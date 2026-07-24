import type {
  InternalBasePermissionConfiguration,
  InternalBasePermissionGrant,
  InternalPermissionEffect,
  InternalPermissionSubjectType,
} from './internal-base-permission.model';
import type { InternalBasePermission } from './internal-base-permission';
import type { InternalEffectiveBasePermission } from './internal-base-permission.service';

export interface InternalBasePermissionStateResponse {
  configuration: InternalBasePermissionConfiguration | null;
  grants: InternalBasePermissionGrant[];
  grantSets: InternalBasePermissionGrantSet[];
  emptyGrantRevision: string;
  catalog: readonly InternalBasePermission[];
  currentActorEffectivePermissions: InternalEffectiveBasePermission[];
}

export interface UpdateInternalBasePermissionConfigurationRequest {
  enabled: boolean;
  expectedUpdatedAt: string | null;
}

export interface InternalBasePermissionAssignment {
  permission: InternalBasePermission;
  effect: InternalPermissionEffect;
}

export interface ReplaceInternalBasePermissionGrantsRequest {
  subjectType: InternalPermissionSubjectType;
  subjectId: string;
  assignments: InternalBasePermissionAssignment[];
  expectedRevision: string;
}

export interface InternalBasePermissionGrantSet {
  subjectType: InternalPermissionSubjectType;
  subjectId: string;
  assignments: InternalBasePermissionAssignment[];
  revision: string;
}
