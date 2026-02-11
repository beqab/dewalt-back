import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FrontRevalidateService {
  constructor(private readonly configService: ConfigService) {}

  async revalidateTags(tags: string[]): Promise<void> {
    const frontUrl = this.configService.get<string>('FRONT_URL') || '';
    const secret = this.configService.get<string>('FRONT_REVALIDATE_SECRET');

    console.log('frontUrl', frontUrl, secret);
    if (!frontUrl || !secret) return;

    try {
      console.log('revalidating tags', tags);
      const response = await fetch(`${frontUrl}api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, tags }),
      });

      const data = (await response.json()) as {
        revalidated: boolean;
        message?: string;
        at: number;
      };
      console.log('revalidated tags', data);
    } catch (e) {
      // Never fail business logic just because revalidation failed.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Front revalidation failed', e);
      }
    }
  }
}
