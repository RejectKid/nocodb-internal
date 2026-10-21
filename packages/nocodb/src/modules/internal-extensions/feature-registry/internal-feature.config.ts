import type {
  InternalFeatureDefinition,
  InternalFeatureKey,
} from './internal-feature.types';

export const INTERNAL_EXTENSIONS_ENABLED_ENV =
  'NC_INTERNAL_EXTENSIONS_ENABLED' as const;

const INTERNAL_FEATURE_ENV: Record<InternalFeatureKey, string> = {
  internalAdmin: 'NC_INTERNAL_ADMIN_ENABLED',
  fineGrainedApiTokens: 'NC_INTERNAL_FINE_GRAINED_API_TOKENS_ENABLED',
  basePermissions: 'NC_INTERNAL_BASE_PERMISSIONS_ENABLED',
  inputValidation: 'NC_INTERNAL_INPUT_VALIDATION_ENABLED',
  documentPermissions: 'NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED',
  filePreviewMode: 'NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED',
  discussionMode: 'NC_INTERNAL_DISCUSSION_MODE_ENABLED',
  teams: 'NC_INTERNAL_TEAMS_ENABLED',
  cellColoring: 'NC_INTERNAL_CELL_COLORING_ENABLED',
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function parseInternalBoolean(value: string | undefined): boolean {
  return value !== undefined && TRUE_VALUES.has(value.trim().toLowerCase());
}

export function isInternalExtensionsEnabled(env: NodeJS.ProcessEnv): boolean {
  return (
    env.NC_WORKER_CONTAINER !== 'true' &&
    parseInternalBoolean(env[INTERNAL_EXTENSIONS_ENABLED_ENV])
  );
}

export function buildInternalFeatureDefinitions(
  env: NodeJS.ProcessEnv,
): InternalFeatureDefinition[] {
  const masterEnabled = isInternalExtensionsEnabled(env);

  return Object.entries(INTERNAL_FEATURE_ENV).map(([key, environmentName]) => ({
    key: key as InternalFeatureKey,
    enabled:
      masterEnabled &&
      parseInternalBoolean(env[environmentName]) &&
      (key !== 'filePreviewMode' ||
        parseInternalBoolean(env.NC_SECURE_ATTACHMENTS)),
    backendCapability: key !== 'cellColoring',
    frontendCapability: true,
    requiredConfiguration:
      key === 'filePreviewMode'
        ? [environmentName, 'NC_SECURE_ATTACHMENTS']
        : [environmentName],
    minimumInternalSchemaVersion: 1,
  }));
}
