import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRoles } from 'nocodb-sdk';
import type { NcContext } from '~/interface/config';
import {
  InternalAuditAction,
  InternalAuditResourceType,
} from '../audit/internal-audit-event';
import type { InternalAuditContext } from '../audit/internal-audit-event.model';
import { InternalAuditService } from '../audit/internal-audit.service';
import { InternalBasePermission } from '../permissions/internal-base-permission';
import { InternalBasePermissionIdentityProvider } from '../permissions/internal-base-permission-identity.provider';
import { InternalBasePermissionService } from '../permissions/internal-base-permission.service';
import type {
  CreateInternalApiTokenAdminRequest,
  CreateInternalApiTokenAdminResponse,
  InternalApiTokenAdminState,
  UpdateInternalApiTokenAdminRequest,
} from './internal-api-token-admin.types';
import { InternalApiTokenIssuanceService } from './internal-api-token-issuance.service';
import { InternalApiTokenRepository } from './internal-api-token.repository';
import { InternalApiTokenScope } from './internal-api-token-scope';
import { INTERNAL_API_TOKEN_SCOPE_CATALOG } from './internal-api-token-scope.catalog';

interface InternalTokenAdminActor {
  userId: string;
  audit: InternalAuditContext;
}

@Injectable()
export class InternalApiTokenAdminService {
  constructor(
    private readonly repository: InternalApiTokenRepository,
    private readonly issuanceService: InternalApiTokenIssuanceService,
    private readonly identityProvider: InternalBasePermissionIdentityProvider,
    private readonly permissionService: InternalBasePermissionService,
    private readonly auditService: InternalAuditService,
  ) {}

  async getState(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    actor: InternalTokenAdminActor,
  ): Promise<InternalApiTokenAdminState> {
    await this.authorizeBase(context, workspaceId, baseId, actor.userId);
    const tokens = (await this.repository.listByUserId(actor.userId))
      .filter(
        ({ record }) =>
          record.allowed_workspace_ids.includes(workspaceId) &&
          record.allowed_base_ids.includes(baseId),
      )
      .map((token) => token.toSummary());
    return {
      tokens,
      scopeCatalog: INTERNAL_API_TOKEN_SCOPE_CATALOG,
      boundary: { workspaceId, baseId },
    };
  }

  async create(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    request: CreateInternalApiTokenAdminRequest,
    actor: InternalTokenAdminActor,
  ): Promise<CreateInternalApiTokenAdminResponse> {
    const allowedBaseIds = this.validateBoundaries(
      workspaceId,
      baseId,
      request,
    );
    await Promise.all(
      allowedBaseIds.map((allowedBaseId) =>
        this.authorizeBase(context, workspaceId, allowedBaseId, actor.userId),
      ),
    );
    const expiresAt =
      request.expiresAt === null || request.expiresAt === undefined
        ? null
        : new Date(request.expiresAt);

    return this.auditService.execute(
      ({ token }) => ({
        action: InternalAuditAction.TOKEN_CREATED,
        resourceType: InternalAuditResourceType.API_TOKEN,
        resourceId: token.id,
        context: actor.audit,
        after: this.auditSummary(token),
      }),
      (transaction) =>
        this.issuanceService.create(
          {
            userId: actor.userId,
            createdBy: actor.userId,
            displayName: request.displayName,
            expiresAt,
            allowedWorkspaceIds: [workspaceId],
            allowedBaseIds,
            scopes: request.scopes,
            metadata: { administration: 'internal-v1' },
          },
          transaction,
        ),
    );
  }

  async revoke(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    tokenId: string,
    actor: InternalTokenAdminActor,
  ) {
    await this.authorizeBase(context, workspaceId, baseId, actor.userId);
    return this.auditService
      .execute(
        ({ before, after }) => ({
          action: InternalAuditAction.TOKEN_REVOKED,
          resourceType: InternalAuditResourceType.API_TOKEN,
          resourceId: tokenId,
          context: actor.audit,
          before: this.auditSummary(before),
          after: this.auditSummary(after),
        }),
        async (transaction) => {
          const token = await this.repository.findById(tokenId, transaction);
          if (
            !token ||
            token.record.user_id !== actor.userId ||
            !token.record.allowed_workspace_ids.includes(workspaceId) ||
            !token.record.allowed_base_ids.includes(baseId)
          ) {
            throw new NotFoundException('Internal API token not found');
          }
          if (token.isRevoked()) {
            throw new ConflictException(
              'Internal API token is already revoked',
            );
          }
          const revoked = await this.repository.revoke(
            tokenId,
            actor.userId,
            new Date(),
            transaction,
          );
          if (!revoked) {
            throw new NotFoundException('Internal API token not found');
          }
          return { before: token.toSummary(), after: revoked.toSummary() };
        },
      )
      .then(({ after }) => after);
  }

  async update(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    tokenId: string,
    request: UpdateInternalApiTokenAdminRequest,
    actor: InternalTokenAdminActor,
  ) {
    const allowedBaseIds = this.validateBoundaries(
      workspaceId,
      baseId,
      request,
    );
    await Promise.all(
      allowedBaseIds.map((allowedBaseId) =>
        this.authorizeBase(context, workspaceId, allowedBaseId, actor.userId),
      ),
    );
    const fields = this.validateMutableFields(workspaceId, request);
    return this.auditService
      .execute(
        ({ before, after }) => ({
          action: InternalAuditAction.TOKEN_UPDATED,
          resourceType: InternalAuditResourceType.API_TOKEN,
          resourceId: tokenId,
          context: actor.audit,
          before: this.auditSummary(before),
          after: this.auditSummary(after),
        }),
        async (transaction) => {
          const token = await this.ownedToken(
            tokenId,
            workspaceId,
            baseId,
            actor.userId,
            transaction,
          );
          if (token.isRevoked()) {
            throw new ConflictException('Revoked tokens cannot be edited');
          }
          const updated = await this.repository.update(
            tokenId,
            fields,
            transaction,
          );
          if (!updated) {
            throw new NotFoundException('Internal API token not found');
          }
          return { before: token.toSummary(), after: updated.toSummary() };
        },
      )
      .then(({ after }) => after);
  }

