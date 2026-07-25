import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import type {
  ReplaceInternalBasePermissionGrantsRequest,
  UpdateInternalBasePermissionConfigurationRequest,
} from './internal-base-permission-admin.types';
import { InternalBasePermissionAdminService } from './internal-base-permission-admin.service';
import { InternalBasePermission } from './internal-base-permission';
import { InternalPermissionSubjectType } from './internal-base-permission.model';

@Controller(
  '/api/internal/v1/workspaces/:workspaceId/bases/:baseId/permissions',
)
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
export class InternalBasePermissionsController {
  constructor(
    private readonly adminService: InternalBasePermissionAdminService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  getState(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Req() request: NcRequest,
  ) {
    return this.adminService.getState(
      request.context,
      workspaceId,
      baseId,
      this.actor(request, workspaceId, baseId),
    );
  }

  @Patch('/configuration')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  setConfiguration(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Body() body: UpdateInternalBasePermissionConfigurationRequest,
    @Req() request: NcRequest,
  ) {
    return this.adminService.setEnabled(
      request.context,
      workspaceId,
      baseId,
      body,
      this.actor(request, workspaceId, baseId),
    );
  }

  @Put('/subjects/:subjectType/:subjectId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_MEMBERS,
  )
  replaceSubjectGrants(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('subjectType') subjectType: InternalPermissionSubjectType,
    @Param('subjectId') subjectId: string,
    @Body()
    body: Pick<
      ReplaceInternalBasePermissionGrantsRequest,
      'assignments' | 'expectedRevision'
    >,
    @Req() request: NcRequest,
  ) {
    return this.adminService.replaceSubjectGrants(
      request.context,
      workspaceId,
      baseId,
      {
        subjectType,
        subjectId,
        assignments: body.assignments,
        expectedRevision: body.expectedRevision,
      },
      this.actor(request, workspaceId, baseId),
    );
  }

  private actor(request: NcRequest, workspaceId: string, baseId: string) {
    return {
      userId: request.user.id,
      audit: {
        ...this.auditContext.fromRequest(request),
        workspaceId,
        baseId,
      },
    };
  }
}
