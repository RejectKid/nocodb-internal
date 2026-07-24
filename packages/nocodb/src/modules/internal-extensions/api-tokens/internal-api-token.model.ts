import type { InternalApiTokenScope } from './internal-api-token-scope';

export interface InternalApiTokenRecord {
  id: string;
  user_id: string;
  display_name: string;
  token_hash: string;
  token_prefix: string;
  hash_version: number;
  created_at: string;
  created_by: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  allowed_workspace_ids: string[];
  allowed_base_ids: string[];
  scopes: InternalApiTokenScope[];
  scope_version: number;
  metadata: Record<string, unknown> | null;
}

export type InternalApiTokenSummary = Omit<
  InternalApiTokenRecord,
  'token_hash' | 'hash_version'
>;

export class InternalApiToken {
  constructor(readonly record: InternalApiTokenRecord) {}

  isExpiredAt(now: Date): boolean {
    return (
      this.record.expires_at !== null &&
      new Date(this.record.expires_at).getTime() <= now.getTime()
    );
  }

  isRevoked(): boolean {
    return this.record.revoked_at !== null;
  }

  canAuthenticateAt(now: Date): boolean {
    return !this.isRevoked() && !this.isExpiredAt(now);
  }

  toSummary(): InternalApiTokenSummary {
    const {
      token_hash: _tokenHash,
      hash_version: _hashVersion,
      ...summary
    } = this.record;
    return summary;
  }
}