  async setEnabled(
    context: NcContext,
    workspaceId: string,
    baseId: string,
    tokenId: string,
    enabled: boolean,
    actor: InternalTokenAdminActor,
  ) {
    await this.authorizeBase(context, workspaceId, baseId, actor.userId);
    return this.auditService
      .execute(
        ({ before, after }) => ({
          action: enabled
            ? InternalAuditAction.TOKEN_ENABLED
            : InternalAuditAction.TOKEN_DISABLED,
          resourceType: InternalAuditResourceType.API_TOKEN,
          resourceId: tokenId,
          context: actor.audit,
          before: this.auditSummary(before),
          after: this.auditSummary(after),
        }),
        async (transaction) => {
          const token = await this.ownedToken(
            tokenId,
            workspaceId,
            baseId,
            actor.userId,
            transaction,
          );
          if (token.isRevoked()) {
            throw new ConflictException(
              'Revoked tokens cannot be enabled or disabled',
            );
          }
          const updated = await this.repository.setDisabled(
            tokenId,
            enabled ? null : new Date(),
            transaction,
          );
          if (!updated) {
            throw new NotFoundException('Internal API token not found');
          }
          return { before: token.toSummary(), after: updated.toSummary() };
        },
      )
      .then(({ after }) => after);
  }

  private validateBoundaries(
    workspaceId: string,
    baseId: string,
    request: CreateInternalApiTokenAdminRequest,
  ) {
    if (
      !Array.isArray(request.allowedWorkspaceIds) ||
      request.allowedWorkspaceIds.length !== 1 ||
      request.allowedWorkspaceIds[0] !== workspaceId
    ) {
      throw new BadRequestException(
        'Tokens created here must be restricted to the current workspace',
      );
    }
    if (
      !Array.isArray(request.allowedBaseIds) ||
      request.allowedBaseIds.length === 0 ||
      request.allowedBaseIds.length > 1_000 ||
      request.allowedBaseIds.some(
        (candidate) =>
          typeof candidate !== 'string' ||
          !candidate.trim() ||
          candidate.length > 20,
      ) ||
      !request.allowedBaseIds.includes(baseId)
    ) {
      throw new BadRequestException(
        'allowedBaseIds must include the current base',
      );
    }
    return [...new Set(request.allowedBaseIds)];
  }

  private validateMutableFields(
    workspaceId: string,
    request: UpdateInternalApiTokenAdminRequest,
  ) {
    const displayName = String(request.displayName ?? '').trim();
    if (!displayName || displayName.length > 255) {
      throw new BadRequestException(
        'displayName must contain between 1 and 255 characters',
      );
    }
    const expiresAt =
      request.expiresAt === null || request.expiresAt === undefined
        ? null
        : new Date(request.expiresAt);
    if (
      expiresAt !== null &&
      (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())
    ) {
      throw new BadRequestException('expiresAt must be a valid future date');
    }
    const supportedScopes = new Set(Object.values(InternalApiTokenScope));
    if (
      !Array.isArray(request.scopes) ||
      request.scopes.length > supportedScopes.size ||
      request.scopes.some((scope) => !supportedScopes.has(scope))
    ) {
      throw new BadRequestException('Token scopes are invalid');
    }
    return {
      display_name: displayName,
      expires_at: expiresAt?.toISOString() ?? null,
      allowed_workspace_ids: [workspaceId],
      allowed_base_ids: [...new Set(request.allowedBaseIds)],
      scopes: [...new Set(request.scopes)],
    };
  }

  private async ownedToken(
    tokenId: string,
    workspaceId: string,
    baseId: string,
    userId: string,
    transaction: Parameters<InternalApiTokenRepository['findById']>[1],
  ) {
    const token = await this.repository.findById(tokenId, transaction);
    if (
      !token ||
      token.record.user_id !== userId ||
      !token.record.allowed_workspace_ids.includes(workspaceId) ||
      !token.record.allowed_base_ids.includes(baseId)
    ) {
      throw new NotFoundException('Internal API token not found');
    }
    return token;
  }

  private async authorizeBase(
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
        communityAllowed: () =>
          identity.roles.includes(ProjectRoles.OWNER) ||
          identity.roles.includes(ProjectRoles.CREATOR),
      },
      InternalBasePermission.BASE_MANAGE_TOKENS,
    );
    if (!decision.allowed) {
      throw new ForbiddenException('Internal token administration denied');
    }
  }

  private auditSummary(token: {
    id: string;
    display_name: string;
    token_prefix: string;
    expires_at: string | null;
    disabled_at: string | null;
    revoked_at: string | null;
    allowed_workspace_ids: string[];
    allowed_base_ids: string[];
    scopes: string[];
  }) {
    return {
      id: token.id,
      display_name: token.display_name,
      token_prefix: token.token_prefix,
      expires_at: token.expires_at,
      disabled_at: token.disabled_at,
      revoked_at: token.revoked_at,
      allowed_workspace_ids: token.allowed_workspace_ids,
      allowed_base_ids: token.allowed_base_ids,
      scopes: token.scopes,
    };
  }
}
