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
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { RequireInternalBasePermission } from '../permissions/internal-base-permission-enforcement.decorator';
import {
  InternalFeatureGuard,
  RequireInternalFeature,
} from '../feature-registry/internal-feature.guard';
import { InternalDiscussionService } from './internal-discussion.service';

@Controller(
  '/api/internal/v1/workspaces/:workspaceId/bases/:baseId/models/:modelId/records/:recordId/discussion',
)
@RequireInternalFeature('discussionMode')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
  InternalFeatureGuard,
)
export class InternalDiscussionController {
  constructor(private readonly service: InternalDiscussionService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_READ,
    'base',
    InternalBasePermission.RECORDS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.service.list(workspaceId, baseId, modelId, recordId);
  }

  @Post()
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_UPDATE,
    'base',
    InternalBasePermission.RECORDS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
    @Body()
    body: { body: string; parentId?: string | null; mentions?: string[] },
    @Req() request: NcRequest,
  ) {
    return this.service.create(
      workspaceId,
      baseId,
      modelId,
      recordId,
      body,
      request,
    );
  }

  @Patch('/:commentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_UPDATE,
    'base',
    InternalBasePermission.RECORDS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
    @Param('commentId') commentId: string,
    @Body() body: { body: string },
    @Req() request: NcRequest,
  ) {
    return this.service.update(
      workspaceId,
      baseId,
      modelId,
      recordId,
      commentId,
      body.body,
      request,
    );
  }

  @Patch('/:commentId/resolution')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_UPDATE,
    'base',
    InternalBasePermission.RECORDS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  resolve(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
    @Param('commentId') commentId: string,
    @Body() body: { resolved: boolean },
    @Req() request: NcRequest,
  ) {
    return this.service.resolve(
      workspaceId,
      baseId,
      modelId,
      recordId,
      commentId,
      body.resolved === true,
      request,
    );
  }

  @Delete('/:commentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_UPDATE,
    'base',
    InternalBasePermission.RECORDS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
    @Param('commentId') commentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.delete(
      workspaceId,
      baseId,
      modelId,
      recordId,
      commentId,
      request,
    );
  }
}
