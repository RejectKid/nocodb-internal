jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {},
}));
jest.mock('~/guards/meta-api-limiter.guard', () => ({
  MetaApiLimiterGuard: class MetaApiLimiterGuard {},
}));

import { InternalCapabilitiesController } from '../feature-registry/internal-capabilities.controller';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { InternalBasePermissionsController } from '../permissions/internal-base-permissions.controller';
import { InternalApiTokensController } from './internal-api-tokens.controller';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from './internal-token-owner.provider';
import {
  INTERNAL_TOKEN_SCOPE_METADATA,
  type InternalTokenScopeMetadata,
} from './internal-token-scope.decorator';

const routeMetadata = (
  controller: object,
  method: string,
): InternalTokenScopeMetadata =>
  Reflect.getMetadata(
    INTERNAL_TOKEN_SCOPE_METADATA,
    (controller as Record<string, () => unknown>)[method],
  );

describe('internal token production route metadata', () => {
  it('protects capabilities with instance admin read', () => {
    expect(
      routeMetadata(
        InternalCapabilitiesController.prototype,
        'getCapabilities',
      ),
    ).toEqual({
      scope: InternalApiTokenScope.ADMIN_READ,
      target: 'instance',
      ownerPermission: INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
    });
  });

  it('protects token administration with typed base read/write scopes', () => {
    expect(
      routeMetadata(InternalApiTokensController.prototype, 'getState'),
    ).toEqual({
      scope: InternalApiTokenScope.TOKENS_READ,
      target: 'base',
      ownerPermission: InternalBasePermission.BASE_MANAGE_TOKENS,
    });
    for (const method of ['create', 'revoke']) {
      expect(
        routeMetadata(InternalApiTokensController.prototype, method),
      ).toEqual({
        scope: InternalApiTokenScope.TOKENS_WRITE,
        target: 'base',
        ownerPermission: InternalBasePermission.BASE_MANAGE_TOKENS,
      });
    }
  });

  it('protects permission administration with typed base admin scopes', () => {
    expect(
      routeMetadata(InternalBasePermissionsController.prototype, 'getState'),
    ).toEqual({
      scope: InternalApiTokenScope.ADMIN_READ,
      target: 'base',
      ownerPermission: InternalBasePermission.BASE_MANAGE_MEMBERS,
    });
    for (const method of ['setConfiguration', 'replaceSubjectGrants']) {
      expect(
        routeMetadata(InternalBasePermissionsController.prototype, method),
      ).toEqual({
        scope: InternalApiTokenScope.ADMIN_WRITE,
        target: 'base',
        ownerPermission: InternalBasePermission.BASE_MANAGE_MEMBERS,
      });
    }
  });
});
