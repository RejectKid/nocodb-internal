import knexFactory from 'knex';
import {
  down,
  INTERNAL_API_TOKENS_TABLE,
  up,
} from './nc_internal_001_api_tokens';

describe('nc_internal_001_api_tokens migration', () => {
  const knex = knexFactory({
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
  });

  afterAll(async () => {
    await knex.destroy();
  });

  it('creates and rolls back the independent token table', async () => {
    await up(knex);

    expect(await knex.schema.hasTable(INTERNAL_API_TOKENS_TABLE)).toBe(true);
    const columns = await knex(INTERNAL_API_TOKENS_TABLE).columnInfo();
    expect(Object.keys(columns)).toEqual(
      expect.arrayContaining([
        'id',
        'user_id',
        'display_name',
        'token_hash',
        'token_prefix',
        'expires_at',
        'revoked_at',
        'allowed_workspace_ids',
        'allowed_base_ids',
        'scopes',
        'scope_version',
        'metadata',
      ]),
    );
    expect(columns).not.toHaveProperty('token');

    await down(knex);
    expect(await knex.schema.hasTable(INTERNAL_API_TOKENS_TABLE)).toBe(false);
  });
});
