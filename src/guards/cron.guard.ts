import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

export const cronSecretHeaderName = 'x-cron-secret';

@Injectable()
export class CronAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[cronSecretHeaderName];
    const expected = this.configService.get<string>('CRON_SECRET');

    if (!expected) {
      throw new UnauthorizedException('Cron auth is not configured');
    }

    const providedValue = Array.isArray(provided) ? provided[0] : provided;

    if (typeof providedValue !== 'string' || providedValue.length === 0) {
      throw new UnauthorizedException('Cron secret header is missing');
    }

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const providedBuffer = Buffer.from(providedValue, 'utf8');

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    return true;
  }
}
