import knexFactory from 'knex';
import type { Knex } from 'knex';
import type { MetaService } from '~/meta/meta.service';
import {
  down,
  INTERNAL_API_TOKENS_TABLE,
  up,
} from '../migrations/nc_internal_001_api_tokens';
import { InternalApiTokenScope } from './internal-api-token-scope';
import {
  InternalApiTokenIssuanceService,
  InternalApiTokenValidationError,
} from './internal-api-token-issuance.service';
import type { GeneratedInternalToken } from './internal-token-hashing.service';
import { InternalTokenHashingService } from './internal-token-hashing.service';
import { KnexInternalApiTokenRepository } from './knex-internal-api-token.repository';
import { ScryptInternalTokenHashingService } from './scrypt-internal-token-hashing.service';

class SequenceHashingService extends InternalTokenHashingService {
  constructor(private readonly generated: GeneratedInternalToken[]) {
    super();
  }

  generate(): GeneratedInternalToken {
    const next = this.generated.shift();
    if (!next) {
      throw new Error('No generated token configured');
    }
    return next;
  }

  hash(tokenValue: string): Promise<string> {
    return Promise.resolve(`hash:${tokenValue}`);
  }

  verify(tokenValue: string, storedHash: string): Promise<boolean> {
    return Promise.resolve(storedHash === `hash:${tokenValue}`);
  }
}

describe('InternalApiTokenIssuanceService', () => {
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

  it('returns plaintext once while persisting only its hash and prefix', async () => {
    const hashingService = new ScryptInternalTokenHashingService();
    const service = new InternalApiTokenIssuanceService(
      repository,
      hashingService,
    );

    const issued = await service.create({
      userId: 'user-1',
      displayName: ' CI automation ',
      createdBy: 'user-1',
      expiresAt: new Date('2099-07-23T12:00:00.000Z'),
      allowedWorkspaceIds: ['workspace-1', 'workspace-1'],
      allowedBaseIds: ['base-1'],
      scopes: [
        InternalApiTokenScope.DATA_READ,
        InternalApiTokenScope.DATA_READ,
      ],
      metadata: { environment: 'test' },
    });
    const stored = await knex(INTERNAL_API_TOKENS_TABLE)
      .where({ id: issued.token.id })
      .first();

    expect(issued.value).toMatch(
      new RegExp(`^${issued.token.token_prefix}_[A-Za-z0-9_-]{43}$`),
    );
    expect(issued.token).not.toHaveProperty('token_hash');
    expect(issued.token).not.toHaveProperty('hash_version');
    expect(issued.token.display_name).toBe('CI automation');
    expect(issued.token.allowed_workspace_ids).toEqual(['workspace-1']);
    expect(issued.token.scopes).toEqual([InternalApiTokenScope.DATA_READ]);
    expect(stored).not.toHaveProperty('token');
    expect(stored.token_hash).not.toBe(issued.value);
    expect(JSON.stringify(stored)).not.toContain(issued.value);
    await expect(
      hashingService.verify(issued.value, stored.token_hash),
    ).resolves.toBe(true);
  });

  it('retries when a generated public prefix already exists', async () => {
    const first = {
      prefix: 'nci_collision001',
      value: `nci_collision001_${'a'.repeat(43)}`,
    };
    const second = {
      prefix: 'nci_available001',
      value: `nci_available001_${'b'.repeat(43)}`,
    };
    const hashingService = new SequenceHashingService([first, second]);
    const service = new InternalApiTokenIssuanceService(
      repository,
      hashingService,
    );

    await knex(INTERNAL_API_TOKENS_TABLE).insert({
      id: 'existing-token',
      user_id: 'user-1',
      display_name: 'Existing',
      token_hash: 'hash:existing',
      token_prefix: first.prefix,
      hash_version: 1,
      created_at: '2026-07-23T12:00:00.000Z',
      created_by: 'user-1',
      allowed_workspace_ids: '[]',
      allowed_base_ids: '[]',
      scopes: '[]',
      scope_version: 1,
    });

    const issued = await service.create({
      userId: 'user-1',
      displayName: 'Replacement',
      createdBy: 'user-1',
      expiresAt: new Date('2099-07-23T12:00:00.000Z'),
    });

    expect(issued.value).toBe(second.value);
    expect(issued.token.token_prefix).toBe(second.prefix);
    await expect(
      knex(INTERNAL_API_TOKENS_TABLE).count('* as count').first(),
    ).resolves.toEqual({ count: 2 });
  });

  it('rejects expired issuance and invalid scope input before persistence', async () => {
    const service = new InternalApiTokenIssuanceService(
      repository,
      new ScryptInternalTokenHashingService(),
    );

    await expect(
      service.create({
        userId: 'user-1',
        displayName: 'Expired',
        createdBy: 'user-1',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(InternalApiTokenValidationError);

    await expect(
      service.create({
        userId: 'user-1',
        displayName: 'Invalid scope',
        createdBy: 'user-1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        scopes: ['unknown:scope' as InternalApiTokenScope],
      }),
    ).rejects.toBeInstanceOf(InternalApiTokenValidationError);

    await expect(
      knex(INTERNAL_API_TOKENS_TABLE).count('* as count').first(),
    ).resolves.toEqual({ count: 0 });
  });
});
