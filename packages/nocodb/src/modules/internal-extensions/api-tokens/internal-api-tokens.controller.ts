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
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import type {
  CreateInternalApiTokenAdminRequest,
  UpdateInternalApiTokenAdminRequest,
} from './internal-api-token-admin.types';
import { InternalApiTokenAdminService } from './internal-api-token-admin.service';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { InternalTokenAuthenticationGuard } from './internal-token-authentication.guard';
import { RequireInternalTokenScope } from './internal-token-scope.decorator';
import { InternalTokenScopeGuard } from './internal-token-scope.guard';

@Controller('/api/internal/v1/workspaces/:workspaceId/bases/:baseId/tokens')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
export class InternalApiTokensController {
  constructor(
    private readonly adminService: InternalApiTokenAdminService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.TOKENS_READ,
    'base',
    InternalBasePermission.BASE_MANAGE_TOKENS,
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

  @Post()
  @RequireInternalTokenScope(
    InternalApiTokenScope.TOKENS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_TOKENS,
  )
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Body() body: CreateInternalApiTokenAdminRequest,
    @Req() request: NcRequest,
  ) {
    return this.adminService.create(
      request.context,
      workspaceId,
      baseId,
      body,
      this.actor(request, workspaceId, baseId),
    );
  }

  @Patch('/:tokenId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.TOKENS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_TOKENS,
  )
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('tokenId') tokenId: string,
    @Body() body: UpdateInternalApiTokenAdminRequest,
    @Req() request: NcRequest,
  ) {
    return this.adminService.update(
      request.context,
      workspaceId,
      baseId,
      tokenId,
      body,
      this.actor(request, workspaceId, baseId),
    );
  }

  @Patch('/:tokenId/status')
  @RequireInternalTokenScope(
    InternalApiTokenScope.TOKENS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_TOKENS,
  )
  setEnabled(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('tokenId') tokenId: string,
    @Body() body: { enabled: boolean },
    @Req() request: NcRequest,
  ) {
    return this.adminService.setEnabled(
      request.context,
      workspaceId,
      baseId,
      tokenId,
      body.enabled === true,
      this.actor(request, workspaceId, baseId),
    );
  }

  @Delete('/:tokenId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.TOKENS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_TOKENS,
  )
  revoke(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('tokenId') tokenId: string,
    @Req() request: NcRequest,
  ) {
    return this.adminService.revoke(
      request.context,
      workspaceId,
      baseId,
      tokenId,
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
