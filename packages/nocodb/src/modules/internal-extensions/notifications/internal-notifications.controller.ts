import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { NcRequest } from '~/interface/config';
import { GlobalGuard } from '~/guards/global/global.guard';
import { MetaApiLimiterGuard } from '~/guards/meta-api-limiter.guard';
import { InternalAuthenticatedGuard } from '../authorization/internal-authenticated.guard';
import { InternalTokenAuthenticationGuard } from '../api-tokens/internal-token-authentication.guard';
import { InternalTokenScopeGuard } from '../api-tokens/internal-token-scope.guard';
import { RequireInternalTokenScope } from '../api-tokens/internal-token-scope.decorator';
import { InternalApiTokenScope } from '../api-tokens/internal-api-token-scope';
import { INTERNAL_TOKEN_AUTHENTICATED_PERMISSION } from '../api-tokens/internal-token-owner.provider';
import { InternalNotificationService } from './internal-notification.service';

@Controller('/api/internal/v1/notifications')
@UseGuards(
  MetaApiLimiterGuard,
  GlobalGuard,
  InternalTokenAuthenticationGuard,
  InternalAuthenticatedGuard,
  InternalTokenScopeGuard,
)
export class InternalNotificationsController {
  constructor(private readonly service: InternalNotificationService) {}

  @Get()
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_READ,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  list(@Req() request: NcRequest, @Query('unreadOnly') unreadOnly?: string) {
    return this.service.list(request.user.id, unreadOnly === 'true');
  }

  @Patch('/:notificationId/read')
  @RequireInternalTokenScope(
    InternalApiTokenScope.ADMIN_WRITE,
    'instance',
    INTERNAL_TOKEN_AUTHENTICATED_PERMISSION,
  )
  markRead(
    @Param('notificationId') notificationId: string,
    @Req() request: NcRequest,
  ) {
    return this.service.markRead(notificationId, request);
  }
}
