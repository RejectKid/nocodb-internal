import type { NcRequest } from '~/interface/config';
import { InternalBasePermission } from './internal-base-permission';
import { resolveInternalPermissionsForCommunityAcl } from './internal-community-acl-permission-map';

export enum InternalPermissionRequestKind {
  INTERNAL_API = 'internal-api',
  MCP = 'mcp',
}

const mcpToolPermissions = new Map<string, readonly InternalBasePermission[]>([
  ['getBaseInfo', [InternalBasePermission.BASE_VIEW]],
  ['getTablesList', [InternalBasePermission.BASE_VIEW]],
  ['getTableSchema', [InternalBasePermission.BASE_VIEW]],
  ['queryRecords', [InternalBasePermission.RECORDS_READ]],
  ['getRecord', [InternalBasePermission.RECORDS_READ]],
  ['countRecords', [InternalBasePermission.RECORDS_READ]],
  ['readAttachment', [InternalBasePermission.RECORDS_READ]],
  ['aggregate_single', [InternalBasePermission.RECORDS_READ]],
  ['createRecords', [InternalBasePermission.RECORDS_CREATE]],
  ['updateRecords', [InternalBasePermission.RECORDS_UPDATE]],
  ['deleteRecords', [InternalBasePermission.RECORDS_DELETE]],
]);

const uniquePermissions = (
  permissions: readonly (readonly InternalBasePermission[] | undefined)[],
) =>
  Object.freeze([
    ...new Set(permissions.flatMap((permission) => permission ?? [])),
  ]);

const resolveInternalApiPermissions = (request: NcRequest) => {
  const operation = request.query?.operation;
  if (operation === 'batch') {
    const operations = Array.isArray(request.body?.operations)
      ? request.body.operations
      : [];
    return uniquePermissions(
      operations.map((entry) =>
        resolveInternalPermissionsForCommunityAcl(entry?.operation),
      ),
    );
  }
  return resolveInternalPermissionsForCommunityAcl(
    typeof operation === 'string' ? operation : undefined,
  );
};

const resolveMcpPermissions = (request: NcRequest) => {
  if (request.body?.method !== 'tools/call') {
    return undefined;
  }
  const tool = request.body?.params?.name;
  return typeof tool === 'string' ? mcpToolPermissions.get(tool) : undefined;
};

export const resolveInternalPermissionsForRequest = (
  kind: InternalPermissionRequestKind,
  request: NcRequest,
) => {
  switch (kind) {
    case InternalPermissionRequestKind.INTERNAL_API:
      return resolveInternalApiPermissions(request);
    case InternalPermissionRequestKind.MCP:
      return resolveMcpPermissions(request);
  }
};
