jest.mock('~/middlewares/extract-ids/extract-ids.middleware', () => ({
  Acl: () => () => undefined,
}));
jest.mock('~/services/data-table.service', () => ({
  DataTableService: class DataTableService {},
}));
jest.mock('~/guards/data-api-limiter.guard', () => ({
  DataApiLimiterGuard: class DataApiLimiterGuard {},
}));
jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {},
}));
jest.mock('~/helpers', () => ({
  parseHrtimeToMilliSeconds: () => 0,
}));

import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  NestInterceptor,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataTableController } from '~/controllers/data-table.controller';
import { InternalFeatureRegistryService } from '../feature-registry/internal-feature-registry.service';
import { InternalBasePermission } from './internal-base-permission';
import {
  INTERNAL_BASE_PERMISSION_METADATA,
  RequireInternalBasePermission,
} from './internal-base-permission-enforcement.decorator';
import { InternalBasePermissionEnforcementInterceptor } from './internal-base-permission-enforcement.interceptor';
import { InternalBasePermissionIdentityProvider } from './internal-base-permission-identity.provider';
import { InternalBasePermissionRepository } from './internal-base-permission.repository';
import { InternalBasePermissionService } from './internal-base-permission.service';
import type { CallHandler, ExecutionContext } from '@nestjs/common';

@Injectable()
class CommunityDenyInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, _next: CallHandler) {
    throw new ForbiddenException('Community ACL denied');
  }
}

@Controller('/permission-fixture/workspaces/:workspaceId/bases/:baseId')
class PermissionFixtureController {
  @Get('/read')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  read() {
    return { allowed: true };
  }

  @Post('/create')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_CREATE)
  create() {
    return { allowed: true };
  }

  @Patch('/update')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_UPDATE)
  update() {
    return { allowed: true };
  }

  @Delete('/delete')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_DELETE)
  delete() {
    return { allowed: true };
  }

  @Post('/upsert')
  @RequireInternalBasePermission(
    InternalBasePermission.RECORDS_CREATE,
    InternalBasePermission.RECORDS_UPDATE,
  )
  upsert() {
    return { allowed: true };
  }

  @Get('/community-denied')
  @RequireInternalBasePermission(InternalBasePermission.RECORDS_READ)
  @UseInterceptors(CommunityDenyInterceptor)
  communityDenied() {
    return { allowed: true };
  }
}

