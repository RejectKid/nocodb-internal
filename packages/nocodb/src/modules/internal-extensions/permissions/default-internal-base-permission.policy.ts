import { Injectable } from '@nestjs/common';
import {
  InternalPermissionEffect,
  InternalPermissionSubjectType,
} from './internal-base-permission.model';
import {
  InternalBasePermissionPolicy,
  type InternalBasePermissionDecision,
  type InternalBasePermissionRequest,
} from './internal-base-permission.policy';

@Injectable()
export class DefaultInternalBasePermissionPolicy extends InternalBasePermissionPolicy {
  evaluate(
    request: InternalBasePermissionRequest,
  ): InternalBasePermissionDecision {
    if (!request.actor) {
      return this.deny('community', 'authentication', 'anonymous');
    }
    if (request.actor.state !== 'active') {
      return this.deny(
        'community',
        'authentication',
        `user_${request.actor.state}`,
      );
    }

    if (!request.configuration?.enabled) {
      return {
        allowed: request.communityAllowed,
        mode: 'community',
        source: 'community',
        reason: request.communityAllowed
          ? 'community_allowed'
          : 'community_denied',
      };
    }

    if (
      request.configuration.workspace_id !== request.workspaceId ||
      request.configuration.base_id !== request.baseId
    ) {
      return this.deny('internal', 'default', 'configuration_context_mismatch');
    }
    if (
      request.grants.some(
        (grant) =>
          grant.workspace_id !== request.workspaceId ||
          grant.base_id !== request.baseId,
      )
    ) {
      return this.deny('internal', 'default', 'grant_context_mismatch');
    }
    if (request.actor.isOwner) {
      return {
        allowed: true,
        mode: 'internal',
        source: 'owner',
        reason: 'owner_emergency_access',
      };
    }

    const relevant = request.grants.filter(
      (grant) => grant.permission === request.permission,
    );
    const userGrant = relevant.find(
      (grant) =>
        grant.subject_type === InternalPermissionSubjectType.USER &&
        grant.subject_id === request.actor?.id,
    );
    if (userGrant) {
      return this.fromEffect(userGrant.effect, 'user');
    }

    const teamGrants = relevant.filter(
      (grant) =>
        grant.subject_type === InternalPermissionSubjectType.TEAM &&
        request.actor?.teamIds?.includes(grant.subject_id),
    );
    if (
      teamGrants.some((grant) => grant.effect === InternalPermissionEffect.DENY)
    )
      return this.fromEffect(InternalPermissionEffect.DENY, 'team');
    if (
      teamGrants.some(
        (grant) => grant.effect === InternalPermissionEffect.ALLOW,
      )
    )
      return this.fromEffect(InternalPermissionEffect.ALLOW, 'team');

    const roleGrants = relevant.filter(
      (grant) =>
        grant.subject_type === InternalPermissionSubjectType.ROLE &&
        request.actor?.roles.includes(grant.subject_id),
    );
    if (
      roleGrants.some((grant) => grant.effect === InternalPermissionEffect.DENY)
    ) {
      return this.fromEffect(InternalPermissionEffect.DENY, 'role');
    }
    if (
      roleGrants.some(
        (grant) => grant.effect === InternalPermissionEffect.ALLOW,
      )
    ) {
      return this.fromEffect(InternalPermissionEffect.ALLOW, 'role');
    }

    return this.deny('internal', 'default', 'no_matching_grant');
  }

  private fromEffect(
    effect: InternalPermissionEffect,
    source: 'user' | 'role' | 'team',
  ): InternalBasePermissionDecision {
    return {
      allowed: effect === InternalPermissionEffect.ALLOW,
      mode: 'internal',
      source,
      reason: `${source}_${effect}`,
    };
  }

  private deny(
    mode: 'community' | 'internal',
    source: InternalBasePermissionDecision['source'],
    reason: string,
  ): InternalBasePermissionDecision {
    return { allowed: false, mode, source, reason };
  }
}
