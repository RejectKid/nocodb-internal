jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {},
}));
jest.mock('~/guards/meta-api-limiter.guard', () => ({
  MetaApiLimiterGuard: class MetaApiLimiterGuard {},
}));
jest.mock('~/services/caches.service', () => ({
  CachesService: class CachesService {},
}));
jest.mock('~/middlewares/extract-ids/extract-ids.middleware', () => {
  const {
    ForbiddenException,
    SetMetadata,
    UseInterceptors,
  } = require('@nestjs/common');

  class AclMiddleware {
    intercept(context: any, next: any) {
      const request = context.switchToHttp().getRequest();
      const handler = context.getHandler();
      const allowedRoles: string[] | undefined = Reflect.getMetadata(
        'allowedRoles',
        handler,
      );
      const blockApiTokenAccess = Reflect.getMetadata(
        'blockApiTokenAccess',
        handler,
      );

      if (request.user?.is_api_token && blockApiTokenAccess) {
        throw new ForbiddenException('API token access is blocked');
      }
      if (
        allowedRoles?.length &&
        !allowedRoles.some((role) => request.user?.roles?.[role])
      ) {
        throw new ForbiddenException('Insufficient role');
      }
      return next.handle();
    }
  }

  const Acl =
    (
      permissionName: string,
      options: {
        allowedRoles?: string[];
        blockApiTokenAccess?: boolean;
      } = {},
    ) =>
    (target: any, key?: string, descriptor?: PropertyDescriptor) => {
      SetMetadata('permission', permissionName)(target, key, descriptor);
      SetMetadata('allowedRoles', options.allowedRoles)(
        target,
        key,
        descriptor,
      );
      SetMetadata('blockApiTokenAccess', options.blockApiTokenAccess)(
        target,
        key,
        descriptor,
      );
      UseInterceptors(AclMiddleware)(target, key, descriptor);
    };

  return { Acl, AclMiddleware };
});

import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { CachesController } from '~/controllers/caches.controller';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { AclMiddleware } from '~/middlewares/extract-ids/extract-ids.middleware';
import { CachesService } from '~/services/caches.service';
import {
  AUTHORIZATION_HARNESS_ACTOR_HEADER,
  AuthorizationHarnessIdentityGuard,
  type AuthorizationIdentityFixtureName,
} from './internal-authorization-fixtures';
import { runAuthorizationMatrix } from './internal-authorization-matrix.runner';
import type { AuthorizationMatrixDocument } from './internal-authorization-harness.types';

describe('authorization harness against unchanged Community cache endpoint', () => {
  let app: INestApplication;
  const cacheDelete = jest.fn().mockResolvedValue({ cleared: true });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CachesController],
      providers: [
        AclMiddleware,
        GlobalGuard,
        MetaApiLimiterGuard,
        {
          provide: CachesService,
          useValue: { cacheDelete },
        },
      ],
    })
      .overrideGuard(GlobalGuard)
      .useClass(AuthorizationHarnessIdentityGuard)
      .overrideGuard(MetaApiLimiterGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('preserves Community authentication, role, and API-token denial behavior', async () => {
    const fixtureByCaseId: Record<string, AuthorizationIdentityFixtureName> = {
      'community-cache-anonymous': 'anonymous',
      'community-cache-viewer': 'authenticatedUnauthorized',
      'community-cache-api-token': 'apiTokenAuthorized',
      'community-cache-super-admin': 'authorized',
    };
    const matrix: AuthorizationMatrixDocument = {
      schemaVersion: 1,
      cases: [
        {
          id: 'community-cache-anonymous',
          description: 'Anonymous requests are denied',
          actor: { state: 'anonymous', role: 'guest', permissions: [] },
          target: {
            workspaceId: 'workspace-a',
            baseId: 'base-a',
            resourceType: 'community-cache',
          },
          operation: 'cacheDelete',
          frontendVisible: false,
          expected: { status: 401, failureClass: 'authentication' },
        },
        {
          id: 'community-cache-viewer',
          description: 'Org viewers cannot clear the cache directly',
          actor: { state: 'active', role: 'viewer', permissions: [] },
          target: {
            workspaceId: 'workspace-a',
            baseId: 'base-a',
            resourceType: 'community-cache',
          },
          operation: 'cacheDelete',
          frontendVisible: false,
          expected: { status: 403, failureClass: 'authorization' },
        },
        {
          id: 'community-cache-api-token',
          description: 'Existing Community endpoint blocks API-token access',
          actor: { state: 'active', role: 'super_admin', permissions: [] },
          target: {
            workspaceId: 'workspace-a',
            baseId: 'base-a',
            resourceType: 'community-cache',
          },
          operation: 'cacheDelete',
          frontendVisible: false,
          expected: { status: 403, failureClass: 'authorization' },
        },
        {
          id: 'community-cache-super-admin',
          description: 'A super administrator can clear the cache',
          actor: { state: 'active', role: 'super_admin', permissions: [] },
          target: {
            workspaceId: 'workspace-a',
            baseId: 'base-a',
            resourceType: 'community-cache',
          },
          operation: 'cacheDelete',
          frontendVisible: true,
          expected: { status: 200, failureClass: 'success' },
        },
      ],
    };

    const results = await runAuthorizationMatrix(matrix, async (testCase) => {
      const response = await request(app.getHttpServer())
        .delete('/api/v2/meta/cache')
        .set(AUTHORIZATION_HARNESS_ACTOR_HEADER, fixtureByCaseId[testCase.id]);
      return { status: response.status };
    });

    expect(results).toHaveLength(4);
    expect(cacheDelete).toHaveBeenCalledTimes(1);
  });
});
