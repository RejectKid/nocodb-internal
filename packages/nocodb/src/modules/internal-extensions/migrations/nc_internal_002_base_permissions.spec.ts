import knex, { type Knex } from 'knex';
import {
  down,
  INTERNAL_BASE_PERMISSION_CONFIGS_TABLE,
  INTERNAL_BASE_PERMISSION_GRANTS_TABLE,
  up,
} from './nc_internal_002_base_permissions';

describe('nc_internal_002_base_permissions migration', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({ client: 'sqlite3', connection: { filename: ':memory:' } });
    await up(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('creates independent configuration and grant tables', async () => {
    await expect(
      db.schema.hasTable(INTERNAL_BASE_PERMISSION_CONFIGS_TABLE),
    ).resolves.toBe(true);
    await expect(
      db.schema.hasTable(INTERNAL_BASE_PERMISSION_GRANTS_TABLE),
    ).resolves.toBe(true);
  });

  it('prevents duplicate assignments for a subject and permission', async () => {
    const row = {
      id: 'grant-1',
      workspace_id: 'workspace-1',
      base_id: 'base-1',
      subject_type: 'user',
      subject_id: 'user-1',
      permission: 'records:read',
      effect: 'allow',
      created_by: 'owner-1',
      updated_by: 'owner-1',
    };
    await db(INTERNAL_BASE_PERMISSION_GRANTS_TABLE).insert(row);
    await expect(
      db(INTERNAL_BASE_PERMISSION_GRANTS_TABLE).insert({
        ...row,
        id: 'grant-2',
        effect: 'deny',
      }),
    ).rejects.toThrow();
  });

  it('rolls back both tables', async () => {
    await down(db);
    await expect(
      db.schema.hasTable(INTERNAL_BASE_PERMISSION_CONFIGS_TABLE),
    ).resolves.toBe(false);
    await expect(
      db.schema.hasTable(INTERNAL_BASE_PERMISSION_GRANTS_TABLE),
    ).resolves.toBe(false);
  });
});
