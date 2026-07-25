import { createInternalTokenFixture } from '../testing/authorization/internal-authorization-fixtures';
import { DefaultInternalTokenAuthorizationPolicy } from './default-internal-token-authorization.policy';
import { InternalApiToken } from './internal-api-token.model';
import { InternalApiTokenScope } from './internal-api-token-scope';
import {
  InternalTokenAuthenticationError,
  InternalTokenAuthenticationService,
} from './internal-token-authentication.service';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from './internal-token-owner.provider';
import { InternalTokenVerificationRateLimiter } from './internal-token-verification-rate-limiter';

const now = new Date('2030-01-01T00:00:00.000Z');
const prefix = 'nci_abcdefghijkl';
const value = `${prefix}_${'s'.repeat(43)}`;

const token = (overrides: Record<string, unknown> = {}) => {
  const fixture = createInternalTokenFixture({
    now,
    scopes: [InternalApiTokenScope.DATA_READ],
  });
  return new InternalApiToken({
    ...fixture.record,
    token_prefix: prefix,
    ...overrides,
  });
};

describe('InternalTokenAuthenticationService', () => {
  const repository = {
    findByPrefix: jest.fn(),
  };
  const hashing = {
    verify: jest.fn(),
  };
  const ownerProvider = {
    load: jest.fn(),
  };
  let service: InternalTokenAuthenticationService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByPrefix.mockResolvedValue(token());
    hashing.verify.mockResolvedValue(true);
    ownerProvider.load.mockResolvedValue({
      authorization: {
        id: 'user-token-owner',
        state: 'active',
        permissions: [INTERNAL_TOKEN_AUTHENTICATED_PERMISSION],
      },
      user: {
        id: 'user-token-owner',
        email: 'owner@example.com',
        email_verified: true,
      },
    });
    service = new InternalTokenAuthenticationService(
      repository as never,
      hashing as never,
      ownerProvider as never,
      new DefaultInternalTokenAuthorizationPolicy(),
      new InternalTokenVerificationRateLimiter({
        maxFailures: 20,
        windowMs: 60_000,
        maxBuckets: 100,
      }),
    );
  });

  it('performs bounded prefix lookup, hash verification, and fresh owner loading', async () => {
    await expect(
      service.authenticate(value, '127.0.0.1', now),
    ).resolves.toMatchObject({
      token: { record: { token_prefix: prefix } },
      owner: { user: { id: 'user-token-owner' } },
    });
    expect(repository.findByPrefix).toHaveBeenCalledWith(prefix);
    expect(hashing.verify).toHaveBeenCalledWith(
      value,
      token().record.token_hash,
    );
    expect(ownerProvider.load).toHaveBeenCalledWith('user-token-owner');
  });

  it.each([
    ['malformed', `nci_${'x'.repeat(500)}`],
    ['wrong secret', value],
    ['unknown prefix', value],
  ])('returns the same generic failure for %s input', async (kind, input) => {
    if (kind === 'wrong secret') {
      hashing.verify.mockResolvedValue(false);
    }
    if (kind === 'unknown prefix') {
      repository.findByPrefix.mockResolvedValue(null);
    }

    const promise = service.authenticate(input, '127.0.0.1', now);
    await expect(promise).rejects.toEqual(
      expect.objectContaining({
        name: 'InternalTokenAuthenticationError',
        message: 'Invalid internal API token',
      }),
    );
    await expect(promise).rejects.not.toThrow(input);
    if (kind === 'malformed') {
      expect(repository.findByPrefix).not.toHaveBeenCalled();
    }
  });

  it('fails authentication for revoked tokens and blocked owners', async () => {
    repository.findByPrefix.mockResolvedValueOnce(
      token({ revoked_at: now.toISOString() }),
    );
    await expect(
      service.authenticate(value, '127.0.0.1', now),
    ).rejects.toBeInstanceOf(InternalTokenAuthenticationError);

    ownerProvider.load.mockResolvedValueOnce({
      authorization: {
        id: 'user-token-owner',
        state: 'blocked',
        permissions: [],
      },
      user: {
        id: 'user-token-owner',
        email: 'owner@example.com',
        email_verified: true,
      },
    });
    await expect(
      service.authenticate(value, '127.0.0.2', now),
    ).rejects.toBeInstanceOf(InternalTokenAuthenticationError);
  });
});
