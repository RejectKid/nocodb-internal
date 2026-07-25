import { createInternalTokenFixture } from '../testing/authorization/internal-authorization-fixtures';
import { DefaultInternalTokenAuthorizationPolicy } from './default-internal-token-authorization.policy';
import { INTERNAL_API_TOKEN_SCOPE_CATALOG } from './internal-api-token-scope.catalog';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { InternalApiToken } from './internal-api-token.model';
import type {
  InternalTokenAuthorizationRequest,
  InternalTokenOwnerContext,
} from './internal-token-authorization.policy';

const now = new Date('2030-01-01T00:00:00.000Z');
const requiredOwnerPermission = 'records:read';

function owner(
  overrides: Partial<InternalTokenOwnerContext> = {},
): InternalTokenOwnerContext {
  return {
    id: 'user-token-owner',
    state: 'active',
    permissions: [requiredOwnerPermission],
    ...overrides,
  };
}

function request(
  overrides: Partial<InternalTokenAuthorizationRequest> = {},
): InternalTokenAuthorizationRequest {
  return {
    token: createInternalTokenFixture({
      now,
      scopes: [InternalApiTokenScope.DATA_READ],
    }),
    owner: owner(),
    requiredScope: InternalApiTokenScope.DATA_READ,
    requiredOwnerPermission,
    target: {
      kind: 'base',
      workspaceId: 'workspace-a',
      baseId: 'base-a',
    },
    now,
    ...overrides,
  };
}

