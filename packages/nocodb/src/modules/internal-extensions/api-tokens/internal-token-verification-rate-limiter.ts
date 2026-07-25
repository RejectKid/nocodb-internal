import { Inject, Injectable, Optional } from '@nestjs/common';

interface VerificationBucket {
  failures: number;
  windowStartedAt: number;
}

export interface InternalTokenVerificationRateLimitOptions {
  maxFailures: number;
  windowMs: number;
  maxBuckets: number;
}

export const INTERNAL_TOKEN_RATE_LIMIT_OPTIONS = Symbol(
  'INTERNAL_TOKEN_RATE_LIMIT_OPTIONS',
);

export class InternalTokenVerificationRateLimitError extends Error {
  constructor() {
    super('Internal token verification rate limit exceeded');
    this.name = 'InternalTokenVerificationRateLimitError';
  }
}

const integerFromEnvironment = (
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
};

@Injectable()
export class InternalTokenVerificationRateLimiter {
  private readonly buckets = new Map<string, VerificationBucket>();
  private readonly options: InternalTokenVerificationRateLimitOptions;

  constructor(
    @Optional()
    @Inject(INTERNAL_TOKEN_RATE_LIMIT_OPTIONS)
    options?: Partial<InternalTokenVerificationRateLimitOptions>,
  ) {
    this.options = {
      maxFailures:
        options?.maxFailures ??
        integerFromEnvironment(
          process.env.NC_INTERNAL_TOKEN_AUTH_FAILURES_PER_MINUTE,
          20,
          1,
          1_000,
        ),
      windowMs: options?.windowMs ?? 60_000,
      maxBuckets: options?.maxBuckets ?? 10_000,
    };
  }

  assertAllowed(keys: readonly string[], now = new Date()): void {
    this.prune(now.getTime());
    for (const key of keys) {
      const bucket = this.buckets.get(this.normalizeKey(key));
      if (
        bucket &&
        now.getTime() - bucket.windowStartedAt < this.options.windowMs &&
        bucket.failures >= this.options.maxFailures
      ) {
        throw new InternalTokenVerificationRateLimitError();
      }
    }
  }

  recordFailure(keys: readonly string[], now = new Date()): void {
    const timestamp = now.getTime();
    this.prune(timestamp);
    for (const key of keys) {
      const normalized = this.normalizeKey(key);
      const existing = this.buckets.get(normalized);
      if (
        existing &&
        timestamp - existing.windowStartedAt < this.options.windowMs
      ) {
        existing.failures += 1;
        continue;
      }
      if (!existing && this.buckets.size >= this.options.maxBuckets) {
        throw new InternalTokenVerificationRateLimitError();
      }
      this.buckets.set(normalized, {
        failures: 1,
        windowStartedAt: timestamp,
      });
    }
  }

  private prune(timestamp: number): void {
    for (const [key, bucket] of this.buckets) {
      if (timestamp - bucket.windowStartedAt >= this.options.windowMs) {
        this.buckets.delete(key);
      }
    }
  }

  private normalizeKey(key: string): string {
    return key.trim().slice(0, 160) || 'unknown';
  }
}
