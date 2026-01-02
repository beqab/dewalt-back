import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  CurrentUser?: {
    id: string;
    email?: string;
  };
}

interface JwtPayload {
  userId: string;
  email?: string;
}

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers['authorization'];

    if (token) {
      try {
        const secret = this.configService.get<string>('USER_ACCESS_SECRET');
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret,
        });

        request.CurrentUser = {
          id: payload.userId,
          email: payload.email,
        };
      } catch (error) {
        // Token invalid or expired, continue without user
      }
    }

    return next.handle();
  }
}
