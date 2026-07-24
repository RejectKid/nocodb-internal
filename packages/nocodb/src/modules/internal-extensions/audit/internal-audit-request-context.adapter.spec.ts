import { InternalAuditActorType } from './internal-audit-event';
import { InternalAuditRequestContextAdapter } from './internal-audit-request-context.adapter';

describe('InternalAuditRequestContextAdapter', () => {
  const adapter = new InternalAuditRequestContextAdapter();

  it('extracts bounded authenticated request context', () => {
    expect(
      adapter.fromRequest({
        user: { id: 'user-1' },
        ncWorkspaceId: 'workspace-1',
        ncBaseId: 'base-1',
        clientIp: '192.0.2.10',
        headers: {
          'x-request-id': 'request-1',
          'user-agent': 'internal-test-agent',
        },
      }),
    ).toEqual({
      actorType: InternalAuditActorType.USER,
      actorId: 'user-1',
      workspaceId: 'workspace-1',
      baseId: 'base-1',
      requestId: 'request-1',
      ipAddress: '192.0.2.10',
      userAgent: 'internal-test-agent',
    });
  });

  it('does not invent an authenticated actor', () => {
    expect(adapter.fromRequest({})).toMatchObject({
      actorType: InternalAuditActorType.SYSTEM,
      actorId: null,
    });
  });
});
