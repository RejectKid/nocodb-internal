import { loadAuthorizationRegressionMatrix } from './authorization-regression-matrix.loader';
import {
  runAuthorizationMatrix,
  selectAuthorizationCases,
} from './internal-authorization-matrix.runner';
import { executeInternalTokenPolicyMatrixCase } from './internal-token-policy.matrix.executor';

const TOKEN_MATRIX_CASES = [
  'api-token-scope-allowed',
  'api-token-scope-denied',
  'expired-api-token-denied',
  'revoked-api-token-denied',
  'cross-base-api-token-denied',
  'cross-workspace-api-token-denied',
  'disabled-token-owner-denied',
] as const;

describe('internal token policy authorization matrix', () => {
  it('passes every shared API-token allow and deny case through production policy', async () => {
    const matrix = selectAuthorizationCases(
      loadAuthorizationRegressionMatrix(),
      TOKEN_MATRIX_CASES,
    );

    const results = await runAuthorizationMatrix(
      matrix,
      executeInternalTokenPolicyMatrixCase,
    );

    expect(results).toHaveLength(TOKEN_MATRIX_CASES.length);
    expect(results.every(({ passed }) => passed)).toBe(true);
  });
});
