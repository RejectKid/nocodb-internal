import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { extractRolesObj, OrgUserRoles } from 'nocodb-sdk';
import { MetaService } from '~/meta/meta.service';
import { MetaTable } from '~/utils/globals';
import type { NcRequest } from '~/interface/config';
import { InternalFeatureRegistryService } from '../feature-registry/internal-feature-registry.service';
import { InternalAuditService } from '../audit/internal-audit.service';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import {
  INTERNAL_TEAMS_TABLE as TEAMS,
  INTERNAL_TEAM_MEMBERS_TABLE as MEMBERS,
} from '../migrations/nc_internal_006_teams';
import { InternalTeamDirectory } from './internal-team-directory';

@Injectable()
export class InternalTeamService extends InternalTeamDirectory {
  constructor(
    private readonly meta: MetaService,
    private readonly registry: InternalFeatureRegistryService,
    private readonly audit: InternalAuditService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {
    super();
  }

  async teamIdsForUser(workspaceId: string, userId: string): Promise<string[]> {
    if (!this.registry.getCapabilities().features.teams || !userId) return [];
    const db = this.meta.knexConnection;
    const rows = await db(`${TEAMS} as t`)
      .join(`${MEMBERS} as m`, 'm.team_id', 't.id')
      .join(`${MetaTable.USERS} as u`, 'u.id', 'm.user_id')
      .join(`${MetaTable.WORKSPACE} as ws`, 'ws.id', 't.workspace_id')
      .join(`${MetaTable.WORKSPACE_USER} as w`, function () {
        this.on('w.fk_user_id', '=', 'm.user_id').andOn(
          'w.fk_workspace_id',
          '=',
          't.workspace_id',
        );
      })
      .where('t.workspace_id', workspaceId)
      .where('m.user_id', userId)
      .whereNull('t.archived_at')
      .where((q) => q.where('ws.deleted', false).orWhereNull('ws.deleted'))
      .where((q) => q.where('u.blocked', false).orWhereNull('u.blocked'))
      .where((q) => q.where('u.is_deleted', false).orWhereNull('u.is_deleted'))
      .where((q) => q.where('w.deleted', false).orWhereNull('w.deleted'))
      .select('t.id');
    return [...new Set(rows.map((r) => String(r.id)))];
  }

  async assertAssignable(workspaceId: string, teamId: string) {
    if (
      !this.registry.getCapabilities().features.teams ||
      !(await this.meta
        .knexConnection(TEAMS)
        .where({ id: teamId, workspace_id: workspaceId })
        .whereNull('archived_at')
        .first())
    ) {
      throw new BadRequestException('Active team in this workspace required');
    }
  }

  async list(workspaceId: string, request: NcRequest) {
    const db = this.meta.knexConnection;
    const workspace = await db(MetaTable.WORKSPACE)
      .where({ id: workspaceId })
      .where((q) => q.where('deleted', false).orWhereNull('deleted'))
      .first();
    if (!workspace) throw new NotFoundException('Workspace not found');
    const membership = await db(MetaTable.WORKSPACE_USER)
      .where({ fk_workspace_id: workspaceId, fk_user_id: request.user.id })
      .where((q) => q.where('deleted', false).orWhereNull('deleted'))
      .first();
    if (
      !membership &&
      !extractRolesObj(request.user.roles)?.[OrgUserRoles.SUPER_ADMIN]
    )
      throw new ForbiddenException('Workspace access required');
    const teams = await db(TEAMS)
      .where({ workspace_id: workspaceId })
      .whereNull('archived_at')
      .orderBy('name');
    const members = teams.length
      ? await db(MEMBERS).whereIn(
          'team_id',
          teams.map((t) => t.id),
        )
      : [];
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      revision: t.revision,
      memberIds: members
        .filter((m) => m.team_id === t.id)
        .map((m) => m.user_id),
    }));
  }

  async create(
    workspaceId: string,
    input: { name: string },
    request: NcRequest,
  ) {
    const name = this.name(input.name);
    const id = nanoid(20);
    await this.audit.execute(
      {
        action: InternalAuditAction.TEAM_CREATED,
        resourceType: InternalAuditResourceType.TEAM,
        resourceId: id,
        context: { ...this.auditContext.fromRequest(request), workspaceId },
        after: { name },
      },
      async (db) => {
        await db(TEAMS).insert({
          id,
          workspace_id: workspaceId,
          name,
          created_by: request.user.id,
        });
      },
    );
    return { id, name, revision: 1, memberIds: [] };
  }

  async update(
    workspaceId: string,
    teamId: string,
    input: {
      name?: string;
      memberIds?: string[];
      archived?: boolean;
      expectedRevision: number;
    },
    request: NcRequest,
  ) {
    if (!Number.isInteger(input.expectedRevision) || input.expectedRevision < 1)
      throw new BadRequestException('expectedRevision required');
    if (input.archived !== undefined && input.archived !== true)
      throw new BadRequestException('Only archiving is supported');
    const name = input.name === undefined ? undefined : this.name(input.name);
    const ids = input.memberIds;
    if (
      ids !== undefined &&
      (!Array.isArray(ids) ||
        ids.length > 500 ||
        ids.some((id) => typeof id !== 'string' || !id || id.length > 20) ||
        new Set(ids).size !== ids.length)
    )
      throw new BadRequestException('Invalid member IDs');
    return this.audit.execute<{
      before: { name: string; memberIds: string[] };
      after: {
        name: string;
        memberIds: string[];
        archived: boolean;
        revision: number;
      };
    }>(
      (result) => ({
        action: input.archived
          ? InternalAuditAction.TEAM_ARCHIVED
          : InternalAuditAction.TEAM_CHANGED,
        resourceType: InternalAuditResourceType.TEAM,
        resourceId: teamId,
        context: { ...this.auditContext.fromRequest(request), workspaceId },
        before: result.before,
        after: result.after,
      }),
      async (db) => {
        const team = await db(TEAMS)
          .where({ id: teamId, workspace_id: workspaceId })
          .whereNull('archived_at')
          .first();
        if (!team) throw new NotFoundException('Team not found');
        if (team.revision !== input.expectedRevision)
          throw new ConflictException('Team changed; reload and retry');
        if (ids?.length) {
          const valid = await db(`${MetaTable.WORKSPACE_USER} as w`)
            .join(`${MetaTable.USERS} as u`, 'u.id', 'w.fk_user_id')
            .where('w.fk_workspace_id', workspaceId)
            .whereIn('u.id', ids)
            .where((q) => q.where('w.deleted', false).orWhereNull('w.deleted'))
            .where((q) => q.where('u.blocked', false).orWhereNull('u.blocked'))
            .where((q) =>
              q.where('u.is_deleted', false).orWhereNull('u.is_deleted'),
            )
            .distinct('u.id');
          if (valid.length !== ids.length)
            throw new BadRequestException(
              'Members must be active users in this workspace',
            );
        }
        const previous = await db(MEMBERS)
          .where({ team_id: teamId })
          .pluck('user_id');
        const changed = await db(TEAMS)
          .where({
            id: teamId,
            workspace_id: workspaceId,
            revision: input.expectedRevision,
          })
          .update({
            name: name ?? team.name,
            revision: team.revision + 1,
            archived_at: input.archived ? new Date().toISOString() : null,
          });
        if (!changed)
          throw new ConflictException('Team changed; reload and retry');
        if (ids !== undefined) {
          await db(MEMBERS).where({ team_id: teamId }).delete();
          if (ids.length)
            await db(MEMBERS).insert(
              ids.map((user_id) => ({ team_id: teamId, user_id })),
            );
        }
        return {
          before: { name: team.name, memberIds: previous },
          after: {
            name: name ?? team.name,
            memberIds: ids ?? previous,
            archived: Boolean(input.archived),
            revision: team.revision + 1,
          },
        };
      },
    );
  }

  private name(value: string) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 128)
      throw new BadRequestException('Team name must be 1–128 characters');
    return value.trim();
  }
}
