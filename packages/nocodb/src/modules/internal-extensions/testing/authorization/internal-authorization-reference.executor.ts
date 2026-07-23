import type {
  AuthorizationExecutionResult,
  AuthorizationMatrixCase,
} from './internal-authorization-harness.types';

function isInactiveUserState(state: string): boolean {
  return ['anonymous', 'blocked', 'deleted', 'disabled'].includes(state);
}

/**
 * Reference executor for harness self-tests only.
 *
 * Production features must supply an executor that performs a real HTTP
 * request or calls their centralized policy. This implementation expresses
 * the minimum shared denial contract and is not an application policy.
 */
export async function executeReferenceAuthorizationCase(
  testCase: AuthorizationMatrixCase,
): Promise<AuthorizationExecutionResult> {
  if (isInactiveUserState(testCase.actor.state)) {
    return { status: 401 };
  }

  if (testCase.token) {
    if (
      isInactiveUserState(testCase.token.ownerState) ||
      testCase.token.state === 'expired' ||
      testCase.token.state === 'revoked'
    ) {
      return { status: 401 };
    }

    if (
      (testCase.requiredScope &&
        !testCase.token.scopes.includes(testCase.requiredScope)) ||
      !testCase.token.allowedWorkspaceIds.includes(
        testCase.target.workspaceId,
      ) ||
      !testCase.token.allowedBaseIds.includes(testCase.target.baseId)
    ) {
      return { status: 403 };
    }
  } else if (
    testCase.requiredPermission &&
    !testCase.actor.permissions.includes(testCase.requiredPermission)
  ) {
    return { status: 403 };
  }

  return { status: 200 };
}
