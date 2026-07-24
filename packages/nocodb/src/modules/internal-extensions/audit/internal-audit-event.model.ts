import type {
  InternalAuditAction,
  InternalAuditActorType,
  InternalAuditResourceType,
} from './internal-audit-event';

export type InternalAuditSummary = Record<string, unknown>;

export interface InternalAuditEventRecord {
  id: string;
  schema_version: number;
  actor_type: InternalAuditActorType;
  actor_id: string | null;
  action: InternalAuditAction;
  resource_type: InternalAuditResourceType;
  resource_id: string;
  workspace_id: string | null;
  base_id: string | null;
  occurred_at: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  before_summary: InternalAuditSummary | null;
  after_summary: InternalAuditSummary | null;
  metadata: InternalAuditSummary | null;
}

export interface InternalAuditContext {
  actorType: InternalAuditActorType;
  actorId?: string | null;
  workspaceId?: string | null;
  baseId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateInternalAuditEvent {
  id?: string;
  action: InternalAuditAction;
  resourceType: InternalAuditResourceType;
  resourceId: string;
  context: InternalAuditContext;
  before?: InternalAuditSummary | null;
  after?: InternalAuditSummary | null;
  metadata?: InternalAuditSummary | null;
  occurredAt?: Date;
}
