export type AuthorizationFailureClass =
  | 'success'
  | 'authentication'
  | 'authorization';

export type AuthorizationActorState =
  | 'anonymous'
  | 'active'
  | 'blocked'
  | 'deleted'
  | 'disabled';

export type AuthorizationTokenState = 'active' | 'expired' | 'revoked';

export interface AuthorizationActorFixture {
  state: AuthorizationActorState;
  role: string;
  permissions: string[];
}

export interface AuthorizationTokenFixture {
  state: AuthorizationTokenState;
  ownerState: Exclude<AuthorizationActorState, 'anonymous'>;
  scopes: string[];
  allowedWorkspaceIds: string[];
  allowedBaseIds: string[];
}

export interface AuthorizationTargetFixture {
  workspaceId: string;
  baseId: string;
  resourceType: string;
}

export interface AuthorizationMatrixExpectation {
  status: number;
  failureClass: AuthorizationFailureClass;
}

export interface AuthorizationMatrixCase {
  id: string;
  description: string;
  actor: AuthorizationActorFixture;
  token?: AuthorizationTokenFixture;
  target: AuthorizationTargetFixture;
  operation: string;
  requiredPermission?: string;
  requiredScope?: string;
  frontendVisible: boolean;
  expected: AuthorizationMatrixExpectation;
}

export interface AuthorizationMatrixDocument {
  schemaVersion: 1;
  cases: AuthorizationMatrixCase[];
}

export interface AuthorizationExecutionResult {
  status: number;
}

export type AuthorizationMatrixExecutor = (
  testCase: AuthorizationMatrixCase,
) => Promise<AuthorizationExecutionResult>;

export interface AuthorizationMatrixResult {
  id: string;
  expectedStatus: number;
  actualStatus: number;
  expectedFailureClass: AuthorizationFailureClass;
  actualFailureClass: AuthorizationFailureClass;
  passed: boolean;
}
