import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { extractRolesObj, OrgUserRoles } from 'nocodb-sdk';
import { MetaService } from '~/meta/meta.service';
import User from '~/models/User';

@Injectable()
export class InternalSuperAdminGuard implements CanActivate {
  constructor(private readonly metaService: MetaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request?.user?.id || !request.user.isAuthorized) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = await User.get(request.user.id, this.metaService);
    if (
      !user ||
      user.blocked ||
      user.is_deleted ||
      !extractRolesObj(user.roles)?.[OrgUserRoles.SUPER_ADMIN]
    ) {
      throw new ForbiddenException('Internal super administrator required');
    }
    return true;
  }
}
