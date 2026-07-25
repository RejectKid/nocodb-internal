import { ProjectRoles } from 'nocodb-sdk';
import { createInternalTokenFixture } from '../testing/authorization/internal-authorization-fixtures';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { DefaultInternalTokenAuthorizationPolicy } from './default-internal-token-authorization.policy';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY } from './internal-token-authentication.guard';
import { InternalTokenScopeGuard } from './internal-token-scope.guard';

const executionContext = (request: Record<string, any>) =>
  ({
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any);

const metadata = {
  scope: InternalApiTokenScope.DATA_READ,
  target: 'base' as const,
  ownerPermission: InternalBasePermission.RECORDS_READ,
};

const requestWithToken = (
  token = createInternalTokenFixture({
    now: new Date(Date.now() - 1_000),
    scopes: [InternalApiTokenScope.DATA_READ],
  }),
) => ({
  params: { workspaceId: 'workspace-a', baseId: 'base-a' },
  context: { workspace_id: 'workspace-a', base_id: 'base-a' },
  [INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY]: {
    token,
    owner: {
      authorization: {
        id: 'user-token-owner',
        state: 'active',
        permissions: ['authenticated'],
      },
      user: {
        id: 'user-token-owner',
        email: 'owner@example.com',
        email_verified: true,
      },
    },
  },
});

describe('InternalTokenScopeGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const identityProvider = {
    resolve: jest.fn(),
  };
  const permissionService = {
    resolve: jest.fn(),
  };
  const repository = {
    markUsed: jest.fn(),
  };
  let guard: InternalTokenScopeGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(metadata);
    identityProvider.resolve.mockResolvedValue({
      id: 'user-token-owner',
      state: 'active',
      roles: [ProjectRoles.OWNER],
      isOwner: true,
    });
    permissionService.resolve.mockResolvedValue({ allowed: true });
    repository.markUsed.mockResolvedValue(true);
    guard = new InternalTokenScopeGuard(
      reflector as never,
      new DefaultInternalTokenAuthorizationPolicy(),
      identityProvider as never,
      permissionService as never,
      repository as never,
    );
  });

  it('does not alter authenticated session requests', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(
      guard.canActivate(executionContext({ user: { id: 'session-user' } })),
    ).resolves.toBe(true);
    expect(repository.markUsed).not.toHaveBeenCalled();
  });

  it('intersects scope, tenant boundary, and current owner permission', async () => {
    await expect(
      guard.canActivate(executionContext(requestWithToken())),
    ).resolves.toBe(true);
    expect(identityProvider.resolve).toHaveBeenCalledWith(
      expect.anything(),
      'workspace-a',
      'base-a',
      'user-token-owner',
    );
    expect(permissionService.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-a',
        baseId: 'base-a',
      }),
      InternalBasePermission.RECORDS_READ,
    );
    expect(repository.markUsed).toHaveBeenCalledWith(
      'internal-token-fixture',
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('denies missing route metadata, scope, boundaries, and owner permission', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(undefined);
    await expect(
      guard.canActivate(executionContext(requestWithToken())),
    ).rejects.toMatchObject({ status: 403 });

    const missingScope = createInternalTokenFixture({
      now: new Date(Date.now() - 1_000),
      scopes: [InternalApiTokenScope.DATA_UPDATE],
    });
    await expect(
      guard.canActivate(executionContext(requestWithToken(missingScope))),
    ).rejects.toMatchObject({ status: 403 });

    const crossBaseRequest = requestWithToken();
    crossBaseRequest.params.baseId = 'base-b';
    crossBaseRequest.context.base_id = 'base-b';
    await expect(
      guard.canActivate(executionContext(crossBaseRequest)),
    ).rejects.toMatchObject({ status: 403 });

    permissionService.resolve.mockResolvedValueOnce({ allowed: false });
    await expect(
      guard.canActivate(executionContext(requestWithToken())),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.markUsed).not.toHaveBeenCalled();
  });

  it('distinguishes lifecycle authentication failures from scope denials', async () => {
    const revoked = createInternalTokenFixture({
      now: new Date(),
      scopes: [InternalApiTokenScope.DATA_READ],
      revoked: true,
    });
    await expect(
      guard.canActivate(executionContext(requestWithToken(revoked))),
    ).rejects.toMatchObject({ status: 401 });
  });
});
