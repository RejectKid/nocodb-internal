export enum InternalAuditAction {
  TOKEN_CREATED = 'token.created',
  TOKEN_REVOKED = 'token.revoked',
  BASE_PERMISSION_CHANGED = 'base.permission.changed',
  USER_DISABLED = 'user.disabled',
  USER_ENABLED = 'user.enabled',
  MEMBERSHIP_INVITED = 'membership.invited',
  MEMBERSHIP_CHANGED = 'membership.changed',
  MEMBERSHIP_REMOVED = 'membership.removed',
  ADMIN_CONFIGURATION_CHANGED = 'admin.configuration.changed',
  DOCUMENT_PERMISSION_CHANGED = 'document.permission.changed',
  DOCUMENT_REVISION_RESTORED = 'document.revision.restored',
  VALIDATION_RULE_CHANGED = 'validation.rule.changed',
}

export enum InternalAuditActorType {
  USER = 'user',
  API_TOKEN = 'api_token',
  SYSTEM = 'system',
}

export enum InternalAuditResourceType {
  API_TOKEN = 'api_token',
  BASE_PERMISSION = 'base_permission',
  USER = 'user',
  MEMBERSHIP = 'membership',
  CONFIGURATION = 'configuration',
  DOCUMENT = 'document',
  DOCUMENT_REVISION = 'document_revision',
  VALIDATION_RULE = 'validation_rule',
}

export const INTERNAL_AUDIT_ACTIONS = Object.freeze(
  Object.values(InternalAuditAction),
);
