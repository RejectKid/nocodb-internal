import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import type { CreateInternalApiTokenAdminRequest } from './internal-api-token-admin.types';
import { InternalApiTokenAdminService } from './internal-api-token-admin.service';

@Controller('/api/internal/v1/workspaces/:workspaceId/bases/:baseId/tokens')
@UseGuards(MetaApiLimiterGuard, GlobalGuard, InternalAuthenticatedGuard)
export class InternalApiTokensController {
  constructor(
    private readonly adminService: InternalApiTokenAdminService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  @Get()
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

  @Delete('/:tokenId')
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
