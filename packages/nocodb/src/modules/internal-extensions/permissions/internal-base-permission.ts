export enum InternalBasePermission {
  BASE_VIEW = 'base:view',
  BASE_EDIT = 'base:edit',
  BASE_MANAGE_SCHEMA = 'base:manage_schema',
  BASE_MANAGE_VIEWS = 'base:manage_views',
  BASE_MANAGE_MEMBERS = 'base:manage_members',
  BASE_MANAGE_TOKENS = 'base:manage_tokens',
  BASE_EXPORT = 'base:export',
  BASE_IMPORT = 'base:import',
  RECORDS_READ = 'records:read',
  RECORDS_CREATE = 'records:create',
  RECORDS_UPDATE = 'records:update',
  RECORDS_DELETE = 'records:delete',
  DOCUMENTS_READ = 'documents:read',
  DOCUMENTS_CREATE = 'documents:create',
  DOCUMENTS_UPDATE = 'documents:update',
  DOCUMENTS_DELETE = 'documents:delete',
}

export const INTERNAL_BASE_PERMISSIONS = Object.freeze(
  Object.values(InternalBasePermission),
);
