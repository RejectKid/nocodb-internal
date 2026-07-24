import {
  INTERNAL_AUDIT_ACTIONS,
  InternalAuditAction,
} from './internal-audit-event';

describe('InternalAuditAction', () => {
  it('contains every required security mutation family without duplicates', () => {
    expect(new Set(INTERNAL_AUDIT_ACTIONS).size).toBe(
      INTERNAL_AUDIT_ACTIONS.length,
    );
    expect(INTERNAL_AUDIT_ACTIONS).toEqual(
      expect.arrayContaining([
        InternalAuditAction.TOKEN_CREATED,
        InternalAuditAction.TOKEN_REVOKED,
        InternalAuditAction.BASE_PERMISSION_CHANGED,
        InternalAuditAction.USER_DISABLED,
        InternalAuditAction.USER_ENABLED,
        InternalAuditAction.MEMBERSHIP_INVITED,
        InternalAuditAction.MEMBERSHIP_CHANGED,
        InternalAuditAction.MEMBERSHIP_REMOVED,
        InternalAuditAction.ADMIN_CONFIGURATION_CHANGED,
        InternalAuditAction.DOCUMENT_PERMISSION_CHANGED,
        InternalAuditAction.DOCUMENT_REVISION_RESTORED,
        InternalAuditAction.VALIDATION_RULE_CHANGED,
      ]),
    );
  });
});
