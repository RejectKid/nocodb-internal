import { Injectable } from '@nestjs/common';
import { InternalAuditActorType } from './internal-audit-event';
import type { InternalAuditContext } from './internal-audit-event.model';

interface InternalAuditRequestLike {
  user?: { id?: string } | null;
  ncWorkspaceId?: string;
  ncBaseId?: string;
  clientIp?: string;
  ip?: string;
  id?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@Injectable()
export class InternalAuditRequestContextAdapter {
  fromRequest(request: InternalAuditRequestLike): InternalAuditContext {
    return {
      actorType: request.user?.id
        ? InternalAuditActorType.USER
        : InternalAuditActorType.SYSTEM,
      actorId: request.user?.id ?? null,
      workspaceId: request.ncWorkspaceId ?? null,
      baseId: request.ncBaseId ?? null,
      requestId:
        this.header(request, 'x-request-id') ??
        request.id?.slice(0, 128) ??
        null,
      ipAddress: (request.clientIp ?? request.ip ?? '').slice(0, 64) || null,
      userAgent: this.header(request, 'user-agent')?.slice(0, 512) ?? null,
    };
  }

  private header(request: InternalAuditRequestLike, name: string) {
    const value = request.headers?.[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
