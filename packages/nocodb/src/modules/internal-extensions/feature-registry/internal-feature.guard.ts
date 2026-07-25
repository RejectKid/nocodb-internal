import { Injectable, NotFoundException, SetMetadata } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MetaService } from '~/meta/meta.service';
import { INTERNAL_BASE_FEATURES_TABLE } from '../migrations/nc_internal_004_product_suite';
import type { InternalFeatureKey } from './internal-feature.types';
import { InternalFeatureRegistryService } from './internal-feature-registry.service';

export const INTERNAL_REQUIRED_FEATURE =
  'nc.internal.required-feature' as const;

export const RequireInternalFeature = (feature: InternalFeatureKey) =>
  SetMetadata(INTERNAL_REQUIRED_FEATURE, feature);

@Injectable()
export class InternalFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: InternalFeatureRegistryService,
    private readonly metaService: MetaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<
      InternalFeatureKey | undefined
    >(INTERNAL_REQUIRED_FEATURE, [context.getHandler(), context.getClass()]);
    if (feature && !this.registry.getCapabilities().features[feature]) {
      // A disabled internal capability should not advertise a route.
      throw new NotFoundException('Internal capability is disabled');
    }
    const request = context.switchToHttp().getRequest();
    const workspaceId =
      request.params?.workspaceId ??
      request.ncWorkspaceId ??
      request.context?.workspace_id;
    const baseId =
      request.params?.baseId ?? request.ncBaseId ?? request.context?.base_id;
    if (feature && workspaceId && baseId) {
      const setting = await this.metaService
        .knexConnection(INTERNAL_BASE_FEATURES_TABLE)
        .where({
          workspace_id: workspaceId,
          base_id: baseId,
          feature_key: feature,
        })
        .first();
      if (setting && !Boolean(setting.enabled)) {
        throw new NotFoundException('Internal capability is disabled');
      }
    }
    return true;
  }
}
