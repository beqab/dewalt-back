import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  CurrentUser?: {
    id: string;
    email?: string;
  };
}

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.CurrentUser) {
      throw new UnauthorizedException('User not authenticated');
    }

    return request.CurrentUser;
  },
);

export type CurrentUserType = {
  id: string;
  email?: string;
};
