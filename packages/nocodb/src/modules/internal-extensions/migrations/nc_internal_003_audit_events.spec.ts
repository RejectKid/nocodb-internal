import knex, { type Knex } from 'knex';
import {
  down,
  INTERNAL_AUDIT_EVENTS_TABLE,
  up,
} from './nc_internal_003_audit_events';

describe('nc_internal_003_audit_events migration', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('creates the independent audit-event table', async () => {
    await expect(db.schema.hasTable(INTERNAL_AUDIT_EVENTS_TABLE)).resolves.toBe(
      true,
    );
  });

  it('rolls the table back independently', async () => {
    await down(db);
    await expect(db.schema.hasTable(INTERNAL_AUDIT_EVENTS_TABLE)).resolves.toBe(
      false,
    );
  });
});
