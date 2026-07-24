import type {
  InternalApiToken,
  InternalApiTokenRecord,
} from './internal-api-token.model';

export class InternalApiTokenPrefixConflictError extends Error {
  constructor(readonly prefix: string) {
    super(`Internal API token prefix already exists: ${prefix}`);
    this.name = 'InternalApiTokenPrefixConflictError';
  }
}

export abstract class InternalApiTokenRepository {
  abstract insert(record: InternalApiTokenRecord): Promise<InternalApiToken>;
  abstract findById(id: string): Promise<InternalApiToken | null>;
  abstract findByPrefix(prefix: string): Promise<InternalApiToken | null>;
  abstract listByUserId(userId: string): Promise<InternalApiToken[]>;
  abstract revoke(
    id: string,
    revokedBy: string,
    revokedAt: Date,
  ): Promise<InternalApiToken | null>;
}
