import { z } from 'zod';
import type { Knex } from 'knex';
import type { MetaService } from '~/meta/meta.service';
import {
  InternalAuditAction,
  InternalAuditActorType,
  InternalAuditResourceType,
} from './internal-audit-event';
import type {
  InternalAuditEventRecord,
  InternalAuditSummary,
} from './internal-audit-event.model';
import {
  InternalAuditRepository,
  type InternalAuditQuery,
} from './internal-audit.repository';
import { INTERNAL_AUDIT_EVENTS_TABLE } from '../migrations/nc_internal_003_audit_events';

type InternalAuditDatabaseRow = Omit<
  InternalAuditEventRecord,
  'occurred_at' | 'before_summary' | 'after_summary' | 'metadata'
> & {
  occurred_at: string | Date;
  before_summary: string | null;
  after_summary: string | null;
  metadata: string | null;
};

const summarySchema = z.record(z.unknown()).nullable();
const rowSchema = z.object({
  id: z.string().min(1),
  schema_version: z.number().int().positive(),
  actor_type: z.nativeEnum(InternalAuditActorType),
  actor_id: z.string().nullable(),
  action: z.nativeEnum(InternalAuditAction),
  resource_type: z.nativeEnum(InternalAuditResourceType),
  resource_id: z.string().min(1),
  workspace_id: z.string().nullable(),
  base_id: z.string().nullable(),
  occurred_at: z.union([z.string(), z.date()]),
  request_id: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  before_summary: z.string().nullable(),
  after_summary: z.string().nullable(),
  metadata: z.string().nullable(),
});

function parseSummary(value: string | null, field: string) {
  if (value === null) {
    return null;
  }
  try {
    return summarySchema.parse(JSON.parse(value)) as InternalAuditSummary;
  } catch {
    throw new Error(`Stored internal audit event has invalid ${field}`);
  }
}

function toModel(input: unknown): InternalAuditEventRecord {
  const row = rowSchema.parse(input);
  const occurredAt =
    row.occurred_at instanceof Date
      ? row.occurred_at
      : new Date(row.occurred_at);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error('Stored internal audit event has invalid occurred_at');
  }
  return {
    ...row,
    occurred_at: occurredAt.toISOString(),
    before_summary: parseSummary(row.before_summary, 'before_summary'),
    after_summary: parseSummary(row.after_summary, 'after_summary'),
    metadata: parseSummary(row.metadata, 'metadata'),
  } as InternalAuditEventRecord;
}

function toDatabaseRow(
  event: InternalAuditEventRecord,
): InternalAuditDatabaseRow {
  return {
    ...event,
    before_summary: event.before_summary
      ? JSON.stringify(event.before_summary)
      : null,
    after_summary: event.after_summary
      ? JSON.stringify(event.after_summary)
      : null,
    metadata: event.metadata ? JSON.stringify(event.metadata) : null,
  };
}

export class KnexInternalAuditRepository extends InternalAuditRepository {
  constructor(
    private readonly metaService: Pick<MetaService, 'knexConnection'>,
  ) {
    super();
  }

  async append(
    event: InternalAuditEventRecord,
    transaction?: Knex.Transaction,
  ): Promise<InternalAuditEventRecord> {
    const connection = transaction ?? this.metaService.knexConnection;
    await connection<InternalAuditDatabaseRow>(
      INTERNAL_AUDIT_EVENTS_TABLE,
    ).insert(toDatabaseRow(event));
    const row = await connection<InternalAuditDatabaseRow>(
      INTERNAL_AUDIT_EVENTS_TABLE,
    )
      .where({ id: event.id })
      .first();
    if (!row) {
      throw new Error('Internal audit event could not be reloaded');
    }
    return toModel(row);
  }

  async list(query: InternalAuditQuery): Promise<InternalAuditEventRecord[]> {
    if (!query.workspaceId) {
      throw new Error('Internal audit queries require a workspace boundary');
    }
    const builder = this.table().where({ workspace_id: query.workspaceId });
    if (query.baseId) builder.andWhere({ base_id: query.baseId });
    if (query.action) builder.andWhere({ action: query.action });
    if (query.resourceType) {
      builder.andWhere({ resource_type: query.resourceType });
    }
    if (query.resourceId) builder.andWhere({ resource_id: query.resourceId });
    const rows = await builder
      .orderBy('occurred_at', 'desc')
      .orderBy('id', 'desc')
      .limit(Math.min(Math.max(query.limit ?? 100, 1), 200));
    return rows.map(toModel);
  }

  transaction<T>(
    work: (transaction: Knex.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.metaService.knexConnection.transaction(work);
  }

  private table() {
    return this.metaService.knexConnection<InternalAuditDatabaseRow>(
      INTERNAL_AUDIT_EVENTS_TABLE,
    );
  }
}
