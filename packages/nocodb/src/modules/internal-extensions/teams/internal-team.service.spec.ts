jest.mock('~/meta/meta.service', () => ({ MetaService: class {} }));
jest.mock('../audit/internal-audit.service', () => ({
  InternalAuditService: class {},
}));
jest.mock('../audit/internal-audit-request-context.adapter', () => ({
  InternalAuditRequestContextAdapter: class {},
}));
import knex, { type Knex } from 'knex';
import { MetaTable } from '~/utils/globals';
import { InternalTeamService } from './internal-team.service';
import { InternalFeatureRegistryService } from '../feature-registry/internal-feature-registry.service';
import {
  up,
  down,
  INTERNAL_TEAMS_TABLE as TEAMS,
  INTERNAL_TEAM_MEMBERS_TABLE as MEMBERS,
} from '../migrations/nc_internal_006_teams';
import {
  up as documentsUp,
  INTERNAL_DOCUMENTS_TABLE,
  INTERNAL_DOCUMENT_GRANTS_TABLE,
} from '../migrations/nc_internal_004_product_suite';
import { InternalDocumentPermissionService } from '../documents/internal-document-permission.service';
import { InternalDocumentPermission } from '../documents/internal-document.types';

describe('internal teams live membership and persistence', () => {
  let db: Knex;
  let service: InternalTeamService;
  let registry: InternalFeatureRegistryService;
  const events: any[] = [];
  const request = { user: { id: 'owner', roles: { super: true } } } as any;
  beforeEach(async () => {
    events.length = 0;
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable(MetaTable.USERS, (t) => {
      t.string('id').primary();
      t.boolean('blocked');
      t.boolean('is_deleted');
    });
    await db.schema.createTable(MetaTable.WORKSPACE_USER, (t) => {
      t.string('fk_workspace_id');
      t.string('fk_user_id');
      t.boolean('deleted');
    });
    await db.schema.createTable(MetaTable.WORKSPACE, (t) => {
      t.string('id');
      t.boolean('deleted');
    });
    await up(db);
    await db(MetaTable.USERS).insert([
      { id: 'user', blocked: false },
      { id: 'outsider', blocked: false },
    ]);
    await db(MetaTable.WORKSPACE_USER).insert({
      fk_workspace_id: 'w',
      fk_user_id: 'user',
      deleted: false,
    });
    await db(MetaTable.WORKSPACE).insert({ id: 'w', deleted: false });
    registry = new InternalFeatureRegistryService();
    jest
      .spyOn(registry, 'getCapabilities')
      .mockImplementation(
        () => ({ schemaVersion: 1, features: { teams: true } } as any),
      );
    const audit = {
      execute: async (event: any, operation: any) =>
        db.transaction(async (trx) => {
          const result = await operation(trx);
          events.push(typeof event === 'function' ? event(result) : event);
          return result;
        }),
    };
    service = new InternalTeamService(
      { knexConnection: db } as any,
      registry,
      audit as any,
      { fromRequest: () => ({ actorId: 'owner' }) } as any,
    );
  });
  afterEach(async () => db.destroy());
  async function createTeam() {
    const t = await service.create('w', { name: 'Research' }, request);
    await service.update(
      'w',
      t.id,
      { expectedRevision: 1, memberIds: ['user'] },
      request,
    );
    return t.id;
  }
  it('resolves live membership, never across workspaces, and revokes on removal', async () => {
    const id = await createTeam();
    expect(await service.teamIdsForUser('w', 'user')).toEqual([id]);
    expect(await service.teamIdsForUser('other', 'user')).toEqual([]);
    await expect(service.assertAssignable('other', id)).rejects.toThrow();
    await service.update(
      'w',
      id,
      { expectedRevision: 2, memberIds: [] },
      request,
    );
    expect(await service.teamIdsForUser('w', 'user')).toEqual([]);
    expect(events.map((e) => e.action)).toEqual([
      'team.created',
      'team.changed',
      'team.changed',
    ]);
  });
  it('rejects foreign members and stale writes without changing stored state', async () => {
    const id = await createTeam();
    await expect(
      service.update(
        'w',
        id,
        { expectedRevision: 2, memberIds: ['outsider'] },
        request,
      ),
    ).rejects.toThrow('active users');
    await expect(
      service.update('w', id, { expectedRevision: 1, memberIds: [] }, request),
    ).rejects.toThrow('reload');
    await expect(
      service.update(
        'other',
        id,
        { expectedRevision: 2, memberIds: [] },
        request,
      ),
    ).rejects.toThrow('Team not found');
    expect(await service.teamIdsForUser('w', 'user')).toEqual([id]);
  });
  it.each(['blocked', 'is_deleted'])(
    'excludes users with %s set',
    async (field) => {
      await createTeam();
      await db(MetaTable.USERS)
        .where('id', 'user')
        .update({ [field]: true });
      expect(await service.teamIdsForUser('w', 'user')).toEqual([]);
    },
  );
  it('excludes removed workspace members and archived teams', async () => {
    const id = await createTeam();
    await db(MetaTable.WORKSPACE_USER).update({ deleted: true });
    expect(await service.teamIdsForUser('w', 'user')).toEqual([]);
    await db(MetaTable.WORKSPACE_USER).update({ deleted: false });
    await service.update(
      'w',
      id,
      { expectedRevision: 2, archived: true },
      request,
    );
    expect(await service.teamIdsForUser('w', 'user')).toEqual([]);
    await expect(service.assertAssignable('w', id)).rejects.toThrow();
    expect(events[2].action).toBe('team.archived');
  });
  it('ignores all team contributions when disabled', async () => {
    await createTeam();
    jest
      .spyOn(registry, 'getCapabilities')
      .mockReturnValue({ schemaVersion: 1, features: { teams: false } } as any);
    expect(await service.teamIdsForUser('w', 'user')).toEqual([]);
  });
  it('inherits document team grants and removes them immediately on membership removal', async () => {
    const id = await createTeam();
    await documentsUp(db);
    await db(INTERNAL_DOCUMENTS_TABLE).insert({
      id: 'parent',
      workspace_id: 'w',
      base_id: 'b',
      title: 'Parent',
      content: '{}',
      created_by: 'owner',
      updated_by: 'owner',
    });
    await db(INTERNAL_DOCUMENT_GRANTS_TABLE).insert({
      id: 'g',
      document_id: 'parent',
      subject_type: 'team',
      subject_id: id,
      permission: 'edit',
      created_by: 'owner',
    });
    const policy = new InternalDocumentPermissionService(
      { knexConnection: db } as any,
      service,
    );
    const doc = {
      id: 'child',
      parentId: 'parent',
      workspaceId: 'w',
      baseId: 'b',
      createdBy: 'owner',
    } as any;
    const reader = {
      user: { id: 'user', roles: {}, base_roles: { viewer: true } },
    } as any;
    expect(await policy.can(doc, reader, InternalDocumentPermission.EDIT)).toBe(
      true,
    );
    expect(await policy.sources(doc, reader)).toEqual([
      {
        subjectType: 'team',
        subjectId: id,
        permission: 'edit',
        inherited: true,
      },
    ]);
    expect(
      await policy.can(
        { ...doc, workspaceId: 'other' },
        reader,
        InternalDocumentPermission.READ,
      ),
    ).toBe(false);
    await service.update(
      'w',
      id,
      { expectedRevision: 2, memberIds: [] },
      request,
    );
    expect(await policy.can(doc, reader, InternalDocumentPermission.READ)).toBe(
      false,
    );
  });
  it('rolls back team tables without dropping Community tables', async () => {
    await createTeam();
    await down(db);
    expect(await db.schema.hasTable(TEAMS)).toBe(false);
    expect(await db.schema.hasTable(MEMBERS)).toBe(false);
    expect(await db(MetaTable.USERS).count('* as count').first()).toEqual({
      count: 2,
    });
  });
});
