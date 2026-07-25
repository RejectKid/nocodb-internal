jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {
    canActivate(context: any) {
      const request = context.switchToHttp().getRequest();
      request.context = {
        workspace_id: request.params.workspaceId,
        base_id: request.params.baseId,
      };
      request.user =
        request.headers['x-internal-test-user'] === 'active'
          ? { id: 'user-1', isAuthorized: true }
          : { roles: { guest: true } };
      return true;
    }
  },
}));
jest.mock('~/guards/meta-api-limiter.guard', () => ({
  MetaApiLimiterGuard: class MetaApiLimiterGuard {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('../api-tokens/internal-token-authentication.guard', () => ({
  InternalTokenAuthenticationGuard: class InternalTokenAuthenticationGuard {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('../api-tokens/internal-token-scope.guard', () => ({
  InternalTokenScopeGuard: class InternalTokenScopeGuard {
    canActivate() {
      return true;
    }
  },
}));

import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalBasePermissionAdminService } from './internal-base-permission-admin.service';
import { InternalBasePermissionsController } from './internal-base-permissions.controller';

describe('InternalBasePermissionsController HTTP integration', () => {
  let app: INestApplication;
  const adminService = {
    getState: jest.fn().mockResolvedValue({ catalog: [], grants: [] }),
    setEnabled: jest.fn().mockResolvedValue({ enabled: true }),
    replaceSubjectGrants: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalBasePermissionsController],
      providers: [
        GlobalGuard,
        MetaApiLimiterGuard,
        InternalAuthenticatedGuard,
        InternalTokenAuthenticationGuard,
        InternalTokenScopeGuard,
        InternalAuditRequestContextAdapter,
        {
          provide: InternalBasePermissionAdminService,
          useValue: adminService,
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies an anonymous direct request', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions')
      .expect(401);
  });

  it('returns permission state through the authenticated contract', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions')
      .set('x-internal-test-user', 'active')
      .expect(200)
      .expect({ catalog: [], grants: [] });
    expect(adminService.getState).toHaveBeenCalledWith(
      expect.anything(),
      'workspace-1',
      'base-1',
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('projects configuration and subject mutation routes', async () => {
    await request(app.getHttpServer())
      .patch(
        '/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions/configuration',
      )
      .set('x-internal-test-user', 'active')
      .send({ enabled: true, expectedUpdatedAt: null })
      .expect(200)
      .expect({ enabled: true });
    await request(app.getHttpServer())
      .put(
        '/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions/subjects/user/user-2',
      )
      .set('x-internal-test-user', 'active')
      .send({ assignments: [], expectedRevision: 'empty-revision' })
      .expect(200)
      .expect([]);
    expect(adminService.replaceSubjectGrants).toHaveBeenCalledWith(
      expect.anything(),
      'workspace-1',
      'base-1',
      expect.objectContaining({
        subjectType: 'user',
        subjectId: 'user-2',
        assignments: [],
        expectedRevision: 'empty-revision',
      }),
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});
