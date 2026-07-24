import knex, { type Knex } from 'knex';
import { down, up } from '../migrations/nc_internal_002_base_permissions';
import { InternalBasePermission } from './internal-base-permission';
import {
  InternalPermissionEffect,
  InternalPermissionSubjectType,
  type InternalBasePermissionConfiguration,
  type InternalBasePermissionGrant,
} from './internal-base-permission.model';
import { KnexInternalBasePermissionRepository } from './knex-internal-base-permission.repository';

describe('KnexInternalBasePermissionRepository', () => {
  let db: Knex;
  let repository: KnexInternalBasePermissionRepository;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
    repository = new KnexInternalBasePermissionRepository({
      knexConnection: db,
    } as never);
  });

  afterEach(async () => {
    await down(db);
    await db.destroy();
  });

  it('round-trips and updates base opt-in configuration', async () => {
    const configuration: InternalBasePermissionConfiguration = {
      workspace_id: 'workspace-1',
      base_id: 'base-1',
      enabled: false,
      schema_version: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'owner-1',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'owner-1',
    };

    await repository.upsertConfiguration(configuration);
    await repository.upsertConfiguration({
      ...configuration,
      enabled: true,
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    await expect(
      repository.getConfiguration('workspace-1', 'base-1'),
    ).resolves.toMatchObject({ enabled: true });
    await expect(
      repository.getConfiguration('workspace-2', 'base-1'),
    ).resolves.toBeNull();
  });

  it('upserts one deterministic assignment per subject and permission', async () => {
    const grant: InternalBasePermissionGrant = {
      id: 'grant-1',
      workspace_id: 'workspace-1',
      base_id: 'base-1',
      subject_type: InternalPermissionSubjectType.USER,
      subject_id: 'user-1',
      permission: InternalBasePermission.RECORDS_READ,
      effect: InternalPermissionEffect.ALLOW,
      created_at: '2026-01-01T00:00:00.000Z',
      created_by: 'owner-1',
      updated_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'owner-1',
    };

    await repository.upsertGrant(grant);
    await repository.upsertGrant({
      ...grant,
      id: 'ignored-replacement-id',
      effect: InternalPermissionEffect.DENY,
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    await expect(
      repository.listGrants('workspace-1', 'base-1'),
    ).resolves.toMatchObject([
      { id: 'grant-1', effect: InternalPermissionEffect.DENY },
    ]);
    await expect(
      repository.listGrants('workspace-1', 'base-2'),
    ).resolves.toEqual([]);
  });

  it('rejects unknown stored permission values', async () => {
    await db('nc_internal_base_permission_grants').insert({
      id: 'grant-1',
      workspace_id: 'workspace-1',
      base_id: 'base-1',
      subject_type: 'user',
      subject_id: 'user-1',
      permission: 'unknown:permission',
      effect: 'allow',
      created_by: 'owner-1',
      updated_by: 'owner-1',
    });

    await expect(
      repository.listGrants('workspace-1', 'base-1'),
    ).rejects.toThrow();
  });
});
