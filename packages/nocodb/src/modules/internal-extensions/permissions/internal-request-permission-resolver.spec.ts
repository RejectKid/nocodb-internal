import { InternalBasePermission } from './internal-base-permission';
import {
  InternalPermissionRequestKind,
  resolveInternalPermissionsForRequest,
} from './internal-request-permission-resolver';

describe('request-derived internal base permissions', () => {
  it('maps a single internal API operation', () => {
    expect(
      resolveInternalPermissionsForRequest(
        InternalPermissionRequestKind.INTERNAL_API,
        { query: { operation: 'dataInsert' } } as any,
      ),
    ).toEqual([InternalBasePermission.RECORDS_CREATE]);
  });

  it('deduplicates a batched internal API permission set', () => {
    expect(
      resolveInternalPermissionsForRequest(
        InternalPermissionRequestKind.INTERNAL_API,
        {
          query: { operation: 'batch' },
          body: {
            operations: [
              { operation: 'dataList' },
              { operation: 'dataCount' },
              { operation: 'dataUpdate' },
            ],
          },
        } as any,
      ),
    ).toEqual([
      InternalBasePermission.RECORDS_READ,
      InternalBasePermission.RECORDS_UPDATE,
    ]);
  });

  it.each([
    ['queryRecords', InternalBasePermission.RECORDS_READ],
    ['createRecords', InternalBasePermission.RECORDS_CREATE],
    ['updateRecords', InternalBasePermission.RECORDS_UPDATE],
    ['deleteRecords', InternalBasePermission.RECORDS_DELETE],
  ])('maps MCP tool %s', (tool, permission) => {
    expect(
      resolveInternalPermissionsForRequest(InternalPermissionRequestKind.MCP, {
        body: { method: 'tools/call', params: { name: tool } },
      } as any),
    ).toEqual([permission]);
  });

  it('does not authorize protocol setup as a data operation', () => {
    expect(
      resolveInternalPermissionsForRequest(InternalPermissionRequestKind.MCP, {
        body: { method: 'initialize' },
      } as any),
    ).toBeUndefined();
  });
});
