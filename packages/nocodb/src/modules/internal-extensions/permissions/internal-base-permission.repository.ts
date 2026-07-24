import type {
  InternalBasePermissionConfiguration,
  InternalBasePermissionGrant,
} from './internal-base-permission.model';

export abstract class InternalBasePermissionRepository {
  abstract getConfiguration(
    workspaceId: string,
    baseId: string,
  ): Promise<InternalBasePermissionConfiguration | null>;

  abstract upsertConfiguration(
    configuration: InternalBasePermissionConfiguration,
  ): Promise<InternalBasePermissionConfiguration>;

  abstract listGrants(
    workspaceId: string,
    baseId: string,
  ): Promise<InternalBasePermissionGrant[]>;

  abstract upsertGrant(
    grant: InternalBasePermissionGrant,
  ): Promise<InternalBasePermissionGrant>;
}
