import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import type { InternalDocumentGrantInput } from './internal-document.types';
import { InternalDocumentService } from './internal-document.service';

@Controller('/api/internal/v1/workspaces/:workspaceId/bases/:baseId/documents')
@RequireInternalFeature('documentPermissions')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
  InternalFeatureGuard,
)
export class InternalDocumentsController {
  constructor(private readonly service: InternalDocumentService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_READ,
    'base',
    InternalBasePermission.DOCUMENTS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_READ)
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Req() request: NcRequest,
    @Query('query') query?: string,
  ) {
    return this.service.list(workspaceId, baseId, request, query);
  }

  @Post()
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_CREATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_CREATE)
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Body()
    body: {
      title: string;
      content?: Record<string, unknown>;
      metadata?: Record<string, unknown> | null;
      parentId?: string | null;
      order?: number;
    },
    @Req() request: NcRequest,
  ) {
    return this.service.create(workspaceId, baseId, body, request);
  }

  @Get('/:documentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_READ,
    'base',
    InternalBasePermission.DOCUMENTS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_READ)
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.get(workspaceId, baseId, documentId, request);
  }

  @Patch('/:documentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Body()
    body: {
      title?: string;
      content?: Record<string, unknown>;
      metadata?: Record<string, unknown> | null;
      parentId?: string | null;
      order?: number;
      expectedVersion?: number;
      summary?: string;
    },
    @Req() request: NcRequest,
  ) {
    return this.service.update(workspaceId, baseId, documentId, body, request);
  }

  @Delete('/:documentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_DELETE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_DELETE)
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.delete(workspaceId, baseId, documentId, request);
  }

  @Get('/:documentId/permissions')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_READ,
    'base',
    InternalBasePermission.DOCUMENTS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_READ)
  grants(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.grants(workspaceId, baseId, documentId, request);
  }

  @Put('/:documentId/permissions')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  replaceGrants(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Body() body: { grants: InternalDocumentGrantInput[] },
    @Req() request: NcRequest,
  ) {
    return this.service.replaceGrants(
      workspaceId,
      baseId,
      documentId,
      body.grants,
      request,
    );
  }

  @Get('/:documentId/revisions')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_READ,
    'base',
    InternalBasePermission.DOCUMENTS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_READ)
  revisions(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.revisions(workspaceId, baseId, documentId, request);
  }

  @Post('/:documentId/revisions/:revisionId/restore')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  restore(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Param('revisionId') revisionId: string,
    @Body() body: { expectedVersion?: number },
    @Req() request: NcRequest,
  ) {
    return this.service.restore(
      workspaceId,
      baseId,
      documentId,
      revisionId,
      body.expectedVersion,
      request,
    );
  }

  @Get('/:documentId/comments')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_READ,
    'base',
    InternalBasePermission.DOCUMENTS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_READ)
  comments(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.listComments(workspaceId, baseId, documentId, request);
  }

  @Post('/:documentId/comments')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  createComment(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Body()
    body: {
      body: string;
      parentId?: string | null;
      anchor?: Record<string, unknown> | null;
      mentions?: string[];
    },
    @Req() request: NcRequest,
  ) {
    return this.service.createComment(
      workspaceId,
      baseId,
      documentId,
      body,
      request,
    );
  }

  @Patch('/:documentId/comments/:commentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  updateComment(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Body() body: { body: string },
    @Req() request: NcRequest,
  ) {
    return this.service.updateComment(
      workspaceId,
      baseId,
      documentId,
      commentId,
      body.body,
      request,
    );
  }

  @Patch('/:documentId/comments/:commentId/resolution')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  resolveComment(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Body() body: { resolved: boolean },
    @Req() request: NcRequest,
  ) {
    return this.service.resolveComment(
      workspaceId,
      baseId,
      documentId,
      commentId,
      body.resolved === true,
      request,
    );
  }

  @Delete('/:documentId/comments/:commentId')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_WRITE,
    'base',
    InternalBasePermission.DOCUMENTS_UPDATE,
  )
  @RequireInternalBasePermission(InternalBasePermission.DOCUMENTS_UPDATE)
  deleteComment(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Param('commentId') commentId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.deleteComment(
      workspaceId,
      baseId,
      documentId,
      commentId,
      request,
    );
  }

  @Get('/:documentId/export.pdf')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DOCUMENTS_READ,
    'base',
    InternalBasePermission.BASE_EXPORT,
  )
  @RequireInternalBasePermission(
    InternalBasePermission.BASE_EXPORT,
    InternalBasePermission.DOCUMENTS_READ,
  )
  async exportPdf(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('documentId') documentId: string,
    @Req() request: NcRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const exported = await this.service.exportPdf(
      workspaceId,
      baseId,
      documentId,
      request,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(exported.buffer);
  }
}
