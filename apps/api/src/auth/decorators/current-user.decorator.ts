import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthUserProfile } from '../auth.types';

type RequestWithUser = {
  user?: AuthUserProfile;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUserProfile => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return request.user as AuthUserProfile;
  }
);
