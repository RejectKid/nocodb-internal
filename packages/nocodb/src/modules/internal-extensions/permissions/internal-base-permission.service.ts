import { Injectable, Optional } from '@nestjs/common';
import { InternalTeamDirectory } from '../teams/internal-team-directory';
import {
  INTERNAL_BASE_PERMISSIONS,
  type InternalBasePermission,
} from './internal-base-permission';
import { InternalBasePermissionPolicy } from './internal-base-permission.policy';
import type {
  InternalBasePermissionActor,
  InternalBasePermissionDecision,
} from './internal-base-permission.policy';
import { InternalBasePermissionRepository } from './internal-base-permission.repository';

export interface ResolveInternalBasePermissionInput {
  workspaceId: string;
  baseId: string;
  actor: InternalBasePermissionActor | null;
  communityAllowed: (permission: InternalBasePermission) => boolean;
}

export interface InternalEffectiveBasePermission {
  permission: InternalBasePermission;
  allowed: boolean;
  mode: InternalBasePermissionDecision['mode'];
  source: InternalBasePermissionDecision['source'];
  reason: string;
}

@Injectable()
export class InternalBasePermissionService {
  constructor(
    private readonly repository: InternalBasePermissionRepository,
    private readonly policy: InternalBasePermissionPolicy,
    @Optional() private readonly teams?: InternalTeamDirectory,
  ) {}

  async resolve(
    input: ResolveInternalBasePermissionInput,
    permission: InternalBasePermission,
  ): Promise<InternalBasePermissionDecision> {
    return (await this.resolveMany(input, [permission]))[0];
  }

  async resolveMany(
    input: ResolveInternalBasePermissionInput,
    permissions: readonly InternalBasePermission[],
  ): Promise<InternalBasePermissionDecision[]> {
    const actor = input.actor
      ? {
          ...input.actor,
          teamIds:
            (await this.teams?.teamIdsForUser(
              input.workspaceId,
              input.actor.id,
            )) ?? [],
        }
      : null;
    const [configuration, grants] = await Promise.all([
      this.repository.getConfiguration(input.workspaceId, input.baseId),
      this.repository.listGrants(input.workspaceId, input.baseId),
    ]);

    return permissions.map((permission) =>
      this.policy.evaluate({
        workspaceId: input.workspaceId,
        baseId: input.baseId,
        permission,
        actor,
        configuration,
        grants,
        communityAllowed: input.communityAllowed(permission),
      }),
    );
  }

  async resolveAll(
    input: ResolveInternalBasePermissionInput,
  ): Promise<InternalEffectiveBasePermission[]> {
    const actor = input.actor
      ? {
          ...input.actor,
          teamIds:
            (await this.teams?.teamIdsForUser(
              input.workspaceId,
              input.actor.id,
            )) ?? [],
        }
      : null;
    const [configuration, grants] = await Promise.all([
      this.repository.getConfiguration(input.workspaceId, input.baseId),
      this.repository.listGrants(input.workspaceId, input.baseId),
    ]);

    return INTERNAL_BASE_PERMISSIONS.map((permission) => ({
      permission,
      ...this.policy.evaluate({
        workspaceId: input.workspaceId,
        baseId: input.baseId,
        permission,
        actor,
        configuration,
        grants,
        communityAllowed: input.communityAllowed(permission),
      }),
    }));
  }
}
