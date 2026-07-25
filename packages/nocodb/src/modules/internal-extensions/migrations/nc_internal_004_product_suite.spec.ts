import knex, { type Knex } from 'knex';
import {
  down,
  INTERNAL_BASE_FEATURES_TABLE,
  INTERNAL_DOCUMENT_COMMENTS_TABLE,
  INTERNAL_DOCUMENT_GRANTS_TABLE,
  INTERNAL_DOCUMENT_REVISIONS_TABLE,
  INTERNAL_DOCUMENTS_TABLE,
  INTERNAL_NOTIFICATIONS_TABLE,
  INTERNAL_RECORD_COMMENTS_TABLE,
  INTERNAL_VALIDATION_RULES_TABLE,
  up,
} from './nc_internal_004_product_suite';

const tables = [
  INTERNAL_BASE_FEATURES_TABLE,
  INTERNAL_VALIDATION_RULES_TABLE,
  INTERNAL_RECORD_COMMENTS_TABLE,
  INTERNAL_DOCUMENTS_TABLE,
  INTERNAL_DOCUMENT_GRANTS_TABLE,
  INTERNAL_DOCUMENT_REVISIONS_TABLE,
  INTERNAL_DOCUMENT_COMMENTS_TABLE,
  INTERNAL_NOTIFICATIONS_TABLE,
];

describe('nc_internal_004_product_suite migration', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
  });

  afterEach(async () => db.destroy());

  it('creates every independent product-suite table', async () => {
    await expect(
      Promise.all(tables.map((table) => db.schema.hasTable(table))),
    ).resolves.toEqual(tables.map(() => true));
  });

  it('rolls every table back without touching upstream tables', async () => {
    await db.schema.createTable('upstream_sentinel', (table) =>
      table.string('id').primary(),
    );
    await down(db);
    await expect(
      Promise.all(tables.map((table) => db.schema.hasTable(table))),
    ).resolves.toEqual(tables.map(() => false));
    await expect(db.schema.hasTable('upstream_sentinel')).resolves.toBe(true);
  });
});
