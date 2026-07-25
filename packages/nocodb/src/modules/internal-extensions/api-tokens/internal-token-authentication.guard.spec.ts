import {
  InternalTokenAuthenticationGuard,
  INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY,
} from './internal-token-authentication.guard';
import { InternalTokenAuthenticationError } from './internal-token-authentication.service';
import { InternalTokenVerificationRateLimitError } from './internal-token-verification-rate-limiter';

const executionContext = (request: Record<string, any>) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any);

describe('InternalTokenAuthenticationGuard', () => {
  const authentication = {
    authenticate: jest.fn(),
  };
  const guard = new InternalTokenAuthenticationGuard(authentication as never);

  beforeEach(() => jest.clearAllMocks());

  it('leaves session and upstream token authentication unchanged', async () => {
    const request = {
      headers: { 'xc-auth': 'session' },
      context: { workspace_id: '', base_id: '' },
    };

    await expect(guard.canActivate(executionContext(request))).resolves.toBe(
      true,
    );
    expect(authentication.authenticate).not.toHaveBeenCalled();
    expect(request).not.toHaveProperty(INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY);
  });

  it('attaches a verified internal principal without retaining plaintext', async () => {
    const principal = {
      token: { record: { id: 'token-1' } },
      owner: {
        authorization: {
          id: 'user-1',
          state: 'active',
          permissions: ['authenticated'],
        },
        user: {
          id: 'user-1',
          email: 'user@example.com',
          email_verified: true,
        },
      },
    };
    authentication.authenticate.mockResolvedValue(principal);
    const value = `nci_abcdefghijkl_${'s'.repeat(43)}`;
    const request: Record<string, any> = {
      headers: { 'xc-token': value },
      context: { workspace_id: 'workspace-1', base_id: 'base-1' },
      clientIp: '127.0.0.1',
    };

    await expect(guard.canActivate(executionContext(request))).resolves.toBe(
      true,
    );
    expect(authentication.authenticate).toHaveBeenCalledWith(
      value,
      '127.0.0.1',
    );
    expect(request.user).toMatchObject({
      id: 'user-1',
      isAuthorized: true,
      is_api_token: true,
      is_internal_api_token: true,
    });
    expect(request.context.is_api_token).toBe(true);
    expect(
      JSON.stringify(request[INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY]),
    ).not.toContain(value);
  });

  it('maps token failures to generic 401 and limiter failures to 429', async () => {
    const request = {
      headers: { 'xc-token': 'nci_invalid' },
      context: { workspace_id: '', base_id: '' },
    };
    authentication.authenticate.mockRejectedValueOnce(
      new InternalTokenAuthenticationError(),
    );
    await expect(
      guard.canActivate(executionContext(request)),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid internal API token',
    });

    authentication.authenticate.mockRejectedValueOnce(
      new InternalTokenVerificationRateLimitError(),
    );
    await expect(
      guard.canActivate(executionContext(request)),
    ).rejects.toMatchObject({ status: 429 });
  });
});
