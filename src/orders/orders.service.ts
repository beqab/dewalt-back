import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  DeliveryType,
  Order,
  OrderDocument,
  OrderStatus,
} from './entities/order.entity';
import { Product, ProductDocument } from '../products/entities/product.entity';
import { TranslationHelperService } from '../translation/translationHelper.service';
import { User, UserDocument } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { FinaService } from '../fina/fina.service';
import { SaveDocProductOutDto } from '../fina/dto/save-doc-product-out.dto';

type LocalizedText = { ka: string; en: string };

type PaymentRequestParams = {
  amount: number;
  currency: 'GEL';
  lang: 'ka' | 'en';
  merchant_id?: string;
  order_desc: string;
  order_id: string;
  response_url: string;
  server_callback_url: string;
  // payment_method: string;
  // payment_systems: string;
};

type PaymentCallbackPayload = {
  rrn?: string;
  masked_card?: string;
  sender_cell_phone?: string;
  sender_account?: string;
  currency?: string | number;
  fee?: string;
  reversal_amount?: string;
  settlement_amount?: string;
  actual_amount?: string;
  response_description?: string;
  sender_email?: string;
  order_status?: string;
  response_status?: string;
  order_time?: string;
  actual_currency?: string;
  order_id?: string;
  tran_type?: string;
  eci?: string;
  settlement_date?: string;
  payment_system?: string;
  approval_code?: string | number;
  merchant_id?: string | number;
  settlement_currency?: string;
  payment_id?: string | number;
  card_bin?: string | number;
  response_code?: string;
  card_type?: string;
  amount?: string | number;
  signature?: string;
  product_id?: string;
  merchant_data?: string;
  rectoken?: string;
  rectoken_lifetime?: string;
  verification_status?: string;
  parent_order_id?: string;
  additional_info?: string;
  response_signature_string?: string;
  [key: string]: unknown;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly translationHelper: TranslationHelperService,
    private readonly emailService: EmailService,
    private readonly settingsService: SettingsService,
    private readonly finaService: FinaService,
  ) {}

  private async syncFinaDocProductOut(
    orderId: string | Types.ObjectId,
  ): Promise<void> {
    // Find the order by its ID and populate items.productId with finaId
    const order = await this.orderModel
      .findById(orderId)
      .populate({
        path: 'items.productId',
        select: 'finaId',
      })
      .exec();

    // If order not found, exit
    if (!order) return;

    // Only sync if order is paid
    if (order.status !== OrderStatus.Paid) return;

    // Only sync if not already synced (finaDocProductOutId should not be a positive number)
    if (
      typeof order.finaDocProductOutId === 'number' &&
      order.finaDocProductOutId > 0
    )
      return;

    try {
      // Prepare products array for payload and collect any missing finaIds
      const products: SaveDocProductOutDto['products'] = [];

      for (const item of order.items || []) {
        // Get finaId from populated product
        const populatedProduct = item.productId as unknown as {
          finaId?: number | null;
        };
        const finaId = populatedProduct?.finaId;

        // If finaId invalid, continue
        if (!finaId) {
          continue;
        }

        // Add product info to products array
        products.push({
          id: finaId,
          sub_id: 0,
          quantity: item.quantity,
          price: item.unitPrice,
        });
      }

      // Build payload for finaService submission
      const payload: SaveDocProductOutDto = {
        date: new Date().toISOString(),
        purpose: `Online order ${order.uuid}`,
        amount:
          typeof order.subtotal === 'number' && Number.isFinite(order.subtotal)
            ? order.subtotal
            : products.reduce((sum, p) => sum + p.price * p.quantity, 0),
        is_vat: true,
        make_entry: true,
        products,
      };

      console.log(payload, 'payload+++++++++++++++++');
      // return;
      // Call finaService to save the document
      const response = await this.finaService.saveDocProductOut(payload);

      console.log(response, 'response+++++++++++++++++');
      // Save the response's document ID and reset error, update sync time
      order.finaDocProductOutId =
        typeof response?.id === 'number' ? response.id : undefined;
      order.finaDocProductOutSyncedAt = new Date();
      order.finaDocProductOutError = undefined;
      await order.save();
    } catch (error) {
      console.log(error, 'error+++++++++++++++++');
    }
  }

  private async resolveRecipientEmail(
    order: OrderDocument,
  ): Promise<string | null> {
    if (order.email) return order.email;

    const userId =
      order.userId instanceof Types.ObjectId
        ? order.userId
        : typeof order.userId === 'string' &&
            Types.ObjectId.isValid(order.userId)
          ? new Types.ObjectId(order.userId)
          : null;
    if (!userId) return null;

    const user = await this.userModel.findById(userId).select('email').exec();
    return user?.email ?? null;
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildCaseInsensitiveContains(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return { $regex: this.escapeRegex(trimmed), $options: 'i' } as const;
  }

  private stringifyFlittValue(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') {
      return value.length > 0 ? value : undefined;
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private buildFlittSignature(
    payload: Record<string, unknown>,
    secretKey: string,
  ) {
    const signatureValues = Object.entries(payload)
      .filter(
        ([key]) => key !== 'signature' && key !== 'response_signature_string',
      )
      .map(([key, value]) => [key, this.stringifyFlittValue(value)] as const)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value as string);

    return crypto
      .createHash('sha1')
      .update([secretKey, ...signatureValues].join('|'))
      .digest('hex');
  }

  private signaturesMatch(expected: string, received: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(received, 'utf8');

    return (
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private applyFlittCallbackMetadata(
    order: OrderDocument,
    callback: PaymentCallbackPayload,
    signature: string,
  ) {
    const paymentId = this.stringifyFlittValue(callback.payment_id);
    const orderStatus = this.stringifyFlittValue(callback.order_status);
    const responseStatus = this.stringifyFlittValue(callback.response_status);
    const merchantId = this.stringifyFlittValue(callback.merchant_id);

    order.flittPaymentId = paymentId || order.flittPaymentId;
    order.flittOrderStatus = orderStatus || order.flittOrderStatus;
    order.flittResponseStatus = responseStatus || order.flittResponseStatus;
    order.flittMerchantId = merchantId || order.flittMerchantId;
    order.flittLastSignature = signature;
    order.flittCallbackAt = new Date();
  }

  private buildOrderCode(): string {
    const date = new Date();
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    const randomPart = crypto
      .randomBytes(3)
      .toString('base64')
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase();
    return `ORD-${y}${m}${d}-${randomPart}`;
  }

  private async generateUniqueOrderCode(): Promise<string> {
    while (true) {
      const code = this.buildOrderCode();
      const exists = await this.orderModel.exists({ uuid: code });
      if (!exists) {
        return code;
      }
    }
  }

  async create(createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    const { items, deliveryType } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must include at least one item');
    }

    let locale: 'ka' | 'en' = 'ka';
    try {
      locale = this.translationHelper.currentLanguage;
    } catch {
      locale = 'ka';
    }

    const productIds = items.map((item) => item.productId);
    const uniqueIds = Array.from(new Set(productIds));

    const products: FlattenMaps<ProductDocument>[] | null =
      await this.productModel
        .find({ _id: { $in: uniqueIds } })
        .lean()
        .exec();

    if (products.length !== uniqueIds.length) {
      const foundIds = new Set(
        products.map((product) =>
          (product._id as Types.ObjectId).toHexString(),
        ),
      );
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Products not found: ${missingIds.join(', ')}`,
      );
    }

    // Index products by id for fast lookup when building order items
    const productsById = new Map(
      products.map((product) => [
        (product._id as Types.ObjectId).toHexString(),
        product,
      ]),
    );

    // Snapshot price at order time to prevent later price changes

    const orderItems = items.map((item) => {
      const product = productsById.get(item.productId.toString());
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );
      }

      const unitPrice = Math.round(product.price * 100) / 100;
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      return {
        productId: new Types.ObjectId(item.productId),
        // Snapshot product fields at order time so the order remains readable
        // even if the product is later deleted/changed.
        name: product.name as unknown as LocalizedText,
        image: product.image,
        finaCode: product.finaCode || undefined,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal =
      Math.round(
        orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100,
      ) / 100;
    const settings = await this.settingsService.getSettings();
    const freeDeliveryEnabled = settings.freeDeliveryEnabled !== false;

    let deliveryPrice = 0;
    if (deliveryType === DeliveryType.Tbilisi) {
      const fee = settings.deliveryTbilisiPrice ?? 0;
      const freeOver = freeDeliveryEnabled
        ? settings.deliveryTbilisiFreeOver
        : undefined;
      deliveryPrice =
        typeof freeOver === 'number' && subtotal >= freeOver ? 0 : fee;
    } else if (deliveryType === DeliveryType.Region) {
      const fee = settings.deliveryRegionPrice ?? 0;
      const freeOver = freeDeliveryEnabled
        ? settings.deliveryRegionFreeOver
        : undefined;
      deliveryPrice =
        typeof freeOver === 'number' && subtotal >= freeOver ? 0 : fee;
    }
    const total = Math.round((subtotal + deliveryPrice) * 100) / 100;

    const orderCode = await this.generateUniqueOrderCode();

    const order = new this.orderModel({
      uuid: orderCode,
      locale,
      name: createOrderDto.name,
      surname: createOrderDto.surname,
      email: createOrderDto.email || undefined,
      personalId: createOrderDto.personalId,
      phone: createOrderDto.phone,
      address: createOrderDto.address,
      deliveryType,
      deliveryPrice,
      subtotal,
      total,
      status: OrderStatus.Pending,
      items: orderItems,
      userId: createOrderDto.userId
        ? new Types.ObjectId(createOrderDto.userId)
        : undefined,
    });

    return order.save();
  }

  async createPayment(orderId: string, locale?: 'ka' | 'en') {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const resolvedLocale = locale ?? order.locale ?? 'ka';
    if (locale && order.locale !== locale) {
      order.locale = locale;
      await order.save();
    }

    console.log(order.total * 100, 'amount * 100');
    const amount = order.total;
    const requestParams: PaymentRequestParams = {
      amount: Math.round(amount * 100),
      currency: 'GEL',
      lang: resolvedLocale,
      merchant_id: process.env.FLITT_MERCHANT_ID,

      // payment_systems: 'installments',
      // payment_method: 'x',
      order_desc: 'Order payment',
      order_id: orderId,
      // response_url: `${process.env.FRONT_URL}ka/payment-status?orderId=${orderId}`,

      response_url: `${process.env.API_URL}orders/return?locale=${resolvedLocale}`,
      server_callback_url: `${process.env.API_URL}orders/callback`,
    };
    const secret_key = process.env.FLITT_SECRET_KEY;

    if (!secret_key) {
      throw new BadRequestException('FLITT_SECRET_KEY is not configured');
    }

    const signature = this.buildFlittSignature(requestParams, secret_key);

    const requestData = {
      request: {
        ...requestParams,
        signature,
      },
    };

    try {
      if (typeof fetch !== 'function') {
        throw new BadRequestException('Fetch is not available on the server');
      }

      const response = await fetch('https://pay.flitt.com/api/checkout/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = (await response.json()) as Record<string, unknown>;
      console.log(data, 'data+++++++++++++++++');
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Flitt API error:', error.message);
      }
      throw new BadRequestException('Flitt API request failed');
    }
  }

  async callback(body: PaymentCallbackPayload) {
    try {
      // Debug log: აქ ჩანს ზუსტად რა flat payload მოვიდა Flitt-დან.
      // სასურველია production-ში ეს გადაიტანოთ structured logger-ზე,
      // რადგან callback-ში შეიძლება სენსიტიური payment metadata მოდიოდეს.
      console.log(body, 'body+++++');

      // სისტემური კონფიგურაცია ამ endpoint-ის სანდოობის ბირთვია:
      // secret key საჭიროა signature-ის გადასამოწმებლად,
      // merchant id კი გვიცავს იმ შემთხვევისგან, თუ უცხო merchant-ის payload მოვა.
      const secretKey = process.env.FLITT_SECRET_KEY;
      const merchantIdExpected = process.env.FLITT_MERCHANT_ID;

      if (!secretKey) {
        throw new BadRequestException('FLITT_SECRET_KEY is not configured');
      }

      if (!merchantIdExpected) {
        throw new BadRequestException('FLITT_MERCHANT_ID is not configured');
      }

      // callback-ის ძირითადი ველები ერთ სტრინგ ფორმატში მოგვყავს,
      // რადგან Flitt ნაწილი ველებისა რიცხვადაც შეიძლება გამოგვიგზავნოს.
      // stringifyFlittValue null/undefined-ს ფილტრავს და დანარჩენს
      // შედარებისთვის ერთნაირ, პროგნოზირებად ფორმაში გარდაქმნის.
      const orderId = this.stringifyFlittValue(body.order_id);
      const orderStatus = this.stringifyFlittValue(body.order_status);
      const amount = this.stringifyFlittValue(body.amount);
      const currency = this.stringifyFlittValue(body.currency);
      const merchantId = this.stringifyFlittValue(body.merchant_id);
      const signatureRaw = this.stringifyFlittValue(body.signature);
      const paymentId = this.stringifyFlittValue(body.payment_id);
      const responseStatus = this.stringifyFlittValue(body.response_status);

      // ეს ველები callback-ის მინიმალური ვალიდაციისთვის აუცილებელია.
      // რომელიმე რომ აკლდეს, payload-ს საერთოდ აღარ ვენდობით
      // და შეკვეთის სტატუსზე არანაირ ცვლილებას არ ვაკეთებთ.
      if (!orderId || !orderStatus || !amount || !currency || !merchantId) {
        throw new BadRequestException(
          'Flitt callback is missing required fields',
        );
      }

      // signature-ის გარეშე callback კრიპტოგრაფიულად ვერ დადასტურდება,
      // ამიტომ ასეთი request ავტომატურად უარყოფილია.
      if (!signatureRaw) {
        throw new BadRequestException('Flitt callback signature is missing');
      }

      // ვანგარიშობთ იმ signature-ს, რომელიც ამ payload-ს უნდა ჰქონდეს
      // ჩვენი FLITT_SECRET_KEY-ის მიხედვით. შემდეგ timing-safe შედარებით
      // ვამოწმებთ რეალურად მოსულ მნიშვნელობასთან თანხვედრას.
      const expectedSignature = this.buildFlittSignature(body, secretKey);
      const receivedSignature = signatureRaw.toLowerCase();

      if (!this.signaturesMatch(expectedSignature, receivedSignature)) {
        throw new BadRequestException('Flitt callback signature is invalid');
      }

      // დამატებითი დაცვა: სწორ signature-თან ერთად merchant_id-ც უნდა ემთხვეოდეს
      // ჩვენს კონფიგურაციას, რომ სხვა merchant-ის callback არ დამუშავდეს.
      if (merchantId !== String(merchantIdExpected)) {
        throw new BadRequestException('Flitt callback merchant_id mismatch');
      }

      // ამ flow-ში მხოლოდ GEL ველოდებით. სხვა ვალუტის payload-ის მიღება
      // ნიშნავს, რომ თანხის შედარება და ბიზნეს-ლოგიკა სანდო აღარ არის.
      if (currency !== 'GEL') {
        throw new BadRequestException('Flitt callback currency mismatch');
      }

      // მას შემდეგ, რაც callback ავთენტურობაში დარწმუნდით,
      // უკვე შეგვიძლია შესაბამისი order მოვძებნოთ payment provider-ის order_id-ით.
      const order = await this.orderModel.findById(orderId).exec();

      if (!order) {
        console.error('Order not found for callback');
        throw new NotFoundException('Order not found');
      }

      // თანხას ვადარებთ შეკვეთაში შენახულ total-ს თეთრებში/კაპიკებში.
      // ეს გვიცავს იმ შემთხვევისგან, როცა signature მართალია,
      // მაგრამ callback სხვა თანხაზეა გამოგზავნილი.
      const expectedAmount = String(Math.round(order.total * 100));
      if (amount !== expectedAmount) {
        throw new BadRequestException('Flitt callback amount mismatch');
      }

      // idempotency:
      // თუ იგივე callback მეორედ/მესამედ მოვიდა, აღარ უნდა გავუშვათ
      // მეორედ სტატუსის განახლება, email ან FINA sync.
      // ამისთვის ვამოწმებთ payment_id-ს ან ბოლო დამუშავებულ signature-ს.
      const isDuplicateCallback =
        (paymentId && order.flittPaymentId === paymentId) ||
        order.flittLastSignature === receivedSignature;

      // დუბლირებული callback-ს უბრალოდ ვპასუხობთ ok-ით.
      // აქ სტატუსს აღარ ვეხებით, რათა side effect-ები არ განმეორდეს.
      if (
        isDuplicateCallback &&
        order.flittOrderStatus === orderStatus &&
        (responseStatus === undefined ||
          order.flittResponseStatus === responseStatus)
      ) {
        return { status: 'ok' };
      }

      // callback-ის ტექნიკურ მეტამონაცემებს order-ზე ვინახავთ audit/debug მიზნებისთვის:
      // payment id, response status, merchant id, ბოლო signature და callback დრო.
      // ეს ძალიან გამოსადეგია მომავალში disputed payment-ის ან duplicate callback-ის ანალიზისთვის.
      this.applyFlittCallbackMetadata(order, body, receivedSignature);

      // თუ order უკვე paid არის, metadata-ს ვინახავთ, მაგრამ ბიზნეს-სტატუსს აღარ ვცვლით.
      // ეს გვიცავს უკვე დასრულებული გადახდის ხელახლა დამუშავებისგან.
      if (order.status === OrderStatus.Paid) {
        await order.save();
        return { status: 'ok' };
      }

      // თუ provider-მა approved არ დააბრუნა, ამ flow-ში შეკვეთას failed-ზე გადავიყვანთ.
      // მომავალში შეიძლება გინდოდეთ უფრო დეტალური mapping:
      // მაგალითად expired / reversed / declined სხვადასხვა შიდა სტატუსებზე.
      if (orderStatus !== 'approved') {
        order.status = OrderStatus.Failed;
        await order.save();
        return { status: 'ok' };
      }

      // approved ნიშნავს, რომ callback წარმატებული გადახდის შესახებ გვატყობინებს,
      // ამიტომ order ოფიციალურად გადაგვყავს paid სტატუსზე.
      order.status = OrderStatus.Paid;
      await order.save();

      // გადახდილი შეკვეთის შემდეგ FINA-ში დოკუმენტის სინქრონიზაციას ვუშვებთ ფონურად.
      // ამას intentionally არ ველოდებით, რომ callback სწრაფად დასრულდეს.
      void this.syncFinaDocProductOut(order._id as Types.ObjectId).catch(
        () => undefined,
      );

      // confirmation email-ის გასაგზავნად ჯერ order.email-ს ვიყენებთ,
      // ხოლო თუ order-ზე არ არის, ვცდილობთ user პროფილიდან ამოვიღოთ.
      let to: string | null = order.email;
      if (!to) {
        to = await this.resolveRecipientEmail(order);
      }

      // მეილი ასევე ფონურად იგზავნება, რათა callback endpoint
      // გარე სერვისის პასუხზე არ იყოს დამოკიდებული.
      if (to) {
        void this.emailService
          .sendOrderPaidEmail({
            to,
            locale: order.locale ?? 'ka',

            // @ts-expect-error: order type does not match OrderWithId as _id can be unknown
            order: order,
          })
          .catch(() => undefined);
      }

      // provider callback-ზე ხშირად აუცილებელია სტაბილურად "ok" დაბრუნდეს,
      // რათა payment system-მა request retry-ები ან failure არ ჩათვალოს.
      return { status: 'ok' }; // აუცილებელია რომ ok დაბრუნდეს
    } catch (error) {
      // აქ ყველა მოულოდნელი შეცდომა გადაიქცევა BadRequestException-ად.
      // საჭიროების შემთხვევაში ჯობია დაემატოს structured logging,
      // რომ signature mismatch / amount mismatch / missing order ცალ-ცალკე მარტივად იძებნებოდეს.
      console.log(error);
      throw new BadRequestException(error);
    }
  }

  async checkOrderStatus(
    orderIdOrUuid: string,
  ): Promise<{ status: OrderStatus; order: OrderDocument }> {
    let order: OrderDocument | null = null;

    if (Types.ObjectId.isValid(orderIdOrUuid) && orderIdOrUuid.length === 24) {
      order = await this.orderModel.findById(orderIdOrUuid).exec();
    }
    if (!order) {
      order = await this.orderModel.findOne({ uuid: orderIdOrUuid }).exec();
    }
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { status: order.status, order };
  }

  async findOneAdmin(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order id format');
    }

    const order = await this.orderModel
      .findById(orderId)
      .populate('userId', 'name surname email')
      .populate({
        path: 'items.productId',
        select:
          '_id name code image images slug price originalPrice discount inStock quantity rating reviewCount finaId finaCode specs',
      })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let ordersCountForUser = 0;
    const userIdRaw = (order.userId as unknown as { _id?: unknown })?._id;
    const userIdValue =
      userIdRaw instanceof Types.ObjectId
        ? userIdRaw.toHexString()
        : typeof userIdRaw === 'string'
          ? userIdRaw
          : null;
    if (userIdValue && Types.ObjectId.isValid(userIdValue)) {
      ordersCountForUser = await this.orderModel.countDocuments({
        userId: new Types.ObjectId(userIdValue),
      });
    } else if (order.email) {
      // ordersCountForUser = await this.orderModel.countDocuments({
      //   email: this.buildCaseInsensitiveContains(order.email) ?? order.email,
      // });
    }

    return {
      order,
      ordersCountForUser,
    };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
    id?: string;
    uuid?: string;
    email?: string;
  }): Promise<{
    data: OrderDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, status, userId, id, uuid, email } = query;

      const idRaw = id ? String(id).trim() : '';
      const uuidRaw = uuid ? String(uuid).trim() : '';
      const uuidIsObjectId = uuidRaw ? Types.ObjectId.isValid(uuidRaw) : false;
      const identifierFilters: Record<string, unknown>[] = [];

      if (idRaw && Types.ObjectId.isValid(idRaw)) {
        identifierFilters.push({ _id: new Types.ObjectId(idRaw) });
      }

      if (uuidRaw) {
        if (uuidIsObjectId) {
          identifierFilters.push({ _id: new Types.ObjectId(uuidRaw) });
          identifierFilters.push({ uuid: uuidRaw });
        } else {
          const uuidFilter = this.buildCaseInsensitiveContains(uuidRaw);
          if (uuidFilter) {
            identifierFilters.push({ uuid: uuidFilter });
          }
        }
      }

      const emailFilter = email
        ? this.buildCaseInsensitiveContains(String(email))
        : undefined;

      const filterParts: Record<string, unknown>[] = [];

      if (status) {
        filterParts.push({ status });
      } else if (identifierFilters.length === 0) {
        filterParts.push({
          status: {
            $nin: [OrderStatus.Pending, OrderStatus.Failed],
          },
        });
      }

      if (userId) {
        filterParts.push({ userId });
      }

      if (identifierFilters.length === 1) {
        filterParts.push(identifierFilters[0]);
      } else if (identifierFilters.length > 1) {
        filterParts.push({ $or: identifierFilters });
      }

      if (emailFilter) {
        const userIds = await this.userModel
          .find({ email: emailFilter })
          .select('_id')
          .lean()
          .exec();
        const ids = (userIds || []).map((u) =>
          String((u as { _id: unknown })._id),
        );

        filterParts.push({
          $or: [
            { email: emailFilter },
            ...(ids.length > 0 ? [{ userId: { $in: ids } }] : []),
          ],
        });
      }

      const filter =
        filterParts.length > 0
          ? filterParts.length === 1
            ? filterParts[0]
            : { $and: filterParts }
          : {};

      const skip = (page - 1) * limit;
      const total = await this.orderModel.countDocuments(filter);
      const orders = await this.orderModel
        .find(filter)
        .populate('userId', 'name surname email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

      const totalPages = Math.ceil(total / limit);
      return {
        data: orders,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: totalPages,
        totalPages,
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }

  async findMyOrders(query: {
    userId: string;
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const { userId, page = 1, limit = 10, status } = query;

      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID format');
      }

      const filter: Record<string, unknown> = {
        userId: new Types.ObjectId(userId),
      };
      if (status) {
        filter.status = status;
      }

      const skip = (page - 1) * limit;
      const total = await this.orderModel.countDocuments({
        ...filter,
        status: { $nin: [OrderStatus.Failed, OrderStatus.Pending] },
      });

      let lang: 'ka' | 'en' = 'ka';
      try {
        lang = this.translationHelper.currentLanguage;
      } catch {
        lang = 'ka';
      }

      const orders = await this.orderModel
        .find({
          ...filter,
          status: { $nin: [OrderStatus.Failed, OrderStatus.Pending] },
        })
        .lean()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

      /* eslint-disable */
      const translatedOrders = (orders ?? []).map((order: any) => ({
        ...order,
        items: (order.items ?? []).map((item: any) => {
          const rawId = item.productId;
          const id =
            rawId instanceof Types.ObjectId
              ? rawId.toHexString()
              : typeof rawId === 'string'
                ? rawId
                : null;

          const snapshotNameValue = item.name as
            | LocalizedText
            | string
            | undefined;
          const snapshotTranslatedName =
            typeof snapshotNameValue === 'string'
              ? snapshotNameValue
              : snapshotNameValue?.[lang];

          const snapshotImage =
            typeof item.image === 'string' && item.image.length
              ? item.image
              : undefined;

          return {
            ...item,
            productId: {
              _id: id ?? undefined,
              name: snapshotTranslatedName ?? '',
              image: snapshotImage,
            },
          };
        }),
      }));
      /* eslint-enable */

      return {
        data: translatedOrders,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }

  async updateStatus(updateOrderDto: UpdateOrderDto): Promise<OrderDocument> {
    try {
      const { orderId, status } = updateOrderDto;
      const order = await this.orderModel.findById(orderId).exec();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const oldStatus = order.status;
      if (oldStatus === status) return order;

      order.status = status;
      const saved = await order.save();

      if (oldStatus !== OrderStatus.Paid && status === OrderStatus.Paid) {
        void this.syncFinaDocProductOut(saved._id as Types.ObjectId).catch(
          () => undefined,
        );
      }

      let to: string | null = saved.email;
      if (!to) {
        to = await this.resolveRecipientEmail(saved);
      }
      if (to) {
        void this.emailService
          .sendOrderStatusChangedEmail({
            to,
            locale: saved.locale ?? 'ka',
            order: saved,
            oldStatus,
            newStatus: status,
          })
          .catch(() => undefined);
      }

      return saved;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }
}
