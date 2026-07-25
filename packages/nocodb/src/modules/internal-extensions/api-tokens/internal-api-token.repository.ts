import type {
  InternalApiToken,
  InternalApiTokenRecord,
} from './internal-api-token.model';
import type { Knex } from 'knex';

export type InternalApiTokenMutableFields = Pick<
  InternalApiTokenRecord,
  | 'display_name'
  | 'expires_at'
  | 'allowed_workspace_ids'
  | 'allowed_base_ids'
  | 'scopes'
>;

export class InternalApiTokenPrefixConflictError extends Error {
  constructor(readonly prefix: string) {
    super(`Internal API token prefix already exists: ${prefix}`);
    this.name = 'InternalApiTokenPrefixConflictError';
  }
}

export abstract class InternalApiTokenRepository {
  abstract insert(
    record: InternalApiTokenRecord,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken>;
  abstract findById(
    id: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null>;
  abstract findByPrefix(
    prefix: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null>;
  abstract listByUserId(
    userId: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken[]>;
  abstract revoke(
    id: string,
    revokedBy: string,
    revokedAt: Date,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null>;
  abstract update(
    id: string,
    fields: InternalApiTokenMutableFields,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null>;
  abstract setDisabled(
    id: string,
    disabledAt: Date | null,
    transaction?: Knex.Transaction,
  ): Promise<InternalApiToken | null>;
  abstract markUsed(
    id: string,
    usedAt: Date,
    previousUseNotAfter: Date,
    transaction?: Knex.Transaction,
  ): Promise<boolean>;
}
