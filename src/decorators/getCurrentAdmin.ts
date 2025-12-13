import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  CurrentAdmin?: {
    id: string;
    username?: string;
  };
}

export const CurrentAdmin = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    console.log(request.CurrentAdmin, 'request.CurrentAdmin CurrentAdmin');
    if (!request.CurrentAdmin) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    console.log(request.CurrentAdmin, 'request.CurrentAdmin CurrentAdmin');
    return request.CurrentAdmin;
  },
);

export type CurrentAdminType = {
  id: string;
  username?: string;
};
