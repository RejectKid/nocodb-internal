import {
  INTERNAL_FEATURE_SCHEMA_VERSION,
  INTERNAL_FEATURE_KEYS,
} from './internal-feature.types';
import { InternalFeatureRegistryService } from './internal-feature-registry.service';

describe('InternalFeatureRegistryService', () => {
  it('fails closed when the internal extension boundary is disabled', () => {
    const service = new InternalFeatureRegistryService();

    expect(
      service.getCapabilities({
        NC_INTERNAL_ADMIN_ENABLED: 'true',
      }),
    ).toEqual({
      schemaVersion: INTERNAL_FEATURE_SCHEMA_VERSION,
      features: Object.fromEntries(
        INTERNAL_FEATURE_KEYS.map((key) => [key, false]),
      ),
    });
  });

  it('enables only explicitly configured internal features', () => {
    const service = new InternalFeatureRegistryService();

    expect(
      service.getCapabilities({
        NC_INTERNAL_EXTENSIONS_ENABLED: 'true',
        NC_INTERNAL_ADMIN_ENABLED: '1',
        NC_INTERNAL_DISCUSSION_MODE_ENABLED: 'yes',
        NC_INTERNAL_BASE_PERMISSIONS_ENABLED: 'false',
      }),
    ).toEqual({
      schemaVersion: 1,
      features: {
        internalAdmin: true,
        fineGrainedApiTokens: false,
        basePermissions: false,
        inputValidation: false,
        documentPermissions: false,
        filePreviewMode: false,
        discussionMode: true,
        teams: false,
      },
    });
  });

  it('returns the stable authenticated capability response shape', () => {
    const response = new InternalFeatureRegistryService().getCapabilities({
      NC_INTERNAL_EXTENSIONS_ENABLED: 'on',
    });

    expect(response.schemaVersion).toBe(1);
    expect(Object.keys(response.features)).toEqual(INTERNAL_FEATURE_KEYS);
    expect(Object.values(response.features)).toHaveLength(
      INTERNAL_FEATURE_KEYS.length,
    );
  });
});
