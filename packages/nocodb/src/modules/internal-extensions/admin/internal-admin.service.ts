import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extractRolesObj, OrgUserRoles, ProjectRoles } from 'nocodb-sdk';
import { v4 as uuidv4 } from 'uuid';
import { MetaService } from '~/meta/meta.service';
import User from '~/models/User';
import NocoCache from '~/cache/NocoCache';
import { CacheScope, MetaTable } from '~/utils/globals';
import { normalizeEmail } from '~/utils/emailUtils';
import { InternalFeatureRegistryService } from '../feature-registry/internal-feature-registry.service';
import type { InternalFeatureKey } from '../feature-registry/internal-feature.types';
import { INTERNAL_API_TOKENS_TABLE } from '../migrations/nc_internal_001_api_tokens';
import { INTERNAL_AUDIT_EVENTS_TABLE } from '../migrations/nc_internal_003_audit_events';
import { INTERNAL_BASE_FEATURES_TABLE } from '../migrations/nc_internal_004_product_suite';
import {
  InternalAuditAction,
  InternalAuditActorType,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import type { InternalAuditContext } from '../audit/internal-audit-event.model';
import { InternalAuditService } from '../audit/internal-audit.service';

import { INTERNAL_EXTENSION_VERSION } from '../internal-extension.constants';

const clampLimit = (value?: number) =>
  Math.min(Math.max(Number(value) || 25, 1), 100);
const clampOffset = (value?: number) => Math.max(Number(value) || 0, 0);

@Injectable()
export class InternalAdminService {
  constructor(
    private readonly metaService: MetaService,
    private readonly registry: InternalFeatureRegistryService,
    private readonly audit: InternalAuditService,
  ) {}

  async overview() {
    const knex = this.metaService.knexConnection;
    const startedAt = Date.now();
    const [users, workspaces, bases, queuedJobs] = await Promise.all([
      this.count(MetaTable.USERS, (query) =>
        query.where((builder) =>
          builder.where('is_deleted', false).orWhereNull('is_deleted'),
        ),
      ),
      this.safeCount(MetaTable.WORKSPACE, (query) =>
        query.where((builder) =>
          builder.where('deleted', false).orWhereNull('deleted'),
        ),
      ),
      this.count(MetaTable.PROJECT, (query) =>
        query.where((builder) =>
          builder.where('deleted', false).orWhereNull('deleted'),
        ),
      ),
      this.safeCount(MetaTable.JOBS, (query) =>
        query.whereIn('status', ['waiting', 'delayed', 'active']),
      ),
    ]);
    await knex.raw('select 1');
    const configured = (...names: string[]) =>
      names.some((name) => Boolean(process.env[name]?.trim()));

    return {
      applicationVersion: process.env.NC_VERSION ?? 'development',
      internalExtensionVersion: INTERNAL_EXTENSION_VERSION,
      nodeVersion: process.version,
      database: { status: 'ok', latencyMs: Date.now() - startedAt },
      queue: {
        status: configured('NC_REDIS_URL') ? 'configured' : 'database-backed',
        pendingJobs: queuedJobs,
      },
      storage: {
        configured: true,
        provider: configured('NC_S3_BUCKET_NAME')
          ? 's3-compatible'
          : configured('NC_GCS_BUCKET')
          ? 'gcs'
          : 'local',
      },
      email: {
        configured: configured(
          'NC_SMTP_HOST',
          'NC_MAILER_HOST',
          'NC_SES_REGION',
        ),
      },
      secureAttachments: process.env.NC_SECURE_ATTACHMENTS === 'true',
      features: this.registry.getCapabilities().features,
      counts: { users, workspaces, bases },
      checkedAt: new Date().toISOString(),
    };
  }

  async listUsers(query = '', limit?: number, offset?: number) {
    const knex = this.metaService.knexConnection;
    const builder = knex(MetaTable.USERS)
      .select(
        'id',
        'email',
        'display_name',
        'roles',
        'blocked',
        'blocked_reason',
        'email_verified',
        'created_at',
        'updated_at',
      )
      .where((where) =>
        where.where('is_deleted', false).orWhereNull('is_deleted'),
      );
    if (query.trim()) {
      const term = `%${query.trim().toLowerCase()}%`;
      builder.andWhere((where) =>
        where
          .whereRaw('LOWER(email) like ?', [term])
          .orWhereRaw('LOWER(display_name) like ?', [term]),
      );
    }
    const rows = await builder
      .orderBy('created_at', 'desc')
      .limit(clampLimit(limit))
      .offset(clampOffset(offset));
    return {
      list: rows.map((row) => ({
        ...row,
        blocked: Boolean(row.blocked),
        email_verified: Boolean(row.email_verified),
      })),
      pageInfo: {
        limit: clampLimit(limit),
        offset: clampOffset(offset),
        total: await this.count(MetaTable.USERS, (countQuery) =>
          countQuery.where((where) =>
            where.where('is_deleted', false).orWhereNull('is_deleted'),
          ),
        ),
      },
    };
  }

  async getUser(userId: string) {
    const knex = this.metaService.knexConnection;
    const user = await knex(MetaTable.USERS)
      .select(
        'id',
        'email',
        'display_name',
        'roles',
        'blocked',
        'blocked_reason',
        'email_verified',
        'created_at',
        'updated_at',
      )
      .where({ id: userId })
      .where((where) =>
        where.where('is_deleted', false).orWhereNull('is_deleted'),
      )
      .first();
    if (!user) throw new NotFoundException('User not found');
    const [workspaceMemberships, baseMemberships, tokens, events] =
      await Promise.all([
        knex(MetaTable.WORKSPACE_USER)
          .select('fk_workspace_id as workspaceId', 'roles')
          .where({ fk_user_id: userId })
          .where((where) =>
            where.where('deleted', false).orWhereNull('deleted'),
          ),
        knex(MetaTable.PROJECT_USERS)
          .select('base_id as baseId', 'roles')
          .where({ fk_user_id: userId }),
        knex(INTERNAL_API_TOKENS_TABLE)
          .select(
            'id',
            'display_name',
            'token_prefix',
            'created_at',
            'last_used_at',
            'expires_at',
            'revoked_at',
          )
          .where({ user_id: userId })
          .orderBy('created_at', 'desc'),
        knex(INTERNAL_AUDIT_EVENTS_TABLE)
          .select('id', 'action', 'resource_type', 'resource_id', 'occurred_at')
          .where({ actor_id: userId })
          .orderBy('occurred_at', 'desc')
          .limit(25),
      ]);
    return {
      ...user,
      blocked: Boolean(user.blocked),
      email_verified: Boolean(user.email_verified),
      workspaceMemberships,
      baseMemberships,
      internalTokens: tokens,
      recentSecurityEvents: events,
    };
  }

  async setUserEnabled(
    userId: string,
    enabled: boolean,
    actorId: string,
    auditContext: InternalAuditContext,
  ) {
    if (userId === actorId && !enabled) {
      throw new BadRequestException('You cannot disable your own account');
    }
    const existing = await User.get(userId, this.metaService);
    if (!existing) throw new NotFoundException('User not found');
    if (
      extractRolesObj(existing.roles)?.[OrgUserRoles.SUPER_ADMIN] &&
      !enabled
    ) {
      throw new BadRequestException(
        'Super administrator accounts cannot be disabled',
      );
    }
    const changedAt = new Date().toISOString();
    await this.audit.execute(
      {
        action: enabled
          ? InternalAuditAction.USER_ENABLED
          : InternalAuditAction.USER_DISABLED,
        resourceType: InternalAuditResourceType.USER,
        resourceId: userId,
        context: auditContext,
        before: { blocked: Boolean(existing.blocked) },
        after: { blocked: !enabled },
      },
      async (transaction) => {
        await transaction(MetaTable.USERS)
          .where({ id: userId })
          .update({
            blocked: !enabled,
            blocked_reason: enabled
              ? null
              : 'Disabled by internal instance administration',
            token_version: uuidv4(),
            updated_at: changedAt,
          });
        if (!enabled) {
          await transaction(MetaTable.USER_REFRESH_TOKENS)
            .where({ fk_user_id: userId })
            .delete();
          await transaction(INTERNAL_API_TOKENS_TABLE)
            .where({ user_id: userId })
            .whereNull('revoked_at')
            .update({ revoked_at: changedAt, revoked_by: actorId });
        }
      },
    );
    await this.clearUserCache(existing);
    return this.getUser(userId);
  }

  async listWorkspaces(query = '', limit?: number, offset?: number) {
    const knex = this.metaService.knexConnection;
    const builder = knex(MetaTable.WORKSPACE)
      .select('id', 'title', 'fk_user_id as ownerId', 'created_at')
      .where((where) => where.where('deleted', false).orWhereNull('deleted'));
    if (query.trim()) {
      builder.andWhereRaw('LOWER(title) like ?', [
        `%${query.trim().toLowerCase()}%`,
      ]);
    }
    const rows = await builder
      .orderBy('title', 'asc')
      .limit(clampLimit(limit))
      .offset(clampOffset(offset));
    const list = await Promise.all(
      rows.map(async (workspace) => ({
        ...workspace,
        memberCount: await this.count(MetaTable.WORKSPACE_USER, (countQuery) =>
          countQuery
            .where({ fk_workspace_id: workspace.id })
            .where((where) =>
              where.where('deleted', false).orWhereNull('deleted'),
            ),
        ),
        baseCount: await this.count(MetaTable.PROJECT, (countQuery) =>
          countQuery
            .where({ fk_workspace_id: workspace.id })
            .where((where) =>
              where.where('deleted', false).orWhereNull('deleted'),
            ),
        ),
      })),
    );
    return {
      list,
      pageInfo: {
        limit: clampLimit(limit),
        offset: clampOffset(offset),
        total: await this.safeCount(MetaTable.WORKSPACE),
      },
    };
  }

  async listBases(query = '', limit?: number, offset?: number) {
    const knex = this.metaService.knexConnection;
    const builder = knex(MetaTable.PROJECT)
      .select('id', 'title', 'fk_workspace_id as workspaceId', 'created_at')
      .where((where) => where.where('deleted', false).orWhereNull('deleted'));
    if (query.trim()) {
      builder.andWhereRaw('LOWER(title) like ?', [
        `%${query.trim().toLowerCase()}%`,
      ]);
    }
    const rows = await builder
      .orderBy('title', 'asc')
      .limit(clampLimit(limit))
      .offset(clampOffset(offset));
    const list = await Promise.all(
      rows.map(async (base) => {
        const [memberCount, ownerCount, featureSettings] = await Promise.all([
          this.count(MetaTable.PROJECT_USERS, (countQuery) =>
            countQuery.where({ base_id: base.id }),
          ),
          this.count(MetaTable.PROJECT_USERS, (countQuery) =>
            countQuery
              .where({ base_id: base.id })
              .andWhere('roles', ProjectRoles.OWNER),
          ),
          knex(INTERNAL_BASE_FEATURES_TABLE)
            .select('feature_key as featureKey', 'enabled', 'revision')
            .where({ base_id: base.id }),
        ]);
        return {
          ...base,
          memberCount,
          orphaned: ownerCount === 0,
          featureSettings: featureSettings.map((setting) => ({
            ...setting,
            enabled: Boolean(setting.enabled),
          })),
        };
      }),
    );
    return {
      list,
      pageInfo: {
        limit: clampLimit(limit),
        offset: clampOffset(offset),
        total: await this.count(MetaTable.PROJECT),
      },
    };
  }

  async setBaseFeature(
    workspaceId: string,
    baseId: string,
    featureKey: InternalFeatureKey,
    enabled: boolean,
    expectedRevision: number | undefined,
    actorId: string,
    auditContext: InternalAuditContext,
  ) {
    if (!(featureKey in this.registry.getCapabilities().features)) {
      throw new BadRequestException('Unknown internal feature');
    }
    const existing = await this.metaService
      .knexConnection(INTERNAL_BASE_FEATURES_TABLE)
      .where({
        workspace_id: workspaceId,
        base_id: baseId,
        feature_key: featureKey,
      })
      .first();
    if (
      existing &&
      expectedRevision !== undefined &&
      Number(existing.revision) !== expectedRevision
    ) {
      throw new BadRequestException('Base feature setting is stale');
    }
    const revision = Number(existing?.revision ?? 0) + 1;
    await this.audit.execute(
      {
        action: InternalAuditAction.ADMIN_CONFIGURATION_CHANGED,
        resourceType: InternalAuditResourceType.CONFIGURATION,
        resourceId: `${baseId}:${featureKey}`,
        context: { ...auditContext, workspaceId, baseId },
        before: existing
          ? { enabled: Boolean(existing.enabled), revision: existing.revision }
          : null,
        after: { enabled, revision },
      },
      async (transaction) => {
        const values = {
          workspace_id: workspaceId,
          base_id: baseId,
          feature_key: featureKey,
          enabled,
          revision,
          updated_by: actorId,
          updated_at: new Date().toISOString(),
        };
        if (existing) {
          await transaction(INTERNAL_BASE_FEATURES_TABLE)
            .where({ base_id: baseId, feature_key: featureKey })
            .update(values);
        } else {
          await transaction(INTERNAL_BASE_FEATURES_TABLE).insert(values);
        }
      },
    );
    return { workspaceId, baseId, featureKey, enabled, revision };
  }

  private async count(
    table: string,
    configure?: (query: any) => void,
  ): Promise<number> {
    const query = this.metaService.knexConnection(table).count('* as count');
    configure?.(query);
    const result = await query.first();
    return Number(result?.count ?? 0);
  }

  private async safeCount(
    table: string,
    configure?: (query: any) => void,
  ): Promise<number> {
    try {
      return await this.count(table, configure);
    } catch {
      return 0;
    }
  }

  private async clearUserCache(user: User) {
    await NocoCache.del('root', `${CacheScope.USER}:${user.id}`);
    await NocoCache.del('root', `${CacheScope.USER}:${user.email}`);
    if (user.email) {
      await NocoCache.del(
        'root',
        `${CacheScope.USER}:canonical:${normalizeEmail(user.email)}`,
      );
    }
  }
}
