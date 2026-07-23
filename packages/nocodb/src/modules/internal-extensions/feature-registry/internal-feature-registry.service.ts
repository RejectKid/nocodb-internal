import { Injectable } from '@nestjs/common';
import {
  INTERNAL_FEATURE_SCHEMA_VERSION,
  type InternalCapabilitiesResponse,
  type InternalFeatureDefinition,
} from './internal-feature.types';
import { buildInternalFeatureDefinitions } from './internal-feature.config';

@Injectable()
export class InternalFeatureRegistryService {
  getDefinitions(
    env: NodeJS.ProcessEnv = process.env,
  ): readonly InternalFeatureDefinition[] {
    return buildInternalFeatureDefinitions(env);
  }

  getCapabilities(
    env: NodeJS.ProcessEnv = process.env,
  ): InternalCapabilitiesResponse {
    const features = Object.fromEntries(
      this.getDefinitions(env).map(({ key, enabled }) => [key, enabled]),
    ) as InternalCapabilitiesResponse['features'];

    return {
      schemaVersion: INTERNAL_FEATURE_SCHEMA_VERSION,
      features,
    };
  }
}
