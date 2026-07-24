import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { Knex } from 'knex';
import type {
  CreateInternalAuditEvent,
  InternalAuditEventRecord,
} from './internal-audit-event.model';
import { InternalAuditRedactionService } from './internal-audit-redaction.service';
import { InternalAuditRepository } from './internal-audit.repository';

const SCHEMA_VERSION = 1;

@Injectable()
export class InternalAuditService {
  constructor(
    private readonly repository: InternalAuditRepository,
    private readonly redaction: InternalAuditRedactionService,
  ) {}

  async record(
    event: CreateInternalAuditEvent,
    transaction?: Knex.Transaction,
  ): Promise<InternalAuditEventRecord> {
    return this.repository.append(this.prepare(event), transaction);
  }

  async execute<T>(
    event: CreateInternalAuditEvent | ((result: T) => CreateInternalAuditEvent),
    mutation: (transaction: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.repository.transaction(async (transaction) => {
      const result = await mutation(transaction);
      await this.record(
        typeof event === 'function' ? event(result) : event,
        transaction,
      );
      return result;
    });
  }

  private prepare(event: CreateInternalAuditEvent): InternalAuditEventRecord {
    const occurredAt = event.occurredAt ?? new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error('Internal audit event occurredAt must be valid');
    }
    if (!event.resourceId.trim() || event.resourceId.length > 255) {
      throw new Error('Internal audit event resourceId is invalid');
    }

    return {
      id: event.id ?? nanoid(20),
      schema_version: SCHEMA_VERSION,
      actor_type: event.context.actorType,
      actor_id: event.context.actorId?.slice(0, 255) ?? null,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      workspace_id: event.context.workspaceId?.slice(0, 20) ?? null,
      base_id: event.context.baseId?.slice(0, 20) ?? null,
      occurred_at: occurredAt.toISOString(),
      request_id: event.context.requestId?.slice(0, 128) ?? null,
      ip_address: event.context.ipAddress?.slice(0, 64) ?? null,
      user_agent: event.context.userAgent?.slice(0, 512) ?? null,
      before_summary: this.redaction.sanitize(event.before),
      after_summary: this.redaction.sanitize(event.after),
      metadata: this.redaction.sanitize(event.metadata),
    };
  }
}
