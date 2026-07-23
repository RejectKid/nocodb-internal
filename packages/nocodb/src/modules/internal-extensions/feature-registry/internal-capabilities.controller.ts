import { Controller, Get, UseGuards } from '@nestjs/common';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalFeatureRegistryService } from './internal-feature-registry.service';
import type { InternalCapabilitiesResponse } from './internal-feature.types';

@Controller('/api/internal/v1')
@UseGuards(MetaApiLimiterGuard, GlobalGuard, InternalAuthenticatedGuard)
export class InternalCapabilitiesController {
  constructor(
    private readonly featureRegistry: InternalFeatureRegistryService,
  ) {}

  @Get('/capabilities')
  getCapabilities(): InternalCapabilitiesResponse {
    return this.featureRegistry.getCapabilities();
  }
}
