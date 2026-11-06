/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment -- loose mocks in this test */
import { ValidationPipe } from '@nestjs/common';
import * as crypto from 'crypto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus } from './entities/order.entity';
import { OrdersService } from './orders.service';

const CARD_MERCHANT = '1111111';
const DIST_MERCHANT = '4057632';
const CARD_SECRET = 'card-secret';
const DIST_SECRET = 'dist-secret';
const ORDER_ID = '66b9d248a3142c7c3e2d4c11';

const sign = (payload: Record<string, unknown>, secret: string) =>
  crypto
    .createHash('sha1')
    .update(
      [
        secret,
        ...Object.keys(payload)
          .sort((a, b) => a.localeCompare(b))
          .map((key) => String(payload[key])),
      ].join('|'),
    )
    .digest('hex');

const signedCallback = (
  overrides: Record<string, unknown>,
  secret = DIST_SECRET,
) => {
  const body: Record<string, unknown> = {
    order_id: ORDER_ID,
    order_status: 'approved',
    amount: '10000',
    currency: 'GEL',
    merchant_id: DIST_MERCHANT,
    payment_id: 'p1',
    response_status: 'success',
    ...overrides,
  };
  return { ...body, signature: sign(body, secret) };
};

function setup(orderOverrides: Record<string, unknown> = {}) {
  const order: Record<string, any> = {
    _id: ORDER_ID,
    uuid: 'uuid-1',
    status: OrderStatus.Pending,
    total: 100,
    locale: 'ka',
    email: 'buyer@example.com',
    stockReserved: true,
    ...orderOverrides,
  };
  order.save = jest.fn().mockResolvedValue(order);

  const orderModel = {
    findById: jest.fn(() => ({ exec: () => Promise.resolve(order) })),
    findOneAndUpdate: jest.fn((_filter: unknown, update: any) => ({
      exec: () => {
        Object.assign(order, update.$set);
        return Promise.resolve(order);
      },
    })),
  };
  const emailService = {
    sendOrderPaidEmail: jest.fn().mockResolvedValue(undefined),
  };
  const service = new (OrdersService as any)(
    orderModel,
    {},
    {},
    {},
    emailService,
    {},
    {},
    {},
  ) as OrdersService;
  const spy = service as any;
  jest.spyOn(spy, 'getReservationExpiresAt').mockReturnValue(new Date());
  jest.spyOn(spy, 'markStockReservation').mockImplementation(() => undefined);
  jest.spyOn(spy, 'clearStockReservation').mockImplementation(() => undefined);
  jest.spyOn(spy, 'releaseReservedStock').mockResolvedValue(undefined);
  const syncFina = jest
    .spyOn(spy, 'syncFinaDocProductOut')
    .mockResolvedValue(undefined);

  return { service, order, orderModel, emailService, syncFina };
}

