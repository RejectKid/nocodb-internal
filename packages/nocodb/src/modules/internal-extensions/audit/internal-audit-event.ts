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
  DISCUSSION_COMMENT_CREATED = 'discussion.comment.created',
  DISCUSSION_COMMENT_UPDATED = 'discussion.comment.updated',
  DISCUSSION_COMMENT_DELETED = 'discussion.comment.deleted',
  DOCUMENT_CREATED = 'document.created',
  DOCUMENT_UPDATED = 'document.updated',
  DOCUMENT_DELETED = 'document.deleted',
  DOCUMENT_COMMENT_CREATED = 'document.comment.created',
  DOCUMENT_COMMENT_UPDATED = 'document.comment.updated',
  DOCUMENT_COMMENT_DELETED = 'document.comment.deleted',
  NOTIFICATION_READ = 'notification.read',
  VIEW_CREATED = 'view.created',
  VIEW_UPDATED = 'view.updated',
  VIEW_DELETED = 'view.deleted',
  VIEW_REORDERED = 'view.reordered',
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
  DISCUSSION_COMMENT = 'discussion_comment',
  DOCUMENT_COMMENT = 'document_comment',
  NOTIFICATION = 'notification',
  VIEW = 'view',
}

export const INTERNAL_AUDIT_ACTIONS = Object.freeze(
  Object.values(InternalAuditAction),
);
