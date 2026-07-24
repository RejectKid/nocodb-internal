import { InternalBasePermission } from './internal-base-permission';
import {
  InternalPermissionEffect,
  InternalPermissionSubjectType,
  type InternalBasePermissionConfiguration,
  type InternalBasePermissionGrant,
} from './internal-base-permission.model';
import type { InternalBasePermissionRequest } from './internal-base-permission.policy';
import { DefaultInternalBasePermissionPolicy } from './default-internal-base-permission.policy';

const configuration: InternalBasePermissionConfiguration = {
  workspace_id: 'workspace-1',
  base_id: 'base-1',
  enabled: true,
  schema_version: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: 'owner-1',
  updated_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'owner-1',
};

function grant(
  subjectType: InternalPermissionSubjectType,
  subjectId: string,
  effect: InternalPermissionEffect,
): InternalBasePermissionGrant {
  return {
    id: `${subjectType}-${subjectId}-${effect}`,
    workspace_id: 'workspace-1',
    base_id: 'base-1',
    subject_type: subjectType,
    subject_id: subjectId,
    permission: InternalBasePermission.RECORDS_READ,
    effect,
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: 'owner-1',
    updated_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'owner-1',
  };
}

function request(
  overrides: Partial<InternalBasePermissionRequest> = {},
): InternalBasePermissionRequest {
  return {
    workspaceId: 'workspace-1',
    baseId: 'base-1',
    permission: InternalBasePermission.RECORDS_READ,
    actor: {
      id: 'user-1',
      state: 'active',
      roles: ['editor'],
      isOwner: false,
    },
    configuration,
    grants: [],
    communityAllowed: false,
    ...overrides,
  };
}

describe('DefaultInternalBasePermissionPolicy', () => {
  const policy = new DefaultInternalBasePermissionPolicy();

  it('preserves the Community decision when internal permissions are disabled', () => {
    expect(
      policy.evaluate(
        request({
          configuration: { ...configuration, enabled: false },
          communityAllowed: true,
        }),
      ),
    ).toMatchObject({
      allowed: true,
      mode: 'community',
      source: 'community',
    });
  });

  it('denies by default after the base opts in', () => {
    expect(policy.evaluate(request())).toMatchObject({
      allowed: false,
      mode: 'internal',
      reason: 'no_matching_grant',
    });
  });

  it('gives a direct user assignment precedence over role assignments', () => {
    expect(
      policy.evaluate(
        request({
          grants: [
            grant(
              InternalPermissionSubjectType.ROLE,
              'editor',
              InternalPermissionEffect.DENY,
            ),
            grant(
              InternalPermissionSubjectType.USER,
              'user-1',
              InternalPermissionEffect.ALLOW,
            ),
          ],
        }),
      ),
    ).toMatchObject({ allowed: true, source: 'user' });
  });

  it('uses deny precedence when multiple assigned roles conflict', () => {
    expect(
      policy.evaluate(
        request({
          actor: {
            id: 'user-1',
            state: 'active',
            roles: ['editor', 'viewer'],
            isOwner: false,
          },
          grants: [
            grant(
              InternalPermissionSubjectType.ROLE,
              'editor',
              InternalPermissionEffect.ALLOW,
            ),
            grant(
              InternalPermissionSubjectType.ROLE,
              'viewer',
              InternalPermissionEffect.DENY,
            ),
          ],
        }),
      ),
    ).toMatchObject({ allowed: false, source: 'role' });
  });

  it('retains owner emergency access despite an explicit deny', () => {
    expect(
      policy.evaluate(
        request({
          actor: {
            id: 'owner-1',
            state: 'active',
            roles: ['owner'],
            isOwner: true,
          },
          grants: [
            grant(
              InternalPermissionSubjectType.USER,
              'owner-1',
              InternalPermissionEffect.DENY,
            ),
          ],
        }),
      ),
    ).toMatchObject({
      allowed: true,
      source: 'owner',
      reason: 'owner_emergency_access',
    });
  });

  it.each(['blocked', 'disabled', 'deleted'] as const)(
    'denies a %s user before permission evaluation',
    (state) => {
      expect(
        policy.evaluate(
          request({
            actor: {
              id: 'user-1',
              state,
              roles: ['editor'],
              isOwner: false,
            },
            communityAllowed: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        source: 'authentication',
        reason: `user_${state}`,
      });
    },
  );

  it('denies cross-workspace configuration facts', () => {
    expect(
      policy.evaluate(
        request({
          configuration: { ...configuration, workspace_id: 'workspace-2' },
        }),
      ),
    ).toMatchObject({
      allowed: false,
      reason: 'configuration_context_mismatch',
    });
  });

  it('denies cross-base grant facts', () => {
    expect(
      policy.evaluate(
        request({
          grants: [
            {
              ...grant(
                InternalPermissionSubjectType.USER,
                'user-1',
                InternalPermissionEffect.ALLOW,
              ),
              base_id: 'base-2',
            },
          ],
        }),
      ),
    ).toMatchObject({ allowed: false, reason: 'grant_context_mismatch' });
  });
});
