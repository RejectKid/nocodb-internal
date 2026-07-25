import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { extractRolesObj, ProjectRoles } from 'nocodb-sdk';
import { nanoid } from 'nanoid';
import type { Knex } from 'knex';
import type { NcRequest } from '~/interface/config';
import { MetaService } from '~/meta/meta.service';
import { MetaTable } from '~/utils/globals';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalAuditService } from '../audit/internal-audit.service';
import {
  INTERNAL_NOTIFICATIONS_TABLE,
  INTERNAL_RECORD_COMMENTS_TABLE,
} from '../migrations/nc_internal_004_product_suite';

@Injectable()
export class InternalDiscussionService {
  constructor(
    private readonly metaService: MetaService,
    private readonly audit: InternalAuditService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  async list(
    workspaceId: string,
    baseId: string,
    modelId: string,
    recordId: string,
  ) {
    const rows = await this.table()
      .leftJoin(
        MetaTable.USERS,
        `${INTERNAL_RECORD_COMMENTS_TABLE}.created_by`,
        `${MetaTable.USERS}.id`,
      )
      .select(
        `${INTERNAL_RECORD_COMMENTS_TABLE}.*`,
        `${MetaTable.USERS}.display_name as author_display_name`,
      )
      .where({
        [`${INTERNAL_RECORD_COMMENTS_TABLE}.workspace_id`]: workspaceId,
        [`${INTERNAL_RECORD_COMMENTS_TABLE}.base_id`]: baseId,
        [`${INTERNAL_RECORD_COMMENTS_TABLE}.model_id`]: modelId,
        [`${INTERNAL_RECORD_COMMENTS_TABLE}.record_id`]: recordId,
      })
      .whereNull(`${INTERNAL_RECORD_COMMENTS_TABLE}.deleted_at`)
      .orderBy(`${INTERNAL_RECORD_COMMENTS_TABLE}.created_at`, 'asc');
    return rows.map((row) => this.toModel(row));
  }

  async create(
    workspaceId: string,
    baseId: string,
    modelId: string,
    recordId: string,
    input: { body: string; parentId?: string | null; mentions?: string[] },
    request: NcRequest,
  ) {
    const body = this.validBody(input.body);
    const mentions = this.validMentions(input.mentions, request.user.id);
    if (input.parentId) {
      const parent = await this.table()
        .where({
          id: input.parentId,
          base_id: baseId,
          model_id: modelId,
          record_id: recordId,
        })
        .whereNull('deleted_at')
        .first();
      if (!parent || parent.parent_id) {
        throw new BadRequestException(
          'Replies must target a top-level comment in this discussion',
        );
      }
    }
    const id = nanoid(20);
    await this.audit.execute(
      {
        action: InternalAuditAction.DISCUSSION_COMMENT_CREATED,
        resourceType: InternalAuditResourceType.DISCUSSION_COMMENT,
        resourceId: id,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        after: {
          modelId,
          recordId,
          parentId: input.parentId ?? null,
          mentions,
        },
      },
      async (transaction) => {
        await transaction(INTERNAL_RECORD_COMMENTS_TABLE).insert({
          id,
          workspace_id: workspaceId,
          base_id: baseId,
          model_id: modelId,
          record_id: recordId,
          parent_id: input.parentId ?? null,
          body,
          mentions: JSON.stringify(mentions),
          created_by: request.user.id,
          updated_by: request.user.id,
        });
        await this.notifyMentions(
          transaction,
          mentions,
          'record_mention',
          'discussion_comment',
          id,
          workspaceId,
          baseId,
          { modelId, recordId },
        );
      },
    );
    return this.get(id);
  }

  async update(
    workspaceId: string,
    baseId: string,
    modelId: string,
    recordId: string,
    commentId: string,
    bodyValue: string,
    request: NcRequest,
  ) {
    const comment = await this.getRow(commentId, {
      workspace_id: workspaceId,
      base_id: baseId,
      model_id: modelId,
      record_id: recordId,
    });
    if (comment.created_by !== request.user.id) {
      throw new ForbiddenException('Only the author can edit this comment');
    }
    const body = this.validBody(bodyValue);
    await this.audit.execute(
      {
        action: InternalAuditAction.DISCUSSION_COMMENT_UPDATED,
        resourceType: InternalAuditResourceType.DISCUSSION_COMMENT,
        resourceId: commentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId: comment.workspace_id,
          baseId: comment.base_id,
        },
        before: { bodyLength: String(comment.body).length },
        after: { bodyLength: body.length },
      },
      (transaction) =>
        transaction(INTERNAL_RECORD_COMMENTS_TABLE)
          .where({ id: commentId })
          .update({
            body,
            updated_by: request.user.id,
            updated_at: new Date().toISOString(),
          }),
    );
    return this.get(commentId);
  }

