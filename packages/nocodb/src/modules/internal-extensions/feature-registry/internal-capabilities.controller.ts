import { Controller, Get, UseGuards } from '@nestjs/common';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from '../api-tokens/internal-token-owner.provider';
import { InternalFeatureRegistryService } from './internal-feature-registry.service';
import type { InternalCapabilitiesResponse } from './internal-feature.types';

@Controller('/api/internal/v1')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
export class InternalCapabilitiesController {
  constructor(
    private readonly featureRegistry: InternalFeatureRegistryService,
  ) {}

  @Get('/capabilities')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  getCapabilities(): InternalCapabilitiesResponse {
    return this.featureRegistry.getCapabilities();
  }
}
