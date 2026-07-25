jest.mock('~/models/User', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));
jest.mock('~/meta/meta.service', () => ({
  MetaService: class MetaService {},
}));

import User from '~/models/User';
import { CommunityInternalTokenOwnerProvider } from './community-internal-token-owner.provider';

describe('CommunityInternalTokenOwnerProvider', () => {
  const getUser = User.get as jest.Mock;
  const provider = new CommunityInternalTokenOwnerProvider({} as never);

  beforeEach(() => jest.clearAllMocks());

  it('projects only current authentication facts for an active owner', async () => {
    getUser.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      email_verified: true,
      display_name: 'Owner',
      password: 'must-not-project',
    });

    await expect(provider.load('user-1')).resolves.toEqual({
      authorization: {
        id: 'user-1',
        state: 'active',
        permissions: ['authenticated'],
      },
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        email_verified: true,
        display_name: 'Owner',
      },
    });
  });

  it.each([
    [{ blocked: true }, 'blocked'],
    [{ disabled: true }, 'disabled'],
    [{ is_deleted: true }, 'deleted'],
  ])('maps an ineligible owner to %s state', async (lifecycle, state) => {
    getUser.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      ...lifecycle,
    });

    await expect(provider.load('user-1')).resolves.toMatchObject({
      authorization: { state },
    });
  });

  it('returns null when the authoritative Community lookup has no user', async () => {
    getUser.mockResolvedValue(null);
    await expect(provider.load('missing')).resolves.toBeNull();
  });
});
