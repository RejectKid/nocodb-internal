import { NotFoundException } from '@nestjs/common';
import { InternalFeatureGuard } from './internal-feature.guard';

jest.mock('~/meta/meta.service', () => ({ MetaService: class MetaService {} }));

const context = (params: Record<string, string> = {}) =>
  ({
    getHandler: () => 'handler',
    getClass: () => 'controller',
    switchToHttp: () => ({ getRequest: () => ({ params }) }),
  } as any);

describe('InternalFeatureGuard', () => {
  it('hides globally disabled capabilities', async () => {
    const guard = new InternalFeatureGuard(
      { getAllAndOverride: () => 'documentPermissions' } as any,
      {
        getCapabilities: () => ({
          features: { documentPermissions: false },
        }),
      } as any,
      {} as any,
    );
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('hides a capability disabled for the requested base', async () => {
    const guard = new InternalFeatureGuard(
      { getAllAndOverride: () => 'discussionMode' } as any,
      {
        getCapabilities: () => ({ features: { discussionMode: true } }),
      } as any,
      {
        knexConnection: () => ({
          where: () => ({ first: async () => ({ enabled: false }) }),
        }),
      } as any,
    );
    await expect(
      guard.canActivate(context({ workspaceId: 'w1', baseId: 'b1' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows an enabled capability in an enabled base', async () => {
    const guard = new InternalFeatureGuard(
      { getAllAndOverride: () => 'discussionMode' } as any,
      {
        getCapabilities: () => ({ features: { discussionMode: true } }),
      } as any,
      {
        knexConnection: () => ({
          where: () => ({ first: async () => undefined }),
        }),
      } as any,
    );
    await expect(
      guard.canActivate(context({ workspaceId: 'w1', baseId: 'b1' })),
    ).resolves.toBe(true);
  });
});
