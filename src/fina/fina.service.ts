import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type FinaAuthMode = 'basic' | 'query' | 'token' | 'none';

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
      throw new BadRequestException('Missing FINA_BASE_URL');
    }

    if (!this.apiUser || !this.password) {
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
    if (this.authMode === 'none') return {};
    if (this.authMode === 'basic') return this.buildAuthHeaders();
    if (this.authMode === 'query') return {};
    // token
    const token = await this.getToken();
    return { Authorization: `Bearer ${token}` };
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
    if (!args.endpoint) {
      throw new BadRequestException('FINA endpoint is not configured');
    }

    const url = this.buildUrl(args.endpoint, this.buildAuthQuery());

    const doRequest = async () => {
      const authHeaders = await this.buildRequestHeaders();
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
   * FINA docs: POST api/operation/getProductsRestArray
   * Body: { prods: [1, 2] }
   */
  async getProductsRestArray(prods: number[]): Promise<unknown> {
    return await this.requestJson({
      endpoint: '/api/operation/getProductsRestArray',
      method: 'POST',
      body: { prods },
    });
  }

  /**
   * FINA docs: GET api/operation/getProductsRest
   */
  async getProductsRest(): Promise<unknown> {
    return await this.requestJson({
      endpoint: '/api/operation/getProductsRest',
      method: 'GET',
    });
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
