import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FrontRevalidateService {
  constructor(private readonly configService: ConfigService) {}

  async revalidateTags(tags: string[]): Promise<void> {
    const frontUrl = this.configService.get<string>('FRONT_URL') || '';
    const secret = this.configService.get<string>('FRONT_REVALIDATE_SECRET');
    if (!frontUrl || !secret) return;

    const normalizedFrontUrl = frontUrl.endsWith('/')
      ? frontUrl
      : `${frontUrl}/`;

    try {
      await fetch(`${normalizedFrontUrl}api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, tags }),
      });
    } catch (e) {
      // Never fail business logic just because revalidation failed.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Front revalidation failed', e);
      }
    }
  }
}
