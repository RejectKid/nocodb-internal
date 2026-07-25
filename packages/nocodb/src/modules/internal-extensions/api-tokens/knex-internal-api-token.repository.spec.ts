import knexFactory from 'knex';
import type { Knex } from 'knex';
import type { MetaService } from '~/meta/meta.service';
import {
  down,
  INTERNAL_API_TOKENS_TABLE,
  up,
} from '../migrations/nc_internal_001_api_tokens';
import { InternalApiTokenScope } from './internal-api-token-scope';
import type { InternalApiTokenRecord } from './internal-api-token.model';
import { InternalApiTokenPrefixConflictError } from './internal-api-token.repository';
import {
  InternalApiTokenDataError,
  KnexInternalApiTokenRepository,
} from './knex-internal-api-token.repository';

function tokenRecord(
  overrides: Partial<InternalApiTokenRecord> = {},
): InternalApiTokenRecord {
  return {
    id: 'token-1',
    user_id: 'user-1',
    display_name: 'Automation',
    token_hash: 'scrypt$v1$redacted',
    token_prefix: 'nci_public001',
    hash_version: 1,
    created_at: '2026-07-23T12:00:00.000Z',
    created_by: 'user-1',
    expires_at: '2026-08-23T12:00:00.000Z',
    last_used_at: null,
    revoked_at: null,
    revoked_by: null,
    allowed_workspace_ids: ['workspace-1'],
    allowed_base_ids: ['base-1'],
    scopes: [InternalApiTokenScope.DATA_READ],
    scope_version: 1,
    metadata: { purpose: 'integration-test' },
    ...overrides,
  };
}

describe('KnexInternalApiTokenRepository', () => {
  let knex: Knex;
  let repository: KnexInternalApiTokenRepository;

  beforeAll(async () => {
    knex = knexFactory({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    await up(knex);
    repository = new KnexInternalApiTokenRepository({
      knexConnection: knex,
    } as MetaService);
  });

  beforeEach(async () => {
    await knex(INTERNAL_API_TOKENS_TABLE).delete();
  });

  afterAll(async () => {
    await down(knex);
    await knex.destroy();
  });

  it('round-trips typed token fields through portable JSON storage', async () => {
    const record = tokenRecord();

    await repository.insert(record);

    await expect(repository.findById(record.id)).resolves.toEqual(
      expect.objectContaining({
        record,
      }),
    );
    await expect(repository.findByPrefix(record.token_prefix)).resolves.toEqual(
      expect.objectContaining({
        record,
      }),
    );
    await expect(repository.listByUserId(record.user_id)).resolves.toEqual([
      expect.objectContaining({ record }),
    ]);
  });

  it('revokes a token once without allowing later revoker replacement', async () => {
    await repository.insert(tokenRecord());

    const first = await repository.revoke(
      'token-1',
      'admin-1',
      new Date('2026-07-24T12:00:00.000Z'),
    );
    const second = await repository.revoke(
      'token-1',
      'admin-2',
      new Date('2026-07-25T12:00:00.000Z'),
    );

    expect(first?.record.revoked_by).toBe('admin-1');
    expect(second?.record.revoked_by).toBe('admin-1');
    expect(second?.record.revoked_at).toBe('2026-07-24T12:00:00.000Z');
  });

  it('maps a duplicate public prefix to a typed collision error', async () => {
    await repository.insert(tokenRecord());

    await expect(
      repository.insert(
        tokenRecord({
          id: 'token-2',
          token_prefix: 'nci_public001',
        }),
      ),
    ).rejects.toBeInstanceOf(InternalApiTokenPrefixConflictError);
  });

  it('participates in the caller transaction for atomic audit mutations', async () => {
    await expect(
      knex.transaction(async (transaction) => {
        await repository.insert(tokenRecord(), transaction);
        throw new Error('roll back audit mutation');
      }),
    ).rejects.toThrow('roll back audit mutation');

    await expect(
      knex(INTERNAL_API_TOKENS_TABLE).count('* as count').first(),
    ).resolves.toEqual({ count: 0 });
  });

  it('fails closed when stored scopes are malformed', async () => {
    await repository.insert(tokenRecord());
    await knex(INTERNAL_API_TOKENS_TABLE)
      .where({ id: 'token-1' })
      .update({ scopes: '["unknown:scope"]' });

    await expect(repository.findById('token-1')).rejects.toBeInstanceOf(
      InternalApiTokenDataError,
    );
  });
});
