import {
  Body,
  Controller,
  Get,
  Param,
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
  InternalFeatureGuard,
  RequireInternalFeature,
} from '../feature-registry/internal-feature.guard';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import type { InternalValidationRule } from './internal-validation.types';
import { InternalValidationService } from './internal-validation.service';

@Controller(
  '/api/internal/v1/workspaces/:workspaceId/bases/:baseId/models/:modelId/validation-rules',
)
@RequireInternalFeature('inputValidation')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
  InternalFeatureGuard,
)
export class InternalValidationController {
  constructor(
    private readonly service: InternalValidationService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.SCHEMA_READ,
    'base',
    InternalBasePermission.BASE_MANAGE_SCHEMA,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_SCHEMA)
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
  ) {
    return this.service.list(workspaceId, baseId, modelId);
  }

  @Put()
  @RequireInternalTokenScope(
    InternalApiTokenScope.SCHEMA_UPDATE,
    'base',
    InternalBasePermission.BASE_MANAGE_SCHEMA,
  )
  @RequireInternalBasePermission(InternalBasePermission.BASE_MANAGE_SCHEMA)
  replace(
    @Param('workspaceId') workspaceId: string,
    @Param('baseId') baseId: string,
    @Param('modelId') modelId: string,
    @Body()
    body: {
      fieldKey: string;
      rules: InternalValidationRule[];
      expectedRevision?: number;
    },
    @Req() request: NcRequest,
  ) {
    return this.service.replace(
      {
        workspaceId,
        baseId,
        modelId,
        fieldKey: body.fieldKey,
        rules: body.rules,
        expectedRevision: body.expectedRevision,
        actorId: request.user.id,
      },
      this.auditContext.fromRequest(request),
    );
  }
}
