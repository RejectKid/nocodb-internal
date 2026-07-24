import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { ProjectRoles } from 'nocodb-sdk';
import type { NcContext } from '~/interface/config';
import {
  InternalAuditAction,
  InternalAuditActorType,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import type { InternalAuditContext } from '../audit/internal-audit-event.model';
import { InternalAuditService } from '../audit/internal-audit.service';
import {
  INTERNAL_BASE_PERMISSIONS,
  InternalBasePermission,
} from './internal-base-permission';
import type {
  InternalBasePermissionStateResponse,
  ReplaceInternalBasePermissionGrantsRequest,
  UpdateInternalBasePermissionConfigurationRequest,
} from './internal-base-permission-admin.types';
import { InternalBasePermissionIdentityProvider } from './internal-base-permission-identity.provider';
import {
  InternalPermissionEffect,
  InternalPermissionSubjectType,
  type InternalBasePermissionConfiguration,
  type InternalBasePermissionGrant,
} from './internal-base-permission.model';
import { InternalBasePermissionRepository } from './internal-base-permission.repository';
import { InternalBasePermissionService } from './internal-base-permission.service';

const SUPPORTED_PERMISSIONS = new Set<string>(INTERNAL_BASE_PERMISSIONS);
const SUPPORTED_EFFECTS = new Set<string>(
  Object.values(InternalPermissionEffect),
);
const SUPPORTED_ROLES = new Set<string>(Object.values(ProjectRoles));

interface InternalPermissionAdminActor {
  userId: string;
  audit: InternalAuditContext;
}

interface ConfigurationMutationResult {
  before: InternalBasePermissionConfiguration | null;
  stored: InternalBasePermissionConfiguration;
}

interface GrantMutationResult {
  before: InternalBasePermissionGrant[];
  stored: InternalBasePermissionGrant[];
}

@Injectable()
export class InternalBasePermissionAdminService {
  constructor(
    private readonly repository: InternalBasePermissionRepository,
    private readonly permissionService: InternalBasePermissionService,
    private readonly identityProvider: InternalBasePermissionIdentityProvider,
    private readonly auditService: InternalAuditService,
  ) {}

  async getState(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    actor: InternalPermissionAdminActor,
  ): Promise<InternalBasePermissionStateResponse> {
    const identity = await this.authorize(
      context,
      workspaceId,
      baseId,
      actor.userId,
    );
    const [configuration, grants, currentActorEffectivePermissions] =
      await Promise.all([
        this.repository.getConfiguration(workspaceId, baseId),
        this.repository.listGrants(workspaceId, baseId),
        this.permissionService.resolveAll({
          workspaceId,
          baseId,
          actor: identity,
          communityAllowed: () => this.communityCanManage(identity.roles),
        }),
      ]);
    return {
      configuration,
      grants,
      grantSets: this.groupGrantSets(grants),
      emptyGrantRevision: this.grantRevision([]),
      catalog: INTERNAL_BASE_PERMISSIONS,
      currentActorEffectivePermissions,
    };
  }

  async setEnabled(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    request: UpdateInternalBasePermissionConfigurationRequest,
    actor: InternalPermissionAdminActor,
  ) {
    await this.authorize(context, workspaceId, baseId, actor.userId);
    if (typeof request.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }
    const result = await this.auditService.execute<ConfigurationMutationResult>(
      ({ before, stored }) => ({
        action: InternalAuditAction.BASE_PERMISSION_CHANGED,
        resourceType: InternalAuditResourceType.BASE_PERMISSION,
        resourceId: baseId,
        context: actor.audit,
        before: before ? { enabled: before.enabled } : null,
        after: { enabled: stored.enabled },
        metadata: { change_type: 'configuration' },
      }),
      async (transaction) => {
        const before = await this.repository.getConfiguration(
          workspaceId,
          baseId,
          transaction,
          true,
        );
        if (
          !Object.prototype.hasOwnProperty.call(request, 'expectedUpdatedAt') ||
          request.expectedUpdatedAt !== (before?.updated_at ?? null)
        ) {
          throw new ConflictException(
            'Base permission configuration changed; reload and retry',
          );
        }
        const now = this.nextTimestamp(before?.updated_at);
        const configuration: InternalBasePermissionConfiguration = {
          workspace_id: workspaceId,
          base_id: baseId,
          enabled: request.enabled,
          schema_version: 1,
          created_at: before?.created_at ?? now,
          created_by: before?.created_by ?? actor.userId,
          updated_at: now,
          updated_by: actor.userId,
        };
        return {
          before,
          stored: await this.repository.upsertConfiguration(
            configuration,
            transaction,
          ),
        };
      },
    );
    return result.stored;
  }

  async replaceSubjectGrants(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    request: ReplaceInternalBasePermissionGrantsRequest,
    actor: InternalPermissionAdminActor,
  ) {
    await this.authorize(context, workspaceId, baseId, actor.userId);
    this.validateGrantRequest(request);
    const now = new Date().toISOString();
    const grants: InternalBasePermissionGrant[] = request.assignments.map(
      (assignment) => ({
        id: nanoid(20),
        workspace_id: workspaceId,
        base_id: baseId,
        subject_type: request.subjectType,
        subject_id: request.subjectId,
        permission: assignment.permission,
        effect: assignment.effect,
        created_at: now,
        created_by: actor.userId,
        updated_at: now,
        updated_by: actor.userId,
      }),
    );
    const result = await this.auditService.execute<GrantMutationResult>(
      ({ before, stored }) => ({
        action: InternalAuditAction.BASE_PERMISSION_CHANGED,
        resourceType: InternalAuditResourceType.BASE_PERMISSION,
        resourceId: `${request.subjectType}:${request.subjectId}`,
        context: actor.audit,
        before: { assignments: this.assignmentSummary(before) },
        after: { assignments: this.assignmentSummary(stored) },
        metadata: { change_type: 'subject_grants' },
      }),
      async (transaction) => {
        const configuration = await this.repository.getConfiguration(
          workspaceId,
          baseId,
          transaction,
          true,
        );
        if (!configuration?.enabled) {
          throw new BadRequestException(
            'Internal base permissions must be enabled before assigning grants',
          );
        }
        const before = (
          await this.repository.listGrants(workspaceId, baseId, transaction)
        ).filter(
          (grant) =>
            grant.subject_type === request.subjectType &&
            grant.subject_id === request.subjectId,
        );
        if (
          !request.expectedRevision ||
          request.expectedRevision !== this.grantRevision(before)
        ) {
          throw new ConflictException(
            'Base permission assignments changed; reload and retry',
          );
        }
        return {
          before,
          stored: await this.repository.replaceSubjectGrants(
            workspaceId,
            baseId,
            request.subjectType,
            request.subjectId,
            grants,
            transaction,
          ),
        };
      },
    );
    return result.stored;
  }

  private async authorize(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    userId: string,
  ) {
    const identity = await this.identityProvider.resolve(
      context,
      workspaceId,
      baseId,
      userId,
    );
    if (!identity) {
      throw new NotFoundException('Base not found');
    }
    const decision = await this.permissionService.resolve(
      {
        workspaceId,
        baseId,
        actor: identity,
        communityAllowed: () => this.communityCanManage(identity.roles),
      },
      InternalBasePermission.BASE_MANAGE_MEMBERS,
    );
    if (!decision.allowed) {
      throw new ForbiddenException('Base permission administration denied');
    }
    return identity;
  }

  private communityCanManage(roles: readonly string[]) {
    return (
      roles.includes(ProjectRoles.OWNER) || roles.includes(ProjectRoles.CREATOR)
    );
  }

  private validateGrantRequest(
    request: ReplaceInternalBasePermissionGrantsRequest,
  ) {
    if (
      !Object.values(InternalPermissionSubjectType).includes(
        request.subjectType,
      )
    ) {
      throw new BadRequestException('Unsupported permission subject type');
    }
    if (
      !request.subjectId?.trim() ||
      request.subjectId.length > 255 ||
      (request.subjectType === InternalPermissionSubjectType.ROLE &&
        !SUPPORTED_ROLES.has(request.subjectId))
    ) {
      throw new BadRequestException('Invalid permission subject');
    }
    if (!Array.isArray(request.assignments)) {
      throw new BadRequestException('assignments must be an array');
    }
    const keys = new Set<string>();
    for (const assignment of request.assignments) {
      if (
        !SUPPORTED_PERMISSIONS.has(assignment.permission) ||
        !SUPPORTED_EFFECTS.has(assignment.effect) ||
        keys.has(assignment.permission)
      ) {
        throw new BadRequestException('Invalid or duplicate assignment');
      }
      keys.add(assignment.permission);
    }
  }

  private assignmentSummary(grants: InternalBasePermissionGrant[]) {
    return grants
      .map(({ permission, effect }) => ({ permission, effect }))
      .sort((left, right) => left.permission.localeCompare(right.permission));
  }

  private nextTimestamp(previous?: string) {
    const previousTime = previous ? new Date(previous).getTime() : 0;
    return new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
  }

  private grantRevision(grants: InternalBasePermissionGrant[]) {
    return createHash('sha256')
      .update(JSON.stringify(this.assignmentSummary(grants)))
      .digest('base64url');
  }

  private groupGrantSets(grants: InternalBasePermissionGrant[]) {
    const groups = new Map<string, InternalBasePermissionGrant[]>();
    for (const grant of grants) {
      const key = `${grant.subject_type}:${grant.subject_id}`;
      groups.set(key, [...(groups.get(key) ?? []), grant]);
    }
    return [...groups.values()].map((subjectGrants) => ({
      subjectType: subjectGrants[0].subject_type,
      subjectId: subjectGrants[0].subject_id,
      assignments: this.assignmentSummary(subjectGrants),
      revision: this.grantRevision(subjectGrants),
    }));
  }
}
