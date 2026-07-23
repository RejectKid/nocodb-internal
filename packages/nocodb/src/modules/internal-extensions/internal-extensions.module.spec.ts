jest.mock('./internal-extensions.module', () => ({
  InternalExtensionsModule: class InternalExtensionsModule {},
}));

import {
  getInternalExtensionModuleImports,
  InternalExtensionsModule,
} from './index';

describe('internal extension module boundary', () => {
  it('registers no custom module when disabled', () => {
    expect(getInternalExtensionModuleImports({})).toEqual([]);
  });

  it('registers no HTTP extension module in a worker container', () => {
    expect(
      getInternalExtensionModuleImports({
        NC_INTERNAL_EXTENSIONS_ENABLED: 'true',
        NC_WORKER_CONTAINER: 'true',
      }),
    ).toEqual([]);
  });

  it('registers the isolated module when enabled', () => {
    expect(
      getInternalExtensionModuleImports({
        NC_INTERNAL_EXTENSIONS_ENABLED: 'true',
      }),
    ).toEqual([InternalExtensionsModule]);
  });
});
