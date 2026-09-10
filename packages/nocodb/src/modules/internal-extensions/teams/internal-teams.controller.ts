import {
  Body,
  Controller,
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
import { InternalWorkspaceManagerGuard } from '../authorization/internal-workspace-manager.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from '../api-tokens/internal-token-owner.provider';
import {
  InternalFeatureGuard,
  RequireInternalFeature,
} from '../feature-registry/internal-feature.guard';
import { InternalTeamService } from './internal-team.service';

@Controller('/api/internal/v1/workspaces/:workspaceId/teams')
@RequireInternalFeature('teams')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
  InternalFeatureGuard,
)
export class InternalTeamsController {
  constructor(private readonly service: InternalTeamService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_READ,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  list(@Param('workspaceId') workspaceId: string, @Req() request: NcRequest) {
    return this.service.list(workspaceId, request);
  }

  @Post()
  @UseGuards(InternalWorkspaceManagerGuard)
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string },
    @Req() request: NcRequest,
  ) {
    return this.service.create(workspaceId, body, request);
  }

  @Patch('/:teamId')
  @UseGuards(InternalWorkspaceManagerGuard)
  @RequireInternalTokenScope(
    InternalApiTokenScope.MEMBERS_WRITE,
    'workspace',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('teamId') teamId: string,
    @Body()
    body: {
      name?: string;
      memberIds?: string[];
      archived?: boolean;
      expectedRevision: number;
    },
    @Req() request: NcRequest,
  ) {
    return this.service.update(workspaceId, teamId, body, request);
  }
}
