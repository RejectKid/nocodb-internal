import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { NcRequest } from '~/interface/config';
import { InternalFeatureRegistryService } from '../feature-registry/internal-feature-registry.service';
import { InternalValidationEngine } from './internal-validation.engine';
import { InternalValidationRepository } from './internal-validation.repository';

const CREATE_OPERATIONS = new Set([
  'dataInsert',
  'bulkDataInsert',
  'dataUpsert',
  'bulkDataUpsert',
]);
const UPDATE_OPERATIONS = new Set([
  'dataUpdate',
  'bulkDataUpdate',
  'bulkDataUpdateAll',
]);

@Injectable()
export class InternalValidationInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: InternalFeatureRegistryService,
    private readonly repository: InternalValidationRepository,
    private readonly engine: InternalValidationEngine,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (!this.registry.getCapabilities().features.inputValidation) {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<NcRequest>();
    const operation = this.reflector.getAllAndOverride<string | undefined>(
      'permission',
      [context.getHandler(), context.getClass()],
    );
    let mode: 'create' | 'update' | undefined = CREATE_OPERATIONS.has(
      operation ?? '',
    )
      ? 'create'
      : UPDATE_OPERATIONS.has(operation ?? '')
      ? 'update'
      : undefined;
    if (
      !mode &&
      request.method === 'POST' &&
      String(request.path ?? request.url ?? '').includes('/public/shared-view/')
    ) {
      mode = 'create';
    }
    if (!mode) return next.handle();

    const workspaceId = request.ncWorkspaceId ?? request.context?.workspace_id;
    const baseId = request.ncBaseId ?? request.context?.base_id;
    const modelId =
      request.ncModel?.id ??
      request.context?.fk_model_id ??
      (request.context as { ncTableId?: string } | undefined)?.ncTableId ??
      request.params?.modelId ??
      request.params?.tableId;
    if (!workspaceId || !baseId || !modelId) return next.handle();
    if (await this.repository.isBaseFeatureDisabled(workspaceId, baseId)) {
      return next.handle();
    }
    const configurations = await this.repository.list(
      workspaceId,
      baseId,
      modelId,
    );
    if (!configurations.length) return next.handle();
    const records = this.records(request.body);
    if (!records.length) return next.handle();
    const failures = this.engine.validate(records, configurations, mode);
    if (failures.length) {
      throw new UnprocessableEntityException({
        code: 'INTERNAL_VALIDATION_FAILED',
        message: 'Record validation failed',
        errors: failures,
      });
    }
    return next.handle();
  }

  private records(body: unknown): Record<string, unknown>[] {
    let value = body;
    if (value && typeof value === 'object' && 'data' in value) {
      value = (value as { data: unknown }).data;
    }
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    const items = Array.isArray(value) ? value : [value];
    return items
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        if ('fields' in item && typeof item.fields === 'object') {
          return item.fields as Record<string, unknown>;
        }
        return item as Record<string, unknown>;
      })
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }
}
