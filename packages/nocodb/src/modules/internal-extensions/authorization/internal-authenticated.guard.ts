import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class InternalAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user?.isAuthorized || !user?.id || user?.blocked || user?.is_deleted) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}
