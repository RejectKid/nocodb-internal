import knexFactory from 'knex';
import type { Knex } from 'knex';
import {
  down as tokensDown,
  INTERNAL_API_TOKENS_TABLE,
  up as tokensUp,
} from './nc_internal_001_api_tokens';
import {
  down as suiteDown,
  INTERNAL_RECORD_COMMENTS_TABLE,
  up as suiteUp,
} from './nc_internal_004_product_suite';
import { down, up } from './nc_internal_005_parity_hardening';

describe('nc_internal_005_parity_hardening migration', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knexFactory({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    await tokensUp(db);
    await suiteUp(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('adds reversible token-disable and discussion-resolution fields', async () => {
    await up(db);

    expect(
      await db.schema.hasColumn(INTERNAL_API_TOKENS_TABLE, 'disabled_at'),
    ).toBe(true);
    expect(
      await db.schema.hasColumn(INTERNAL_RECORD_COMMENTS_TABLE, 'resolved_at'),
    ).toBe(true);
    expect(
      await db.schema.hasColumn(INTERNAL_RECORD_COMMENTS_TABLE, 'resolved_by'),
    ).toBe(true);

    await down(db);

    expect(
      await db.schema.hasColumn(INTERNAL_API_TOKENS_TABLE, 'disabled_at'),
    ).toBe(false);
    expect(
      await db.schema.hasColumn(INTERNAL_RECORD_COMMENTS_TABLE, 'resolved_at'),
    ).toBe(false);
    expect(
      await db.schema.hasColumn(INTERNAL_RECORD_COMMENTS_TABLE, 'resolved_by'),
    ).toBe(false);

    await suiteDown(db);
    await tokensDown(db);
  });
});
