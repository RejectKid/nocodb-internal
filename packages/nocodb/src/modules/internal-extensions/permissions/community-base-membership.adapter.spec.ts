import { ProjectRoles } from 'nocodb-sdk';
import { CommunityBaseMembershipAdapter } from './community-base-membership.adapter';

describe('CommunityBaseMembershipAdapter', () => {
  const adapter = new CommunityBaseMembershipAdapter();

  it('maps only enabled effective Community base roles', () => {
    expect(
      adapter.fromCommunityUser({
        id: 'user-1',
        base_roles: {
          [ProjectRoles.EDITOR]: true,
          [ProjectRoles.VIEWER]: false,
        },
      }),
    ).toEqual({
      id: 'user-1',
      state: 'active',
      roles: [ProjectRoles.EDITOR],
      isOwner: false,
    });
  });

  it('derives owner emergency access from effective Community roles', () => {
    expect(
      adapter.fromCommunityUser({
        id: 'owner-1',
        base_roles: { [ProjectRoles.OWNER]: true },
      }),
    ).toMatchObject({ isOwner: true });
  });

  it('maps blocked and deleted lifecycle state without trusting roles', () => {
    expect(
      adapter.fromCommunityUser({
        id: 'blocked-1',
        blocked: true,
        base_roles: { [ProjectRoles.OWNER]: true },
      }),
    ).toMatchObject({ state: 'blocked' });
    expect(
      adapter.fromCommunityUser({
        id: 'deleted-1',
        blocked: true,
        is_deleted: true,
        base_roles: { [ProjectRoles.OWNER]: true },
      }),
    ).toMatchObject({ state: 'deleted' });
  });

  it('maps a missing Community user to anonymous facts', () => {
    expect(adapter.fromCommunityUser(null)).toBeNull();
  });
});
