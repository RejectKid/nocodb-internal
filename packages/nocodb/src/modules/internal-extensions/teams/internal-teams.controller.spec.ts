jest.mock('~/meta/meta.service', () => ({ MetaService: class {} }));
jest.mock('~/guards/global/global.guard', () => ({ GlobalGuard: class {} }));
jest.mock('~/guards/meta-api-limiter.guard', () => ({
  MetaApiLimiterGuard: class {},
}));
jest.mock('../authorization/internal-workspace-manager.guard', () => ({
  InternalWorkspaceManagerGuard: class {},
}));
jest.mock('./internal-team.service', () => ({ InternalTeamService: class {} }));
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { InternalTeamsController } from './internal-teams.controller';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalWorkspaceManagerGuard } from '../authorization/internal-workspace-manager.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { INTERNAL_TOKEN_SCOPE_METADATA } from '../api-tokens/internal-token-scope.decorator';
import { InternalFeatureGuard } from '../feature-registry/internal-feature.guard';

describe('team controller authorization registration', () => {
  it('requires authentication, token scope and feature enablement before route execution', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, InternalTeamsController),
    ).toEqual(
      expect.arrayContaining([
        InternalAuthenticatedGuard,
        InternalTokenScopeGuard,
        InternalFeatureGuard,
      ]),
    );
  });
  it.each(['create', 'update'])(
    'requires workspace manager and workspace members:write for %s',
    (method) => {
      const handler = InternalTeamsController.prototype[method];
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(
        InternalWorkspaceManagerGuard,
      );
      expect(
        Reflect.getMetadata(INTERNAL_TOKEN_SCOPE_METADATA, handler),
      ).toMatchObject({ target: 'workspace', scope: 'members:write' });
    },
  );
  it('requires workspace members:read for listing', () => {
    expect(
      Reflect.getMetadata(
        INTERNAL_TOKEN_SCOPE_METADATA,
        InternalTeamsController.prototype.list,
      ),
    ).toMatchObject({ target: 'workspace', scope: 'members:read' });
  });
});
