import { InternalApiTokenScope } from './internal-api-token-scope';

export type InternalApiTokenScopeFamily =
  | 'data'
  | 'schema'
  | 'views'
  | 'members'
  | 'documents'
  | 'tokens'
  | 'webhooks'
  | 'admin';

export interface InternalApiTokenScopeDefinition {
  readonly scope: InternalApiTokenScope;
  readonly family: InternalApiTokenScopeFamily;
  readonly label: string;
  readonly mutation: boolean;
}

export const INTERNAL_API_TOKEN_SCOPE_CATALOG: readonly InternalApiTokenScopeDefinition[] =
  Object.freeze([
    {
      scope: InternalApiTokenScope.DATA_READ,
      family: 'data',
      label: 'Read records',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.DATA_CREATE,
      family: 'data',
      label: 'Create records',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.DATA_UPDATE,
      family: 'data',
      label: 'Update records',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.DATA_DELETE,
      family: 'data',
      label: 'Delete records',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.SCHEMA_READ,
      family: 'schema',
      label: 'Read schema',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.SCHEMA_CREATE,
      family: 'schema',
      label: 'Create schema',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.SCHEMA_UPDATE,
      family: 'schema',
      label: 'Update schema',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.SCHEMA_DELETE,
      family: 'schema',
      label: 'Delete schema',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.VIEWS_READ,
      family: 'views',
      label: 'Read views',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.VIEWS_WRITE,
      family: 'views',
      label: 'Manage views',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.MEMBERS_READ,
      family: 'members',
      label: 'Read members',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.MEMBERS_WRITE,
      family: 'members',
      label: 'Manage members',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.DOCUMENTS_READ,
      family: 'documents',
      label: 'Read documents',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.DOCUMENTS_WRITE,
      family: 'documents',
      label: 'Manage documents',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.TOKENS_READ,
      family: 'tokens',
      label: 'Read tokens',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.TOKENS_WRITE,
      family: 'tokens',
      label: 'Manage tokens',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.WEBHOOKS_READ,
      family: 'webhooks',
      label: 'Read webhooks',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.WEBHOOKS_WRITE,
      family: 'webhooks',
      label: 'Manage webhooks',
      mutation: true,
    },
    {
      scope: InternalApiTokenScope.ADMIN_READ,
      family: 'admin',
      label: 'Read administration',
      mutation: false,
    },
    {
      scope: InternalApiTokenScope.ADMIN_WRITE,
      family: 'admin',
      label: 'Manage administration',
      mutation: true,
    },
  ]);
