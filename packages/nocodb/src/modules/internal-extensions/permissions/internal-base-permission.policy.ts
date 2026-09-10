import type { InternalBasePermission } from './internal-base-permission';
import type {
  InternalBasePermissionConfiguration,
  InternalBasePermissionGrant,
} from './internal-base-permission.model';

export type InternalPermissionActorState =
  | 'active'
  | 'blocked'
  | 'disabled'
  | 'deleted';

export interface InternalBasePermissionActor {
  id: string;
  state: InternalPermissionActorState;
  roles: readonly string[];
  isOwner: boolean;
  teamIds?: readonly string[];
}

export interface InternalBasePermissionRequest {
  workspaceId: string;
  baseId: string;
  permission: InternalBasePermission;
  actor: InternalBasePermissionActor | null;
  configuration: InternalBasePermissionConfiguration | null;
  grants: readonly InternalBasePermissionGrant[];
  communityAllowed: boolean;
}

export type InternalBasePermissionDecisionSource =
  | 'authentication'
  | 'community'
  | 'owner'
  | 'user'
  | 'role'
  | 'team'
  | 'default';

export interface InternalBasePermissionDecision {
  allowed: boolean;
  mode: 'community' | 'internal';
  source: InternalBasePermissionDecisionSource;
  reason: string;
}

export abstract class InternalBasePermissionPolicy {
  abstract evaluate(
    request: InternalBasePermissionRequest,
  ): InternalBasePermissionDecision;
}
