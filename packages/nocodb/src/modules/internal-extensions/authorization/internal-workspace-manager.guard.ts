import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { extractRolesObj, OrgUserRoles, WorkspaceUserRoles } from 'nocodb-sdk';
import { MetaService } from '~/meta/meta.service';
import User from '~/models/User';
import Workspace from '~/models/Workspace';
import WorkspaceUser from '~/models/WorkspaceUser';

@Injectable()
export class InternalWorkspaceManagerGuard implements CanActivate {
  constructor(private readonly metaService: MetaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const workspaceId =
      request.params?.workspaceId ??
      request.ncWorkspaceId ??
      request.context?.workspace_id;
    if (
      !workspaceId ||
      !(await Workspace.get(workspaceId, false, this.metaService))
    ) {
      throw new NotFoundException('Workspace not found');
    }
    const user = await User.get(request.user?.id, this.metaService);
    if (user && extractRolesObj(user.roles)?.[OrgUserRoles.SUPER_ADMIN]) {
      return true;
    }
    const membership = await WorkspaceUser.get(
      workspaceId,
      request.user?.id,
      {},
      this.metaService,
    );
    if (
      !membership ||
      ![WorkspaceUserRoles.OWNER, WorkspaceUserRoles.CREATOR].includes(
        membership.roles as WorkspaceUserRoles,
      )
    ) {
      throw new ForbiddenException('Workspace manager permission required');
    }
    return true;
  }
}
