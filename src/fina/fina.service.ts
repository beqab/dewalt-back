import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SaveDocProductOutDto } from './dto/save-doc-product-out.dto';
import { GetProductsRestResponseDto } from './dto/get-products-rest.response.dto';

type FinaAuthMode = 'basic' | 'query' | 'token' | 'none';

export type FinaProductListItem = {
  id: number;
  code?: string;
  name?: string;
};

export type FinaSaveDocProductOutResponse = { id: number; ex?: string | null };

@Injectable()
export class FinaService {
  constructor(private readonly configService: ConfigService) {}

  private cachedToken: { value: string; expiresAtMs: number } | null = null;

  private get baseUrl(): string {
    // Example: http://94.43.175.24:8085
    return this.configService.get<string>('FINA_BASE_URL') || '';
  }

  private get authPath(): string {
    return (
      this.configService.get<string>('FINA_AUTH_PATH') ||
      '/api/authentication/authenticate'
    );
  }

  private get apiUser(): string {
    return this.configService.get<string>('FINA_API_USER') || '';
  }

  private get password(): string {
    return this.configService.get<string>('FINA_PASSWORD') || '';
  }

  private get authMode(): FinaAuthMode {
    const raw = (this.configService.get<string>('FINA_AUTH_MODE') || 'token')
      .trim()
      .toLowerCase();
    if (raw === 'basic' || raw === 'query' || raw === 'token' || raw === 'none')
      return raw;
    return 'token';
  }

