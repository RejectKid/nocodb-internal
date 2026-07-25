import knexFactory from 'knex';
import type { Knex } from 'knex';
import type { MetaService } from '~/meta/meta.service';
import {
  down,
  INTERNAL_VALIDATION_RULES_TABLE,
  up,
} from '../migrations/nc_internal_004_product_suite';
import { InternalValidationRepository } from './internal-validation.repository';

jest.mock('~/meta/meta.service', () => ({ MetaService: class {} }));

describe('InternalValidationRepository', () => {
  let knex: Knex;
  let repository: InternalValidationRepository;

  beforeAll(async () => {
    knex = knexFactory({
      client: 'sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    await up(knex);
    repository = new InternalValidationRepository({
      knexConnection: knex,
    } as MetaService);
  });

  beforeEach(async () => {
    await knex(INTERNAL_VALIDATION_RULES_TABLE).delete();
  });

  afterAll(async () => {
    await down(knex);
    await knex.destroy();
  });

  it('creates and then reads a rule set on SQLite', async () => {
    const saved = await repository.replace({
      workspaceId: 'workspace-1',
      baseId: 'base-1',
      modelId: 'model-1',
      fieldKey: 'Title',
      rules: [{ type: 'minLength', value: 3 }],
      actorId: 'user-1',
    });

    expect(saved).toEqual(
      expect.objectContaining({
        fieldKey: 'Title',
        revision: 1,
        rules: [{ type: 'minLength', value: 3 }],
      }),
    );
    await expect(
      repository.list('workspace-1', 'base-1', 'model-1'),
    ).resolves.toEqual([expect.objectContaining({ id: saved.id })]);
  });

  it('updates an existing rule without reusing the prior query builder', async () => {
    const first = await repository.replace({
      workspaceId: 'workspace-1',
      baseId: 'base-1',
      modelId: 'model-1',
      fieldKey: 'Title',
      rules: [{ type: 'required' }],
      actorId: 'user-1',
    });
    const second = await repository.replace({
      workspaceId: 'workspace-1',
      baseId: 'base-1',
      modelId: 'model-1',
      fieldKey: 'Title',
      rules: [{ type: 'maxLength', value: 20 }],
      expectedRevision: first.revision,
      actorId: 'user-2',
    });

    expect(second).toEqual(
      expect.objectContaining({
        id: first.id,
        revision: 2,
        updatedBy: 'user-2',
        rules: [{ type: 'maxLength', value: 20 }],
      }),
    );
  });
});
