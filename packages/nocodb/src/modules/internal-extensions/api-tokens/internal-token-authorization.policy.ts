import type { InternalApiToken } from './internal-api-token.model';
import type { InternalApiTokenScope } from './internal-api-token-scope';

export type InternalTokenOwnerState =
  | 'active'
  | 'blocked'
  | 'deleted'
  | 'disabled';

export interface InternalTokenOwnerContext {
  id: string;
  state: InternalTokenOwnerState;
  permissions: readonly string[];
}

export type InternalTokenAuthorizationTarget =
  | { kind: 'instance' }
  | { kind: 'workspace'; workspaceId?: string }
  | { kind: 'base'; workspaceId?: string; baseId?: string };

export interface InternalTokenAuthorizationRequest {
  token: InternalApiToken;
  owner: InternalTokenOwnerContext | null;
  requiredScope: InternalApiTokenScope;
  requiredOwnerPermission: string;
  target: InternalTokenAuthorizationTarget;
  now: Date;
}

export interface InternalTokenAuthenticationRequest {
  token: InternalApiToken;
  owner: InternalTokenOwnerContext | null;
  now: Date;
}

export type InternalTokenAuthorizationFailureClass =
  | 'none'
  | 'authentication'
  | 'authorization';

export type InternalTokenAuthorizationReason =
  | 'allowed'
  | 'expired'
  | 'revoked'
  | 'disabled'
  | 'owner_not_found'
  | 'owner_mismatch'
  | 'owner_blocked'
  | 'owner_deleted'
  | 'owner_disabled'
  | 'owner_permission_missing'
  | 'scope_missing'
  | 'invalid_scope_set'
  | 'unsupported_required_scope'
  | 'workspace_context_missing'
  | 'base_context_missing'
  | 'workspace_not_allowed'
  | 'base_not_allowed'
  | 'unsupported_scope_version';

export type InternalTokenAuthorizationDeniedReason = Exclude<
  InternalTokenAuthorizationReason,
  'allowed'
>;

export type InternalTokenAuthorizationDecision =
  | {
      allowed: true;
      failureClass: 'none';
      reason: 'allowed';
    }
  | {
      allowed: false;
      failureClass: Exclude<InternalTokenAuthorizationFailureClass, 'none'>;
      reason: InternalTokenAuthorizationDeniedReason;
    };

export abstract class InternalTokenAuthorizationPolicy {
  abstract authenticate(
    request: InternalTokenAuthenticationRequest,
  ): Promise<InternalTokenAuthorizationDecision>;

  abstract authorize(
    request: InternalTokenAuthorizationRequest,
  ): Promise<InternalTokenAuthorizationDecision>;
}
