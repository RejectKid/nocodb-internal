import { InternalApiTokenScope } from '../../api-tokens/internal-api-token-scope';
import {
  AUTHORIZATION_HARNESS_TENANTS,
  createAuthorizationIdentityFixture,
  createInternalTokenFixture,
} from './internal-authorization-fixtures';

describe('internal authorization fixtures', () => {
  it('creates distinct active, blocked, deleted, and disabled identities', () => {
    const active = createAuthorizationIdentityFixture('authorized');
    expect(active).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        isAuthorized: true,
      }),
    );
    expect(active).not.toHaveProperty('blocked');
    expect(active).not.toHaveProperty('is_deleted');
    expect(createAuthorizationIdentityFixture('blocked').blocked).toBe(true);
    expect(createAuthorizationIdentityFixture('deleted').is_deleted).toBe(true);
    expect(createAuthorizationIdentityFixture('disabled')).toEqual(
      expect.objectContaining({ blocked: true, disabled: true }),
    );
  });

  it('creates scoped token records without a plaintext token field', () => {
    const token = createInternalTokenFixture({
      scopes: [InternalApiTokenScope.DATA_READ],
    });
    const storedRecord = token.record as unknown as Record<string, unknown>;

    expect(token.record.scopes).toEqual([InternalApiTokenScope.DATA_READ]);
    expect(token.record.allowed_workspace_ids).toEqual([
      AUTHORIZATION_HARNESS_TENANTS.workspaceA,
    ]);
    expect(token.record.allowed_base_ids).toEqual([
      AUTHORIZATION_HARNESS_TENANTS.baseA,
    ]);
    expect(storedRecord).not.toHaveProperty('token');
    expect(storedRecord).not.toHaveProperty('value');
    expect(storedRecord).not.toHaveProperty('secret');
  });

  it('creates deterministic expiration and revocation fixtures', () => {
    const now = new Date('2030-01-01T00:00:00.000Z');

    expect(
      createInternalTokenFixture({ now, expired: true }).isExpiredAt(now),
    ).toBe(true);
    expect(createInternalTokenFixture({ now, revoked: true }).isRevoked()).toBe(
      true,
    );
  });
});
