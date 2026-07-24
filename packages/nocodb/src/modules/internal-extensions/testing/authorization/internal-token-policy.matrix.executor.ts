import { DefaultInternalTokenAuthorizationPolicy } from '../../api-tokens/default-internal-token-authorization.policy';
import { InternalApiTokenScope } from '../../api-tokens/internal-api-token-scope';
import type { InternalTokenOwnerContext } from '../../api-tokens/internal-token-authorization.policy';
import type {
  AuthorizationExecutionResult,
  AuthorizationMatrixCase,
} from './internal-authorization-harness.types';
import { createInternalTokenFixture } from './internal-authorization-fixtures';

const now = new Date('2030-01-01T00:00:00.000Z');
const supportedScopes = new Set<string>(Object.values(InternalApiTokenScope));

function toScope(value: string): InternalApiTokenScope {
  if (!supportedScopes.has(value)) {
    throw new TypeError(`Unsupported matrix token scope: ${value}`);
  }
  return value as InternalApiTokenScope;
}

function toOwner(testCase: AuthorizationMatrixCase): InternalTokenOwnerContext {
  const token = testCase.token;
  if (!token) {
    throw new TypeError(`${testCase.id} is not an API-token matrix case`);
  }

  return {
    id: 'user-token-owner',
    state: token.ownerState,
    permissions: testCase.actor.permissions,
  };
}

export async function executeInternalTokenPolicyMatrixCase(
  testCase: AuthorizationMatrixCase,
): Promise<AuthorizationExecutionResult> {
  if (!testCase.token || !testCase.requiredScope) {
    throw new TypeError(
      `${testCase.id} must define token and requiredScope fixtures`,
    );
  }

  const policy = new DefaultInternalTokenAuthorizationPolicy();
  const decision = await policy.authorize({
    token: createInternalTokenFixture({
      now,
      scopes: testCase.token.scopes.map(toScope),
      allowedWorkspaceIds: testCase.token.allowedWorkspaceIds,
      allowedBaseIds: testCase.token.allowedBaseIds,
      expired: testCase.token.state === 'expired',
      revoked: testCase.token.state === 'revoked',
    }),
    owner: toOwner(testCase),
    requiredScope: toScope(testCase.requiredScope),
    requiredOwnerPermission: testCase.requiredPermission ?? testCase.operation,
    target: {
      kind: 'base',
      workspaceId: testCase.target.workspaceId,
      baseId: testCase.target.baseId,
    },
    now,
  });

  if (decision.allowed) {
    return { status: 200 };
  }
  return {
    status: decision.failureClass === 'authentication' ? 401 : 403,
  };
}
