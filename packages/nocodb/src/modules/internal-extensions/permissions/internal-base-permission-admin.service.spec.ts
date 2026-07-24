import knex, { type Knex } from 'knex';
import { ProjectRoles } from 'nocodb-sdk';
import type { NcContext } from '~/interface/config';
import { up as upPermissions } from '../migrations/nc_internal_002_base_permissions';
import { up as upAudit } from '../migrations/nc_internal_003_audit_events';
import {
  InternalAuditActorType,
  InternalAuditAction,
} from '../audit/internal-audit-event';
import { InternalAuditRedactionService } from '../audit/internal-audit-redaction.service';
import { InternalAuditService } from '../audit/internal-audit.service';
import { KnexInternalAuditRepository } from '../audit/knex-internal-audit.repository';
import { InternalBasePermissionAdminService } from './internal-base-permission-admin.service';
import { InternalBasePermissionIdentityProvider } from './internal-base-permission-identity.provider';
import { InternalBasePermission } from './internal-base-permission';
import {
  InternalPermissionEffect,
  InternalPermissionSubjectType,
} from './internal-base-permission.model';
import type { InternalBasePermissionActor } from './internal-base-permission.policy';
import { InternalBasePermissionService } from './internal-base-permission.service';
import { DefaultInternalBasePermissionPolicy } from './default-internal-base-permission.policy';
import { KnexInternalBasePermissionRepository } from './knex-internal-base-permission.repository';

class TestIdentityProvider extends InternalBasePermissionIdentityProvider {
  identity: InternalBasePermissionActor | null = {
    id: 'owner-1',
    state: 'active',
    roles: [ProjectRoles.OWNER],
    isOwner: true,
  };

  async resolve() {
    return this.identity;
  }
}

