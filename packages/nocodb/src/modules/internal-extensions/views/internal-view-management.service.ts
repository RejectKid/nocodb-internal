import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import View from '~/models/View';
import { ViewsService } from '~/services/views.service';
import { GridsService } from '~/services/grids.service';
import { FormsService } from '~/services/forms.service';
import { GalleriesService } from '~/services/galleries.service';
import { KanbansService } from '~/services/kanbans.service';
import { CalendarsService } from '~/services/calendars.service';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalAuditService } from '../audit/internal-audit.service';

export const INTERNAL_SUPPORTED_VIEW_TYPES = [
  'grid',
  'form',
  'gallery',
  'kanban',
  'calendar',
] as const;
export type InternalSupportedViewType =
  (typeof INTERNAL_SUPPORTED_VIEW_TYPES)[number];

@Injectable()
export class InternalViewManagementService {
  constructor(
    private readonly views: ViewsService,
    private readonly grids: GridsService,
    private readonly forms: FormsService,
    private readonly galleries: GalleriesService,
    private readonly kanbans: KanbansService,
    private readonly calendars: CalendarsService,
    private readonly audit: InternalAuditService,
    private readonly auditContext: InternalAuditRequestContextAdapter,
  ) {}

  list(modelId: string, request: NcRequest) {
    return this.views.viewList(request.context, {
      tableId: modelId,
      user: request.user,
    });
  }

  async get(viewId: string, request: NcRequest) {
    const view = await View.get(request.context, viewId);
    if (!view) throw new NotFoundException('View not found');
    return View.maskPasswordForResponse(view);
  }

  async create(
    modelId: string,
    type: InternalSupportedViewType,
    body: any,
    request: NcRequest,
  ) {
    if (!INTERNAL_SUPPORTED_VIEW_TYPES.includes(type)) {
      throw new BadRequestException(
        `Unsupported view type. Allowed: ${INTERNAL_SUPPORTED_VIEW_TYPES.join(
          ', ',
        )}`,
      );
    }
    let view: any;
    switch (type) {
      case 'grid':
        view = await this.grids.gridViewCreate(request.context, {
          tableId: modelId,
          grid: body,
          req: request,
        });
        break;
      case 'form':
        view = await this.forms.formViewCreate(request.context, {
          tableId: modelId,
          body,
          user: request.user,
          req: request,
        });
        break;
      case 'gallery':
        view = await this.galleries.galleryViewCreate(request.context, {
          tableId: modelId,
          gallery: body,
          user: request.user,
          req: request,
        });
        break;
      case 'kanban':
        view = await this.kanbans.kanbanViewCreate(request.context, {
          tableId: modelId,
          kanban: body,
          user: request.user,
          req: request,
        });
        break;
      case 'calendar':
        view = await this.calendars.calendarViewCreate(request.context, {
          tableId: modelId,
          calendar: body,
          user: request.user,
          req: request,
        });
        break;
    }
    await this.record(
      InternalAuditAction.VIEW_CREATED,
      view?.id ?? `${modelId}:${body.title}`,
      request,
      { modelId, type, title: body.title },
    );
    return view;
  }

  async update(viewId: string, body: any, request: NcRequest) {
    await this.get(viewId, request);
    const view = await this.views.viewUpdate(request.context, {
      viewId,
      view: body,
      req: request,
    });
    await this.record(InternalAuditAction.VIEW_UPDATED, viewId, request, {
      fields: Object.keys(body).filter((key) => body[key] !== undefined),
    });
    return view;
  }

  async delete(viewId: string, request: NcRequest) {
    await this.get(viewId, request);
    const result = await this.views.viewDelete(request.context, {
      viewId,
      req: request,
    });
    await this.record(InternalAuditAction.VIEW_DELETED, viewId, request, {
      deleted: true,
    });
    return result;
  }

  async reorder(modelId: string, viewIds: string[], request: NcRequest) {
    if (
      !Array.isArray(viewIds) ||
      !viewIds.length ||
      viewIds.length > 1_000 ||
      new Set(viewIds).size !== viewIds.length
    ) {
      throw new BadRequestException('viewIds are invalid');
    }
    const listed = await this.list(modelId, request);
    const allowed = new Set(listed.map((view: any) => view.id));
    if (viewIds.some((id) => !allowed.has(id))) {
      throw new BadRequestException('Every view must belong to the model');
    }
    const updated = [];
    for (let index = 0; index < viewIds.length; index += 1) {
      updated.push(
        await this.views.viewUpdate(request.context, {
          viewId: viewIds[index],
          view: { order: index + 1 },
          req: request,
        }),
      );
    }
    await this.record(InternalAuditAction.VIEW_REORDERED, modelId, request, {
      viewIds,
    });
    return updated;
  }

  private record(
    action: InternalAuditAction,
    resourceId: string,
    request: NcRequest,
    after: Record<string, unknown>,
  ) {
    return this.audit.record({
      action,
      resourceType: InternalAuditResourceType.VIEW,
      resourceId,
      context: this.auditContext.fromRequest(request),
      after,
    });
  }
}
