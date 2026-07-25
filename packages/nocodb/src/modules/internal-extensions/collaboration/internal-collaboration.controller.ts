import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceUserRoles } from 'nocodb-sdk';
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalWorkspaceManagerGuard } from '../authorization/internal-workspace-manager.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from '../api-tokens/internal-token-owner.provider';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { RequireInternalBasePermission } from '../permissions/internal-base-permission-enforcement.decorator';
import { InternalCollaborationService } from './internal-collaboration.service';

const commonGuards = [
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
];

@Controller('/api/internal/v1/workspaces/:workspaceId/members')
@UseGuards(...commonGuards, InternalWorkspaceManagerGuard)
export class InternalWorkspaceCollaborationController {
  constructor(private readonly service: InternalCollaborationService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_READ,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  list(@Param('workspaceId') workspaceId: string) {
    return this.service.workspaceList(workspaceId);
  }

  @Post()
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  invite(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { email: string; roles: WorkspaceUserRoles },
    @Req() request: NcRequest,
  ) {
    return this.service.workspaceInvite(workspaceId, body, request);
  }

  @Patch('/:userId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() body: { roles: WorkspaceUserRoles },
    @Req() request: NcRequest,
  ) {
    return this.service.workspaceUpdate(
      workspaceId,
      userId,
      body.roles,
      request,
    );
  }

  @Delete('/:userId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.workspaceRemove(workspaceId, userId, request);
  }
}

@Controller('/api/internal/v1/workspaces/:workspaceId/bases/:baseId/members')
@UseGuards(...commonGuards)
export class InternalBaseCollaborationController {
  constructor(private readonly service: InternalCollaborationService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_READ,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_MEMBERS)
  list(@Param('baseId') baseId: string, @Req() request: NcRequest) {
    return this.service.baseList(request.context, baseId);
  }

  @Post()
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_MEMBERS)
  invite(
    @Param('baseId') baseId: string,
    @Body() body: any,
    @Req() request: NcRequest,
  ) {
    return this.service.baseInvite(baseId, body, request);
  }

  @Patch('/:userId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_MEMBERS)
  update(
    @Param('baseId') baseId: string,
    @Param('userId') userId: string,
    @Body() body: any,
    @Req() request: NcRequest,
  ) {
    return this.service.baseUpdate(baseId, userId, body, request);
  }

  @Delete('/:userId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_MEMBERS)
  remove(
    @Param('baseId') baseId: string,
    @Param('userId') userId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.baseRemove(baseId, userId, request);
  }

  @Get('/:userId/effective-permissions')
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_READ,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_MEMBERS)
  effectivePermissions(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('userId') userId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.effectivePermissions(
      workspaceId,
      baseId,
      userId,
      request,
    );
  }
}
