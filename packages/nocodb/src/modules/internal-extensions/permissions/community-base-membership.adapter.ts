import { ProjectRoles } from 'nocodb-sdk';
import type { InternalBasePermissionActor } from './internal-base-permission.policy';

export interface CommunityBaseMembershipFacts {
  id: string;
  blocked?: boolean;
  is_deleted?: boolean;
  base_roles?: Record<string, boolean> | null;
}

/**
 * Converts the authoritative result of Community User.getWithRoles into the
 * small facts consumed by the independent internal policy.
 */
export class CommunityBaseMembershipAdapter {
  fromCommunityUser(
    user: CommunityBaseMembershipFacts | null,
  ): InternalBasePermissionActor | null {
    if (!user) {
      return null;
    }

    const roles = Object.entries(user.base_roles ?? {})
      .filter(([, enabled]) => enabled)
      .map(([role]) => role)
      .sort();

    return {
      id: user.id,
      state: user.is_deleted ? 'deleted' : user.blocked ? 'blocked' : 'active',
      roles,
      isOwner: roles.includes(ProjectRoles.OWNER),
    };
  }
}
