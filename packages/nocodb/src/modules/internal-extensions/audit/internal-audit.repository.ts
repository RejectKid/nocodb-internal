import type { Knex } from 'knex';
import type { InternalAuditEventRecord } from './internal-audit-event.model';
import type {
  InternalAuditAction,
  InternalAuditResourceType,
} from './internal-audit-event';

export interface InternalAuditQuery {
  workspaceId?: string;
  baseId?: string;
  action?: InternalAuditAction;
  resourceType?: InternalAuditResourceType;
  resourceId?: string;
  limit?: number;
}

export abstract class InternalAuditRepository {
  abstract append(
    event: InternalAuditEventRecord,
    transaction?: Knex.Transaction,
  ): Promise<InternalAuditEventRecord>;

  abstract list(query: InternalAuditQuery): Promise<InternalAuditEventRecord[]>;

  abstract transaction<T>(
    work: (transaction: Knex.Transaction) => Promise<T>,
  ): Promise<T>;
}
