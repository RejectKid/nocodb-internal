import type { Knex } from 'knex';
import type {
  InternalBasePermissionConfiguration,
  InternalBasePermissionGrant,
  InternalPermissionSubjectType,
} from './internal-base-permission.model';

export abstract class InternalBasePermissionRepository {
  abstract getConfiguration(
    workspaceId: string,
    baseId: string,
    transaction?: Knex.Transaction,
    lockForUpdate?: boolean,
  ): Promise<InternalBasePermissionConfiguration | null>;

  abstract upsertConfiguration(
    configuration: InternalBasePermissionConfiguration,
    transaction?: Knex.Transaction,
  ): Promise<InternalBasePermissionConfiguration>;

  abstract listGrants(
    workspaceId: string,
    baseId: string,
    transaction?: Knex.Transaction,
  ): Promise<InternalBasePermissionGrant[]>;

  abstract upsertGrant(
    grant: InternalBasePermissionGrant,
    transaction?: Knex.Transaction,
  ): Promise<InternalBasePermissionGrant>;

  abstract replaceSubjectGrants(
    workspaceId: string,
    baseId: string,
    subjectType: InternalPermissionSubjectType,
    subjectId: string,
    grants: InternalBasePermissionGrant[],
    transaction?: Knex.Transaction,
  ): Promise<InternalBasePermissionGrant[]>;
}
