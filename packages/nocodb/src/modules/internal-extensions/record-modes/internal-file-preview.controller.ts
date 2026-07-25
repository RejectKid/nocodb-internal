import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AttachmentsService } from '~/services/attachments.service';
import type { NcContext } from '~/interface/config';
import { TenantContext } from '~/decorators/tenant-context.decorator';
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

@Controller(
  '/api/internal/v1/workspaces/:workspaceId/bases/:baseId/models/:modelId/records/:recordId/file-preview',
)
@RequireInternalFeature('filePreviewMode')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
  InternalFeatureGuard,
)
export class InternalFilePreviewController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post('/authorize')
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_READ,
    'base',
    InternalBasePermission.RECORDS_READ,
  )
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  authorize(
    @TenantContext() context: NcContext,
    @Param('modelId') modelId: string,
    @Param('recordId') recordId: string,
    @Body() body: { columnId: string; urlOrPath: string },
  ) {
    return this.attachments.downloadAttachment(context, {
      modelId,
      columnId: body.columnId,
      rowId: recordId,
      urlOrPath: body.urlOrPath,
    });
  }
}
