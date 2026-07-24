import { InternalApiToken } from './internal-api-token.model';

const record = {
  id: 'token-1',
  user_id: 'user-1',
  display_name: 'Automation',
  token_hash: 'hash',
  token_prefix: 'nci_prefix',
  hash_version: 1,
  created_at: '2026-07-23T12:00:00.000Z',
  created_by: 'user-1',
  expires_at: '2026-07-24T12:00:00.000Z',
  last_used_at: null,
  revoked_at: null,
  revoked_by: null,
  allowed_workspace_ids: [],
  allowed_base_ids: [],
  scopes: [],
  scope_version: 1,
  metadata: null,
};

describe('InternalApiToken', () => {
  it('accepts an unrevoked token before its expiration', () => {
    const token = new InternalApiToken(record);

    expect(token.canAuthenticateAt(new Date('2026-07-24T11:59:59.999Z'))).toBe(
      true,
    );
  });

  it('expires exactly at the configured expiration time', () => {
    const token = new InternalApiToken(record);

    expect(token.canAuthenticateAt(new Date(record.expires_at))).toBe(false);
  });

  it('rejects a revoked token even before expiration', () => {
    const token = new InternalApiToken({
      ...record,
      revoked_at: '2026-07-23T13:00:00.000Z',
    });

    expect(token.canAuthenticateAt(new Date('2026-07-23T14:00:00.000Z'))).toBe(
      false,
    );
  });

  it('produces a public summary without secret-verification material', () => {
    const token = new InternalApiToken(record);

    expect(token.toSummary()).toEqual(
      expect.objectContaining({
        id: record.id,
        token_prefix: record.token_prefix,
      }),
    );
    expect(token.toSummary()).not.toHaveProperty('token_hash');
    expect(token.toSummary()).not.toHaveProperty('hash_version');
  });
});
