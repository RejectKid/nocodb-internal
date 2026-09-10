import {
  backendRouteExcludePatterns,
  backendRoutePrefixes,
} from '~/utils/backend-route-prefixes';

describe('internal frontend route boundary', () => {
  it('keeps internal APIs behind the API prefix while allowing internal SPA routes', () => {
    expect(backendRoutePrefixes).toContain('/api');
    expect(backendRoutePrefixes).not.toContain('/internal');
    expect(backendRouteExcludePatterns).toContain('/api/:path*');
    expect(backendRouteExcludePatterns).not.toContain('/internal/:path*');
  });
});
