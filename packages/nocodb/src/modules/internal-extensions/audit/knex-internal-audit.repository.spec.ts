import knex, { type Knex } from 'knex';
import { up } from '../migrations/nc_internal_003_audit_events';
import {
  InternalAuditAction,
  InternalAuditActorType,
  InternalAuditResourceType,
} from './internal-audit-event';
import { InternalAuditRedactionService } from './internal-audit-redaction.service';
import { InternalAuditService } from './internal-audit.service';
import { KnexInternalAuditRepository } from './knex-internal-audit.repository';

describe('internal audit persistence', () => {
  let db: Knex;
  let repository: KnexInternalAuditRepository;
  let service: InternalAuditService;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
    await db.schema.createTable('test_domain_mutations', (table) => {
      table.string('id').primary();
    });
    repository = new KnexInternalAuditRepository({
      knexConnection: db,
    } as never);
    service = new InternalAuditService(
      repository,
      new InternalAuditRedactionService(),
    );
  });

  afterEach(async () => {
    await db.destroy();
  });

  const event = {
    id: 'audit-1',
    action: InternalAuditAction.BASE_PERMISSION_CHANGED,
    resourceType: InternalAuditResourceType.BASE_PERMISSION,
    resourceId: 'grant-1',
    context: {
      actorType: InternalAuditActorType.USER,
      actorId: 'owner-1',
      workspaceId: 'workspace-1',
      baseId: 'base-1',
      requestId: 'request-1',
    },
    before: { effect: 'deny' },
    after: { effect: 'allow', token: 'never-store-this' },
  };

  it('stores required fields and safe summaries', async () => {
    await service.record(event);
    await expect(
      repository.list({ workspaceId: 'workspace-1' }),
    ).resolves.toMatchObject([
      {
        id: 'audit-1',
        actor_id: 'owner-1',
        action: InternalAuditAction.BASE_PERMISSION_CHANGED,
        resource_id: 'grant-1',
        workspace_id: 'workspace-1',
        base_id: 'base-1',
        request_id: 'request-1',
        before_summary: { effect: 'deny' },
        after_summary: { effect: 'allow', token: '[REDACTED]' },
      },
    ]);
  });

  it('requires an explicit workspace boundary for reads', async () => {
    await expect(repository.list({})).rejects.toThrow(
      'require a workspace boundary',
    );
  });

  it('prevents cross-workspace and cross-base reads', async () => {
    await service.record(event);
    await expect(
      repository.list({ workspaceId: 'workspace-2' }),
    ).resolves.toEqual([]);
    await expect(
      repository.list({ workspaceId: 'workspace-1', baseId: 'base-2' }),
    ).resolves.toEqual([]);
  });

  it('commits a domain mutation and audit event atomically', async () => {
    await service.execute(event, async (transaction) => {
      await transaction('test_domain_mutations').insert({ id: 'mutation-1' });
      return 'mutation-1';
    });
    await expect(db('test_domain_mutations')).resolves.toHaveLength(1);
    await expect(
      repository.list({ workspaceId: 'workspace-1' }),
    ).resolves.toHaveLength(1);
  });

  it('rolls back the domain mutation when audit append fails', async () => {
    await service.record(event);
    await expect(
      service.execute(event, async (transaction) => {
        await transaction('test_domain_mutations').insert({
          id: 'mutation-1',
        });
        return 'mutation-1';
      }),
    ).rejects.toThrow();
    await expect(db('test_domain_mutations')).resolves.toEqual([]);
  });

  it('does not emit an event when the domain mutation fails', async () => {
    await expect(
      service.execute(event, async () => {
        throw new Error('mutation failed');
      }),
    ).rejects.toThrow('mutation failed');
    await expect(
      repository.list({ workspaceId: 'workspace-1' }),
    ).resolves.toEqual([]);
  });

  it('rejects unknown stored action values', async () => {
    await db('nc_internal_audit_events').insert({
      id: 'corrupt-1',
      schema_version: 1,
      actor_type: 'user',
      action: 'unknown.action',
      resource_type: 'user',
      resource_id: 'user-1',
      workspace_id: 'workspace-1',
    });
    await expect(
      repository.list({ workspaceId: 'workspace-1' }),
    ).rejects.toThrow();
  });
});
