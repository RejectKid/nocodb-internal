jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {
    canActivate(context: any) {
      const request = context.switchToHttp().getRequest();
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

import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalCapabilitiesController } from './internal-capabilities.controller';
import { InternalFeatureRegistryService } from './internal-feature-registry.service';

describe('InternalCapabilitiesController HTTP integration', () => {
  let app: INestApplication;

  const response = {
    schemaVersion: 1,
    features: {
      internalAdmin: false,
      fineGrainedApiTokens: true,
      basePermissions: false,
      inputValidation: false,
      documentPermissions: false,
      filePreviewMode: false,
      discussionMode: false,
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalCapabilitiesController],
      providers: [
        GlobalGuard,
        MetaApiLimiterGuard,
        InternalAuthenticatedGuard,
        {
          provide: InternalFeatureRegistryService,
          useValue: {
            getCapabilities: () => response,
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for an anonymous request', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/v1/capabilities')
      .expect(401);
  });

  it('returns the versioned response to an authenticated active user', async () => {
    await request(app.getHttpServer())
      .get('/api/internal/v1/capabilities')
      .set('x-internal-test-user', 'active')
      .expect(200)
      .expect(response);
  });
});
