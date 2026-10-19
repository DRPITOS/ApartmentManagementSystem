import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentOwnerPayload {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
}

export const CurrentOwner = createParamDecorator(
  (data: keyof CurrentOwnerPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentOwnerPayload;
    return data ? user?.[data] : user;
  },
);
