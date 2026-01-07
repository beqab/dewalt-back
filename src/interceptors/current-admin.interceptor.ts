import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { authHeaderName } from '../guards/admin.guard';

interface AuthenticatedRequest extends Request {
  CurrentAdmin?: {
    id: string;
    username?: string;
  };
}

interface JwtPayload {
  adminId: string;
  username?: string;
}

@Injectable()
export class CurrentAdminInterceptor implements NestInterceptor {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = request.headers[authHeaderName];

    if (!authorizationHeader) {
      return next.handle();
    }

    try {
      const secret = this.configService.get<string>('ADMIN_ACCESS_SECRET');
      console.log(secret, 'secret from current-admin.interceptor.ts');
      const payload = this.jwtService.verify<JwtPayload>(authorizationHeader, {
        secret,
      });

      request.CurrentAdmin = {
        id: payload.adminId,
        username: payload.username,
      };
    } catch (error) {
      // Silently fail and continue - let guards handle authentication errors
      return next.handle();
    }
    return next.handle();
  }
}

export type CurrentAdminType = {
  id: string;
  username?: string;
};
