import { UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  InternalApiToken,
  type InternalApiTokenRecord,
} from '../../api-tokens/internal-api-token.model';
import type { InternalApiTokenScope } from '../../api-tokens/internal-api-token-scope';

export const AUTHORIZATION_HARNESS_ACTOR_HEADER =
  'x-internal-authorization-actor';

export const AUTHORIZATION_HARNESS_TENANTS = {
  workspaceA: 'workspace-a',
  workspaceB: 'workspace-b',
  baseA: 'base-a',
  baseB: 'base-b',
} as const;

export type AuthorizationIdentityFixtureName =
  | 'anonymous'
  | 'authenticatedUnauthorized'
  | 'authorized'
  | 'apiTokenAuthorized'
  | 'blocked'
  | 'deleted'
  | 'disabled';

interface AuthorizationIdentityFixture {
  id?: string;
  isAuthorized: boolean;
  roles?: Record<string, boolean>;
  workspace_roles?: Record<string, boolean>;
  base_roles?: Record<string, boolean>;
  is_api_token?: boolean;
  blocked?: boolean;
  is_deleted?: boolean;
  disabled?: boolean;
}

export function createAuthorizationIdentityFixture(
  name: AuthorizationIdentityFixtureName,
): AuthorizationIdentityFixture {
  switch (name) {
    case 'anonymous':
      return {
        isAuthorized: false,
        roles: { guest: true },
      };
    case 'authenticatedUnauthorized':
      return {
        id: 'user-viewer',
        isAuthorized: true,
        roles: { 'org-level-viewer': true },
        workspace_roles: { 'workspace-level-viewer': true },
        base_roles: { viewer: true },
      };
    case 'apiTokenAuthorized':
      return {
        id: 'user-token-owner',
        isAuthorized: true,
        is_api_token: true,
        roles: { super: true },
        workspace_roles: { 'workspace-level-owner': true },
        base_roles: { owner: true },
      };
    case 'blocked':
      return {
        ...createAuthorizationIdentityFixture('authorized'),
        blocked: true,
      };
    case 'deleted':
      return {
        ...createAuthorizationIdentityFixture('authorized'),
        is_deleted: true,
      };
    case 'disabled':
      return {
        ...createAuthorizationIdentityFixture('authorized'),
        blocked: true,
        disabled: true,
      };
    case 'authorized':
      return {
        id: 'user-super-admin',
        isAuthorized: true,
        roles: { super: true },
        workspace_roles: { 'workspace-level-owner': true },
        base_roles: { owner: true },
      };
  }
}

export class AuthorizationHarnessIdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requestedFixture =
      request.headers?.[AUTHORIZATION_HARNESS_ACTOR_HEADER];
    const fixtureName =
      typeof requestedFixture === 'string'
        ? (requestedFixture as AuthorizationIdentityFixtureName)
        : 'anonymous';
    const user = createAuthorizationIdentityFixture(fixtureName);

    if (
      !user.id ||
      !user.isAuthorized ||
      user.blocked ||
      user.is_deleted ||
      user.disabled
    ) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = user;
    request.context = {
      workspace_id: AUTHORIZATION_HARNESS_TENANTS.workspaceA,
      base_id: AUTHORIZATION_HARNESS_TENANTS.baseA,
      permissions: [],
    };
    return true;
  }
}

export interface InternalTokenFixtureOptions {
  now?: Date;
  scopes?: InternalApiTokenScope[];
  allowedWorkspaceIds?: string[];
  allowedBaseIds?: string[];
  expired?: boolean;
  revoked?: boolean;
}

export function createInternalTokenFixture(
  options: InternalTokenFixtureOptions = {},
): InternalApiToken {
  const now = options.now ?? new Date('2030-01-01T00:00:00.000Z');
  const record: InternalApiTokenRecord = {
    id: 'internal-token-fixture',
    user_id: 'user-token-owner',
    display_name: 'Authorization harness token',
    token_hash: 'scrypt$v1$redacted-test-hash',
    token_prefix: 'nci_fixture',
    hash_version: 1,
    created_at: new Date(now.getTime() - 60_000).toISOString(),
    created_by: 'user-super-admin',
    expires_at: options.expired
      ? new Date(now.getTime() - 1).toISOString()
      : new Date(now.getTime() + 60_000).toISOString(),
    last_used_at: null,
    disabled_at: null,
    revoked_at: options.revoked ? now.toISOString() : null,
    revoked_by: options.revoked ? 'user-super-admin' : null,
    allowed_workspace_ids: options.allowedWorkspaceIds ?? [
      AUTHORIZATION_HARNESS_TENANTS.workspaceA,
    ],
    allowed_base_ids: options.allowedBaseIds ?? [
      AUTHORIZATION_HARNESS_TENANTS.baseA,
    ],
    scopes: options.scopes ?? [],
    scope_version: 1,
    metadata: { fixture: true },
  };

  return new InternalApiToken(record);
}