describe('Flitt payment types', () => {
  const originalEnv = process.env;
  let fetchMock: jest.Mock;

  const sentRequest = () =>
    JSON.parse(fetchMock.mock.calls[0][1].body as string).request as Record<
      string,
      unknown
    >;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      FLITT_MERCHANT_ID: CARD_MERCHANT,
      FLITT_SECRET_KEY: CARD_SECRET,
      FLITT_DISTRIBUTION_MERCHANT_ID: DIST_MERCHANT,
      FLITT_DISTRIBUTION_SECRET_KEY: DIST_SECRET,
      FRONT_URL: 'https://front.test/',
      API_URL: 'https://api.test/',
    };
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ response: { checkout_url: 'https://pay.test/x' } }),
    });
    global.fetch = fetchMock;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('request DTO', () => {
    const pipe = new ValidationPipe({ whitelist: true });
    const run = (value: object) =>
      pipe.transform(value, { type: 'body', metatype: CreatePaymentDto });

    it('keeps paymentType through the global whitelist pipe', async () => {
      await expect(
        run({ orderId: ORDER_ID, paymentType: 'distribution' }),
      ).resolves.toMatchObject({ paymentType: 'distribution' });
    });

    it('rejects an unknown paymentType', async () => {
      await expect(
        run({ orderId: ORDER_ID, paymentType: 'other' }),
      ).rejects.toBeDefined();
    });
  });

  describe('createPayment', () => {
    it('leaves the card request without installment parameters', async () => {
      const { service, order } = setup();
      await service.createPayment(ORDER_ID, 'ka');

      const { signature, ...params } = sentRequest();
      expect(params.merchant_id).toBe(CARD_MERCHANT);
      expect(params).not.toHaveProperty('payment_systems');
      expect(params).not.toHaveProperty('payment_method');
      expect(signature).toBe(sign(params, CARD_SECRET));
      expect(order.paymentOption).toBeUndefined();
    });

    it('sends distribution on its merchant with installment parameters', async () => {
      const { service, order } = setup();
      await service.createPayment(ORDER_ID, 'ka', 'distribution');

      const { signature, ...params } = sentRequest();
      expect(params).toMatchObject({
        merchant_id: DIST_MERCHANT,
        payment_systems: 'installments',
        payment_method: 'tbc',
      });
      expect(signature).toBe(sign(params, DIST_SECRET));
      expect(order.flittMerchantId).toBe(DIST_MERCHANT);
      expect(order.paymentOption).toBe('distribution');
    });

    it('fails instead of using the card merchant when the secret is missing', async () => {
      delete process.env.FLITT_DISTRIBUTION_SECRET_KEY;
      const { service } = setup();
      await expect(
        service.createPayment(ORDER_ID, 'ka', 'distribution'),
      ).rejects.toThrow('FLITT_DISTRIBUTION');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects distribution below 50 GEL and accepts exactly 50', async () => {
      const low = setup({ total: 49.99 });
      await expect(
        low.service.createPayment(ORDER_ID, 'ka', 'distribution'),
      ).rejects.toThrow('50 GEL');

      const min = setup({ total: 50 });
      await min.service.createPayment(ORDER_ID, 'ka', 'distribution');
      expect(sentRequest().amount).toBe(5000);
    });

    it('rejects orders bound to another merchant or a TBC session', async () => {
      const bound = setup({ flittMerchantId: CARD_MERCHANT });
      await expect(
        bound.service.createPayment(ORDER_ID, 'ka', 'distribution'),
      ).rejects.toThrow('another payment merchant');

      const tbc = setup({ tbcInstalmentSessionId: 'session' });
      await expect(
        tbc.service.createPayment(ORDER_ID, 'ka', 'distribution'),
      ).rejects.toThrow('TBC instalment session');
    });
  });

  describe('logging', () => {
    it('never logs the checkout token or signature', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              checkout_url:
                'https://pay.flitt.com/x/index.html?token=SECRETTOKEN',
              payment_id: 'p1',
            },
          }),
      });
      const logged = jest.spyOn(console, 'log');
      const { service } = setup({
        flittMerchantId: DIST_MERCHANT,
        paymentOption: 'distribution',
      });
      await service.createPayment(ORDER_ID, 'ka', 'distribution');
      const callback = signedCallback({});
      await service.callback(callback);

      const output = JSON.stringify(logged.mock.calls);
      expect(output).toContain('installments');
      expect(output).not.toContain('SECRETTOKEN');
      expect(output).not.toContain(callback.signature);
    });
  });

  describe('callback', () => {
    const distOrder = {
      flittMerchantId: DIST_MERCHANT,
      paymentOption: 'distribution',
    };

    it('marks a distribution order paid using its own secret', async () => {
      const { service, order, syncFina } = setup(distOrder);
      await expect(service.callback(signedCallback({}))).resolves.toEqual({
        status: 'ok',
      });
      expect(order.status).toBe(OrderStatus.Paid);
      expect(syncFina).toHaveBeenCalledTimes(1);
    });

    it('still accepts card callbacks on unbound legacy orders', async () => {
      const { service, order } = setup();
      await service.callback(
        signedCallback({ merchant_id: CARD_MERCHANT }, CARD_SECRET),
      );
      expect(order.status).toBe(OrderStatus.Paid);
    });

    it('rejects a callback signed with the other merchant secret', async () => {
      const { service, order } = setup(distOrder);
      await expect(
        service.callback(signedCallback({}, CARD_SECRET)),
      ).rejects.toBeDefined();
      expect(order.status).toBe(OrderStatus.Pending);
    });

    it('rejects a callback from a merchant the order is not bound to', async () => {
      const { service, order } = setup({ flittMerchantId: CARD_MERCHANT });
      await expect(service.callback(signedCallback({}))).rejects.toBeDefined();
      expect(order.status).toBe(OrderStatus.Pending);
    });

    it('does not repeat side effects for a duplicate callback', async () => {
      const { service, syncFina, emailService } = setup(distOrder);
      const callback = signedCallback({});
      await service.callback(callback);
      await service.callback(callback);
      expect(syncFina).toHaveBeenCalledTimes(1);
      expect(emailService.sendOrderPaidEmail).toHaveBeenCalledTimes(1);
    });

    it('keeps the order pending on processing, then pays on approved', async () => {
      const { service, order } = setup(distOrder);
      await service.callback(signedCallback({ order_status: 'processing' }));
      expect(order.status).toBe(OrderStatus.Pending);
      expect((service as any).releaseReservedStock).not.toHaveBeenCalled();

      await service.callback(signedCallback({}));
      expect(order.status).toBe(OrderStatus.Paid);
    });

    it('fails a declined distribution order and releases stock', async () => {
      const { service, order } = setup(distOrder);
      await service.callback(signedCallback({ order_status: 'declined' }));
      expect(order.status).toBe(OrderStatus.Failed);
      expect((service as any).releaseReservedStock).toHaveBeenCalled();
    });

    it('keeps existing card behaviour for a processing callback', async () => {
      const { service, order } = setup();
      await service.callback(
        signedCallback(
          { merchant_id: CARD_MERCHANT, order_status: 'processing' },
          CARD_SECRET,
        ),
      );
      expect(order.status).toBe(OrderStatus.Failed);
    });
  });
});
