import { InternalBasePermission } from './internal-base-permission';
import { resolveInternalPermissionsForCommunityAcl } from './internal-community-acl-permission-map';

describe('Community ACL to internal base-permission adapter', () => {
  it.each([
    ['dataList', [InternalBasePermission.RECORDS_READ]],
    ['bulkDataInsert', [InternalBasePermission.RECORDS_CREATE]],
    ['relationDataAdd', [InternalBasePermission.RECORDS_UPDATE]],
    ['bulkDataDeleteAll', [InternalBasePermission.RECORDS_DELETE]],
    [
      'bulkDataUpsert',
      [
        InternalBasePermission.RECORDS_CREATE,
        InternalBasePermission.RECORDS_UPDATE,
      ],
    ],
    ['tableUpdate', [InternalBasePermission.BASE_MANAGE_SCHEMA]],
    ['filterUpdate', [InternalBasePermission.BASE_MANAGE_VIEWS]],
    ['baseUserUpdate', [InternalBasePermission.BASE_MANAGE_MEMBERS]],
    ['baseApiTokenCreate', [InternalBasePermission.BASE_MANAGE_TOKENS]],
    ['baseInfoGet', [InternalBasePermission.BASE_VIEW]],
    ['baseUpdate', [InternalBasePermission.BASE_EDIT]],
    ['migrateBase', [InternalBasePermission.BASE_IMPORT]],
    [
      'dataExport',
      [InternalBasePermission.BASE_EXPORT, InternalBasePermission.RECORDS_READ],
    ],
  ])('maps %s', (operation, expected) => {
    expect(resolveInternalPermissionsForCommunityAcl(operation)).toEqual(
      expected,
    );
  });

  it('leaves unknown and commercial operations unmapped', () => {
    expect(resolveInternalPermissionsForCommunityAcl('licenseSet')).toBe(
      undefined,
    );
    expect(resolveInternalPermissionsForCommunityAcl('unknown')).toBe(
      undefined,
    );
  });
});
