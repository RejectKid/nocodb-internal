jest.mock('~/meta/meta.service', () => ({ MetaService: class {} }));
jest.mock('../audit/internal-audit.service', () => ({
  InternalAuditService: class {},
}));
jest.mock('../audit/internal-audit-request-context.adapter', () => ({
  InternalAuditRequestContextAdapter: class {},
}));
import knex, { type Knex } from 'knex';
import { InternalDocumentService } from './internal-document.service';
import { InternalDocumentPermissionService } from './internal-document-permission.service';
import {
  up,
  INTERNAL_DOCUMENTS_TABLE,
  INTERNAL_DOCUMENT_GRANTS_TABLE,
} from '../migrations/nc_internal_004_product_suite';

describe('portable document export authorization', () => {
  let db: Knex;
  let service: InternalDocumentService;
  const request = {
    user: { id: 'reader', roles: {}, base_roles: { viewer: true } },
  } as any;
  beforeEach(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await up(db);
    const meta = { knexConnection: db } as any;
    service = new InternalDocumentService(
      meta,
      new InternalDocumentPermissionService(meta),
      {} as any,
      {} as any,
      {} as any,
    );
    await db(INTERNAL_DOCUMENTS_TABLE).insert({
      id: 'doc',
      workspace_id: 'workspace',
      base_id: 'base',
      title: 'Private notes',
      content: JSON.stringify({ type: 'doc', content: [] }),
      created_by: 'owner',
      updated_by: 'owner',
    });
  });
  afterEach(async () => db.destroy());
  async function grant(permission: string) {
    await db(INTERNAL_DOCUMENT_GRANTS_TABLE).insert({
      id: permission,
      document_id: 'doc',
      subject_type: 'user',
      subject_id: 'reader',
      permission,
      created_by: 'owner',
    });
  }
  it('does not treat read permission as export permission', async () => {
    await grant('read');
    await expect(
      service.exportJson('workspace', 'base', 'doc', request),
    ).rejects.toThrow('Document not found');
  });
  it('exports only portable content and rejects cross-tenant requests', async () => {
    await grant('export');
    await expect(
      service.exportJson('workspace', 'base', 'doc', request),
    ).resolves.toEqual({
      format: 'nc-internal-document',
      version: 1,
      title: 'Private notes',
      content: { type: 'doc', content: [] },
    });
    await expect(
      service.exportJson('other', 'base', 'doc', request),
    ).rejects.toThrow('Document not found');
    await expect(
      service.exportJson('workspace', 'other', 'doc', request),
    ).rejects.toThrow('Document not found');
  });
});
