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
import { InternalTokenOwnerProvider } from './api-tokens/internal-token-owner.provider';
import { CommunityInternalTokenOwnerProvider } from './api-tokens/community-internal-token-owner.provider';
import { InternalTokenVerificationRateLimiter } from './api-tokens/internal-token-verification-rate-limiter';
import { InternalTokenAuthenticationService } from './api-tokens/internal-token-authentication.service';
import { InternalTokenAuthenticationGuard } from './api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from './api-tokens/internal-token-scope.guard';
import { InternalFeatureGuard } from './feature-registry/internal-feature.guard';
import { InternalSuperAdminGuard } from './authorization/internal-super-admin.guard';
import { InternalAdminService } from './admin/internal-admin.service';
import { InternalAdminController } from './admin/internal-admin.controller';
import { InternalValidationEngine } from './validation/internal-validation.engine';
import { InternalValidationRepository } from './validation/internal-validation.repository';
import { InternalValidationService } from './validation/internal-validation.service';
import { InternalValidationController } from './validation/internal-validation.controller';
import { InternalValidationInterceptor } from './validation/internal-validation.interceptor';
import { InternalDiscussionService } from './discussions/internal-discussion.service';
import { InternalDiscussionController } from './discussions/internal-discussion.controller';
import { InternalDocumentPermissionService } from './documents/internal-document-permission.service';
import { InternalPdfService } from './documents/internal-pdf.service';
import { InternalDocumentService } from './documents/internal-document.service';
import { InternalDocumentsController } from './documents/internal-documents.controller';
import { InternalNotificationService } from './notifications/internal-notification.service';
import { InternalNotificationsController } from './notifications/internal-notifications.controller';
import { InternalWorkspaceManagerGuard } from './authorization/internal-workspace-manager.guard';
import { InternalCollaborationService } from './collaboration/internal-collaboration.service';
import {
  InternalBaseCollaborationController,
  InternalWorkspaceCollaborationController,
} from './collaboration/internal-collaboration.controller';
import { InternalViewManagementService } from './views/internal-view-management.service';
import { InternalViewManagementController } from './views/internal-view-management.controller';
import { InternalOpenApiService } from './openapi/internal-openapi.service';
import { InternalOpenApiController } from './openapi/internal-openapi.controller';
import { InternalFilePreviewController } from './record-modes/internal-file-preview.controller';

@Module({
  imports: [NocoModule],
  controllers: [
    InternalCapabilitiesController,
    InternalBasePermissionsController,
    InternalApiTokensController,
    InternalAdminController,
    InternalValidationController,
    InternalDiscussionController,
    InternalDocumentsController,
    InternalNotificationsController,
    InternalWorkspaceCollaborationController,
    InternalBaseCollaborationController,
    InternalViewManagementController,
    InternalOpenApiController,
    InternalFilePreviewController,
  ],
  providers: [
    GlobalGuard,
    MetaApiLimiterGuard,
    InternalAuthenticatedGuard,
    InternalFeatureRegistryService,
    InternalFeatureGuard,
    InternalSuperAdminGuard,
    InternalWorkspaceManagerGuard,
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
      provide: InternalTokenOwnerProvider,
      useClass: CommunityInternalTokenOwnerProvider,
    },
    InternalTokenVerificationRateLimiter,
    InternalTokenAuthenticationService,
    InternalTokenAuthenticationGuard,
    InternalTokenScopeGuard,
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
    InternalAdminService,
    InternalValidationEngine,
    InternalValidationRepository,
    InternalValidationService,
    InternalDiscussionService,
    InternalDocumentPermissionService,
    InternalPdfService,
    InternalDocumentService,
    InternalNotificationService,
    InternalCollaborationService,
    InternalViewManagementService,
    InternalOpenApiService,
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalBasePermissionEnforcementInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalValidationInterceptor,
    },
  ],
  exports: [
    InternalFeatureRegistryService,
    InternalTokenHashingService,
    InternalApiTokenRepository,
    InternalApiTokenIssuanceService,
    InternalApiTokenAdminService,
    InternalTokenOwnerProvider,
    InternalTokenVerificationRateLimiter,
    InternalTokenAuthenticationService,
    InternalTokenAuthenticationGuard,
    InternalTokenScopeGuard,
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
    InternalAdminService,
    InternalValidationEngine,
    InternalValidationRepository,
    InternalValidationService,
    InternalDiscussionService,
    InternalDocumentPermissionService,
    InternalPdfService,
    InternalDocumentService,
    InternalNotificationService,
    InternalCollaborationService,
    InternalViewManagementService,
    InternalOpenApiService,
  ],
})
export class InternalExtensionsModule {}