describe('InternalBasePermissionAdminService', () => {
  let db: Knex;
  let permissionRepository: KnexInternalBasePermissionRepository;
  let auditRepository: KnexInternalAuditRepository;
  let identityProvider: TestIdentityProvider;
  let service: InternalBasePermissionAdminService;

  const context = {
    workspace_id: 'workspace-1',
    base_id: 'base-1',
  } as NcContext;
  const actor = {
    userId: 'owner-1',
    audit: {
      actorType: InternalAuditActorType.USER,
      actorId: 'owner-1',
      workspaceId: 'workspace-1',
      baseId: 'base-1',
      requestId: 'request-1',
    },
  };
  const setEnabled = async (enabled: boolean) => {
    const state = await service.getState(
      context,
      'workspace-1',
      'base-1',
      actor,
    );
    return service.setEnabled(
      context,
      'workspace-1',
      'base-1',
      { enabled, expectedUpdatedAt: state.configuration?.updated_at ?? null },
      actor,
    );
  };
  const replaceGrants = async (
    request: Omit<
      Parameters<InternalBasePermissionAdminService['replaceSubjectGrants']>[3],
      'expectedRevision'
    >,
    requestActor = actor,
  ) => {
    const state = await service.getState(
      context,
      'workspace-1',
      'base-1',
      requestActor,
    );
    const grantSet = state.grantSets.find(
      ({ subjectType, subjectId }) =>
        subjectType === request.subjectType && subjectId === request.subjectId,
    );
    return service.replaceSubjectGrants(
      context,
      'workspace-1',
      'base-1',
      {
        ...request,
        expectedRevision: grantSet?.revision ?? state.emptyGrantRevision,
      },
      requestActor,
    );
  };

  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await upPermissions(db);
    await upAudit(db);
    const metaService = { knexConnection: db } as never;
    permissionRepository = new KnexInternalBasePermissionRepository(
      metaService,
    );
    auditRepository = new KnexInternalAuditRepository(metaService);
    identityProvider = new TestIdentityProvider();
    service = new InternalBasePermissionAdminService(
      permissionRepository,
      new InternalBasePermissionService(
        permissionRepository,
        new DefaultInternalBasePermissionPolicy(),
      ),
      identityProvider,
      new InternalAuditService(
        auditRepository,
        new InternalAuditRedactionService(),
      ),
    );
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('lets a Community owner inspect an unconfigured base', async () => {
    const state = await service.getState(
      context,
      'workspace-1',
      'base-1',
      actor,
    );
    expect(state.configuration).toBeNull();
    expect(state.catalog).toContain(InternalBasePermission.BASE_MANAGE_MEMBERS);
    expect(
      state.currentActorEffectivePermissions.find(
        ({ permission }) =>
          permission === InternalBasePermission.BASE_MANAGE_MEMBERS,
      ),
    ).toMatchObject({ allowed: true, mode: 'community' });
  });

  it('denies an unauthorized Community role without writing an event', async () => {
    identityProvider.identity = {
      id: 'viewer-1',
      state: 'active',
      roles: [ProjectRoles.VIEWER],
      isOwner: false,
    };
    await expect(
      service.setEnabled(
        context,
        'workspace-1',
        'base-1',
        { enabled: true, expectedUpdatedAt: null },
        {
          ...actor,
          userId: 'viewer-1',
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      auditRepository.list({ workspaceId: 'workspace-1' }),
    ).resolves.toEqual([]);
  });

  it('enables a base and records the safe audit event atomically', async () => {
    await expect(setEnabled(true)).resolves.toMatchObject({
      enabled: true,
      updated_by: 'owner-1',
    });
    await expect(
      auditRepository.list({ workspaceId: 'workspace-1' }),
    ).resolves.toMatchObject([
      {
        action: InternalAuditAction.BASE_PERMISSION_CHANGED,
        resource_id: 'base-1',
        before_summary: null,
        after_summary: { enabled: true },
      },
    ]);
  });

  it('atomically replaces one subject assignments and audits before and after', async () => {
    await setEnabled(true);
    await replaceGrants({
      subjectType: InternalPermissionSubjectType.ROLE,
      subjectId: ProjectRoles.EDITOR,
      assignments: [
        {
          permission: InternalBasePermission.RECORDS_READ,
          effect: InternalPermissionEffect.ALLOW,
        },
        {
          permission: InternalBasePermission.RECORDS_DELETE,
          effect: InternalPermissionEffect.DENY,
        },
      ],
    });
    await replaceGrants({
      subjectType: InternalPermissionSubjectType.ROLE,
      subjectId: ProjectRoles.EDITOR,
      assignments: [
        {
          permission: InternalBasePermission.RECORDS_READ,
          effect: InternalPermissionEffect.ALLOW,
        },
      ],
    });

    await expect(
      permissionRepository.listGrants('workspace-1', 'base-1'),
    ).resolves.toMatchObject([
      {
        subject_id: ProjectRoles.EDITOR,
        permission: InternalBasePermission.RECORDS_READ,
      },
    ]);
    const events = await auditRepository.list({
      workspaceId: 'workspace-1',
      action: InternalAuditAction.BASE_PERMISSION_CHANGED,
    });
    expect(events).toHaveLength(3);
    expect(events[0].after_summary).toEqual({
      assignments: [
        {
          permission: InternalBasePermission.RECORDS_READ,
          effect: InternalPermissionEffect.ALLOW,
        },
      ],
    });
  });

  it('allows a delegated manager only after internal opt-in and assignment', async () => {
    await setEnabled(true);
    await replaceGrants({
      subjectType: InternalPermissionSubjectType.USER,
      subjectId: 'manager-1',
      assignments: [
        {
          permission: InternalBasePermission.BASE_MANAGE_MEMBERS,
          effect: InternalPermissionEffect.ALLOW,
        },
      ],
    });
    identityProvider.identity = {
      id: 'manager-1',
      state: 'active',
      roles: [ProjectRoles.VIEWER],
      isOwner: false,
    };
    await expect(
      replaceGrants(
        {
          subjectType: InternalPermissionSubjectType.USER,
          subjectId: 'user-2',
          assignments: [
            {
              permission: InternalBasePermission.RECORDS_READ,
              effect: InternalPermissionEffect.ALLOW,
            },
          ],
        },
        {
          ...actor,
          userId: 'manager-1',
          audit: { ...actor.audit, actorId: 'manager-1' },
        },
      ),
    ).resolves.toHaveLength(1);
  });

  it('rejects duplicate or unknown assignments before mutation', async () => {
    await expect(
      service.replaceSubjectGrants(
        context,
        'workspace-1',
        'base-1',
        {
          subjectType: InternalPermissionSubjectType.USER,
          subjectId: 'user-1',
          expectedRevision: 'unused-for-invalid-request',
          assignments: [
            {
              permission: InternalBasePermission.RECORDS_READ,
              effect: InternalPermissionEffect.ALLOW,
            },
            {
              permission: InternalBasePermission.RECORDS_READ,
              effect: InternalPermissionEffect.DENY,
            },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('does not disclose a cross-workspace base', async () => {
    identityProvider.identity = null;
    await expect(
      service.getState(context, 'workspace-2', 'base-1', actor),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('rejects stale configuration and grant writes without audit events', async () => {
    const initialState = await service.getState(
      context,
      'workspace-1',
      'base-1',
      actor,
    );
    await setEnabled(true);
    await expect(
      service.setEnabled(
        context,
        'workspace-1',
        'base-1',
        {
          enabled: false,
          expectedUpdatedAt: initialState.configuration?.updated_at ?? null,
        },
        actor,
      ),
    ).rejects.toMatchObject({ status: 409 });

    const emptyRevision = (
      await service.getState(context, 'workspace-1', 'base-1', actor)
    ).emptyGrantRevision;
    await replaceGrants({
      subjectType: InternalPermissionSubjectType.USER,
      subjectId: 'user-2',
      assignments: [
        {
          permission: InternalBasePermission.RECORDS_READ,
          effect: InternalPermissionEffect.ALLOW,
        },
      ],
    });
    await expect(
      service.replaceSubjectGrants(
        context,
        'workspace-1',
        'base-1',
        {
          subjectType: InternalPermissionSubjectType.USER,
          subjectId: 'user-2',
          expectedRevision: emptyRevision,
          assignments: [],
        },
        actor,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      auditRepository.list({ workspaceId: 'workspace-1' }),
    ).resolves.toHaveLength(2);
  });
});
