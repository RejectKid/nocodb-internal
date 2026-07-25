export enum InternalDocumentPermission {
  DISCOVER = 'discover',
  READ = 'read',
  COMMENT = 'comment',
  EDIT = 'edit',
  MANAGE = 'manage',
  EXPORT = 'export',
}

export const INTERNAL_DOCUMENT_PERMISSIONS = Object.freeze(
  Object.values(InternalDocumentPermission),
);

export type InternalDocumentSubjectType = 'user' | 'role';

export interface InternalDocumentGrantInput {
  subjectType: InternalDocumentSubjectType;
  subjectId: string;
  permission: InternalDocumentPermission;
}

export interface InternalDocumentRecord {
  id: string;
  workspaceId: string;
  baseId: string;
  parentId: string | null;
  title: string;
  content: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  order: number;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}
