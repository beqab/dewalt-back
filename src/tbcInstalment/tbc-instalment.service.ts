import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { Model, Types } from 'mongoose';
import {
  LocalizedText,
  Order,
  OrderDocument,
  OrderStatus,
  TbcInstalmentStatus,
} from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { EmailService } from '../email/email.service';
import { FrontRevalidateService } from '../revalidate/front-revalidate.service';
import { FRONT_PRODUCTS_TAGS } from '../revalidate/front-cache-tags';
import { CreateTbcInstalmentDto } from './dto/create-tbc-instalment.dto';

export type TbcInstalmentOrderContext = {
  orderId: string;
  orderUuid: string;
  amount: number;
  currency: 'GEL';
  sessionId: string;
  redirectUrl: string;
  status: string;
};

export type TbcSweepResult = {
  scanned: number;
  confirmed: number;
  cancelled: number;
  expired: number;
  failed: number;
  skipped: number;
};

type TbcTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  issued_at?: string;
  expires_in?: number | string;
};

type TbcInstalmentProduct = {
  name: string;
  price: number;
  quantity: number;
};

type TbcInitiateApplicationRequest = {
  merchantKey: string;
  priceTotal: number;
  campaignId: string;
  invoiceId: string;
  products: TbcInstalmentProduct[];
};

type TbcInitiateApplicationResponse = {
  sessionId?: string;
  [key: string]: unknown;
};

type TbcErrorPayload = {
  code?: string;
  userMessage?: string;
  systemMessage?: string;
  info?: string;
  [key: string]: unknown;
};

type TbcRawResponse<T> = {
  status: number;
  data: T;
  headers: Record<string, unknown>;
};

@Injectable()
export class TbcInstalmentService {
  private readonly logger = new Logger(TbcInstalmentService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly emailService: EmailService,
    private readonly frontRevalidate: FrontRevalidateService,
  ) {}

  private cachedToken: { value: string; expiresAtMs: number } | null = null;

  private get baseUrl(): string {
    const configured =
      this.configService.get<string>('TBC_INSTALLMENT_BASE_URL') ||
      'https://test-api.tbcbank.ge';
    const trimmed = configured.trim().replace(/\/+$/, '');

    if (!trimmed) {
      throw new BadRequestException(
        'TBC_INSTALLMENT_BASE_URL is not configured',
      );
    }

    const withProtocol =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    const url = new URL(withProtocol);

    if (url.hostname === 'test.inst.ge') {
      url.hostname = 'test-api.tbcbank.ge';
    }

    url.pathname = url.pathname.replace(/\/api\/v1\/?$/, '');

    return url.toString().replace(/\/+$/, '');
  }

  private get tokenUrl(): string {
    const configured = this.configService
      .get<string>('TBC_INSTALLMENT_TOKEN_URL')
      ?.trim();

    if (configured) {
      return configured;
    }

    return `${this.baseUrl}/oauth/token`;
  }

  private get appKey(): string {
    return this.getRequiredConfig('TBC_INSTALLMENT_APP_KEY');
  }

  private get appSecret(): string {
    return this.getRequiredConfig('TBC_INSTALLMENT_APP_SECRET');
  }

  private get scope(): string {
    return (
      this.configService.get<string>('TBC_INSTALLMENT_OAUTH_SCOPE') ||
      this.configService.get<string>('TBC_INSTALLMENT_SCOPE') ||
      'online_installments'
    );
  }

  private get merchantKey(): string {
    return this.getRequiredConfig('TBC_INSTALLMENT_MERCHANT_KEY');
  }

  private get campaignId(): string {
    return this.getRequiredConfig('TBC_INSTALLMENT_CAMPAIGN_ID');
  }

  private get requestTimeoutMs(): number {
    const raw = Number(
      this.configService.get<string>('TBC_INSTALLMENT_TIMEOUT_MS'),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : 20000;
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key)?.trim();

    if (!value) {
      throw new BadRequestException(`${key} is not configured`);
    }

    return value;
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  private throwTbcTransportError(error: unknown, message: string): never {
    if (axios.isAxiosError<unknown>(error)) {
      throw new BadRequestException({
        message,
        statusCode: error.response?.status,
        details: error.response?.data ?? error.code ?? error.message,
        url: error.config?.url,
      });
    }

    throw new BadRequestException(message);
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && this.cachedToken.expiresAtMs > now) {
      return this.cachedToken.value;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: this.scope,
    });