  private buildUrl(pathOrUrl: string, query?: Record<string, string>) {
    const raw = pathOrUrl.trim();
    if (!raw) {
      throw new BadRequestException('FINA endpoint path/url is not configured');
    }

    const url =
      raw.startsWith('http://') || raw.startsWith('https://')
        ? new URL(raw)
        : new URL(raw.startsWith('/') ? raw : `/${raw}`, this.baseUrl);

    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && String(v).length > 0) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    return url;
  }

  private toSafeUrlString(url: URL): string {
    const safe = new URL(url.toString());
    // Never leak credentials/secrets in errors/logs.
    safe.searchParams.delete('API_User');
    safe.searchParams.delete('Password');
    return safe.toString();
  }

  private buildAuthHeaders(): Record<string, string> {
    if (this.authMode !== 'basic') return {};
    if (!this.apiUser || !this.password) return {};

    const token = Buffer.from(`${this.apiUser}:${this.password}`).toString(
      'base64',
    );
    return { Authorization: `Basic ${token}` };
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAtMs > now) {
      return this.cachedToken.value;
    }

    if (!this.baseUrl) {
      console.log('Missing FINA_BASE_URL');
      throw new BadRequestException('Missing FINA_BASE_URL');
    }

    if (!this.apiUser || !this.password) {
      console.log(
        this.apiUser,
        this.password,
        'Missing FINA_API_USER / FINA_PASSWORD',
      );
      throw new BadRequestException('Missing FINA_API_USER / FINA_PASSWORD');
    }

    // FINA docs: POST api/authentication/authenticate with { login, password }
    const url = this.buildUrl(this.authPath);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login: this.apiUser, password: this.password }),
    });
    console.log(
      this.apiUser,
      this.password,
      'this.apiUser<insert> from getToken',
    );
    console.log(this.password, 'this.password+++ from getToken');
    console.log(response, 'response+++ from getToken');
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new BadRequestException({
        message: 'FINA authenticate request failed',
        statusCode: response.status,
        url: this.toSafeUrlString(url),
        details: text || response.statusText,
      });
    }

    const json = (await response.json()) as { token?: string; ex?: unknown };
    const token = json?.token;
    if (!token) {
      throw new BadRequestException({
        message: 'FINA authenticate did not return token',
        url: this.toSafeUrlString(url),
      });
    }

    // Docs mention ~36h validity; default to 35h to be safe.
    const ttlHours =
      Number(this.configService.get<string>('FINA_TOKEN_TTL_HOURS')) || 35;
    const expiresAtMs = now + ttlHours * 60 * 60 * 1000;
    this.cachedToken = { value: token, expiresAtMs };
    return token;
  }

  private async buildRequestHeaders(): Promise<Record<string, string>> {
    try {
      if (this.authMode === 'none') return {};
      if (this.authMode === 'basic') return this.buildAuthHeaders();
      if (this.authMode === 'query') return {};
      // token
      const token = await this.getToken();
      return { Authorization: `Bearer ${token}` };
    } catch (error) {
      console.log(error, 'error+++ from buildRequestHeaders');
      throw new BadRequestException(error);
    }
  }

  private buildAuthQuery(): Record<string, string> {
    if (this.authMode !== 'query') return {};
    if (!this.apiUser || !this.password) return {};

    // Some FINA deployments use these exact parameter names.
    return { API_User: this.apiUser, Password: this.password };
  }

  private async requestJson<TResponse = unknown>(args: {
    endpoint: string;
    method: 'GET' | 'POST';
    body?: unknown;
  }): Promise<TResponse> {
    try {
      if (!args.endpoint) {
        throw new BadRequestException('FINA endpoint is not configured');
      }

      const url = this.buildUrl(args.endpoint, this.buildAuthQuery());
      console.log(url, 'url+++');
      const doRequest = async () => {
        const authHeaders = await this.buildRequestHeaders();
        console.log(authHeaders, 'authHeaders+++');
        return await fetch(url, {
          method: args.method,
          headers: {
            Accept: 'application/json',
            ...(args.body ? { 'Content-Type': 'application/json' } : {}),
            ...authHeaders,
          },
          body: args.body ? JSON.stringify(args.body) : undefined,
        });
      };

      let response = await doRequest();
      if (response.status === 401 && this.authMode === 'token') {
        this.cachedToken = null;
        response = await doRequest();
      }

      console.log(response, 'response+++ from requestJson');

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new BadRequestException({
          message: 'FINA request failed',
          statusCode: response.status,
          url: this.toSafeUrlString(url),
          details: text || response.statusText,
        });
      }

      return (await response.json()) as TResponse;
    } catch (error) {
      console.log(error, 'error+++ from requestJson');
      throw new BadRequestException(error);
    }
  }

  /**
   * Fetches all products from FINA.
   *
   * Configure via env:
   * - FINA_BASE_URL (required if using a relative path)
   * - FINA_PRODUCTS_ALL_URL (optional absolute override)
   * - FINA_PRODUCTS_ALL_PATH (optional relative path, default: /api/operation/getProducts)
   * - FINA_AUTH_MODE: basic | query | none (default: basic)
   * - FINA_API_USER / FINA_PASSWORD (required for basic/query)
   */
  async getAllProducts(): Promise<unknown> {
    const absoluteOverride =
      this.configService.get<string>('FINA_PRODUCTS_ALL_URL') || '';
    const path =
      this.configService.get<string>('FINA_PRODUCTS_ALL_PATH') ||
      '/api/operation/getProducts';
    const endpoint = absoluteOverride.trim() ? absoluteOverride : path;
    if (!endpoint) {
      throw new BadRequestException(
        'Missing FINA_PRODUCTS_ALL_URL or FINA_PRODUCTS_ALL_PATH',
      );
    }

    if (!absoluteOverride.trim() && !this.baseUrl) {
      throw new BadRequestException(
        'Missing FINA_BASE_URL (required for relative FINA_PRODUCTS_ALL_PATH)',
      );
    }

    if (this.authMode !== 'none' && (!this.apiUser || !this.password)) {
      throw new BadRequestException(
        'Missing FINA_API_USER / FINA_PASSWORD for selected auth mode',
      );
    }

    return await this.requestJson({
      endpoint,
      method: 'GET',
    });
  }

  /**
   * Normalized list for UIs: [{ id, code?, name? }]
   */
  async getAllProductsList(): Promise<FinaProductListItem[]> {
    const raw = (await this.getAllProducts()) as {
      products: Record<string, unknown>[];
    };
    console.log('raw11111', raw);
    if (!Array.isArray(raw?.products)) {
      throw new BadRequestException({
        message: 'Unexpected FINA products response shape (expected array)',
      });
    }

    console.log('raw', raw);

    return raw.products
      .filter((x): x is Record<string, unknown> =>
        Boolean(x && typeof x === 'object'),
      )
      .map((it) => {
        const id = Number(it.id);
        const codeRaw = it.code as string;

        const nameRaw = it.name as string;

        return { id, code: codeRaw, name: nameRaw, ...it };
      })
      .filter((x) => Number.isFinite(x.id));
  }

  /**
   * FINA docs: POST api/operation/getProductsRestArray
   * Body: { prods: [1, 2] }
   */
  async getProductsRestArray(
    prods: number[],
  ): Promise<GetProductsRestResponseDto> {
    try {
      const response = await this.requestJson<GetProductsRestResponseDto>({
        endpoint: '/api/operation/getProductsRestArray',
        method: 'POST',
        body: { prods },
      });
      return response;
    } catch (error) {
      console.log(error, 'error+++');
      throw new BadRequestException(error);
    }
  }

  /**
   * FINA docs: GET api/operation/getProductsRest
   */
  async getProductsRest(): Promise<GetProductsRestResponseDto> {
    return await this.requestJson<GetProductsRestResponseDto>({
      endpoint: '/api/operation/getProductsRest',
      method: 'GET',
    });
  }

  /**
   * FINA docs: GET api/operation/getPriceTypes
   */
  async getPriceTypes(): Promise<unknown> {
    return await this.requestJson({
      endpoint: '/api/operation/getPriceTypes',
      method: 'GET',
    });
  }

  /**
   * FINA docs: GET api/operation/getUsers
   */
  async getUsers(): Promise<unknown> {
    return await this.requestJson({
      endpoint: '/api/operation/getUsers',
      method: 'GET',
    });
  }

  /**
   * FINA docs: GET api/operation/getCustomers
   */
  async getCustomers(): Promise<unknown> {
    return await this.requestJson({
      endpoint: '/api/operation/getCustomers',
      method: 'GET',
    });
  }

  /**
   * FINA docs: POST api/operation/saveDocProductOut
   * Accepts reduced payload and fills missing fields with defaults.
   */
  async saveDocProductOut(
    input: SaveDocProductOutDto,
  ): Promise<FinaSaveDocProductOutResponse> {
    try {
      const toNumber = (value: unknown, fallback: number) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
          const n = Number(value);
          if (Number.isFinite(n)) return n;
        }
        return fallback;
      };

      const toInt = (value: unknown, fallback: number) =>
        Math.trunc(toNumber(value, fallback));

      const body = {
        id: 0,
        date: input.date,
        purpose: input.purpose || 'ონლაინ გაყიდვა',
        amount: input.amount,
        currency: input.currency || 'GEL',
        rate: input.rate || 1,
        store: input.store || 1,
        user: input.user || 3,
        customer: input.customer || 0,
        is_vat: input.is_vat,
        vat: toNumber(input.vat, 1),
        make_entry: input.make_entry,
        pay_type: input.pay_type || 3,
        price_type: toInt(input.price_type, 3),
        w_type: toInt(input.w_type, 3),
        t_type: toInt(input.t_type, 7),
        t_payer: toInt(input.t_payer, 1),
        products: input.products,
      };

      console.log(input, 'body+++');
      const response = await this.requestJson<FinaSaveDocProductOutResponse>({
        endpoint: '/api/operation/saveDocProductOut',
        method: 'POST',
        body,
      });

      console.log(response, 'response+++');
      return response;
    } catch (error) {
      console.log(error, 'error+++');
      throw error;
    }
  }

  /**
   * Basic connectivity check. This endpoint does not require auth on some deployments.
   */
  async getApiInfo(): Promise<unknown> {
    if (!this.baseUrl) {
      throw new BadRequestException('Missing FINA_BASE_URL');
    }

    return await this.requestJson({
      endpoint: '/api/info/GetApiInfo',
      method: 'GET',
    });
  }
}
