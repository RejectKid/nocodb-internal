import { z } from 'zod';
import type { MetaService } from '~/meta/meta.service';
import {
  INTERNAL_BASE_PERMISSION_CONFIGS_TABLE,
  INTERNAL_BASE_PERMISSION_GRANTS_TABLE,
} from '../migrations/nc_internal_002_base_permissions';
import { InternalBasePermission } from './internal-base-permission';
import {
  InternalPermissionEffect,
  InternalPermissionSubjectType,
  type InternalBasePermissionConfiguration,
  type InternalBasePermissionGrant,
} from './internal-base-permission.model';
import { InternalBasePermissionRepository } from './internal-base-permission.repository';

const configurationSchema = z.object({
  workspace_id: z.string().min(1),
  base_id: z.string().min(1),
  enabled: z.union([z.boolean(), z.number()]).transform(Boolean),
  schema_version: z.number().int().positive(),
  created_at: z.union([z.string(), z.date()]).transform(toIsoTimestamp),
  created_by: z.string().min(1),
  updated_at: z.union([z.string(), z.date()]).transform(toIsoTimestamp),
  updated_by: z.string().min(1),
});

const grantSchema = z.object({
  id: z.string().min(1),
  workspace_id: z.string().min(1),
  base_id: z.string().min(1),
  subject_type: z.nativeEnum(InternalPermissionSubjectType),
  subject_id: z.string().min(1),
  permission: z.nativeEnum(InternalBasePermission),
  effect: z.nativeEnum(InternalPermissionEffect),
  created_at: z.union([z.string(), z.date()]).transform(toIsoTimestamp),
  created_by: z.string().min(1),
  updated_at: z.union([z.string(), z.date()]).transform(toIsoTimestamp),
  updated_by: z.string().min(1),
});

function toIsoTimestamp(value: string | Date): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Stored internal base permission has invalid timestamp');
  }
  return parsed.toISOString();
}

export class KnexInternalBasePermissionRepository extends InternalBasePermissionRepository {
  constructor(
    private readonly metaService: Pick<MetaService, 'knexConnection'>,
  ) {
    super();
  }

  async getConfiguration(
    workspaceId: string,
    baseId: string,
  ): Promise<InternalBasePermissionConfiguration | null> {
    const row = await this.configurationTable()
      .where({ workspace_id: workspaceId, base_id: baseId })
      .first();
    return row
      ? (configurationSchema.parse(row) as InternalBasePermissionConfiguration)
      : null;
  }

  async upsertConfiguration(
    configuration: InternalBasePermissionConfiguration,
  ): Promise<InternalBasePermissionConfiguration> {
    await this.configurationTable()
      .insert(configuration)
      .onConflict('base_id')
      .merge({
        enabled: configuration.enabled,
        schema_version: configuration.schema_version,
        updated_at: configuration.updated_at,
        updated_by: configuration.updated_by,
      });
    const stored = await this.getConfiguration(
      configuration.workspace_id,
      configuration.base_id,
    );
    if (!stored) {
      throw new Error('Internal base permission configuration was not stored');
    }
    return stored;
  }

  async listGrants(
    workspaceId: string,
    baseId: string,
  ): Promise<InternalBasePermissionGrant[]> {
    const rows = await this.grantTable()
      .where({ workspace_id: workspaceId, base_id: baseId })
      .orderBy('id');
    return rows.map(
      (row) => grantSchema.parse(row) as InternalBasePermissionGrant,
    );
  }

  async upsertGrant(
    grant: InternalBasePermissionGrant,
  ): Promise<InternalBasePermissionGrant> {
    await this.grantTable()
      .insert(grant)
      .onConflict(['base_id', 'subject_type', 'subject_id', 'permission'])
      .merge({
        effect: grant.effect,
        updated_at: grant.updated_at,
        updated_by: grant.updated_by,
      });
    const row = await this.grantTable()
      .where({
        base_id: grant.base_id,
        subject_type: grant.subject_type,
        subject_id: grant.subject_id,
        permission: grant.permission,
      })
      .first();
    return grantSchema.parse(row) as InternalBasePermissionGrant;
  }

  private configurationTable() {
    return this.metaService.knexConnection(
      INTERNAL_BASE_PERMISSION_CONFIGS_TABLE,
    );
  }

  private grantTable() {
    return this.metaService.knexConnection(
      INTERNAL_BASE_PERMISSION_GRANTS_TABLE,
    );
  }
}
