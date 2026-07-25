import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { NcRequest } from '~/interface/config';
import { InternalFeatureRegistryService } from '../feature-registry/internal-feature-registry.service';
import type { InternalBasePermission } from './internal-base-permission';
import {
  INTERNAL_BASE_PERMISSION_METADATA,
  INTERNAL_BASE_PERMISSION_REQUEST_METADATA,
} from './internal-base-permission-enforcement.decorator';
import { InternalBasePermissionIdentityProvider } from './internal-base-permission-identity.provider';
import { InternalBasePermissionRepository } from './internal-base-permission.repository';
import { InternalBasePermissionService } from './internal-base-permission.service';
import { resolveInternalPermissionsForCommunityAcl } from './internal-community-acl-permission-map';
import {
  InternalPermissionRequestKind,
  resolveInternalPermissionsForRequest,
} from './internal-request-permission-resolver';

@Injectable()
export class InternalBasePermissionEnforcementInterceptor
  implements NestInterceptor
{
  constructor(
    private readonly reflector: Reflector,
    private readonly featureRegistry: InternalFeatureRegistryService,
    private readonly permissionService: InternalBasePermissionService,
    private readonly identityProvider: InternalBasePermissionIdentityProvider,
    private readonly repository: InternalBasePermissionRepository,
  ) {}

  async intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const explicitPermissions = this.reflector.getAllAndOverride<
      readonly InternalBasePermission[] | undefined
    >(INTERNAL_BASE_PERMISSION_METADATA, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    const requestKind = this.reflector.getAllAndOverride<
      InternalPermissionRequestKind | undefined
    >(INTERNAL_BASE_PERMISSION_REQUEST_METADATA, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    const communityPermission = this.reflector.getAllAndOverride<
      string | undefined
    >('permission', [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    const scope = this.reflector.getAllAndOverride<string | undefined>(
      'scope',
      [executionContext.getHandler(), executionContext.getClass()],
    );

    const request = executionContext.switchToHttp().getRequest<NcRequest>();
    const permissions =
      explicitPermissions ??
      (requestKind
        ? resolveInternalPermissionsForRequest(requestKind, request)
        : scope === 'base'
        ? resolveInternalPermissionsForCommunityAcl(communityPermission)
        : undefined);
    if (
      !permissions?.length ||
      !this.featureRegistry.getCapabilities().features.basePermissions
    ) {
      return next.handle();
    }

    // Shared/public-base sessions keep their dedicated upstream share
    // authorization. Internal grants are user assignments and cannot be
    // resolved safely for an anonymous/public identity.
    if (
      request.context?.is_public ||
      (request.user as { isPublicBase?: boolean } | undefined)?.isPublicBase
    ) {
      return next.handle();
    }
    const workspaceId = request.ncWorkspaceId ?? request.context?.workspace_id;
    const baseId = request.ncBaseId ?? request.context?.base_id;
    if (!request.context || !workspaceId || !baseId) {
      throw new ForbiddenException(
        'Internal base permission context is unavailable',
      );
    }
    const configuration = await this.repository.getConfiguration(
      workspaceId,
      baseId,
    );
    if (!configuration?.enabled) {
      return next.handle();
    }

    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const actor = await this.identityProvider.resolve(
      request.context,
      workspaceId,
      baseId,
      userId,
    );
    const decisions = await this.permissionService.resolveMany(
      {
        workspaceId,
        baseId,
        actor,
        // Community guards have already run, while the existing method-level
        // ACL interceptor remains downstream and authoritative. Treating it as
        // a candidate allow preserves disabled-base fallback; next.handle()
        // still cannot bypass a Community ACL denial.
        communityAllowed: () => true,
      },
      permissions,
    );
    if (decisions.some((decision) => !decision.allowed)) {
      throw new ForbiddenException('Internal base permission denied');
    }

    return next.handle();
  }
}
