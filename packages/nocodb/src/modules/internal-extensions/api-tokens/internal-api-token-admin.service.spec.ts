import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { InternalApiToken } from './internal-api-token.model';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { InternalApiTokenAdminService } from './internal-api-token-admin.service';

const summary = (overrides: Record<string, unknown> = {}) => ({
  id: 'token-1',
  user_id: 'user-1',
  display_name: 'Automation',
  token_prefix: 'nci_public001',
  created_at: '2026-07-24T12:00:00.000Z',
  created_by: 'user-1',
  expires_at: null,
  last_used_at: null,
  disabled_at: null,
  revoked_at: null,
  revoked_by: null,
  allowed_workspace_ids: ['workspace-1'],
  allowed_base_ids: ['base-1'],
  scopes: [InternalApiTokenScope.DATA_READ],
  scope_version: 1,
  metadata: null,
  ...overrides,
});

describe('InternalApiTokenAdminService', () => {
  let recordedEvent: any;
  const repository = {
    listByUserId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    setDisabled: jest.fn(),
    revoke: jest.fn(),
  };
  const issuanceService = {
    create: jest.fn(),
  };
  const identityProvider = {
    resolve: jest.fn(),
  };
  const permissionService = {
    resolve: jest.fn(),
  };
  const auditService = {
    execute: jest.fn(async (event, mutation) => {
      const result = await mutation({ transaction: true });
      recordedEvent = typeof event === 'function' ? event(result) : event;
      return result;
    }),
  };
  const service = new InternalApiTokenAdminService(
    repository as any,
    issuanceService as any,
    identityProvider as any,
    permissionService as any,
    auditService as any,
  );
  const context = { workspace_id: 'workspace-1', base_id: 'base-1' } as any;
  const actor = {
    userId: 'user-1',
    audit: {
      actorType: 'user',
      actorId: 'user-1',
      workspaceId: 'workspace-1',
      baseId: 'base-1',
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    recordedEvent = undefined;
    identityProvider.resolve.mockResolvedValue({
      id: 'user-1',
      state: 'active',
      roles: ['owner'],
      isOwner: true,
    });
    permissionService.resolve.mockResolvedValue({ allowed: true });
    issuanceService.create.mockResolvedValue({
      token: summary(),
      value: 'nci_public001_plaintext',
    });
  });

  it('lists only the actor tokens bound to the current base', async () => {
    repository.listByUserId.mockResolvedValue([
      new InternalApiToken({
        ...summary(),
        token_hash: 'hash',
        hash_version: 1,
      } as any),
      new InternalApiToken({
        ...summary({ id: 'token-2', allowed_base_ids: ['base-2'] }),
        token_hash: 'hash',
        hash_version: 1,
      } as any),
    ]);

    const state = await service.getState(
      context,
      'workspace-1',
      'base-1',
      actor,
    );

    expect(state.tokens.map(({ id }) => id)).toEqual(['token-1']);
    expect(state.tokens[0]).not.toHaveProperty('token_hash');
    expect(permissionService.resolve).toHaveBeenCalledWith(
      expect.anything(),
      InternalBasePermission.BASE_MANAGE_TOKENS,
    );
  });

  it('creates a tenant-bound token and never writes its secret to audit', async () => {
    const result = await service.create(
      context,
      'workspace-1',
      'base-1',
      {
        displayName: 'Automation',
        expiresAt: null,
        allowedWorkspaceIds: ['workspace-1'],
        allowedBaseIds: ['base-1', 'base-2'],
        scopes: [InternalApiTokenScope.DATA_READ],
      },
      actor,
    );

    expect(identityProvider.resolve).toHaveBeenCalledTimes(2);
    expect(issuanceService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        createdBy: 'user-1',
        allowedWorkspaceIds: ['workspace-1'],
        allowedBaseIds: ['base-1', 'base-2'],
      }),
      { transaction: true },
    );
    expect(result.value).toBe('nci_public001_plaintext');
    expect(JSON.stringify(recordedEvent)).not.toContain(result.value);
    expect(recordedEvent.action).toBe('token.created');
  });

  it('rejects cross-workspace and current-base-free boundaries', async () => {
    await expect(
      service.create(
        context,
        'workspace-1',
        'base-1',
        {
          displayName: 'Invalid',
          allowedWorkspaceIds: ['workspace-2'],
          allowedBaseIds: ['base-1'],
          scopes: [],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        context,
        'workspace-1',
        'base-1',
        {
          displayName: 'Invalid',
          allowedWorkspaceIds: ['workspace-1'],
          allowedBaseIds: ['base-2'],
          scopes: [],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(issuanceService.create).not.toHaveBeenCalled();
  });

  it('denies creation when any selected base is unauthorized', async () => {
    permissionService.resolve
      .mockResolvedValueOnce({ allowed: true })
      .mockResolvedValueOnce({ allowed: false });

    await expect(
      service.create(
        context,
        'workspace-1',
        'base-1',
        {
          displayName: 'Too broad',
          allowedWorkspaceIds: ['workspace-1'],
          allowedBaseIds: ['base-1', 'base-2'],
          scopes: [],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(issuanceService.create).not.toHaveBeenCalled();
  });

  it('revokes an owned token immediately and audits no token material', async () => {
    const active = new InternalApiToken({
      ...summary(),
      token_hash: 'secret-hash',
      hash_version: 1,
    } as any);
    const revoked = new InternalApiToken({
      ...active.record,
      revoked_at: '2026-07-24T13:00:00.000Z',
      revoked_by: 'user-1',
    });
    repository.findById.mockResolvedValue(active);
    repository.revoke.mockResolvedValue(revoked);

    const result = await service.revoke(
      context,
      'workspace-1',
      'base-1',
      'token-1',
      actor,
    );

    expect(result.revoked_at).toBe('2026-07-24T13:00:00.000Z');
    expect(repository.revoke).toHaveBeenCalledWith(
      'token-1',
      'user-1',
      expect.any(Date),
      { transaction: true },
    );
    expect(recordedEvent.action).toBe('token.revoked');
    expect(JSON.stringify(recordedEvent)).not.toContain('secret-hash');
  });

  it('edits an active token and audits only its safe summary', async () => {
    const active = new InternalApiToken({
      ...summary(),
      token_hash: 'secret-hash',
      hash_version: 1,
    } as any);
    const edited = new InternalApiToken({
      ...active.record,
      display_name: 'Renamed',
      scopes: [InternalApiTokenScope.DOCUMENTS_READ],
    });
    repository.findById.mockResolvedValue(active);
    repository.update.mockResolvedValue(edited);

    const result = await service.update(
      context,
      'workspace-1',
      'base-1',
      'token-1',
      {
        displayName: 'Renamed',
        expiresAt: null,
        allowedWorkspaceIds: ['workspace-1'],
        allowedBaseIds: ['base-1'],
        scopes: [InternalApiTokenScope.DOCUMENTS_READ],
      },
      actor,
    );

    expect(result.display_name).toBe('Renamed');
    expect(recordedEvent.action).toBe('token.updated');
    expect(JSON.stringify(recordedEvent)).not.toContain('secret-hash');
  });

  it('temporarily disables and re-enables a token', async () => {
    const active = new InternalApiToken({
      ...summary(),
      token_hash: 'secret-hash',
      hash_version: 1,
    } as any);
    repository.findById.mockResolvedValue(active);
    repository.setDisabled.mockImplementation(
      async (_id: string, disabledAt: Date | null) =>
        new InternalApiToken({
          ...active.record,
          disabled_at: disabledAt?.toISOString() ?? null,
        }),
    );

    const disabled = await service.setEnabled(
      context,
      'workspace-1',
      'base-1',
      'token-1',
      false,
      actor,
    );
    expect(disabled.disabled_at).not.toBeNull();
    expect(recordedEvent.action).toBe('token.disabled');

    const enabled = await service.setEnabled(
      context,
      'workspace-1',
      'base-1',
      'token-1',
      true,
      actor,
    );
    expect(enabled.disabled_at).toBeNull();
    expect(recordedEvent.action).toBe('token.enabled');
  });
});
