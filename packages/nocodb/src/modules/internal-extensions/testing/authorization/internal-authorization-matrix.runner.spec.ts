import {
  AuthorizationMatrixError,
  assertValidAuthorizationMatrix,
  runAuthorizationMatrix,
  selectAuthorizationCases,
} from './internal-authorization-matrix.runner';
import { executeReferenceAuthorizationCase } from './internal-authorization-reference.executor';
import { loadAuthorizationRegressionMatrix } from './authorization-regression-matrix.loader';

describe('internal authorization matrix harness', () => {
  it('passes the complete shared authentication and authorization matrix', async () => {
    const matrix = loadAuthorizationRegressionMatrix();
    const results = await runAuthorizationMatrix(
      matrix,
      executeReferenceAuthorizationCase,
    );

    expect(results).toHaveLength(18);
    expect(results.every(({ passed }) => passed)).toBe(true);
  });

  it('fails when a denial accidentally returns success', async () => {
    const matrix = selectAuthorizationCases(
      loadAuthorizationRegressionMatrix(),
      ['frontend-hidden-direct-api-denied'],
    );

    await expect(
      runAuthorizationMatrix(matrix, async () => ({ status: 200 })),
    ).rejects.toEqual(
      expect.objectContaining({
        name: AuthorizationMatrixError.name,
        failures: [
          expect.objectContaining({
            id: 'frontend-hidden-direct-api-denied',
            expectedStatus: 403,
            actualStatus: 200,
          }),
        ],
      }),
    );
  });

  it('rejects duplicate case IDs before executing requests', () => {
    const matrix = loadAuthorizationRegressionMatrix();
    const duplicate = {
      ...matrix,
      cases: [matrix.cases[0], matrix.cases[0]],
    };

    expect(() => assertValidAuthorizationMatrix(duplicate)).toThrow(
      'Duplicate authorization case ID',
    );
  });

  it('distinguishes authentication and authorization failures', async () => {
    const matrix = selectAuthorizationCases(
      loadAuthorizationRegressionMatrix(),
      ['anonymous-denied', 'authenticated-unauthorized-denied'],
    );

    const results = await runAuthorizationMatrix(
      matrix,
      executeReferenceAuthorizationCase,
    );

    expect(results.map(({ actualFailureClass }) => actualFailureClass)).toEqual(
      ['authentication', 'authorization'],
    );
  });
});
