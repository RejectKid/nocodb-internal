import { Injectable } from '@nestjs/common';
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
  constructor(private readonly metaService: MetaService) {}

  async effective(
    document: InternalDocumentRecord,
    request: NcRequest,
  ): Promise<Set<InternalDocumentPermission>> {
    const roles = extractRolesObj(request.user?.roles);
    const baseRoles = extractRolesObj(request.user?.base_roles);
    if (
      roles?.[OrgUserRoles.SUPER_ADMIN] ||
      baseRoles?.[ProjectRoles.OWNER] ||
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
