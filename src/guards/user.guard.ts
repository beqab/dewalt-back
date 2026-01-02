import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  CanActivate,
} from '@nestjs/common';
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

export const authHeaderName = 'authorization';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers[authHeaderName];

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      const secret = this.configService.get<string>('USER_ACCESS_SECRET');
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret,
      });

      // Add decoded user to request object
      request.CurrentUser = {
        id: payload.userId,
        email: payload.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired user token');
    }
  }
}
