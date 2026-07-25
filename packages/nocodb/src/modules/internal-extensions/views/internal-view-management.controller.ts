import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { RequireInternalBasePermission } from '../permissions/internal-base-permission-enforcement.decorator';
import {
  InternalViewManagementService,
  type InternalSupportedViewType,
} from './internal-view-management.service';

@Controller(
  '/api/internal/v1/workspaces/:workspaceId/bases/:baseId/models/:modelId/views',
)
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
export class InternalViewManagementController {
  constructor(private readonly service: InternalViewManagementService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.VIEWS_READ,
    'base',
    InternalBasePermission.BASE_VIEW,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_VIEW)
  list(@Param('modelId') modelId: string, @Req() request: NcRequest) {
    return this.service.list(modelId, request);
  }

  @Get('/:viewId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.VIEWS_READ,
    'base',
    InternalBasePermission.BASE_VIEW,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_VIEW)
  get(@Param('viewId') viewId: string, @Req() request: NcRequest) {
    return this.service.get(viewId, request);
  }

  @Post('/:type')
  @RequireInternalTokenScope(
    InternalApiTokenScope.VIEWS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_VIEWS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_VIEWS)
  create(
    @Param('modelId') modelId: string,
    @Param('type') type: InternalSupportedViewType,
    @Body() body: any,
    @Req() request: NcRequest,
  ) {
    return this.service.create(modelId, type, body, request);
  }

  @Patch('/:viewId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.VIEWS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_VIEWS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_VIEWS)
  update(
    @Param('viewId') viewId: string,
    @Body() body: any,
    @Req() request: NcRequest,
  ) {
    return this.service.update(viewId, body, request);
  }

  @Delete('/:viewId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.VIEWS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_VIEWS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_VIEWS)
  delete(@Param('viewId') viewId: string, @Req() request: NcRequest) {
    return this.service.delete(viewId, request);
  }

  @Put('/order')
  @RequireInternalTokenScope(
    InternalApiTokenScope.VIEWS_WRITE,
    'base',
    InternalBasePermission.BASE_MANAGE_VIEWS,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_VIEWS)
  reorder(
    @Param('modelId') modelId: string,
    @Body() body: { viewIds: string[] },
    @Req() request: NcRequest,
  ) {
    return this.service.reorder(modelId, body.viewIds, request);
  }
}
