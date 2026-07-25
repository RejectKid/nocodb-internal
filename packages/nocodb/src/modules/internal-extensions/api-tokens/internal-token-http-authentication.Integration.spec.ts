import { Controller, Get, Injectable, Param, UseGuards } from '@nestjs/common';
import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ProjectRoles } from 'nocodb-sdk';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { InternalBasePermissionIdentityProvider } from '../permissions/internal-base-permission-identity.provider';
import { InternalBasePermissionService } from '../permissions/internal-base-permission.service';
import { createInternalTokenFixture } from '../testing/authorization/internal-authorization-fixtures';
import { DefaultInternalTokenAuthorizationPolicy } from './default-internal-token-authorization.policy';
import { InternalApiToken } from './internal-api-token.model';
import { InternalApiTokenRepository } from './internal-api-token.repository';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { InternalTokenAuthenticationGuard } from './internal-token-authentication.guard';
import { InternalTokenAuthenticationService } from './internal-token-authentication.service';
import { InternalTokenHashingService } from './internal-token-hashing.service';
import {
  INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  InternalTokenOwnerProvider,
} from './internal-token-owner.provider';
import { RequireInternalTokenScope } from './internal-token-scope.decorator';
import { InternalTokenScopeGuard } from './internal-token-scope.guard';
import { InternalTokenAuthorizationPolicy } from './internal-token-authorization.policy';
import {
  INTERNAL_TOKEN_RATE_LIMIT_OPTIONS,
  InternalTokenVerificationRateLimiter,
} from './internal-token-verification-rate-limiter';

const prefix = 'nci_abcdefghijkl';
const secret = `${prefix}_${'s'.repeat(43)}`;

@Injectable()
class HarnessContextGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.context = {
      workspace_id: request.params.workspaceId,
      base_id: request.params.baseId,
    };
    request.user = { roles: { guest: true } };
    return true;
  }
}

@Controller('/internal-token-harness/:workspaceId/:baseId')
@UseGuards(
  HarnessContextGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
class InternalTokenHarnessController {
  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.DATA_READ,
    'base',
    InternalBasePermission.RECORDS_READ,
  )
  get(@Param('baseId') baseId: string) {
    return { baseId };
  }
}

describe('internal token HTTP authentication', () => {
  let app: INestApplication;
  const now = new Date();
  const baseRecord = createInternalTokenFixture({
    now,
    scopes: [InternalApiTokenScope.DATA_READ],
  }).record;
  const repository = {
    findByPrefix: jest.fn(),
    markUsed: jest.fn().mockResolvedValue(true),
  };
  const hashing = {
    verify: jest.fn(),
  };
  const ownerProvider = {
    load: jest.fn(),
  };
  const identityProvider = {
    resolve: jest.fn(),
  };
  const permissionService = {
    resolve: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [InternalTokenHarnessController],
      providers: [
        HarnessContextGuard,
        InternalAuthenticatedGuard,
        InternalTokenAuthenticationGuard,
        InternalTokenScopeGuard,
        InternalTokenAuthenticationService,
        InternalTokenVerificationRateLimiter,
        {
          provide: INTERNAL_TOKEN_RATE_LIMIT_OPTIONS,
          useValue: {
            maxFailures: 20,
            windowMs: 60_000,
            maxBuckets: 100,
          },
        },
        {
          provide: InternalTokenAuthorizationPolicy,
          useClass: DefaultInternalTokenAuthorizationPolicy,
        },
        { provide: InternalApiTokenRepository, useValue: repository },
        { provide: InternalTokenHashingService, useValue: hashing },
        { provide: InternalTokenOwnerProvider, useValue: ownerProvider },
        {
          provide: InternalBasePermissionIdentityProvider,
          useValue: identityProvider,
        },
        { provide: InternalBasePermissionService, useValue: permissionService },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findByPrefix.mockResolvedValue(
      new InternalApiToken({
        ...baseRecord,
        token_prefix: prefix,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    repository.markUsed.mockResolvedValue(true);
    hashing.verify.mockImplementation((value) => value === secret);
    ownerProvider.load.mockResolvedValue({
      authorization: {
        id: 'user-token-owner',
        state: 'active',
        permissions: [INTERNAL_TOKEN_AUTHENTICATED_PERMISSION],
      },
      user: {
        id: 'user-token-owner',
        email: 'owner@example.com',
        email_verified: true,
      },
    });
    identityProvider.resolve.mockResolvedValue({
      id: 'user-token-owner',
      state: 'active',
      roles: [ProjectRoles.OWNER],
      isOwner: true,
    });
    permissionService.resolve.mockResolvedValue({ allowed: true });
  });

  afterAll(async () => app.close());

  it('accepts xc-token and Bearer internal credentials and updates last-used', async () => {
    const path = '/internal-token-harness/workspace-a/base-a';
    await request(app.getHttpServer())
      .get(path)
      .set('xc-token', secret)
      .expect(200)
      .expect({ baseId: 'base-a' });
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${secret}`)
      .expect(200);
    expect(repository.markUsed).toHaveBeenCalledWith(
      'internal-token-fixture',
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('returns generic failures for invalid credentials, lifecycle, and owner state', async () => {
    const path = '/internal-token-harness/workspace-a/base-a';
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .get(path)
      .set('xc-token', `${prefix}_${'x'.repeat(43)}`)
      .expect(401)
      .expect(({ body }) => {
        expect(JSON.stringify(body)).not.toContain('x'.repeat(43));
      });

    ownerProvider.load.mockResolvedValueOnce({
      authorization: {
        id: 'user-token-owner',
        state: 'disabled',
        permissions: [],
      },
      user: {
        id: 'user-token-owner',
        email: 'owner@example.com',
        email_verified: true,
      },
    });
    await request(app.getHttpServer())
      .get(path)
      .set('xc-token', secret)
      .expect(401);

    for (const lifecycle of [
      { expires_at: new Date(Date.now() - 1).toISOString() },
      {
        revoked_at: new Date().toISOString(),
        revoked_by: 'user-token-owner',
      },
    ]) {
      repository.findByPrefix.mockResolvedValueOnce(
        new InternalApiToken({
          ...baseRecord,
          token_prefix: prefix,
          ...lifecycle,
        }),
      );
      await request(app.getHttpServer())
        .get(path)
        .set('xc-token', secret)
        .expect(401);
    }
  });

  it('denies missing scopes, current owner permission, and cross-base access', async () => {
    const path = '/internal-token-harness/workspace-a/base-a';
    repository.findByPrefix.mockResolvedValueOnce(
      new InternalApiToken({
        ...baseRecord,
        token_prefix: prefix,
        scopes: [InternalApiTokenScope.DATA_UPDATE],
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    );
    await request(app.getHttpServer())
      .get(path)
      .set('xc-token', secret)
      .expect(403);

    permissionService.resolve.mockResolvedValueOnce({ allowed: false });
    await request(app.getHttpServer())
      .get(path)
      .set('xc-token', secret)
      .expect(403);

    await request(app.getHttpServer())
      .get('/internal-token-harness/workspace-a/base-b')
      .set('xc-token', secret)
      .expect(403);
  });

  it('rate limits repeated failed verification for the same client', async () => {
    const path = '/internal-token-harness/workspace-a/base-a';
    const invalid = `${prefix}_${'z'.repeat(43)}`;
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('xc-token', invalid);
      statuses.push(response.status);
      if (response.status === 429) {
        break;
      }
    }
    expect(statuses).toContain(401);
    expect(statuses.at(-1)).toBe(429);
  });
});
