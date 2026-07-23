export const INTERNAL_FEATURE_SCHEMA_VERSION = 1 as const;

export const INTERNAL_FEATURE_KEYS = [
  'internalAdmin',
  'fineGrainedApiTokens',
  'basePermissions',
  'inputValidation',
  'documentPermissions',
  'filePreviewMode',
  'discussionMode',
] as const;

export type InternalFeatureKey = (typeof INTERNAL_FEATURE_KEYS)[number];

export interface InternalFeatureDefinition {
  key: InternalFeatureKey;
  enabled: boolean;
  backendCapability: boolean;
  frontendCapability: boolean;
  requiredConfiguration: readonly string[];
  minimumInternalSchemaVersion: number;
}

export interface InternalCapabilitiesResponse {
  schemaVersion: typeof INTERNAL_FEATURE_SCHEMA_VERSION;
  features: Record<InternalFeatureKey, boolean>;
}
