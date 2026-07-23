import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { InternalAuthenticatedGuard } from './internal-authenticated.guard';

function contextFor(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('InternalAuthenticatedGuard', () => {
  const guard = new InternalAuthenticatedGuard();

  it.each([
    ['anonymous', undefined],
    ['guest', { id: 'user-1', isAuthorized: false }],
    ['blocked', { id: 'user-1', isAuthorized: true, blocked: true }],
    ['deleted', { id: 'user-1', isAuthorized: true, is_deleted: true }],
  ])('denies %s requests as authentication failures', (_label, user) => {
    expect(() => guard.canActivate(contextFor(user))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows an authenticated active user', () => {
    expect(
      guard.canActivate(
        contextFor({ id: 'user-1', isAuthorized: true, blocked: false }),
      ),
    ).toBe(true);
  });
});
