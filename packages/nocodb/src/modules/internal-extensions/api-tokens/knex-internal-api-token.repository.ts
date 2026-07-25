import { z } from 'zod';
import type { Knex } from 'knex';
import type { MetaService } from '~/meta/meta.service';
import { INTERNAL_API_TOKENS_TABLE } from '../migrations/nc_internal_001_api_tokens';
import { InternalApiTokenScope } from './internal-api-token-scope';
import {
  InternalApiToken,
  type InternalApiTokenRecord,
} from './internal-api-token.model';
import {
  InternalApiTokenPrefixConflictError,
  InternalApiTokenRepository,
} from './internal-api-token.repository';

type InternalApiTokenDatabaseRow = Omit<
  InternalApiTokenRecord,
  | 'allowed_workspace_ids'
  | 'allowed_base_ids'
  | 'scopes'
  | 'metadata'
  | 'created_at'
  | 'expires_at'
  | 'last_used_at'
  | 'disabled_at'
  | 'revoked_at'
> & {
  allowed_workspace_ids: string;
  allowed_base_ids: string;
  scopes: string;
  metadata: string | null;
  created_at: string | Date;
  expires_at: string | Date | null;
  last_used_at: string | Date | null;
  disabled_at: string | Date | null;
  revoked_at: string | Date | null;
};

const identifierListSchema = z.array(z.string().min(1).max(255)).max(1_000);
const scopeListSchema = z.array(z.nativeEnum(InternalApiTokenScope)).max(100);
const metadataSchema = z.record(z.unknown()).nullable();

export class InternalApiTokenDataError extends Error {
  constructor(field: string) {
    super(`Stored internal API token has invalid ${field}`);
    this.name = 'InternalApiTokenDataError';
  }
}

function parseJsonField<T>(
  value: string,
  field: string,
  schema: z.ZodType<T>,
): T {
  try {
    return schema.parse(JSON.parse(value));
  } catch {
    throw new InternalApiTokenDataError(field);
  }
}

function toIsoTimestamp(
  value: string | Date | null,
  field: string,
): string | null {
  if (value === null) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InternalApiTokenDataError(field);
  }
  return parsed.toISOString();
}

function toDatabaseRow(
  record: InternalApiTokenRecord,
): InternalApiTokenDatabaseRow {
  return {
    ...record,
    allowed_workspace_ids: JSON.stringify(record.allowed_workspace_ids),
    allowed_base_ids: JSON.stringify(record.allowed_base_ids),
    scopes: JSON.stringify(record.scopes),
    metadata: record.metadata === null ? null : JSON.stringify(record.metadata),
  };
}

function toModel(row: InternalApiTokenDatabaseRow): InternalApiToken {
  const createdAt = toIsoTimestamp(row.created_at, 'created_at');
  if (createdAt === null) {
    throw new InternalApiTokenDataError('created_at');
  }

  return new InternalApiToken({
    ...row,
    created_at: createdAt,
    expires_at: toIsoTimestamp(row.expires_at, 'expires_at'),
    last_used_at: toIsoTimestamp(row.last_used_at, 'last_used_at'),
    disabled_at: toIsoTimestamp(row.disabled_at, 'disabled_at'),
    revoked_at: toIsoTimestamp(row.revoked_at, 'revoked_at'),
    allowed_workspace_ids: parseJsonField(
      row.allowed_workspace_ids,
      'allowed_workspace_ids',
      identifierListSchema,
    ),
    allowed_base_ids: parseJsonField(
      row.allowed_base_ids,
      'allowed_base_ids',
      identifierListSchema,
    ),
    scopes: parseJsonField(row.scopes, 'scopes', scopeListSchema),
    metadata:
      row.metadata === null
        ? null
        : parseJsonField(row.metadata, 'metadata', metadataSchema),
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? String(error.code) : '';
  return [
    '23505',
    'ER_DUP_ENTRY',
    'SQLITE_CONSTRAINT',
    'SQLITE_CONSTRAINT_UNIQUE',
  ].includes(code);
}

export class KnexInternalApiTokenRepository extends InternalApiTokenRepository {
  constructor(
    private readonly metaService: Pick<MetaService, 'knexConnection'>,
  ) {
    super();
  }

  async insert(
    record: InternalApiTokenRecord,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken> {
    try {
      await this.table(transaction).insert(toDatabaseRow(record));
    } catch (error) {
      if (
        isUniqueConstraintError(error) &&
        (await this.findByPrefix(record.token_prefix, transaction))
      ) {
        throw new InternalApiTokenPrefixConflictError(record.token_prefix);
      }
      throw error;
    }

    const inserted = await this.findById(record.id, transaction);
    if (!inserted) {
      throw new Error('Inserted internal API token could not be reloaded');
    }
    return inserted;
  }

  async findById(
    id: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null> {
    const row = await this.table(transaction).where({ id }).first();
    return row ? toModel(row) : null;
  }

  async findByPrefix(
    prefix: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null> {
    const row = await this.table(transaction)
      .where({ token_prefix: prefix })
      .first();
    return row ? toModel(row) : null;
  }

  async listByUserId(
    userId: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken[]> {
    const rows = await this.table(transaction)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    return rows.map(toModel);
  }

  async revoke(
    id: string,
    revokedBy: string,
    revokedAt: Date,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null> {
    await this.table(transaction).where({ id }).whereNull('revoked_at').update({
      revoked_at: revokedAt.toISOString(),
      revoked_by: revokedBy,
    });

    return this.findById(id, transaction);
  }

  async update(
    id: string,
    fields: import('./internal-api-token.repository').InternalApiTokenMutableFields,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null> {
    await this.table(transaction)
      .where({ id })
      .whereNull('revoked_at')
      .update({
        display_name: fields.display_name,
        expires_at: fields.expires_at,
        allowed_workspace_ids: JSON.stringify(fields.allowed_workspace_ids),
        allowed_base_ids: JSON.stringify(fields.allowed_base_ids),
        scopes: JSON.stringify(fields.scopes),
      });
    return this.findById(id, transaction);
  }

  async setDisabled(
    id: string,
    disabledAt: Date | null,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null> {
    await this.table(transaction)
      .where({ id })
      .whereNull('revoked_at')
      .update({ disabled_at: disabledAt?.toISOString() ?? null });
    return this.findById(id, transaction);
  }

  async markUsed(
    id: string,
    usedAt: Date,
    previousUseNotAfter: Date,
    transaction?: Knex.Transaction,
  ): Promise<boolean> {
    const updated = await this.table(transaction)
      .where({ id })
      .whereNull('revoked_at')
      .whereNull('disabled_at')
      .andWhere((builder) =>
        builder
          .whereNull('last_used_at')
          .orWhere('last_used_at', '<=', previousUseNotAfter.toISOString()),
      )
      .update({ last_used_at: usedAt.toISOString() });
    return Number(updated) > 0;
  }

  private table(transaction?: Knex.Transaction) {
    const connection = transaction ?? this.metaService.knexConnection;
    return connection<InternalApiTokenDatabaseRow>(INTERNAL_API_TOKENS_TABLE);
  }
}
