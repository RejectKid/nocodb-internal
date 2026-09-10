import type { InternalBasePermission } from './internal-base-permission';

export enum InternalPermissionSubjectType {
  USER = 'user',
  ROLE = 'role',
  TEAM = 'team',
}

export enum InternalPermissionEffect {
  ALLOW = 'allow',
  DENY = 'deny',
}

export interface InternalBasePermissionConfiguration {
  workspace_id: string;
  base_id: string;
  enabled: boolean;
  schema_version: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface InternalBasePermissionGrant {
  id: string;
  workspace_id: string;
  base_id: string;
  subject_type: InternalPermissionSubjectType;
  subject_id: string;
  permission: InternalBasePermission;
  effect: InternalPermissionEffect;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}
