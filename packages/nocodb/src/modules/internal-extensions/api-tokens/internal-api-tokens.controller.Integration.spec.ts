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
jest.mock('./internal-token-authentication.guard', () => ({
  InternalTokenAuthenticationGuard: class InternalTokenAuthenticationGuard {
    canActivate() {
      return true;
    }
  },
}));
jest.mock('./internal-token-scope.guard', () => ({
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
import { InternalAuditRequestContextAdapter } from '../audit/internal-audit-request-context.adapter';
import { InternalApiTokenAdminService } from './internal-api-token-admin.service';
import { InternalTokenAuthenticationGuard } from './internal-token-authentication.guard';
import { InternalTokenScopeGuard } from './internal-token-scope.guard';
import { InternalApiTokensController } from './internal-api-tokens.controller';

describe('InternalApiTokensController HTTP integration', () => {
  let app: INestApplication;
  const adminService = {
    getState: jest.fn().mockResolvedValue({ tokens: [], scopeCatalog: [] }),
    create: jest.fn().mockResolvedValue({
      token: { id: 'token-1' },
      value: 'shown-once',
    }),
    revoke: jest.fn().mockResolvedValue({
      id: 'token-1',
      revoked_at: '2026-07-24T13:00:00.000Z',
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalApiTokensController],
      providers: [
        GlobalGuard,
        MetaApiLimiterGuard,
        InternalAuthenticatedGuard,
        InternalTokenAuthenticationGuard,
        InternalTokenScopeGuard,
        InternalAuditRequestContextAdapter,
        {
          provide: InternalApiTokenAdminService,
          useValue: adminService,
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('denies anonymous list and mutation requests', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens')
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .delete(
        '/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens/token-1',
      )
      .expect(401);
  });

  it('projects authenticated list, create, and revoke contracts', async () => {
    const path = '/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens';
    await request(app.getHttpServer())
      .get(path)
      .set('x-internal-test-user', 'active')
      .expect(200);
    await request(app.getHttpServer())
      .post(path)
      .set('x-internal-test-user', 'active')
      .send({
        displayName: 'Automation',
        allowedWorkspaceIds: ['workspace-1'],
        allowedBaseIds: ['base-1'],
        scopes: ['data:read'],
      })
      .expect(201)
      .expect({
        token: { id: 'token-1' },
        value: 'shown-once',
      });
    await request(app.getHttpServer())
      .delete(`${path}/token-1`)
      .set('x-internal-test-user', 'active')
      .expect(200);
    expect(adminService.create).toHaveBeenCalledWith(
      expect.anything(),
      'workspace-1',
      'base-1',
      expect.objectContaining({ displayName: 'Automation' }),
      expect.objectContaining({ userId: 'user-1' }),
    );
  });
});
