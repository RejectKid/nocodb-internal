import type { InternalApiToken } from './internal-api-token.model';
import type { InternalApiTokenScope } from './internal-api-token-scope';

export interface InternalTokenAuthorizationRequest {
  token: InternalApiToken;
  requiredScope: InternalApiTokenScope;
  workspaceId?: string;
  baseId?: string;
  now: Date;
}

export interface InternalTokenAuthorizationDecision {
  allowed: boolean;
  reason:
    | 'allowed'
    | 'expired'
    | 'revoked'
    | 'scope_missing'
    | 'workspace_not_allowed'
    | 'base_not_allowed'
    | 'unsupported_scope_version';
}

export abstract class InternalTokenAuthorizationPolicy {
  abstract authorize(
    request: InternalTokenAuthorizationRequest,
  ): Promise<InternalTokenAuthorizationDecision>;
}
