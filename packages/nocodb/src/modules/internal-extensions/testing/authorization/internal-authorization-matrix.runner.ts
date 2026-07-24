import type {
  AuthorizationFailureClass,
  AuthorizationMatrixCase,
  AuthorizationMatrixDocument,
  AuthorizationMatrixExecutor,
  AuthorizationMatrixResult,
} from './internal-authorization-harness.types';

export class AuthorizationMatrixError extends Error {
  constructor(readonly failures: readonly AuthorizationMatrixResult[]) {
    super(
      `Authorization matrix failed: ${failures
        .map(
          ({ id, expectedStatus, actualStatus }) =>
            `${id} expected ${expectedStatus}, received ${actualStatus}`,
        )
        .join('; ')}`,
    );
    this.name = AuthorizationMatrixError.name;
  }
}

export function classifyAuthorizationStatus(
  status: number,
): AuthorizationFailureClass {
  if (status >= 200 && status < 300) {
    return 'success';
  }
  if (status === 401) {
    return 'authentication';
  }
  return 'authorization';
}

export function assertValidAuthorizationMatrix(
  document: AuthorizationMatrixDocument,
): void {
  if (document.schemaVersion !== 1 || !Array.isArray(document.cases)) {
    throw new TypeError('Unsupported authorization matrix schema');
  }

  const ids = new Set<string>();
  for (const testCase of document.cases) {
    if (!testCase.id || ids.has(testCase.id)) {
      throw new TypeError(
        testCase.id
          ? `Duplicate authorization case ID: ${testCase.id}`
          : 'Authorization case ID is required',
      );
    }
    ids.add(testCase.id);

    const expectedClass = classifyAuthorizationStatus(testCase.expected.status);
    if (expectedClass !== testCase.expected.failureClass) {
      throw new TypeError(
        `${testCase.id} has inconsistent expected status and failure class`,
      );
    }
  }
}

export async function runAuthorizationMatrix(
  document: AuthorizationMatrixDocument,
  execute: AuthorizationMatrixExecutor,
): Promise<readonly AuthorizationMatrixResult[]> {
  assertValidAuthorizationMatrix(document);

  const results: AuthorizationMatrixResult[] = [];
  for (const testCase of document.cases) {
    const execution = await execute(testCase);
    const actualFailureClass = classifyAuthorizationStatus(execution.status);

    results.push({
      id: testCase.id,
      expectedStatus: testCase.expected.status,
      actualStatus: execution.status,
      expectedFailureClass: testCase.expected.failureClass,
      actualFailureClass,
      passed:
        execution.status === testCase.expected.status &&
        actualFailureClass === testCase.expected.failureClass,
    });
  }

  const failures = results.filter(({ passed }) => !passed);
  if (failures.length) {
    throw new AuthorizationMatrixError(failures);
  }

  return results;
}

export function selectAuthorizationCases(
  document: AuthorizationMatrixDocument,
  ids: readonly string[],
): AuthorizationMatrixDocument {
  const selectedIds = new Set(ids);
  const cases = document.cases.filter(({ id }) => selectedIds.has(id));

  if (cases.length !== selectedIds.size) {
    const foundIds = new Set(cases.map(({ id }) => id));
    const missing = ids.filter((id) => !foundIds.has(id));
    throw new TypeError(
      `Unknown authorization case IDs: ${missing.join(', ')}`,
    );
  }

  return {
    schemaVersion: document.schemaVersion,
    cases,
  };
}
