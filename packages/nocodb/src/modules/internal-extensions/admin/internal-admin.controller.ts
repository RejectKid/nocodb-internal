import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalSuperAdminGuard } from '../authorization/internal-super-admin.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from '../api-tokens/internal-token-owner.provider';
import {
  InternalFeatureGuard,
  RequireInternalFeature,
} from '../feature-registry/internal-feature.guard';
import type { InternalFeatureKey } from '../feature-registry/internal-feature.types';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalAdminService } from './internal-admin.service';

@Controller('/api/internal/v1/admin')
@RequireInternalFeature('internalAdmin')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
  InternalSuperAdminGuard,
  InternalFeatureGuard,
)
export class InternalAdminController {
  constructor(
    private readonly service: InternalAdminService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  @Get('/overview')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  overview() {
    return this.service.overview();
  }

  @Get('/users')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  users(
    @Query('query') query?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.listUsers(query, limit, offset);
  }

  @Get('/users/:userId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  user(@Param('userId') userId: string) {
    return this.service.getUser(userId);
  }

  @Patch('/users/:userId/status')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_WRITE,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  setUserStatus(
    @Param('userId') userId: string,
    @Body() body: { enabled: boolean },
    @Req() request: NcRequest,
  ) {
    return this.service.setUserEnabled(
      userId,
      body.enabled === true,
      request.user.id,
      this.auditContext.fromRequest(request),
    );
  }

  @Get('/workspaces')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  workspaces(
    @Query('query') query?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.listWorkspaces(query, limit, offset);
  }

  @Get('/bases')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  bases(
    @Query('query') query?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.listBases(query, limit, offset);
  }

  @Patch('/workspaces/:workspaceId/bases/:baseId/features/:featureKey')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_WRITE,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  setBaseFeature(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('featureKey') featureKey: InternalFeatureKey,
    @Body() body: { enabled: boolean; expectedRevision?: number },
    @Req() request: NcRequest,
  ) {
    return this.service.setBaseFeature(
      workspaceId,
      baseId,
      featureKey,
      body.enabled === true,
      body.expectedRevision,
      request.user.id,
      this.auditContext.fromRequest(request),
    );
  }
}
