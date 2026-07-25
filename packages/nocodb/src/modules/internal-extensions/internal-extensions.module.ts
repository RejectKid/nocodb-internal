/**
 * Independently implemented internal extensions for organizational use.
 * This module does not consume or modify commercial entitlement state.
 */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
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
import { InternalBasePermissionRepository } from './permissions/internal-base-permission.repository';
import { KnexInternalBasePermissionRepository } from './permissions/knex-internal-base-permission.repository';
import { InternalBasePermissionPolicy } from './permissions/internal-base-permission.policy';
import { DefaultInternalBasePermissionPolicy } from './permissions/default-internal-base-permission.policy';
import { InternalBasePermissionService } from './permissions/internal-base-permission.service';
import { CommunityBaseMembershipAdapter } from './permissions/community-base-membership.adapter';
import { InternalAuditRepository } from './audit/internal-audit.repository';
import { KnexInternalAuditRepository } from './audit/knex-internal-audit.repository';
import { InternalAuditRedactionService } from './audit/internal-audit-redaction.service';
import { InternalAuditRequestContextAdapter } from './audit/internal-audit-request-context.adapter';
import { InternalAuditService } from './audit/internal-audit.service';
import { InternalBasePermissionIdentityProvider } from './permissions/internal-base-permission-identity.provider';
import { CommunityBasePermissionIdentityProvider } from './permissions/community-base-permission-identity.provider';
import { InternalBasePermissionAdminService } from './permissions/internal-base-permission-admin.service';
import { InternalBasePermissionsController } from './permissions/internal-base-permissions.controller';
import { InternalBasePermissionEnforcementInterceptor } from './permissions/internal-base-permission-enforcement.interceptor';
import { InternalApiTokenAdminService } from './api-tokens/internal-api-token-admin.service';
import { InternalApiTokensController } from './api-tokens/internal-api-tokens.controller';

@Module({
  imports: [NocoModule],
  controllers: [
    InternalCapabilitiesController,
    InternalBasePermissionsController,
    InternalApiTokensController,
  ],
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
    InternalApiTokenAdminService,
    {
      provide: InternalTokenAuthorizationPolicy,
      useClass: DefaultInternalTokenAuthorizationPolicy,
    },
    {
      provide: InternalBasePermissionRepository,
      inject: [MetaService],
      useFactory: (metaService: MetaService) =>
        new KnexInternalBasePermissionRepository(metaService),
    },
    {
      provide: InternalBasePermissionPolicy,
      useClass: DefaultInternalBasePermissionPolicy,
    },
    InternalBasePermissionService,
    CommunityBaseMembershipAdapter,
    {
      provide: InternalAuditRepository,
      inject: [MetaService],
      useFactory: (metaService: MetaService) =>
        new KnexInternalAuditRepository(metaService),
    },
    InternalAuditRedactionService,
    InternalAuditRequestContextAdapter,
    InternalAuditService,
    {
      provide: InternalBasePermissionIdentityProvider,
      useClass: CommunityBasePermissionIdentityProvider,
    },
    InternalBasePermissionAdminService,
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalBasePermissionEnforcementInterceptor,
    },
  ],
  exports: [
    InternalFeatureRegistryService,
    InternalTokenHashingService,
    InternalApiTokenRepository,
    InternalApiTokenIssuanceService,
    InternalApiTokenAdminService,
    InternalTokenAuthorizationPolicy,
    InternalBasePermissionRepository,
    InternalBasePermissionPolicy,
    InternalBasePermissionService,
    CommunityBaseMembershipAdapter,
    InternalAuditRepository,
    InternalAuditRedactionService,
    InternalAuditRequestContextAdapter,
    InternalAuditService,
    InternalBasePermissionIdentityProvider,
    InternalBasePermissionAdminService,
  ],
})
export class InternalExtensionsModule {}
