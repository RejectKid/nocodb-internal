import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  INTERNAL_DOCUMENT_COMMENTS_TABLE,
  INTERNAL_DOCUMENT_GRANTS_TABLE,
  INTERNAL_DOCUMENT_REVISIONS_TABLE,
  INTERNAL_DOCUMENTS_TABLE,
  INTERNAL_NOTIFICATIONS_TABLE,
} from '../migrations/nc_internal_004_product_suite';
import { InternalDocumentPermissionService } from './internal-document-permission.service';
import {
  INTERNAL_DOCUMENT_PERMISSIONS,
  InternalDocumentPermission,
  type InternalDocumentGrantInput,
  type InternalDocumentRecord,
} from './internal-document.types';
import { InternalPdfService } from './internal-pdf.service';

@Injectable()
export class InternalDocumentService {
  constructor(
    private readonly metaService: MetaService,
    private readonly permissions: InternalDocumentPermissionService,
    private readonly audit: InternalAuditService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
    private readonly pdf: InternalPdfService,
  ) {}

  async list(
    workspaceId: string,
    baseId: string,
    request: NcRequest,
    query = '',
  ) {
    const rows = await this.documents()
      .where({ workspace_id: workspaceId, base_id: baseId })
      .whereNull('deleted_at')
      .orderBy('display_order', 'asc')
      .orderBy('created_at', 'asc');
    const term = query.trim().toLowerCase();
    const visible: Array<
      Pick<
        InternalDocumentRecord,
        | 'id'
        | 'parentId'
        | 'title'
        | 'order'
        | 'version'
        | 'updatedAt'
        | 'updatedBy'
      >
    > = [];
    for (const row of rows) {
      const document = this.toDocument(row);
      if (
        (!term || document.title.toLowerCase().includes(term)) &&
        (await this.permissions.can(
          document,
          request,
          InternalDocumentPermission.DISCOVER,
        ))
      ) {
        visible.push({
          id: document.id,
          parentId: document.parentId,
          title: document.title,
          order: document.order,
          version: document.version,
          updatedAt: document.updatedAt,
          updatedBy: document.updatedBy,
        });
      }
    }
    return visible;
  }

