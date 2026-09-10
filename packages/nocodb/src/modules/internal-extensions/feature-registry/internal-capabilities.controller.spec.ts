jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {},
}));
jest.mock('~/guards/meta-api-limiter.guard', () => ({
  MetaApiLimiterGuard: class MetaApiLimiterGuard {},
}));

import { InternalCapabilitiesController } from './internal-capabilities.controller';
import { InternalFeatureRegistryService } from './internal-feature-registry.service';

describe('InternalCapabilitiesController', () => {
  it('returns only the independent internal registry projection', () => {
    const registry = new InternalFeatureRegistryService();
    jest.spyOn(registry, 'getCapabilities').mockReturnValue(
      registry.getCapabilities({
        NC_INTERNAL_EXTENSIONS_ENABLED: 'true',
        NC_INTERNAL_FINE_GRAINED_API_TOKENS_ENABLED: 'true',
      }),
    );
    const controller = new InternalCapabilitiesController(registry);

    expect(controller.getCapabilities()).toEqual({
      schemaVersion: 1,
      features: {
        internalAdmin: false,
        fineGrainedApiTokens: true,
        basePermissions: false,
        inputValidation: false,
        documentPermissions: false,
        filePreviewMode: false,
        discussionMode: false,
        teams: false,
      },
    });
  });
});
