import { InternalBasePermission } from './internal-base-permission';

const READ_RECORD_OPERATIONS = [
  'bulkAggregate',
  'bulkDataList',
  'dataAggregate',
  'dataCount',
  'dataExist',
  'dataFindOne',
  'dataGroupBy',
  'dataList',
  'dataRead',
  'groupedDataList',
  'hmList',
  'hmExcludedList',
  'btExcludedList',
  'linkDataList',
  'mmList',
  'mmExcludedList',
  'nestedDataList',
  'ooExcludedList',
] as const;

const CREATE_RECORD_OPERATIONS = ['bulkDataInsert', 'dataInsert'] as const;

const UPDATE_RECORD_OPERATIONS = [
  'bulkDataUpdate',
  'bulkDataUpdateAll',
  'dataMove',
  'dataUpdate',
  'nestedDataBulkCopyPasteOrDeleteAll',
  'nestedDataBulkLinkByDisplayValue',
  'nestedDataLink',
  'nestedDataListCopyPasteOrDeleteAll',
  'nestedDataReorder',
  'nestedDataUnlink',
  'relationDataAdd',
  'relationDataDelete',
  'relationDataRemove',
] as const;

const DELETE_RECORD_OPERATIONS = [
  'bulkDataDelete',
  'bulkDataDeleteAll',
  'dataDelete',
  'dataDeleteAll',
] as const;

const SCHEMA_READ_OPERATIONS = [
  'columnGet',
  'columnsHash',
  'tableGet',
  'tableList',
] as const;

const SCHEMA_WRITE_OPERATIONS = [
  'columnAdd',
  'columnBulk',
  'columnsBulk',
  'columnDelete',
  'columnSetAsPrimary',
  'columnUpdate',
  'convertLinkToV2',
  'sourceCreate',
  'sqlViewCreate',
  'tableCreate',
  'tableDelete',
  'tableReorder',
  'tableUpdate',
] as const;

const VIEW_READ_OPERATIONS = [
  'calendarViewGet',
  'columnList',
  'filterChildrenList',
  'filterList',
  'formViewGet',
  'galleryViewGet',
  'kanbanViewGet',
  'mapViewGet',
  'modelVisibilityList',
  'sortGet',
  'sortList',
  'viewList',
  'viewRowColorInfo',
] as const;

const VIEW_WRITE_OPERATIONS = [
  'calendarViewCreate',
  'calendarViewUpdate',
  'filterBulkLogicalOpUpdate',
  'filterCreate',
  'filterDelete',
  'filterUpdate',
  'formViewCreate',
  'formViewUpdate',
  'galleryViewCreate',
  'galleryViewUpdate',
  'gridColumnUpdate',
  'gridViewCreate',
  'gridViewUpdate',
  'hideAllColumns',
  'kanbanViewCreate',
  'kanbanViewUpdate',
  'mapViewCreate',
  'mapViewUpdate',
  'modelVisibilitySet',
  'shareView',
  'shareViewDelete',
  'shareViewUpdate',
  'showAllColumns',
  'sortCreate',
  'sortDelete',
  'sortUpdate',
  'viewColumnCreate',
  'viewColumnsBulkSetVisibility',
  'viewColumnUpdate',
  'viewDelete',
  'viewRowColorConditionAdd',
  'viewRowColorConditionDelete',
  'viewRowColorConditionUpdate',
  'viewRowColorInfoDelete',
  'viewRowColorSelectAdd',
  'viewUpdate',
] as const;

const MEMBER_READ_OPERATIONS = ['baseUserList'] as const;
const MEMBER_WRITE_OPERATIONS = [
  'baseUserDelete',
  'baseUserInviteResend',
  'baseUserMetaUpdate',
  'baseUserUpdate',
  'userInvite',
] as const;

const TOKEN_READ_OPERATIONS = ['baseApiTokenList'] as const;
const TOKEN_WRITE_OPERATIONS = [
  'baseApiTokenCreate',
  'baseApiTokenDelete',
] as const;

const BASE_READ_OPERATIONS = [
  'baseGet',
  'baseInfoGet',
  'hasEmptyOrNullFilters',
] as const;
const BASE_WRITE_OPERATIONS = [
  'baseDelete',
  'baseUpdate',
  'createSharedBaseLink',
  'disableSharedBaseLink',
  'getSharedBaseLink',
  'updateSharedBaseLink',
] as const;

const IMPORT_OPERATIONS = [
  'airtableImport',
  'atImportTrigger',
  'dataImportFile',
  'dataImportPreview',
  'migrateBase',
] as const;

const aclPermissionMap = new Map<string, readonly InternalBasePermission[]>();

const add = (
  operations: readonly string[],
  ...permissions: [InternalBasePermission, ...InternalBasePermission[]]
) => {
  const frozen = Object.freeze([...permissions]);
  for (const operation of operations) {
    aclPermissionMap.set(operation, frozen);
  }
};

add(READ_RECORD_OPERATIONS, InternalBasePermission.RECORDS_READ);
add(CREATE_RECORD_OPERATIONS, InternalBasePermission.RECORDS_CREATE);
add(UPDATE_RECORD_OPERATIONS, InternalBasePermission.RECORDS_UPDATE);
add(DELETE_RECORD_OPERATIONS, InternalBasePermission.RECORDS_DELETE);
add(
  ['bulkDataUpsert', 'dataUpsert'],
  InternalBasePermission.RECORDS_CREATE,
  InternalBasePermission.RECORDS_UPDATE,
);
add(SCHEMA_READ_OPERATIONS, InternalBasePermission.BASE_VIEW);
add(SCHEMA_WRITE_OPERATIONS, InternalBasePermission.BASE_MANAGE_SCHEMA);
add(VIEW_READ_OPERATIONS, InternalBasePermission.BASE_VIEW);
add(VIEW_WRITE_OPERATIONS, InternalBasePermission.BASE_MANAGE_VIEWS);
add(MEMBER_READ_OPERATIONS, InternalBasePermission.BASE_MANAGE_MEMBERS);
add(MEMBER_WRITE_OPERATIONS, InternalBasePermission.BASE_MANAGE_MEMBERS);
add(TOKEN_READ_OPERATIONS, InternalBasePermission.BASE_MANAGE_TOKENS);
add(TOKEN_WRITE_OPERATIONS, InternalBasePermission.BASE_MANAGE_TOKENS);
add(BASE_READ_OPERATIONS, InternalBasePermission.BASE_VIEW);
add(BASE_WRITE_OPERATIONS, InternalBasePermission.BASE_EDIT);
add(IMPORT_OPERATIONS, InternalBasePermission.BASE_IMPORT);
add(
  ['dataExport'],
  InternalBasePermission.BASE_EXPORT,
  InternalBasePermission.RECORDS_READ,
);

/**
 * Independent adapter from existing Community ACL operation names to the
 * internal permission catalog. Unknown operations intentionally retain only
 * their upstream Community authorization.
 */
export const resolveInternalPermissionsForCommunityAcl = (
  operation: string | undefined,
): readonly InternalBasePermission[] | undefined =>
  operation ? aclPermissionMap.get(operation) : undefined;
