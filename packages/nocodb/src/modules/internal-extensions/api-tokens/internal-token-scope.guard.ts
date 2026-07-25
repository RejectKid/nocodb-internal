import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ProjectRoles } from 'nocodb-sdk';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { InternalBasePermissionIdentityProvider } from '../permissions/internal-base-permission-identity.provider';
import { InternalBasePermissionService } from '../permissions/internal-base-permission.service';
import { InternalApiTokenRepository } from './internal-api-token.repository';
import {
  INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY,
  type InternalTokenRequest,
} from './internal-token-authentication.guard';
import { InternalTokenAuthorizationPolicy } from './internal-token-authorization.policy';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from './internal-token-owner.provider';
import {
  INTERNAL_TOKEN_SCOPE_METADATA,
  type InternalTokenScopeMetadata,
} from './internal-token-scope.decorator';

const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1_000;

@Injectable()
export class InternalTokenScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policy: InternalTokenAuthorizationPolicy,
    private readonly identityProvider: InternalBasePermissionIdentityProvider,
    private readonly permissionService: InternalBasePermissionService,
    private readonly repository: InternalApiTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<InternalTokenRequest>();
    const principal = request[INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY];
    if (!principal) {
      return true;
    }

    const metadata = this.reflector.getAllAndOverride<
      InternalTokenScopeMetadata | undefined
    >(INTERNAL_TOKEN_SCOPE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) {
      throw new ForbiddenException('Internal token scope is not configured');
    }

    const target = this.target(metadata, request);
    const permissions = [
      ...principal.owner.authorization.permissions,
    ] as string[];
    if (metadata.ownerPermission !== INTERNAL_TOKEN_AUTHENTICATED_PERMISSION) {
      if (
        target.kind !== 'base' ||
        !target.workspaceId ||
        !target.baseId ||
        !request.context
      ) {
        throw new ForbiddenException(
          'Internal token authorization context is unavailable',
        );
      }
      const identity = await this.identityProvider.resolve(
        request.context,
        target.workspaceId,
        target.baseId,
        principal.owner.authorization.id,
      );
      const decision = await this.permissionService.resolve(
        {
          workspaceId: target.workspaceId,
          baseId: target.baseId,
          actor: identity,
          communityAllowed: () =>
            Boolean(
              identity?.roles.some(
                (role) =>
                  role === ProjectRoles.OWNER || role === ProjectRoles.CREATOR,
              ),
            ),
        },
        metadata.ownerPermission as InternalBasePermission,
      );
      if (decision.allowed) {
        permissions.push(metadata.ownerPermission);
      }
    }

    const now = new Date();
    const authorization = await this.policy.authorize({
      token: principal.token,
      owner: {
        ...principal.owner.authorization,
        permissions,
      },
      requiredScope: metadata.scope,
      requiredOwnerPermission: metadata.ownerPermission,
      target,
      now,
    });
    if (!authorization.allowed) {
      if (authorization.failureClass === 'authentication') {
        throw new UnauthorizedException('Invalid internal API token');
      }
      throw new ForbiddenException('Internal token authorization denied');
    }

    await this.repository.markUsed(
      principal.token.record.id,
      now,
      new Date(now.getTime() - LAST_USED_WRITE_INTERVAL_MS),
    );
    return true;
  }

  private target(
    metadata: InternalTokenScopeMetadata,
    request: InternalTokenRequest,
  ) {
    if (metadata.target === 'instance') {
      return { kind: 'instance' as const };
    }
    const workspaceId =
      request.params?.workspaceId ??
      request.ncWorkspaceId ??
      request.context?.workspace_id;
    if (metadata.target === 'workspace') {
      return { kind: 'workspace' as const, workspaceId };
    }
    return {
      kind: 'base' as const,
      workspaceId,
      baseId:
        request.params?.baseId ?? request.ncBaseId ?? request.context?.base_id,
    };
  }
}
