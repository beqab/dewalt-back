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
  CurrentAdmin?: {
    id: string;
    username?: string;
  };
}

interface JwtPayload {
  adminId: string;
  username?: string;
}

export const authHeaderName = 'authorization';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers[authHeaderName];

    console.log(token, 'token AdminAuthGuard');
    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret,
      });

      // Add decoded admin to request object
      request.CurrentAdmin = {
        id: payload.adminId,
        username: payload.username,
      };
      console.log(request.CurrentAdmin, 'request.CurrentAdmin AdminAuthGuard');
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
