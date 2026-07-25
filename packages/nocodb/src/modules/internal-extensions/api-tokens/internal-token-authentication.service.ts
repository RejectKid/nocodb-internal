import { Injectable } from '@nestjs/common';
import { InternalApiTokenRepository } from './internal-api-token.repository';
import { InternalTokenHashingService } from './internal-token-hashing.service';
import { InternalTokenAuthorizationPolicy } from './internal-token-authorization.policy';
import type { InternalApiToken } from './internal-api-token.model';
import {
  type InternalTokenOwnerIdentity,
  InternalTokenOwnerProvider,
} from './internal-token-owner.provider';
import { InternalTokenVerificationRateLimiter } from './internal-token-verification-rate-limiter';

const INTERNAL_TOKEN_PATTERN = /^(nci_[A-Za-z0-9_-]{12})_[A-Za-z0-9_-]{43}$/;
const INTERNAL_TOKEN_PREFIX_CANDIDATE = /^(nci_[A-Za-z0-9_-]{12})/;

export interface AuthenticatedInternalTokenPrincipal {
  token: InternalApiToken;
  owner: InternalTokenOwnerIdentity;
}

export class InternalTokenAuthenticationError extends Error {
  constructor() {
    super('Invalid internal API token');
    this.name = 'InternalTokenAuthenticationError';
  }
}

export const isInternalTokenCandidate = (value: string): boolean =>
  value.startsWith('nci_');

@Injectable()
export class InternalTokenAuthenticationService {
  constructor(
    private readonly repository: InternalApiTokenRepository,
    private readonly hashingService: InternalTokenHashingService,
    private readonly ownerProvider: InternalTokenOwnerProvider,
    private readonly policy: InternalTokenAuthorizationPolicy,
    private readonly rateLimiter: InternalTokenVerificationRateLimiter,
  ) {}

  async authenticate(
    value: string,
    clientKey: string,
    now = new Date(),
  ): Promise<AuthenticatedInternalTokenPrincipal> {
    const candidatePrefix =
      INTERNAL_TOKEN_PREFIX_CANDIDATE.exec(value)?.[1] ?? 'malformed';
    const rateLimitKeys = [
      `client:${clientKey}`,
      `client-prefix:${clientKey}:${candidatePrefix}`,
    ];
    this.rateLimiter.assertAllowed(rateLimitKeys, now);

    const match = INTERNAL_TOKEN_PATTERN.exec(value);
    if (!match) {
      return this.fail(rateLimitKeys, now);
    }

    const token = await this.repository.findByPrefix(match[1]);
    if (!token) {
      return this.fail(rateLimitKeys, now);
    }

    let verified = false;
    try {
      verified = await this.hashingService.verify(
        value,
        token.record.token_hash,
      );
    } catch {
      verified = false;
    }
    if (!verified) {
      return this.fail(rateLimitKeys, now);
    }

    const owner = await this.ownerProvider.load(token.record.user_id);
    const decision = await this.policy.authenticate({
      token,
      owner: owner?.authorization ?? null,
      now,
    });
    if (!decision.allowed || !owner) {
      return this.fail(rateLimitKeys, now);
    }

    return { token, owner };
  }

  private fail(rateLimitKeys: readonly string[], now: Date): never {
    this.rateLimiter.recordFailure(rateLimitKeys, now);
    throw new InternalTokenAuthenticationError();
  }
}
