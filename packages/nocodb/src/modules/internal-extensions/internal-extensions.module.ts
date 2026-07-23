/**
 * Independently implemented internal extensions for organizational use.
 * This module does not consume or modify commercial entitlement state.
 */
import { Module } from '@nestjs/common';
import { NocoModule } from '~/modules/noco.module';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalCapabilitiesController } from './feature-registry/internal-capabilities.controller';
import { InternalAuthenticatedGuard } from './authorization/internal-authenticated.guard';
import { InternalFeatureRegistryService } from './feature-registry/internal-feature-registry.service';

@Module({
  imports: [NocoModule],
  controllers: [InternalCapabilitiesController],
  providers: [
    GlobalGuard,
    MetaApiLimiterGuard,
    InternalAuthenticatedGuard,
    InternalFeatureRegistryService,
  ],
  exports: [InternalFeatureRegistryService],
})
export class InternalExtensionsModule {}
