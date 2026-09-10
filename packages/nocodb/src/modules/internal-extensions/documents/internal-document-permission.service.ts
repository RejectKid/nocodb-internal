import { Injectable, Optional } from '@nestjs/common';
import { InternalTeamDirectory } from '../teams/internal-team-directory';
import { extractRolesObj, OrgUserRoles, ProjectRoles } from 'nocodb-sdk';
import type { NcRequest } from '~/interface/config';
import { MetaService } from '~/meta/meta.service';
import {
  INTERNAL_DOCUMENT_GRANTS_TABLE,
  INTERNAL_DOCUMENTS_TABLE,
} from '../migrations/nc_internal_004_product_suite';
import {
  InternalDocumentPermission,
  type InternalDocumentRecord,
} from './internal-document.types';

const impliedPermissions: Record<
  InternalDocumentPermission,
  readonly InternalDocumentPermission[]
> = {
  [InternalDocumentPermission.DISCOVER]: [],
  [InternalDocumentPermission.READ]: [InternalDocumentPermission.DISCOVER],
  [InternalDocumentPermission.COMMENT]: [
    InternalDocumentPermission.DISCOVER,
    InternalDocumentPermission.READ,
  ],
  [InternalDocumentPermission.EDIT]: [
    InternalDocumentPermission.DISCOVER,
    InternalDocumentPermission.READ,
    InternalDocumentPermission.COMMENT,
  ],
  [InternalDocumentPermission.MANAGE]: Object.values(
    InternalDocumentPermission,
  ).filter((value) => value !== InternalDocumentPermission.MANAGE),
  [InternalDocumentPermission.EXPORT]: [
    InternalDocumentPermission.DISCOVER,
    InternalDocumentPermission.READ,
  ],
};

@Injectable()
export class InternalDocumentPermissionService {
  constructor(
    private readonly metaService: MetaService,
    @Optional() private readonly teams?: InternalTeamDirectory,
  ) {}

  async effective(
    document: InternalDocumentRecord,
    request: NcRequest,
  ): Promise<Set<InternalDocumentPermission>> {
    const roles = extractRolesObj(request.user?.roles);
    const baseRoles = extractRolesObj(request.user?.base_roles);
    if (
      roles?.[OrgUserRoles.SUPER_ADMIN] ||
      baseRoles?.[ProjectRoles.OWNER] ||
      baseRoles?.[ProjectRoles.CREATOR] ||
      document.createdBy === request.user?.id
    ) {
      return new Set(Object.values(InternalDocumentPermission));
    }

    const subjectIds = [
      request.user?.id,
      ...Object.entries(baseRoles ?? {})
        .filter(([, enabled]) => enabled)
        .map(([role]) => role),
    ].filter(Boolean) as string[];
    const documentIds = await this.ancestorIds(document);
    const teamIds =
      (await this.teams?.teamIdsForUser(
        document.workspaceId,
        request.user?.id,
      )) ?? [];
    const grants = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_GRANTS_TABLE)
      .select('permission')
      .whereIn('document_id', documentIds)
      .where((builder) =>
        builder
          .where((userBuilder) =>
            userBuilder
              .where('subject_type', 'user')
              .where('subject_id', request.user?.id),
          )
          .orWhere((teamBuilder) =>
            teamBuilder
              .where('subject_type', 'team')
              .whereIn('subject_id', teamIds),
          )
          .orWhere((roleBuilder) =>
            roleBuilder
              .where('subject_type', 'role')
              .whereIn('subject_id', subjectIds),
          ),
      );
    const permissions = new Set<InternalDocumentPermission>();
    for (const grant of grants) {
      const permission = grant.permission as InternalDocumentPermission;
      permissions.add(permission);
      for (const implied of impliedPermissions[permission] ?? []) {
        permissions.add(implied);
      }
    }
    return permissions;
  }

  async can(
    document: InternalDocumentRecord,
    request: NcRequest,
    permission: InternalDocumentPermission,
  ) {
    return (await this.effective(document, request)).has(permission);
  }

  async sources(document: InternalDocumentRecord, request: NcRequest) {
    const baseRoles = extractRolesObj(request.user?.base_roles);
    if (
      extractRolesObj(request.user?.roles)?.[OrgUserRoles.SUPER_ADMIN] ||
      baseRoles?.[ProjectRoles.OWNER] ||
      baseRoles?.[ProjectRoles.CREATOR] ||
      document.createdBy === request.user?.id
    ) {
      return [
        {
          subjectType: 'owner',
          subjectId: request.user.id,
          permission: 'manage',
          inherited: false,
        },
      ];
    }
    const teamIds =
      (await this.teams?.teamIdsForUser(
        document.workspaceId,
        request.user.id,
      )) ?? [];
    const rows = await this.metaService
      .knexConnection(INTERNAL_DOCUMENT_GRANTS_TABLE)
      .whereIn('document_id', await this.ancestorIds(document))
      .where((q) =>
        q
          .where((b) =>
            b
              .where('subject_type', 'user')
              .where('subject_id', request.user.id),
          )
          .orWhere((b) =>
            b.where('subject_type', 'role').whereIn(
              'subject_id',
              Object.keys(baseRoles ?? {}).filter((r) => baseRoles[r]),
            ),
          )
          .orWhere((b) =>
            b.where('subject_type', 'team').whereIn('subject_id', teamIds),
          ),
      )
      .select('subject_type', 'subject_id', 'permission', 'document_id');
    return rows.map((r) => ({
      subjectType: r.subject_type,
      subjectId: r.subject_id,
      permission: r.permission,
      inherited: r.document_id !== document.id,
    }));
  }

  private async ancestorIds(document: InternalDocumentRecord) {
    const ids = [document.id];
    let parentId = document.parentId;
    const seen = new Set(ids);
    for (let depth = 0; parentId && depth < 100; depth += 1) {
      if (seen.has(parentId)) break;
      seen.add(parentId);
      ids.push(parentId);
      const parent = await this.metaService
        .knexConnection(INTERNAL_DOCUMENTS_TABLE)
        .select('parent_id')
        .where({
          id: parentId,
          workspace_id: document.workspaceId,
          base_id: document.baseId,
        })
        .whereNull('deleted_at')
        .first();
      parentId = parent?.parent_id ?? null;
    }
    return ids;
  }
}
