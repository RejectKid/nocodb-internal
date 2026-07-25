import { Injectable, NotFoundException } from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import { MetaService } from '~/meta/meta.service';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalAuditService } from '../audit/internal-audit.service';
import { INTERNAL_NOTIFICATIONS_TABLE } from '../migrations/nc_internal_004_product_suite';

@Injectable()
export class InternalNotificationService {
  constructor(
    private readonly metaService: MetaService,
    private readonly audit: InternalAuditService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  async list(userId: string, unreadOnly = false) {
    const query = this.metaService
      .knexConnection(INTERNAL_NOTIFICATIONS_TABLE)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(100);
    if (unreadOnly) query.whereNull('read_at');
    const rows = await query;
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      workspaceId: row.workspace_id,
      baseId: row.base_id,
      payload: row.payload ? JSON.parse(row.payload) : null,
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  async markRead(notificationId: string, request: NcRequest) {
    const notification = await this.metaService
      .knexConnection(INTERNAL_NOTIFICATIONS_TABLE)
      .where({ id: notificationId, user_id: request.user.id })
      .first();
    if (!notification) throw new NotFoundException('Notification not found');
    if (!notification.read_at) {
      await this.audit.execute(
        {
          action: InternalAuditAction.NOTIFICATION_READ,
          resourceType: InternalAuditResourceType.NOTIFICATION,
          resourceId: notificationId,
          context: {
            ...this.auditContext.fromRequest(request),
            workspaceId: notification.workspace_id,
            baseId: notification.base_id,
          },
          after: { read: true },
        },
        (transaction) =>
          transaction(INTERNAL_NOTIFICATIONS_TABLE)
            .where({ id: notificationId, user_id: request.user.id })
            .update({ read_at: new Date().toISOString() }),
      );
    }
    return { id: notificationId, read: true };
  }
}