  async delete(
    workspaceId: string,
    baseId: string,
    modelId: string,
    recordId: string,
    commentId: string,
    request: NcRequest,
  ) {
    const comment = await this.getRow(commentId, {
      workspace_id: workspaceId,
      base_id: baseId,
      model_id: modelId,
      record_id: recordId,
    });
    const roles = extractRolesObj(request.user.base_roles);
    const moderator =
      Boolean(roles?.[ProjectRoles.OWNER]) ||
      Boolean(roles?.[ProjectRoles.CREATOR]);
    if (comment.created_by !== request.user.id && !moderator) {
      throw new ForbiddenException('Comment deletion is not allowed');
    }
    await this.audit.execute(
      {
        action: InternalAuditAction.DISCUSSION_COMMENT_DELETED,
        resourceType: InternalAuditResourceType.DISCUSSION_COMMENT,
        resourceId: commentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId: comment.workspace_id,
          baseId: comment.base_id,
        },
        before: { authorId: comment.created_by },
        after: { deleted: true },
      },
      (transaction) =>
        transaction(INTERNAL_RECORD_COMMENTS_TABLE)
          .where({ id: commentId })
          .update({
            deleted_at: new Date().toISOString(),
            updated_by: request.user.id,
          }),
    );
    return { id: commentId, deleted: true };
  }

  async resolve(
    workspaceId: string,
    baseId: string,
    modelId: string,
    recordId: string,
    commentId: string,
    resolved: boolean,
    request: NcRequest,
  ) {
    const comment = await this.getRow(commentId, {
      workspace_id: workspaceId,
      base_id: baseId,
      model_id: modelId,
      record_id: recordId,
    });
    if (comment.parent_id) {
      throw new BadRequestException(
        'Only top-level discussion comments can be resolved',
      );
    }
    await this.audit.execute(
      {
        action: InternalAuditAction.DISCUSSION_COMMENT_RESOLVED,
        resourceType: InternalAuditResourceType.DISCUSSION_COMMENT,
        resourceId: commentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: { resolved: Boolean(comment.resolved_at) },
        after: { resolved },
      },
      (transaction) =>
        transaction(INTERNAL_RECORD_COMMENTS_TABLE)
          .where({ id: commentId })
          .update({
            resolved_at: resolved ? new Date().toISOString() : null,
            resolved_by: resolved ? request.user.id : null,
            updated_by: request.user.id,
            updated_at: new Date().toISOString(),
          }),
    );
    return this.get(commentId);
  }

  private table() {
    return this.metaService.knexConnection(INTERNAL_RECORD_COMMENTS_TABLE);
  }

  private async getRow(id: string, boundary: Record<string, string> = {}) {
    const row = await this.table()
      .where({ id, ...boundary })
      .whereNull('deleted_at')
      .first();
    if (!row) throw new NotFoundException('Comment not found');
    return row;
  }

  private async get(id: string) {
    return this.toModel(await this.getRow(id));
  }

  private validBody(value: string) {
    const body = String(value ?? '').trim();
    if (!body || body.length > 10_000) {
      throw new BadRequestException('Comment body is invalid');
    }
    return body;
  }

  private validMentions(value: string[] | undefined, actorId: string) {
    if (!value) return [];
    if (!Array.isArray(value) || value.length > 50) {
      throw new BadRequestException('Mentions are invalid');
    }
    return [...new Set(value.filter((id) => id && id !== actorId))].slice(
      0,
      50,
    );
  }

  private async notifyMentions(
    transaction: Knex.Transaction,
    userIds: string[],
    type: string,
    resourceType: string,
    resourceId: string,
    workspaceId: string,
    baseId: string,
    payload: Record<string, unknown>,
  ) {
    if (!userIds.length) return;
    const members = await transaction(MetaTable.PROJECT_USERS)
      .select('fk_user_id')
      .where({ base_id: baseId })
      .whereIn('fk_user_id', userIds);
    if (!members.length) return;
    await transaction(INTERNAL_NOTIFICATIONS_TABLE).insert(
      members.map((member) => ({
        id: nanoid(20),
        user_id: member.fk_user_id,
        type,
        resource_type: resourceType,
        resource_id: resourceId,
        workspace_id: workspaceId,
        base_id: baseId,
        payload: JSON.stringify(payload),
      })),
    );
  }

  private toModel(row: any) {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      baseId: row.base_id,
      modelId: row.model_id,
      recordId: row.record_id,
      parentId: row.parent_id,
      body: row.body,
      mentions: row.mentions ? JSON.parse(row.mentions) : [],
      author: {
        id: row.created_by,
        displayName: row.author_display_name ?? null,
      },
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      resolvedAt: row.resolved_at
        ? new Date(row.resolved_at).toISOString()
        : null,
      resolvedBy: row.resolved_by ?? null,
    };
  }
}
