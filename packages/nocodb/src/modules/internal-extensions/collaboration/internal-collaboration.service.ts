import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceUserRoles } from 'nocodb-sdk';
import type { NcRequest } from '~/interface/config';
import { BaseUsersService } from '~/services/base-users/base-users.service';
import { WorkspaceUsersService } from '~/services/workspace-users.service';
import WorkspaceUser from '~/models/WorkspaceUser';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalAuditService } from '../audit/internal-audit.service';
import { InternalBasePermissionIdentityProvider } from '../permissions/internal-base-permission-identity.provider';
import { InternalBasePermissionService } from '../permissions/internal-base-permission.service';

@Injectable()
export class InternalCollaborationService {
  constructor(
    private readonly workspaceUsers: WorkspaceUsersService,
    private readonly baseUsers: BaseUsersService,
    private readonly identityProvider: InternalBasePermissionIdentityProvider,
    private readonly permissionService: InternalBasePermissionService,
    private readonly audit: InternalAuditService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  workspaceList(workspaceId: string) {
    return this.workspaceUsers.list({ workspaceId });
  }

  async workspaceInvite(
    workspaceId: string,
    body: { email: string; roles: WorkspaceUserRoles },
    request: NcRequest,
  ) {
    const result = await this.workspaceUsers.invite({
      workspaceId,
      body,
      invitedBy: request.user,
      siteUrl: request.ncSiteUrl,
      req: request,
    });
    await this.recordMembership(
      InternalAuditAction.MEMBERSHIP_INVITED,
      workspaceId,
      null,
      body.email,
      request,
      { roles: body.roles },
    );
    return result;
  }

  async workspaceUpdate(
    workspaceId: string,
    userId: string,
    roles: WorkspaceUserRoles,
    request: NcRequest,
  ) {
    const result = await this.workspaceUsers.update({
      workspaceId,
      userId,
      roles,
      siteUrl: request.ncSiteUrl,
      req: request,
    });
    await this.recordMembership(
      InternalAuditAction.MEMBERSHIP_CHANGED,
      workspaceId,
      null,
      userId,
      request,
      { roles },
    );
    return result;
  }

  async workspaceRemove(
    workspaceId: string,
    userId: string,
    request: NcRequest,
  ) {
    const membership = await WorkspaceUser.get(workspaceId, userId);
    if (!membership) throw new NotFoundException('Workspace member not found');
    if (membership.roles === WorkspaceUserRoles.OWNER) {
      const users = await this.workspaceUsers.list({ workspaceId });
      const list = Array.isArray((users as any).list)
        ? (users as any).list
        : Array.isArray(users)
        ? users
        : [];
      if (
        list.filter((user: any) => user.roles === WorkspaceUserRoles.OWNER)
          .length <= 1
      ) {
        throw new BadRequestException(
          'At least one workspace owner is required',
        );
      }
    }
    await WorkspaceUser.softDelete(workspaceId, userId);
    await this.recordMembership(
      InternalAuditAction.MEMBERSHIP_REMOVED,
      workspaceId,
      null,
      userId,
      request,
      { previousRoles: membership.roles },
    );
    return { userId, removed: true };
  }

  baseList(context: NcRequest['context'], baseId: string) {
    return this.baseUsers.userList(context, { baseId, mode: 'full' });
  }

  async baseInvite(baseId: string, body: any, request: NcRequest) {
    const result = await this.baseUsers.userInvite(request.context, {
      baseId,
      baseUser: body,
      req: request,
    });
    await this.recordMembership(
      InternalAuditAction.MEMBERSHIP_INVITED,
      request.context.workspace_id,
      baseId,
      body.email,
      request,
      { roles: body.roles },
    );
    return result;
  }

  async baseUpdate(
    baseId: string,
    userId: string,
    body: any,
    request: NcRequest,
  ) {
    await this.baseUsers.baseUserUpdate(request.context, {
      baseId,
      userId,
      baseUser: body,
      req: request,
    });
    await this.recordMembership(
      InternalAuditAction.MEMBERSHIP_CHANGED,
      request.context.workspace_id,
      baseId,
      userId,
      request,
      { roles: body.roles },
    );
    return { userId, updated: true };
  }

  async baseRemove(baseId: string, userId: string, request: NcRequest) {
    await this.baseUsers.baseUserDelete(request.context, {
      baseId,
      userId,
      req: request,
    });
    await this.recordMembership(
      InternalAuditAction.MEMBERSHIP_REMOVED,
      request.context.workspace_id,
      baseId,
      userId,
      request,
      null,
    );
    return { userId, removed: true };
  }

  async effectivePermissions(
    workspaceId: string,
    baseId: string,
    userId: string,
    request: NcRequest,
  ) {
    const identity = await this.identityProvider.resolve(
      request.context,
      workspaceId,
      baseId,
      userId,
    );
    if (!identity) throw new NotFoundException('Base member not found');
    return {
      userId,
      workspaceId,
      baseId,
      permissions: await this.permissionService.resolveAll({
        workspaceId,
        baseId,
        actor: identity,
        communityAllowed: () => true,
      }),
    };
  }

  private async recordMembership(
    action: InternalAuditAction,
    workspaceId: string,
    baseId: string | null,
    resourceId: string,
    request: NcRequest,
    after: Record<string, unknown> | null,
  ) {
    await this.audit.record({
      action,
      resourceType: InternalAuditResourceType.MEMBERSHIP,
      resourceId: String(resourceId).slice(0, 255),
      context: {
        ...this.auditContext.fromRequest(request),
        workspaceId,
        baseId,
      },
      after,
    });
  }
}
