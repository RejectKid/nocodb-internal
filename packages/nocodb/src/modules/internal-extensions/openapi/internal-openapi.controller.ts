import { Controller, Get, UseGuards } from '@nestjs/common';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from '../api-tokens/internal-token-owner.provider';
import { InternalOpenApiService } from './internal-openapi.service';

@Controller('/api/internal/v1')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
export class InternalOpenApiController {
  constructor(private readonly service: InternalOpenApiService) {}

  @Get('/openapi.json')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  getContract() {
    return this.service.generate();
  }
}
