jest.mock('~/middlewares/extract-ids/extract-ids.middleware', () => ({
  Acl: () => () => undefined,
}));
jest.mock('~/services/v3/data-v3.service', () => ({
  DataV3Service: class DataV3Service {},
}));
jest.mock('~/services/data-table.service', () => ({
  DataTableService: class DataTableService {},
}));
jest.mock('~/services/v3/data-attachment-v3.service', () => ({
  DataAttachmentV3Service: class DataAttachmentV3Service {},
}));
jest.mock('~/guards/data-api-limiter.guard', () => ({
  DataApiLimiterGuard: class DataApiLimiterGuard {},
}));
jest.mock('~/guards/global/global.guard', () => ({
  GlobalGuard: class GlobalGuard {},
}));
jest.mock('~/helpers', () => ({
  parseHrtimeToMilliSeconds: () => 0,
}));
jest.mock('~/constants/controllers', () => ({
  PREFIX_APIV3_DATA: '/api/v3/data',
}));

import { Reflector } from '@nestjs/core';
import { Datav3Controller } from '~/controllers/v3/data-v3.controller';
import { InternalBasePermission } from './internal-base-permission';
import { INTERNAL_BASE_PERMISSION_METADATA } from './internal-base-permission-enforcement.decorator';
import { InternalBasePermissionService } from './internal-base-permission.service';

describe('Datav3Controller internal permission metadata', () => {
  const reflector = new Reflector();
  const expected = new Map<
    keyof Datav3Controller,
    readonly InternalBasePermission[]
  >([
    ['dataList', [InternalBasePermission.RECORDS_READ]],
    [
      'dataUpsert',
      [
        InternalBasePermission.RECORDS_CREATE,
        InternalBasePermission.RECORDS_UPDATE,
      ],
    ],
    ['dataInsert', [InternalBasePermission.RECORDS_CREATE]],
    ['dataAttachmentUpload', [InternalBasePermission.RECORDS_UPDATE]],
    ['dataDelete', [InternalBasePermission.RECORDS_DELETE]],
    ['dataUpdate', [InternalBasePermission.RECORDS_UPDATE]],
    ['nestedDataList', [InternalBasePermission.RECORDS_READ]],
    ['nestedLink', [InternalBasePermission.RECORDS_UPDATE]],
    ['nestedUnlink', [InternalBasePermission.RECORDS_UPDATE]],
    ['dataCount', [InternalBasePermission.RECORDS_READ]],
    ['dataRead', [InternalBasePermission.RECORDS_READ]],
  ]);

  it.each([...expected])('maps %s to %s', (methodName, permissions) => {
    expect(
      reflector.get(
        INTERNAL_BASE_PERMISSION_METADATA,
        Datav3Controller.prototype[methodName],
      ),
    ).toEqual(permissions);
  });
});

describe('InternalBasePermissionService compound resolution', () => {
  it('evaluates compound permissions from one configuration and grant snapshot', async () => {
    const configuration = {
      workspace_id: 'workspace-1',
      base_id: 'base-1',
      enabled: true,
    };
    const grants = [{ id: 'grant-1' }];
    const repository = {
      getConfiguration: jest.fn().mockResolvedValue(configuration),
      listGrants: jest.fn().mockResolvedValue(grants),
    };
    const policy = {
      evaluate: jest.fn((request) => ({
        allowed: request.permission === InternalBasePermission.RECORDS_CREATE,
        mode: 'internal',
        source: 'role',
        reason: 'test',
      })),
    };
    const service = new InternalBasePermissionService(
      repository as any,
      policy as any,
    );

    const decisions = await service.resolveMany(
      {
        workspaceId: 'workspace-1',
        baseId: 'base-1',
        actor: {
          id: 'user-1',
          state: 'active',
          roles: ['editor'],
          isOwner: false,
        },
        communityAllowed: () => true,
      },
      [
        InternalBasePermission.RECORDS_CREATE,
        InternalBasePermission.RECORDS_UPDATE,
      ],
    );

    expect(repository.getConfiguration).toHaveBeenCalledTimes(1);
    expect(repository.listGrants).toHaveBeenCalledTimes(1);
    expect(policy.evaluate).toHaveBeenCalledTimes(2);
    expect(policy.evaluate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        permission: InternalBasePermission.RECORDS_CREATE,
        configuration,
        grants,
      }),
    );
    expect(policy.evaluate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        permission: InternalBasePermission.RECORDS_UPDATE,
        configuration,
        grants,
      }),
    );
    expect(decisions.map(({ allowed }) => allowed)).toEqual([true, false]);
  });
});
