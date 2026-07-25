import {
  InternalTokenVerificationRateLimitError,
  InternalTokenVerificationRateLimiter,
} from './internal-token-verification-rate-limiter';

describe('InternalTokenVerificationRateLimiter', () => {
  const start = new Date('2030-01-01T00:00:00.000Z');

  it('blocks a client and prefix after the configured failed-attempt limit', () => {
    const limiter = new InternalTokenVerificationRateLimiter({
      maxFailures: 2,
      windowMs: 60_000,
      maxBuckets: 10,
    });
    const keys = ['client:10.0.0.1', 'client-prefix:10.0.0.1:nci_public'];

    limiter.recordFailure(keys, start);
    limiter.assertAllowed(keys, start);
    limiter.recordFailure(keys, start);

    expect(() => limiter.assertAllowed(keys, start)).toThrow(
      InternalTokenVerificationRateLimitError,
    );
  });

  it('expires failure buckets at the end of the window', () => {
    const limiter = new InternalTokenVerificationRateLimiter({
      maxFailures: 1,
      windowMs: 1_000,
      maxBuckets: 10,
    });
    const keys = ['client:10.0.0.1'];

    limiter.recordFailure(keys, start);
    expect(() => limiter.assertAllowed(keys, start)).toThrow();
    expect(() =>
      limiter.assertAllowed(keys, new Date(start.getTime() + 1_000)),
    ).not.toThrow();
  });

  it('bounds attacker-controlled buckets', () => {
    const limiter = new InternalTokenVerificationRateLimiter({
      maxFailures: 10,
      windowMs: 60_000,
      maxBuckets: 1,
    });

    limiter.recordFailure(['client:first'], start);
    expect(() => limiter.recordFailure(['client:second'], start)).toThrow(
      InternalTokenVerificationRateLimitError,
    );
  });
});
