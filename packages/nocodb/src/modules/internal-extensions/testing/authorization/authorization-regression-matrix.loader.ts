import matrix from './authorization-regression.matrix.json';
import { assertValidAuthorizationMatrix } from './internal-authorization-matrix.runner';
import type { AuthorizationMatrixDocument } from './internal-authorization-harness.types';

export function loadAuthorizationRegressionMatrix(): AuthorizationMatrixDocument {
  const document = matrix as unknown as AuthorizationMatrixDocument;
  assertValidAuthorizationMatrix(document);
  return document;
}