describe('InternalBasePermissionEnforcementInterceptor', () => {
  let app: INestApplication;
  let featureEnabled = true;
  const featureRegistry = {
    getCapabilities: jest.fn(() => ({
      schemaVersion: 1,
      features: { basePermissions: featureEnabled },
    })),
  };
  const identityProvider = {
    resolve: jest.fn().mockResolvedValue({
      id: 'user-1',
      state: 'active',
      roles: ['editor'],
      isOwner: false,
    }),
  };
  const repository = {
    getConfiguration: jest.fn().mockResolvedValue({
      workspace_id: 'authoritative-workspace',
      base_id: 'authoritative-base',
      enabled: true,
    }),
  };
  const permissionService = {
    resolveMany: jest.fn().mockResolvedValue([
      {
        allowed: true,
        mode: 'internal',
        source: 'role',
        reason: 'role_allow',
      },
    ]),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PermissionFixtureController],
      providers: [
        CommunityDenyInterceptor,
        {
          provide: InternalFeatureRegistryService,
          useValue: featureRegistry,
        },
        {
          provide: InternalBasePermissionIdentityProvider,
          useValue: identityProvider,
        },
        {
          provide: InternalBasePermissionService,
          useValue: permissionService,
        },
        {
          provide: InternalBasePermissionRepository,
          useValue: repository,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: InternalBasePermissionEnforcementInterceptor,
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      if (req.headers['x-test-tenant'] === 'ids-only') {
        req.ncWorkspaceId = 'authoritative-workspace';
        req.ncBaseId = 'authoritative-base';
      } else if (req.headers['x-test-tenant'] !== 'missing') {
        req.ncWorkspaceId = 'authoritative-workspace';
        req.ncBaseId = 'authoritative-base';
        req.context = {
          workspace_id: req.ncWorkspaceId,
          base_id: req.ncBaseId,
        };
      }
      if (req.headers['x-test-user'] === 'active') {
        req.user = { id: 'user-1' };
      }
      next();
    });
    await app.init();
  });

  beforeEach(() => {
    featureEnabled = true;
    jest.clearAllMocks();
    identityProvider.resolve.mockResolvedValue({
      id: 'user-1',
      state: 'active',
      roles: ['editor'],
      isOwner: false,
    });
    repository.getConfiguration.mockResolvedValue({
      workspace_id: 'authoritative-workspace',
      base_id: 'authoritative-base',
      enabled: true,
    });
    permissionService.resolveMany.mockResolvedValue([
      {
        allowed: true,
        mode: 'internal',
        source: 'role',
        reason: 'role_allow',
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['get', 'read', InternalBasePermission.RECORDS_READ, 200],
    ['post', 'create', InternalBasePermission.RECORDS_CREATE, 201],
    ['patch', 'update', InternalBasePermission.RECORDS_UPDATE, 200],
    ['delete', 'delete', InternalBasePermission.RECORDS_DELETE, 200],
  ] as const)(
    'enforces %s %s with authoritative tenant context',
    async (method, path, permission, expectedStatus) => {
      await request(app.getHttpServer())
        [method](`/permission-fixture/workspaces/spoofed/bases/spoofed/${path}`)
        .set('x-test-user', 'active')
        .expect(expectedStatus)
        .expect({ allowed: true });

      expect(identityProvider.resolve).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'authoritative-workspace',
          base_id: 'authoritative-base',
        }),
        'authoritative-workspace',
        'authoritative-base',
        'user-1',
      );
      expect(repository.getConfiguration).toHaveBeenCalledWith(
        'authoritative-workspace',
        'authoritative-base',
      );
      expect(permissionService.resolveMany).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'authoritative-workspace',
          baseId: 'authoritative-base',
          communityAllowed: expect.any(Function),
        }),
        [permission],
      );
      const input = permissionService.resolveMany.mock.calls[0][0];
      expect(input.communityAllowed(permission)).toBe(true);
    },
  );

  it('preserves Community behavior when the independent feature is disabled', async () => {
    featureEnabled = false;

    await request(app.getHttpServer())
      .get('/permission-fixture/workspaces/workspace-1/bases/base-1/read')
      .expect(200);
    expect(identityProvider.resolve).not.toHaveBeenCalled();
    expect(repository.getConfiguration).not.toHaveBeenCalled();
    expect(permissionService.resolveMany).not.toHaveBeenCalled();
  });

  it('preserves Community behavior until the base explicitly opts in', async () => {
    repository.getConfiguration.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/permission-fixture/workspaces/workspace-1/bases/base-1/read')
      .expect(200);
    expect(repository.getConfiguration).toHaveBeenCalled();
    expect(identityProvider.resolve).not.toHaveBeenCalled();
    expect(permissionService.resolveMany).not.toHaveBeenCalled();
  });

  it('requires every permission attached to a compound operation', async () => {
    permissionService.resolveMany.mockResolvedValue([
      {
        allowed: true,
        mode: 'internal',
        source: 'role',
        reason: 'role_allow',
      },
      {
        allowed: false,
        mode: 'internal',
        source: 'role',
        reason: 'role_deny',
      },
    ]);

    await request(app.getHttpServer())
      .post('/permission-fixture/workspaces/workspace-1/bases/base-1/upsert')
      .set('x-test-user', 'active')
      .expect(403);
    expect(permissionService.resolveMany).toHaveBeenCalledWith(
      expect.anything(),
      [
        InternalBasePermission.RECORDS_CREATE,
        InternalBasePermission.RECORDS_UPDATE,
      ],
    );
  });

  it('cannot grant around a downstream Community ACL denial', async () => {
    await request(app.getHttpServer())
      .get(
        '/permission-fixture/workspaces/workspace-1/bases/base-1/community-denied',
      )
      .set('x-test-user', 'active')
      .expect(403);
    expect(permissionService.resolveMany).toHaveBeenCalled();
  });

  it('distinguishes missing authentication from authorization denial', async () => {
    await request(app.getHttpServer())
      .get('/permission-fixture/workspaces/workspace-1/bases/base-1/read')
      .expect(401);

    permissionService.resolveMany.mockResolvedValue([
      {
        allowed: false,
        mode: 'internal',
        source: 'role',
        reason: 'role_deny',
      },
    ]);
    await request(app.getHttpServer())
      .get('/permission-fixture/workspaces/workspace-1/bases/base-1/read')
      .set('x-test-user', 'active')
      .expect(403);
  });

  it('fails closed when authoritative tenant context is unavailable', async () => {
    for (const tenantScenario of ['missing', 'ids-only']) {
      await request(app.getHttpServer())
        .get('/permission-fixture/workspaces/workspace-1/bases/base-1/read')
        .set('x-test-user', 'active')
        .set('x-test-tenant', tenantScenario)
        .expect(403);
    }
    expect(identityProvider.resolve).not.toHaveBeenCalled();
    expect(repository.getConfiguration).not.toHaveBeenCalled();
    expect(permissionService.resolveMany).not.toHaveBeenCalled();
  });

  it('denies an authenticated user missing from the authoritative base', async () => {
    identityProvider.resolve.mockResolvedValue(null);
    permissionService.resolveMany.mockResolvedValue([
      {
        allowed: false,
        mode: 'internal',
        source: 'authentication',
        reason: 'anonymous',
      },
    ]);

    await request(app.getHttpServer())
      .get('/permission-fixture/workspaces/workspace-1/bases/base-1/read')
      .set('x-test-user', 'active')
      .expect(403);
  });
});

describe('DataTableController internal permission metadata', () => {
  const reflector = new Reflector();
  const expected = new Map<
    keyof DataTableController,
    readonly InternalBasePermission[]
  >([
    ['dataList', [InternalBasePermission.RECORDS_READ]],
    ['dataCount', [InternalBasePermission.RECORDS_READ]],
    ['dataInsert', [InternalBasePermission.RECORDS_CREATE]],
    ['dataUpdate', [InternalBasePermission.RECORDS_UPDATE]],
    ['dataDelete', [InternalBasePermission.RECORDS_DELETE]],
    ['dataAggregate', [InternalBasePermission.RECORDS_READ]],
    ['bulkDataList', [InternalBasePermission.RECORDS_READ]],
    ['dataRead', [InternalBasePermission.RECORDS_READ]],
    ['rowMove', [InternalBasePermission.RECORDS_UPDATE]],
    ['nestedDataList', [InternalBasePermission.RECORDS_READ]],
    ['nestedLink', [InternalBasePermission.RECORDS_UPDATE]],
    ['nestedUnlink', [InternalBasePermission.RECORDS_UPDATE]],
    ['nestedListCopyPasteOrDeleteAll', [InternalBasePermission.RECORDS_UPDATE]],
    ['bulkAggregate', [InternalBasePermission.RECORDS_READ]],
  ]);

  it.each([...expected])('maps %s to %s', (methodName, permissions) => {
    expect(
      reflector.get(
        INTERNAL_BASE_PERMISSION_METADATA,
        DataTableController.prototype[methodName],
      ),
    ).toEqual(permissions);
  });
});