  async get(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.READ,
    );
    return {
      ...document,
      permissions: [...(await this.permissions.effective(document, request))],
    };
  }

  async create(
    workspaceId: string,
    baseId: string,
    input: {
      title: string;
      content?: Record<string, unknown>;
      metadata?: Record<string, unknown> | null;
      parentId?: string | null;
      order?: number;
    },
    request: NcRequest,
  ) {
    const title = this.title(input.title);
    const content = this.content(input.content ?? {});
    if (input.parentId) {
      await this.authorizedDocument(
        workspaceId,
        baseId,
        input.parentId,
        request,
        InternalDocumentPermission.EDIT,
      );
    }
    const id = nanoid(20);
    const now = new Date().toISOString();
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_CREATED,
        resourceType: InternalAuditResourceType.DOCUMENT,
        resourceId: id,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        after: { title, parentId: input.parentId ?? null },
      },
      async (transaction) => {
        const row = {
          id,
          workspace_id: workspaceId,
          base_id: baseId,
          parent_id: input.parentId ?? null,
          title,
          content: JSON.stringify(content),
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          display_order: this.order(input.order),
          version: 1,
          created_by: request.user.id,
          updated_by: request.user.id,
          created_at: now,
          updated_at: now,
        };
        await transaction(INTERNAL_DOCUMENTS_TABLE).insert(row);
        await this.insertRevision(transaction, this.toDocument(row), 'Created');
      },
    );
    return this.get(workspaceId, baseId, id, request);
  }

  async update(
    workspaceId: string,
    baseId: string,
    documentId: string,
    input: {
      title?: string;
      content?: Record<string, unknown>;
      metadata?: Record<string, unknown> | null;
      parentId?: string | null;
      order?: number;
      expectedVersion?: number;
      summary?: string;
    },
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.EDIT,
    );
    if (
      input.expectedVersion !== undefined &&
      input.expectedVersion !== document.version
    ) {
      throw new ConflictException('Document version is stale');
    }
    if (input.parentId !== undefined && input.parentId !== document.parentId) {
      if (
        !(await this.permissions.can(
          document,
          request,
          InternalDocumentPermission.MANAGE,
        ))
      ) {
        throw new ForbiddenException('Document management permission required');
      }
      await this.assertParent(
        workspaceId,
        baseId,
        documentId,
        input.parentId,
        request,
      );
    }
    const updated: InternalDocumentRecord = {
      ...document,
      title:
        input.title === undefined ? document.title : this.title(input.title),
      content:
        input.content === undefined
          ? document.content
          : this.content(input.content),
      metadata:
        input.metadata === undefined ? document.metadata : input.metadata,
      parentId:
        input.parentId === undefined ? document.parentId : input.parentId,
      order:
        input.order === undefined ? document.order : this.order(input.order),
      version: document.version + 1,
      updatedBy: request.user.id,
      updatedAt: new Date().toISOString(),
    };
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_UPDATED,
        resourceType: InternalAuditResourceType.DOCUMENT,
        resourceId: documentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: {
          title: document.title,
          parentId: document.parentId,
          version: document.version,
        },
        after: {
          title: updated.title,
          parentId: updated.parentId,
          version: updated.version,
        },
      },
      async (transaction) => {
        await transaction(INTERNAL_DOCUMENTS_TABLE)
          .where({
            id: documentId,
            workspace_id: workspaceId,
            base_id: baseId,
            version: document.version,
          })
          .update(this.toRowUpdate(updated));
        await this.insertRevision(
          transaction,
          updated,
          String(input.summary ?? 'Updated').slice(0, 512),
        );
        await this.pruneRevisions(transaction, documentId);
      },
    );
    return this.get(workspaceId, baseId, documentId, request);
  }

  async delete(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.MANAGE,
    );
    const descendantIds = await this.descendantIds(
      workspaceId,
      baseId,
      documentId,
    );
    const ids = [documentId, ...descendantIds];
    const deletedAt = new Date().toISOString();
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_DELETED,
        resourceType: InternalAuditResourceType.DOCUMENT,
        resourceId: documentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: {
          title: document.title,
          descendantCount: descendantIds.length,
        },
        after: { deleted: true },
      },
      async (transaction) => {
        await transaction(INTERNAL_DOCUMENTS_TABLE)
          .whereIn('id', ids)
          .update({ deleted_at: deletedAt, updated_by: request.user.id });
        await transaction(INTERNAL_DOCUMENT_COMMENTS_TABLE)
          .whereIn('document_id', ids)
          .whereNull('deleted_at')
          .update({ deleted_at: deletedAt, updated_by: request.user.id });
      },
    );
    return {
      id: documentId,
      deleted: true,
      descendantCount: descendantIds.length,
    };
  }

  async grants(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
  ) {
    await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.MANAGE,
    );
    return this.metaService
      .knexConnection(INTERNAL_DOCUMENT_GRANTS_TABLE)
      .select(
        'id',
        'subject_type as subjectType',
        'subject_id as subjectId',
        'permission',
        'created_by as createdBy',
        'created_at as createdAt',
      )
      .where({ document_id: documentId })
      .orderBy('subject_type')
      .orderBy('subject_id');
  }

  async replaceGrants(
    workspaceId: string,
    baseId: string,
    documentId: string,
    grants: InternalDocumentGrantInput[],
    request: NcRequest,
  ) {
    await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.MANAGE,
    );
    const normalized = this.validGrants(grants);
    const before = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_GRANTS_TABLE)
      .select('subject_type', 'subject_id', 'permission')
      .where({ document_id: documentId });
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_PERMISSION_CHANGED,
        resourceType: InternalAuditResourceType.DOCUMENT,
        resourceId: documentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: { grants: before },
        after: { grants: normalized },
      },
      async (transaction) => {
        await transaction(INTERNAL_DOCUMENT_GRANTS_TABLE)
          .where({ document_id: documentId })
          .delete();
        if (normalized.length) {
          await transaction(INTERNAL_DOCUMENT_GRANTS_TABLE).insert(
            normalized.map((grant) => ({
              id: nanoid(20),
              document_id: documentId,
              subject_type: grant.subjectType,
              subject_id: grant.subjectId,
              permission: grant.permission,
              created_by: request.user.id,
            })),
          );
        }
      },
    );
    return this.grants(workspaceId, baseId, documentId, request);
  }

  async revisions(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
  ) {
    await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.READ,
    );
    return this.metaService
      .knexConnection(INTERNAL_DOCUMENT_REVISIONS_TABLE)
      .select(
        'id',
        'revision',
        'author_id as authorId',
        'summary',
        'created_at as createdAt',
      )
      .where({ document_id: documentId })
      .orderBy('revision', 'desc');
  }

  async restore(
    workspaceId: string,
    baseId: string,
    documentId: string,
    revisionId: string,
    expectedVersion: number | undefined,
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.MANAGE,
    );
    if (expectedVersion !== undefined && expectedVersion !== document.version) {
      throw new ConflictException('Document version is stale');
    }
    const revision = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_REVISIONS_TABLE)
      .where({ id: revisionId, document_id: documentId })
      .first();
    if (!revision) throw new NotFoundException('Revision not found');
    const snapshot = this.snapshot(revision.snapshot);
    await this.assertParent(
      workspaceId,
      baseId,
      documentId,
      snapshot.parentId,
      request,
    );
    const restored: InternalDocumentRecord = {
      ...document,
      title: snapshot.title,
      content: snapshot.content,
      metadata: snapshot.metadata,
      parentId: snapshot.parentId,
      order: snapshot.order,
      version: document.version + 1,
      updatedBy: request.user.id,
      updatedAt: new Date().toISOString(),
    };
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_REVISION_RESTORED,
        resourceType: InternalAuditResourceType.DOCUMENT_REVISION,
        resourceId: revisionId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: { documentVersion: document.version },
        after: {
          documentVersion: restored.version,
          restoredRevision: Number(revision.revision),
        },
      },
      async (transaction) => {
        const updated = await transaction(INTERNAL_DOCUMENTS_TABLE)
          .where({ id: documentId, version: document.version })
          .update(this.toRowUpdate(restored));
        if (!updated) throw new ConflictException('Document version is stale');
        await this.insertRevision(
          transaction,
          restored,
          `Restored revision ${revision.revision}`,
        );
        await this.pruneRevisions(transaction, documentId);
      },
    );
    return this.get(workspaceId, baseId, documentId, request);
  }

  async listComments(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
  ) {
    await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.READ,
    );
    const rows = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_COMMENTS_TABLE)
      .leftJoin(
        MetaTable.USERS,
        `${INTERNAL_DOCUMENT_COMMENTS_TABLE}.created_by`,
        `${MetaTable.USERS}.id`,
      )
      .select(
        `${INTERNAL_DOCUMENT_COMMENTS_TABLE}.*`,
        `${MetaTable.USERS}.display_name as author_display_name`,
      )
      .where({ document_id: documentId })
      .whereNull(`${INTERNAL_DOCUMENT_COMMENTS_TABLE}.deleted_at`)
      .orderBy(`${INTERNAL_DOCUMENT_COMMENTS_TABLE}.created_at`, 'asc');
    return rows.map((row) => this.toComment(row));
  }

  async createComment(
    workspaceId: string,
    baseId: string,
    documentId: string,
    input: {
      body: string;
      parentId?: string | null;
      anchor?: Record<string, unknown> | null;
      mentions?: string[];
    },
    request: NcRequest,
  ) {
    await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.COMMENT,
    );
    const body = this.commentBody(input.body);
    const mentions = this.mentions(input.mentions, request.user.id);
    if (input.anchor && JSON.stringify(input.anchor).length > 8_192) {
      throw new BadRequestException('Comment anchor is too large');
    }
    if (input.parentId) {
      const parent = await this.metaService
        .knexConnection(INTERNAL_DOCUMENT_COMMENTS_TABLE)
        .where({ id: input.parentId, document_id: documentId })
        .whereNull('deleted_at')
        .first();
      if (!parent) throw new BadRequestException('Parent comment is invalid');
    }
    const id = nanoid(20);
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_COMMENT_CREATED,
        resourceType: InternalAuditResourceType.DOCUMENT_COMMENT,
        resourceId: id,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        after: { documentId, parentId: input.parentId ?? null, mentions },
      },
      async (transaction) => {
        await transaction(INTERNAL_DOCUMENT_COMMENTS_TABLE).insert({
          id,
          document_id: documentId,
          parent_id: input.parentId ?? null,
          anchor: input.anchor ? JSON.stringify(input.anchor) : null,
          body,
          mentions: JSON.stringify(mentions),
          created_by: request.user.id,
          updated_by: request.user.id,
        });
        await this.notify(transaction, mentions, workspaceId, baseId, id, {
          documentId,
        });
      },
    );
    const saved = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_COMMENTS_TABLE)
      .where({ id })
      .first();
    return saved ? this.toComment(saved) : null;
  }

  async updateComment(
    workspaceId: string,
    baseId: string,
    documentId: string,
    commentId: string,
    bodyValue: string,
    request: NcRequest,
  ) {
    await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.COMMENT,
    );
    const comment = await this.comment(documentId, commentId);
    if (comment.created_by !== request.user.id) {
      throw new ForbiddenException('Only the author can edit this comment');
    }
    const body = this.commentBody(bodyValue);
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_COMMENT_UPDATED,
        resourceType: InternalAuditResourceType.DOCUMENT_COMMENT,
        resourceId: commentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: { bodyLength: String(comment.body).length },
        after: { bodyLength: body.length },
      },
      (transaction) =>
        transaction(INTERNAL_DOCUMENT_COMMENTS_TABLE)
          .where({ id: commentId, document_id: documentId })
          .update({
            body,
            updated_by: request.user.id,
            updated_at: new Date().toISOString(),
          }),
    );
    return this.toComment(await this.comment(documentId, commentId));
  }

  async resolveComment(
    workspaceId: string,
    baseId: string,
    documentId: string,
    commentId: string,
    resolved: boolean,
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.COMMENT,
    );
    const comment = await this.comment(documentId, commentId);
    const manage = await this.permissions.can(
      document,
      request,
      InternalDocumentPermission.MANAGE,
    );
    if (comment.created_by !== request.user.id && !manage) {
      throw new ForbiddenException('Comment resolution is not allowed');
    }
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_COMMENT_UPDATED,
        resourceType: InternalAuditResourceType.DOCUMENT_COMMENT,
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
        transaction(INTERNAL_DOCUMENT_COMMENTS_TABLE)
          .where({ id: commentId, document_id: documentId })
          .update({
            resolved_at: resolved ? new Date().toISOString() : null,
            resolved_by: resolved ? request.user.id : null,
            updated_by: request.user.id,
            updated_at: new Date().toISOString(),
          }),
    );
    return this.toComment(await this.comment(documentId, commentId));
  }

  async deleteComment(
    workspaceId: string,
    baseId: string,
    documentId: string,
    commentId: string,
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.COMMENT,
    );
    const comment = await this.comment(documentId, commentId);
    const manage = await this.permissions.can(
      document,
      request,
      InternalDocumentPermission.MANAGE,
    );
    if (comment.created_by !== request.user.id && !manage) {
      throw new ForbiddenException('Comment deletion is not allowed');
    }
    await this.audit.execute(
      {
        action: InternalAuditAction.DOCUMENT_COMMENT_DELETED,
        resourceType: InternalAuditResourceType.DOCUMENT_COMMENT,
        resourceId: commentId,
        context: {
          ...this.auditContext.fromRequest(request),
          workspaceId,
          baseId,
        },
        before: { authorId: comment.created_by },
        after: { deleted: true },
      },
      (transaction) =>
        transaction(INTERNAL_DOCUMENT_COMMENTS_TABLE)
          .where({ id: commentId, document_id: documentId })
          .update({
            deleted_at: new Date().toISOString(),
            updated_by: request.user.id,
          }),
    );
    return { id: commentId, deleted: true };
  }

  async exportPdf(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
  ) {
    const document = await this.authorizedDocument(
      workspaceId,
      baseId,
      documentId,
      request,
      InternalDocumentPermission.EXPORT,
    );
    return {
      filename: `${
        document.title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'document'
      }.pdf`,
      buffer: this.pdf.render(document.title, document.content),
    };
  }

  private async authorizedDocument(
    workspaceId: string,
    baseId: string,
    documentId: string,
    request: NcRequest,
    permission: InternalDocumentPermission,
  ) {
    const row = await this.documents()
      .where({
        id: documentId,
        workspace_id: workspaceId,
        base_id: baseId,
      })
      .whereNull('deleted_at')
      .first();
    if (!row) throw new NotFoundException('Document not found');
    const document = this.toDocument(row);
    if (!(await this.permissions.can(document, request, permission))) {
      // Do not reveal that an inaccessible document exists.
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  private async assertParent(
    workspaceId: string,
    baseId: string,
    documentId: string,
    parentId: string | null,
    request: NcRequest,
  ) {
    if (!parentId) return;
    if (parentId === documentId) {
      throw new BadRequestException('A document cannot be its own parent');
    }
    await this.authorizedDocument(
      workspaceId,
      baseId,
      parentId,
      request,
      InternalDocumentPermission.EDIT,
    );
    if (
      (await this.descendantIds(workspaceId, baseId, documentId)).includes(
        parentId,
      )
    ) {
      throw new BadRequestException('Document nesting would create a cycle');
    }
  }

  private async descendantIds(
    workspaceId: string,
    baseId: string,
    documentId: string,
  ) {
    const result: string[] = [];
    let parents = [documentId];
    for (let depth = 0; parents.length && depth < 100; depth += 1) {
      const rows = await this.documents()
        .select('id')
        .where({ workspace_id: workspaceId, base_id: baseId })
        .whereIn('parent_id', parents)
        .whereNull('deleted_at');
      parents = rows.map((row) => row.id).filter((id) => !result.includes(id));
      result.push(...parents);
    }
    return result;
  }

  private documents() {
    return this.metaService.knexConnection(INTERNAL_DOCUMENTS_TABLE);
  }

  private toDocument(row: any): InternalDocumentRecord {
    const timestamp = (value: string | Date) =>
      (value instanceof Date ? value : new Date(value)).toISOString();
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      baseId: row.base_id,
      parentId: row.parent_id ?? null,
      title: row.title,
      content: this.content(JSON.parse(row.content)),
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      order: Number(row.display_order),
      version: Number(row.version),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: timestamp(row.created_at),
      updatedAt: timestamp(row.updated_at),
    };
  }

  private toRowUpdate(document: InternalDocumentRecord) {
    return {
      parent_id: document.parentId,
      title: document.title,
      content: JSON.stringify(document.content),
      metadata: document.metadata ? JSON.stringify(document.metadata) : null,
      display_order: document.order,
      version: document.version,
      updated_by: document.updatedBy,
      updated_at: document.updatedAt,
    };
  }

  private async insertRevision(
    transaction: Knex.Transaction,
    document: InternalDocumentRecord,
    summary: string,
  ) {
    await transaction(INTERNAL_DOCUMENT_REVISIONS_TABLE).insert({
      id: nanoid(20),
      document_id: document.id,
      revision: document.version,
      author_id: document.updatedBy,
      summary: summary.slice(0, 512),
      snapshot: JSON.stringify({
        title: document.title,
        content: document.content,
        metadata: document.metadata,
        parentId: document.parentId,
        order: document.order,
      }),
    });
  }

  private async pruneRevisions(
    transaction: Knex.Transaction,
    documentId: string,
  ) {
    const retention = Math.min(
      Math.max(
        Number(process.env.NC_INTERNAL_DOCUMENT_REVISION_RETENTION) || 100,
        10,
      ),
      10_000,
    );
    const keep = await transaction(INTERNAL_DOCUMENT_REVISIONS_TABLE)
      .select('id')
      .where({ document_id: documentId })
      .orderBy('revision', 'desc')
      .limit(retention);
    if (keep.length) {
      await transaction(INTERNAL_DOCUMENT_REVISIONS_TABLE)
        .where({ document_id: documentId })
        .whereNotIn(
          'id',
          keep.map((row) => row.id),
        )
        .delete();
    }
  }

  private snapshot(value: string) {
    try {
      const snapshot = JSON.parse(value);
      return {
        title: this.title(snapshot.title),
        content: this.content(snapshot.content),
        metadata:
          snapshot.metadata && typeof snapshot.metadata === 'object'
            ? snapshot.metadata
            : null,
        parentId:
          typeof snapshot.parentId === 'string' ? snapshot.parentId : null,
        order: this.order(snapshot.order),
      };
    } catch {
      throw new BadRequestException('Revision snapshot is invalid');
    }
  }

  private validGrants(grants: InternalDocumentGrantInput[]) {
    if (!Array.isArray(grants) || grants.length > 1_000) {
      throw new BadRequestException('Document grants are invalid');
    }
    const unique = new Map<string, InternalDocumentGrantInput>();
    for (const grant of grants) {
      if (
        !['user', 'role'].includes(grant.subjectType) ||
        !grant.subjectId?.trim() ||
        grant.subjectId.length > 255 ||
        !INTERNAL_DOCUMENT_PERMISSIONS.includes(grant.permission)
      ) {
        throw new BadRequestException('Document grant is invalid');
      }
      unique.set(
        `${grant.subjectType}:${grant.subjectId}:${grant.permission}`,
        grant,
      );
    }
    return [...unique.values()];
  }

  private title(value: string) {
    const title = String(value ?? '').trim();
    if (!title || title.length > 255) {
      throw new BadRequestException('Document title is invalid');
    }
    return title;
  }

  private content(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Document content must be an object');
    }
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, 'utf8') > 5 * 1024 * 1024) {
      throw new BadRequestException('Document content is too large');
    }
    return value as Record<string, unknown>;
  }

  private order(value: number | undefined) {
    const order = Number(value ?? 1);
    if (!Number.isInteger(order) || order < 0 || order > 1_000_000_000) {
      throw new BadRequestException('Document order is invalid');
    }
    return order;
  }

  private commentBody(value: string) {
    const body = String(value ?? '').trim();
    if (!body || body.length > 20_000) {
      throw new BadRequestException('Comment body is invalid');
    }
    return body;
  }

  private mentions(value: string[] | undefined, actorId: string) {
    if (!value) return [];
    if (!Array.isArray(value) || value.length > 50) {
      throw new BadRequestException('Mentions are invalid');
    }
    return [...new Set(value.filter((id) => id && id !== actorId))];
  }

  private async comment(documentId: string, commentId: string) {
    const row = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_COMMENTS_TABLE)
      .where({ id: commentId, document_id: documentId })
      .whereNull('deleted_at')
      .first();
    if (!row) throw new NotFoundException('Comment not found');
    return row;
  }

  private toComment(row: any) {
    const optionalJson = (value: string | null) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };
    return {
      id: row.id,
      documentId: row.document_id,
      parentId: row.parent_id,
      anchor: optionalJson(row.anchor),
      body: row.body,
      mentions: optionalJson(row.mentions) ?? [],
      author: {
        id: row.created_by,
        displayName: row.author_display_name ?? null,
      },
      resolvedAt: row.resolved_at
        ? new Date(row.resolved_at).toISOString()
        : null,
      resolvedBy: row.resolved_by ?? null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private async notify(
    transaction: Knex.Transaction,
    userIds: string[],
    workspaceId: string,
    baseId: string,
    commentId: string,
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
        type: 'document_mention',
        resource_type: 'document_comment',
        resource_id: commentId,
        workspace_id: workspaceId,
        base_id: baseId,
        payload: JSON.stringify(payload),
      })),
    );
  }
}
