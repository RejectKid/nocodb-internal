import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { getApiTokenFromHeader } from '~/helpers/apiHelpers';
import type { NcRequest } from '~/interface/config';
import {
  type AuthenticatedInternalTokenPrincipal,
  InternalTokenAuthenticationError,
  InternalTokenAuthenticationService,
  isInternalTokenCandidate,
} from './internal-token-authentication.service';
import { InternalTokenVerificationRateLimitError } from './internal-token-verification-rate-limiter';

export const INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY =
  'ncInternalTokenPrincipal' as const;

export type InternalTokenRequest = NcRequest & {
  [INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY]?: AuthenticatedInternalTokenPrincipal;
};

@Injectable()
export class InternalTokenAuthenticationGuard implements CanActivate {
  constructor(
    private readonly authentication: InternalTokenAuthenticationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<InternalTokenRequest>();
    const value = getApiTokenFromHeader(request);
    if (!value || !isInternalTokenCandidate(value)) {
      return true;
    }
    if (!request.context) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    try {
      const principal = await this.authentication.authenticate(
        value,
        this.clientKey(request),
      );
      const { user } = principal.owner;
      request[INTERNAL_TOKEN_PRINCIPAL_REQUEST_KEY] = principal;
      request.user = {
        ...user,
        isAuthorized: true,
        is_api_token: true,
        is_internal_api_token: true,
      } as NcRequest['user'];
      request.context.user = user;
      request.context.is_api_token = true;
      return true;
    } catch (error) {
      if (error instanceof InternalTokenVerificationRateLimitError) {
        throw new HttpException(
          'Too many internal token authentication attempts',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (error instanceof InternalTokenAuthenticationError) {
        throw new UnauthorizedException('Invalid internal API token');
      }
      throw error;
    }
  }

  private clientKey(request: InternalTokenRequest): string {
    return String(
      request.clientIp ??
        request.ip ??
        request.socket?.remoteAddress ??
        'unknown',
    ).slice(0, 128);
  }
}
