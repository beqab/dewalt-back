import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { Model } from 'mongoose';
import {
  LocalizedText,
  Order,
  OrderDocument,
  OrderStatus,
} from '../orders/entities/order.entity';
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

@Injectable()
export class TbcInstalmentService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
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
    console.log(token, 'token+++++++++++++++++');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private async tbcRequest<T>(
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    const { data } = await this.tbcRequestWithHeaders<T>(path, config);

    return data;
  }

  private async tbcRequestWithHeaders<T>(
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<{ data: T; headers: Record<string, unknown> }> {
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
      console.log(error, 'error+++ from tbcRequestWithHeaders');
      this.throwTbcTransportError(error, 'TBC installment API request failed');
    }

    if (response.status < 200 || response.status >= 300) {
      console.log(response.data, 'response+++ from tbcRequestWithHeaders');
      throw new BadRequestException({
        message: 'TBC installment API request failed',
        statusCode: response.status,
        details: response.data,
      });
    }

    return {
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
    const products = order.items.map((item) => ({
      name: this.getLocalizedName(item.name, locale),
      price: this.roundMoney(item.unitPrice),
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
      products.reduce(
        (sum, product) => sum + product.price * product.quantity,
        0,
      ),
    );
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
    const invoiceId = order.uuid || dto.orderId;
    const payload: TbcInitiateApplicationRequest = {
      merchantKey: this.merchantKey,
      priceTotal,
      campaignId: this.campaignId,
      invoiceId,
      products,
    };

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
    order.tbcInstalmentStatus = 'initiated';
    order.tbcInstalmentCreatedAt = new Date();
    await order.save();

    return {
      orderId: dto.orderId,
      orderUuid: order.uuid,
      amount: priceTotal,
      currency: 'GEL',
      sessionId,
      redirectUrl,
      status: 'initiated',
    };
  }
}