describe('DefaultInternalTokenAuthorizationPolicy', () => {
  const policy = new DefaultInternalTokenAuthorizationPolicy();

  it('authenticates an active token owner without granting a route scope', async () => {
    await expect(
      policy.authenticate({
        token: request().token,
        owner: owner({ permissions: [] }),
        now,
      }),
    ).resolves.toEqual({
      allowed: true,
      failureClass: 'none',
      reason: 'allowed',
    });
  });

  it.each(INTERNAL_API_TOKEN_SCOPE_CATALOG)(
    'allows the typed $scope scope when owner and target access intersect',
    async ({ scope }) => {
      const decision = await policy.authorize(
        request({
          token: createInternalTokenFixture({ now, scopes: [scope] }),
          requiredScope: scope,
        }),
      );

      expect(decision).toEqual({
        allowed: true,
        failureClass: 'none',
        reason: 'allowed',
      });
    },
  );

  it('keeps the scope catalog complete and duplicate-free', () => {
    const catalogScopes = INTERNAL_API_TOKEN_SCOPE_CATALOG.map(
      ({ scope }) => scope,
    );

    expect(new Set(catalogScopes).size).toBe(catalogScopes.length);
    expect(new Set(catalogScopes)).toEqual(
      new Set(Object.values(InternalApiTokenScope)),
    );
  });

  it('denies a missing required scope after owner permission succeeds', async () => {
    await expect(
      policy.authorize(
        request({ requiredScope: InternalApiTokenScope.DATA_UPDATE }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'scope_missing',
    });
  });

  it('fails authentication for unknown stored scopes or scope versions', async () => {
    const valid = request().token.record;
    const unknownScopeToken = new InternalApiToken({
      ...valid,
      scopes: ['unknown:scope' as InternalApiTokenScope],
    });
    const futureVersionToken = new InternalApiToken({
      ...valid,
      scope_version: 2,
    });

    await expect(
      policy.authorize(request({ token: unknownScopeToken })),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authentication',
      reason: 'invalid_scope_set',
    });
    await expect(
      policy.authorize(request({ token: futureVersionToken })),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authentication',
      reason: 'unsupported_scope_version',
    });
  });

  it('fails closed when a caller supplies an unsupported required scope', async () => {
    await expect(
      policy.authorize(
        request({
          requiredScope: 'unknown:scope' as InternalApiTokenScope,
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'unsupported_required_scope',
    });
  });

  it.each([
    [null, 'owner_not_found'],
    [owner({ id: 'another-user' }), 'owner_mismatch'],
    [owner({ state: 'blocked' }), 'owner_blocked'],
    [owner({ state: 'deleted' }), 'owner_deleted'],
    [owner({ state: 'disabled' }), 'owner_disabled'],
  ] as const)(
    'denies an ineligible token owner with %s',
    async (value, reason) => {
      await expect(
        policy.authorize(request({ owner: value })),
      ).resolves.toEqual({
        allowed: false,
        failureClass: 'authentication',
        reason,
      });
    },
  );

  it('intersects token scope with the current owner permission', async () => {
    await expect(
      policy.authorize(request({ owner: owner({ permissions: [] }) })),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'owner_permission_missing',
    });
  });

  it('enforces explicit workspace and base allowlists', async () => {
    await expect(
      policy.authorize(
        request({
          target: { kind: 'workspace', workspaceId: 'workspace-b' },
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'workspace_not_allowed',
    });
    await expect(
      policy.authorize(
        request({
          target: {
            kind: 'base',
            workspaceId: 'workspace-a',
            baseId: 'base-b',
          },
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'base_not_allowed',
    });
  });

  it('allows a workspace target without requiring a base allowlist entry', async () => {
    await expect(
      policy.authorize(
        request({
          token: createInternalTokenFixture({
            now,
            scopes: [InternalApiTokenScope.DATA_READ],
            allowedWorkspaceIds: ['workspace-a'],
            allowedBaseIds: [],
          }),
          target: { kind: 'workspace', workspaceId: 'workspace-a' },
        }),
      ),
    ).resolves.toEqual({
      allowed: true,
      failureClass: 'none',
      reason: 'allowed',
    });
  });

  it('denies missing tenant context and empty tenant allowlists', async () => {
    await expect(
      policy.authorize(
        request({ target: { kind: 'workspace', workspaceId: undefined } }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'workspace_context_missing',
    });
    await expect(
      policy.authorize(
        request({
          target: {
            kind: 'base',
            workspaceId: 'workspace-a',
            baseId: undefined,
          },
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'base_context_missing',
    });
    await expect(
      policy.authorize(
        request({
          token: createInternalTokenFixture({
            now,
            scopes: [InternalApiTokenScope.DATA_READ],
            allowedWorkspaceIds: [],
            allowedBaseIds: [],
          }),
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authorization',
      reason: 'workspace_not_allowed',
    });
  });

  it('allows instance targets without treating an empty tenant list as global access', async () => {
    const token = createInternalTokenFixture({
      now,
      scopes: [InternalApiTokenScope.ADMIN_READ],
      allowedWorkspaceIds: [],
      allowedBaseIds: [],
    });

    await expect(
      policy.authorize(
        request({
          token,
          requiredScope: InternalApiTokenScope.ADMIN_READ,
          requiredOwnerPermission: 'admin:read',
          owner: owner({ permissions: ['admin:read'] }),
          target: { kind: 'instance' },
        }),
      ),
    ).resolves.toEqual({
      allowed: true,
      failureClass: 'none',
      reason: 'allowed',
    });
  });

  it('checks revocation and expiration before authorization details', async () => {
    await expect(
      policy.authorize(
        request({
          token: createInternalTokenFixture({
            now,
            scopes: [],
            revoked: true,
          }),
          owner: null,
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authentication',
      reason: 'revoked',
    });
    await expect(
      policy.authorize(
        request({
          token: createInternalTokenFixture({
            now,
            scopes: [],
            expired: true,
          }),
          owner: null,
        }),
      ),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authentication',
      reason: 'expired',
    });
  });

  it('fails authentication while a token is temporarily disabled', async () => {
    const token = request().token;

    await expect(
      policy.authenticate({
        token: new InternalApiToken({
          ...token.record,
          disabled_at: now.toISOString(),
        }),
        owner: owner(),
        now,
      }),
    ).resolves.toEqual({
      allowed: false,
      failureClass: 'authentication',
      reason: 'disabled',
    });
  });
});
