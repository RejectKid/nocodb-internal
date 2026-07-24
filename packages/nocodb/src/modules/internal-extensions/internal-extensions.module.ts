/**
 * Independently implemented internal extensions for organizational use.
 * This module does not consume or modify commercial entitlement state.
 */
import { Module } from '@nestjs/common';
import { NocoModule } from '~/modules/noco.module';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { MetaService } from '~/meta/meta.service';
import { InternalCapabilitiesController } from './feature-registry/internal-capabilities.controller';
import { InternalAuthenticatedGuard } from './authorization/internal-authenticated.guard';
import { InternalFeatureRegistryService } from './feature-registry/internal-feature-registry.service';
import { InternalExtensionsMigrationService } from './migrations/internal-extensions-migration.service';
import { InternalTokenHashingService } from './api-tokens/internal-token-hashing.service';
import { ScryptInternalTokenHashingService } from './api-tokens/scrypt-internal-token-hashing.service';
import { InternalApiTokenRepository } from './api-tokens/internal-api-token.repository';
import { KnexInternalApiTokenRepository } from './api-tokens/knex-internal-api-token.repository';
import { InternalApiTokenIssuanceService } from './api-tokens/internal-api-token-issuance.service';
import { InternalTokenAuthorizationPolicy } from './api-tokens/internal-token-authorization.policy';
import { DefaultInternalTokenAuthorizationPolicy } from './api-tokens/default-internal-token-authorization.policy';

@Module({
  imports: [NocoModule],
  controllers: [InternalCapabilitiesController],
  providers: [
    GlobalGuard,
    MetaApiLimiterGuard,
    InternalAuthenticatedGuard,
    InternalFeatureRegistryService,
    InternalExtensionsMigrationService,
    {
      provide: InternalTokenHashingService,
      useClass: ScryptInternalTokenHashingService,
    },
    {
      provide: InternalApiTokenRepository,
      inject: [MetaService],
      useFactory: (metaService: MetaService) =>
        new KnexInternalApiTokenRepository(metaService),
    },
    InternalApiTokenIssuanceService,
    {
      provide: InternalTokenAuthorizationPolicy,
      useClass: DefaultInternalTokenAuthorizationPolicy,
    },
  ],
  exports: [
    InternalFeatureRegistryService,
    InternalTokenHashingService,
    InternalApiTokenRepository,
    InternalApiTokenIssuanceService,
    InternalTokenAuthorizationPolicy,
  ],
})
export class InternalExtensionsModule {}
