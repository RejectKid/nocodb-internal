import type { InternalApiTokenScope } from './internal-api-token-scope';
import type { InternalApiTokenSummary } from './internal-api-token.model';
import type { InternalApiTokenScopeDefinition } from './internal-api-token-scope.catalog';

export interface CreateInternalApiTokenAdminRequest {
  displayName: string;
  expiresAt?: string | null;
  allowedWorkspaceIds: string[];
  allowedBaseIds: string[];
  scopes: InternalApiTokenScope[];
}

export interface InternalApiTokenAdminState {
  tokens: InternalApiTokenSummary[];
  scopeCatalog: readonly InternalApiTokenScopeDefinition[];
  boundary: {
    workspaceId: string;
    baseId: string;
  };
}

export interface CreateInternalApiTokenAdminResponse {
  token: InternalApiTokenSummary;
  value: string;
}