    let response: AxiosResponse<TbcTokenResponse>;
    try {
      const basicAuthToken = Buffer.from(
        `${this.appKey}:${this.appSecret}`,
      ).toString('base64');

      response = await axios.post<TbcTokenResponse>(
        this.tokenUrl,
        body.toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuthToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: this.requestTimeoutMs,
          validateStatus: () => true,
        },
      );
    } catch (error) {
      this.throwTbcTransportError(
        error,
        'TBC installment token request failed',
      );
    }

    if (response.status < 200 || response.status >= 300) {
      throw new BadRequestException({
        message: 'TBC installment token request failed',
        statusCode: response.status,
        details: response.data,
      });
    }

    const token = response.data?.access_token;

    if (!token) {
      throw new BadRequestException(
        'TBC installment token response is missing access_token',
      );
    }

    const expiresInSeconds = Number(response.data?.expires_in) || 3600;
    const refreshBufferSeconds = 60;
    const ttlSeconds = Math.max(expiresInSeconds - refreshBufferSeconds, 1);

    this.cachedToken = {
      value: token,
      expiresAtMs: now + ttlSeconds * 1000,
    };

    return token;
  }

  private async buildAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Request that throws BadRequestException on any non-2xx response.
   * Use this for Initiate where any failure aborts the flow.
   */
  private async tbcRequestWithHeaders<T>(
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<{ data: T; headers: Record<string, unknown> }> {
    const raw = await this.tbcRequestRaw<T>(path, config);

    if (raw.status < 200 || raw.status >= 300) {
      throw new BadRequestException({
        message: 'TBC installment API request failed',
        statusCode: raw.status,
        details: raw.data,
      });
    }

    return { data: raw.data, headers: raw.headers };
  }

  /**
   * Raw request that returns the response untouched so callers can branch
   * on TBC's specific error codes (401 expired, 404 merchant, etc).
   */
  private async tbcRequestRaw<T>(
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<TbcRawResponse<T>> {
    const authHeaders = await this.buildAuthHeaders();

    let response: AxiosResponse<T>;
    try {
      response = await axios.request<T>({
        ...config,
        url: this.buildUrl(path),
        headers: {
          ...config.headers,
          ...authHeaders,
        },
        timeout: config.timeout ?? this.requestTimeoutMs,
        validateStatus: () => true,
      });
    } catch (error) {
      this.throwTbcTransportError(error, 'TBC installment API request failed');
    }

    return {
      status: response.status,
      data: response.data,
      headers: response.headers as Record<string, unknown>,
    };
  }

  private getHeader(headers: Record<string, unknown>, name: string): string {
    const directValue = headers[name] ?? headers[name.toLowerCase()];

    if (typeof directValue === 'string') {
      return directValue;
    }

    if (Array.isArray(directValue) && typeof directValue[0] === 'string') {
      return directValue[0];
    }

    return '';
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private getLocalizedName(name: LocalizedText, locale: 'ka' | 'en'): string {
    return name?.[locale] || name?.ka || name?.en || 'Product';
  }

  private buildProducts(order: OrderDocument): TbcInstalmentProduct[] {
    const locale = order.locale ?? 'ka';
    // TBC expects line totals: when quantity > 1, price must be summed.
    // sum(products[i].price) must equal priceTotal — enforced by TBC API.
    const products = order.items.map((item) => ({
      name: this.getLocalizedName(item.name, locale),
      price: this.roundMoney(item.unitPrice * item.quantity),
      quantity: item.quantity,
    }));

    if (order.deliveryPrice > 0) {
      products.push({
        name: locale === 'ka' ? 'მიტანის ღირებულება' : 'Delivery fee',
        price: this.roundMoney(order.deliveryPrice),
        quantity: 1,
      });
    }

    return products;
  }

  private calculatePriceTotal(products: TbcInstalmentProduct[]): number {
    return this.roundMoney(
      products.reduce((sum, product) => sum + product.price, 0),
    );
  }

  private buildOrderContext(
    order: OrderDocument,
    priceTotal: number,
  ): TbcInstalmentOrderContext {
    return {
      orderId: (order._id as Types.ObjectId).toHexString(),
      orderUuid: order.uuid,
      amount: priceTotal,
      currency: 'GEL',
      sessionId: order.tbcInstalmentSessionId ?? '',
      redirectUrl: order.tbcInstalmentRedirectUrl ?? '',
      status: order.tbcInstalmentStatus ?? TbcInstalmentStatus.Initiated,
    };
  }

  private getTbcErrorMessage(payload: unknown): string {
    if (payload && typeof payload === 'object') {
      const candidate = payload as TbcErrorPayload;
      const msg = candidate.userMessage || candidate.systemMessage;
      if (typeof msg === 'string' && msg.length > 0) return msg;
    }
    return '';
  }

  async createForOrder(
    dto: CreateTbcInstalmentDto,
  ): Promise<TbcInstalmentOrderContext> {
    const order = await this.orderModel.findById(dto.orderId).exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.Pending) {
      throw new BadRequestException(
        'TBC instalment can only be created for pending orders',
      );
    }

    const products = this.buildProducts(order);
    const priceTotal = this.calculatePriceTotal(products);

    // Idempotency: if we already have an active TBC session for this order,
    // return the existing context instead of opening a second one on TBC's side.
    if (
      order.tbcInstalmentStatus === TbcInstalmentStatus.Initiated &&
      order.tbcInstalmentSessionId &&
      order.tbcInstalmentRedirectUrl
    ) {
      return this.buildOrderContext(order, priceTotal);
    }

    const invoiceId = order.uuid || dto.orderId;
    const payload: TbcInitiateApplicationRequest = {
      merchantKey: this.merchantKey,
      priceTotal,
      campaignId: this.campaignId,
      invoiceId,
      products,
    };

    // Reserve stock atomically before opening the TBC session, mirroring the
    // Flitt payment flow. If TBC rejects or we crash mid-flight, the cron
    // sweep / order-cancellation path releases the reservation.
    const expiresAt = this.ordersService.getReservationExpiresAt();
    let reservedNow = false;

    if (!order.stockReserved) {
      this.ordersService.markStockReservation(order, expiresAt);
      try {
        await this.ordersService.reserveStockForOrder(order);
        reservedNow = true;
      } catch (error) {
        this.ordersService.clearStockReservation(order);
        await order.save();
        throw error;
      }
    }

    try {
      const { data, headers } =
        await this.tbcRequestWithHeaders<TbcInitiateApplicationResponse>(
          '/v1/online-installments/applications',
          {
            method: 'POST',
            data: payload,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

      const sessionId = data.sessionId;
      const redirectUrl = this.getHeader(headers, 'location');

      if (!sessionId) {
        throw new BadRequestException(
          'TBC instalment application response is missing sessionId',
        );
      }

      if (!redirectUrl) {
        throw new BadRequestException(
          'TBC instalment application response is missing redirect URL',
        );
      }

      order.tbcInstalmentSessionId = sessionId;
      order.tbcInstalmentRedirectUrl = redirectUrl;
      order.tbcInstalmentStatus = TbcInstalmentStatus.Initiated;
      order.tbcInstalmentCreatedAt = new Date();
      order.tbcInstalmentLastError = undefined;
      await order.save();

      return {
        orderId: dto.orderId,
        orderUuid: order.uuid,
        amount: priceTotal,
        currency: 'GEL',
        sessionId,
        redirectUrl,
        status: TbcInstalmentStatus.Initiated,
      };
    } catch (error) {
      if (reservedNow) {
        await this.ordersService.releaseReservedStock(order);
        this.ordersService.clearStockReservation(order);
        await order.save();
      }
      throw error;
    }
  }

  /**
   * Confirm a single TBC instalment session. Idempotent enough to be safe
   * for cron retries — branches on TBC's error codes.
   */
  // async confirmForOrder(order: OrderDocument): Promise<TbcInstalmentStatus> {
  //   if (!order.tbcInstalmentSessionId) {
  //     throw new BadRequestException('Order has no TBC instalment session');
  //   }

  //   const raw = await this.tbcRequestRaw<unknown>(
  //     `/v1/online-installments/applications/${order.tbcInstalmentSessionId}/confirm`,
  //     {
  //       method: 'POST',
  //       data: { merchantKey: this.merchantKey },
  //       headers: { 'Content-Type': 'application/json' },
  //     },
  //   );

  //   if (raw.status >= 200 && raw.status < 300) {
  //     order.tbcInstalmentStatus = TbcInstalmentStatus.Confirmed;
  //     order.tbcInstalmentConfirmedAt = new Date();
  //     order.tbcInstalmentLastError = undefined;
  //     if (order.stockReserved) {
  //       this.ordersService.clearStockReservation(order);
  //     }
  //     const wasAlreadyPaid = order.status === OrderStatus.Paid;
  //     order.status = OrderStatus.Paid;
  //     await order.save();

  //     if (!wasAlreadyPaid) {
  //       await this.fireOrderPaidSideEffects(order);
  //     }

  //     return TbcInstalmentStatus.Confirmed;
  //   }

  //   const errorMessage = this.getTbcErrorMessage(raw.data);

  //   // 401 with "Expired confirmation date" — past the same-day deadline.
  //   if (raw.status === 401 && /expired/i.test(errorMessage)) {
  //     await this.markInstalmentExpired(order, errorMessage);
  //     return TbcInstalmentStatus.Expired;
  //   }

  //   // 401 "Active installment with sessionId not exists" — TBC no longer
  //   // has an active session. Treat as expired so we release the reservation.
  //   if (raw.status === 401) {
  //     await this.markInstalmentExpired(order, errorMessage);
  //     return TbcInstalmentStatus.Expired;
  //   }

  //   // 404 — merchant config issue; flag and stop retrying via Failed.
  //   if (raw.status === 404) {
  //     await this.markInstalmentFailed(
  //       order,
  //       errorMessage || 'Merchant not found',
  //     );
  //     return TbcInstalmentStatus.Failed;
  //   }

  //   // 400 / other — record the error but leave Initiated so a later sweep
  //   // can retry. If retries keep failing, an operator can flip it manually.
  //   order.tbcInstalmentLastError = `confirm ${raw.status}: ${errorMessage || 'unknown'}`;
  //   await order.save();
  //   throw new BadRequestException({
  //     message: 'TBC installment confirm failed',
  //     statusCode: raw.status,
  //     details: raw.data,
  //   });
  // }

  /**
   * Cancel a single TBC instalment session. Safe to call on an already-cancelled
   * session — TBC's "session not exists" 401 is treated as success.
   */
  async cancelForOrder(order: OrderDocument): Promise<TbcInstalmentStatus> {
    if (!order.tbcInstalmentSessionId) {
      throw new BadRequestException('Order has no TBC instalment session');
    }

    const raw = await this.tbcRequestRaw<unknown>(
      `/v1/online-installments/applications/${order.tbcInstalmentSessionId}/cancel`,
      {
        method: 'POST',
        data: { merchantKey: this.merchantKey },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const errorMessage = this.getTbcErrorMessage(raw.data);
    const sessionGone = raw.status === 401 && /not exists/i.test(errorMessage);

    if ((raw.status >= 200 && raw.status < 300) || sessionGone) {
      await this.markInstalmentCancelled(order, errorMessage);
      return TbcInstalmentStatus.Cancelled;
    }

    if (raw.status === 404) {
      await this.markInstalmentFailed(
        order,
        errorMessage || 'Merchant not found',
      );
      return TbcInstalmentStatus.Failed;
    }

    order.tbcInstalmentLastError = `cancel ${raw.status}: ${errorMessage || 'unknown'}`;
    await order.save();
    throw new BadRequestException({
      message: 'TBC installment cancel failed',
      statusCode: raw.status,
      details: raw.data,
    });
  }

  private async markInstalmentExpired(
    order: OrderDocument,
    errorMessage: string,
  ): Promise<void> {
    if (order.stockReserved) {
      await this.ordersService.releaseReservedStock(order);
      this.ordersService.clearStockReservation(order);
    }
    order.tbcInstalmentStatus = TbcInstalmentStatus.Expired;
    order.tbcInstalmentLastError = errorMessage || undefined;
    if (order.status === OrderStatus.Pending) {
      order.status = OrderStatus.Cancelled;
    }
    await order.save();
    void this.frontRevalidate.revalidateTags(
      FRONT_PRODUCTS_TAGS as unknown as string[],
    );
  }

  private async markInstalmentCancelled(
    order: OrderDocument,
    errorMessage: string,
  ): Promise<void> {
    if (order.stockReserved) {
      await this.ordersService.releaseReservedStock(order);
      this.ordersService.clearStockReservation(order);
    }
    order.tbcInstalmentStatus = TbcInstalmentStatus.Cancelled;
    order.tbcInstalmentCancelledAt = new Date();
    order.tbcInstalmentLastError = errorMessage || undefined;
    if (order.status === OrderStatus.Pending) {
      order.status = OrderStatus.Cancelled;
    }
    await order.save();
    void this.frontRevalidate.revalidateTags(
      FRONT_PRODUCTS_TAGS as unknown as string[],
    );
  }

  private async markInstalmentFailed(
    order: OrderDocument,
    errorMessage: string,
  ): Promise<void> {
    order.tbcInstalmentStatus = TbcInstalmentStatus.Failed;
    order.tbcInstalmentLastError = errorMessage || undefined;
    await order.save();
  }

  private async fireOrderPaidSideEffects(order: OrderDocument): Promise<void> {
    void this.ordersService
      .syncFinaDocProductOut(order._id as Types.ObjectId)
      .catch(() => undefined);

    let to: string | null = order.email;
    if (!to) {
      to = await this.ordersService.resolveRecipientEmail(order);
    }
    if (to) {
      void this.emailService
        .sendOrderPaidEmail({
          to,
          locale: order.locale ?? 'ka',
          // @ts-expect-error: order type does not match OrderWithId
          order,
        })
        .catch(() => undefined);
    }

    void this.frontRevalidate.revalidateTags(
      FRONT_PRODUCTS_TAGS as unknown as string[],
    );
  }

  // private startOfTodayUtc(): Date {
  //   const now = new Date();
  //   return new Date(
  //     Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  //   );
  // }

  /**
   * Sweep all instalments initiated today and call /confirm on each.
   * Intended to be triggered by cronjob.org every ~10 minutes.
   * Per-order errors are swallowed so one failure doesn't block the batch.
   */
  // async sweepConfirmPending(): Promise<TbcSweepResult> {
  //   const startOfToday = this.startOfTodayUtc();
  //   const orders = await this.orderModel
  //     .find({
  //       tbcInstalmentStatus: TbcInstalmentStatus.Initiated,
  //       tbcInstalmentCreatedAt: { $gte: startOfToday },
  //     })
  //     .exec();

  //   const result: TbcSweepResult = {
  //     scanned: orders.length,
  //     confirmed: 0,
  //     cancelled: 0,
  //     expired: 0,
  //     failed: 0,
  //     skipped: 0,
  //   };

  //   for (const order of orders) {
  //     try {
  //       const outcome = await this.confirmForOrder(order);
  //       if (outcome === TbcInstalmentStatus.Confirmed) result.confirmed += 1;
  //       else if (outcome === TbcInstalmentStatus.Expired) result.expired += 1;
  //       else if (outcome === TbcInstalmentStatus.Failed) result.failed += 1;
  //       else result.skipped += 1;
  //     } catch (error) {
  //       result.skipped += 1;
  //       const message = error instanceof Error ? error.message : String(error);
  //       this.logger.warn(
  //         `confirm-pending: order ${(order._id as Types.ObjectId).toHexString()} ${message}`,
  //       );
  //     }
  //   }

  //   return result;
  // }

  /**
   * Sweep instalments that were initiated before today (past TBC's same-day
   * confirmation deadline) and call /cancel on each.
   * Intended to run once per day shortly after midnight.
   */
  // async sweepCancelExpired(): Promise<TbcSweepResult> {
  //   const startOfToday = this.startOfTodayUtc();
  //   const orders = await this.orderModel
  //     .find({
  //       tbcInstalmentStatus: TbcInstalmentStatus.Initiated,
  //       tbcInstalmentCreatedAt: { $lt: startOfToday },
  //     })
  //     .exec();

  //   const result: TbcSweepResult = {
  //     scanned: orders.length,
  //     confirmed: 0,
  //     cancelled: 0,
  //     expired: 0,
  //     failed: 0,
  //     skipped: 0,
  //   };

  //   for (const order of orders) {
  //     try {
  //       const outcome = await this.cancelForOrder(order);
  //       if (outcome === TbcInstalmentStatus.Cancelled) result.cancelled += 1;
  //       else if (outcome === TbcInstalmentStatus.Failed) result.failed += 1;
  //       else result.skipped += 1;
  //     } catch (error) {
  //       result.skipped += 1;
  //       const message = error instanceof Error ? error.message : String(error);
  //       this.logger.warn(
  //         `cancel-expired: order ${(order._id as Types.ObjectId).toHexString()} ${message}`,
  //       );
  //     }
  //   }

  //   return result;
  // }
}
