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

type LocalizedText = { ka: string; en: string };

const DELIVERY_PRICES: Record<DeliveryType, number> = {
  [DeliveryType.Tbilisi]: 5,
  [DeliveryType.Region]: 15,
};

type PaymentRequestParams = {
  amount: number;
  currency: 'GEL';
  lang: 'ka' | 'en';
  merchant_id?: string;
  order_desc: string;
  order_id: string;
  response_url: string;
  server_callback_url: string;
};

type PaymentCallbackPayload = {
  order_id: string;
  order_status: string;
  amount: string;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly translationHelper: TranslationHelperService,
  ) {}

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

      const unitPrice = product.price;
      const lineTotal = unitPrice * item.quantity;
      return {
        productId: new Types.ObjectId(item.productId),
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const deliveryPrice = DELIVERY_PRICES[deliveryType] ?? 0;
    const total = subtotal + deliveryPrice;

    const orderCode = await this.generateUniqueOrderCode();

    const order = new this.orderModel({
      uuid: orderCode,
      name: createOrderDto.name,
      surname: createOrderDto.surname,
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

  async createPayment(orderId: string, locale: 'ka' | 'en' = 'ka') {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const amount = order.total;
    const requestParams: PaymentRequestParams = {
      amount: amount * 100,
      currency: 'GEL',
      lang: 'ka',
      merchant_id: process.env.FLITT_MERCHANT_ID,
      order_desc: 'Order payment',
      order_id: orderId,
      // response_url: `${process.env.FRONT_URL}ka/payment-status?orderId=${orderId}`,

      response_url: `${process.env.API_URL}orders/return?locale=${locale}`,
      server_callback_url: `${process.env.API_URL}orders/callback`,
    };
    const secret_key = process.env.FLITT_SECRET_KEY;

    if (!secret_key) {
      throw new BadRequestException('FLITT_SECRET_KEY is not configured');
    }

    const signatureString = [
      secret_key,
      ...Object.entries(requestParams)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value),
    ].join('|');

    const signature = crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('hex');

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
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Flitt API error:', error.message);
      }
      throw new BadRequestException('Flitt API request failed');
    }
  }

  async callback(body: PaymentCallbackPayload) {
    const { order_id, order_status, amount } = body;

    console.log(body, 'callback+++++++++++++++++');

    try {
      // 1. შეამოწმე არსებობს თუ არა შეკვეთა
      const order = await this.orderModel.findById(order_id);
      console.log(order, 'order+++++++++++++++++');
      if (!order) {
        console.error('Order not found for callback');
        throw new NotFoundException('Order not found');
      }
      if (order_status !== 'approved') {
        order.status = OrderStatus.Failed;
        await order.save();
        return { status: 'ok' };
      }
      if (Number(amount) !== order.total * 100) {
        console.log(amount, order.total, 'amount mismatch');
        order.status = OrderStatus.Failed;
        await order.save();
        return { status: 'ok' };
      }

      if (order_status === 'approved') {
        order.status = OrderStatus.Paid;
        await order.save();
      }

      return { status: 'ok' }; // აუცილებელია რომ ok დაბრუნდეს
    } catch (error) {
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

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
  }): Promise<{
    data: OrderDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const { page = 1, limit = 10, status, userId } = query;

    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = status;
    }
    if (userId) {
      filter.userId = userId;
    }

    const skip = (page - 1) * limit;
    const total = await this.orderModel.countDocuments(filter);
    const orders = await this.orderModel
      .find(filter)
      .populate('userId', 'name surname email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data: orders,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    };
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
      const total = await this.orderModel.countDocuments(filter);

      let lang: 'ka' | 'en' = 'ka';
      try {
        lang = this.translationHelper.currentLanguage;
      } catch {
        lang = 'ka';
      }

      const orders = await this.orderModel
        .find(filter)
        .populate({
          path: 'items.productId',
          select: 'name code image slug',
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
          const p = item.productId;
          if (!p || typeof p === 'string') return item;

          const nameValue = p.name as LocalizedText | string | undefined;
          const translatedName =
            typeof nameValue === 'string' ? nameValue : nameValue?.[lang];

          return {
            ...item,
            productId: {
              _id: p._id,
              name: translatedName ?? '',
              code: p.code,
              image: p.image,
              slug: p.slug,
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
    const { orderId, status } = updateOrderDto;
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
