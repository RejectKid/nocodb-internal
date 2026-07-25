import { InternalOpenApiService } from './internal-openapi.service';

describe('InternalOpenApiService', () => {
  it('publishes a separate authenticated v1 contract', () => {
    const contract = new InternalOpenApiService().generate() as any;
    expect(contract.openapi).toBe('3.1.0');
    expect(contract.info.title).toContain('Internal Extensions');
    expect(
      contract.paths['/api/internal/v1/capabilities'].get.security,
    ).toEqual(expect.any(Array));
    expect(
      contract.paths[
        '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents'
      ],
    ).toEqual(
      expect.objectContaining({
        get: expect.any(Object),
        post: expect.any(Object),
      }),
    );
    expect(JSON.stringify(contract)).not.toContain('/api/v2/meta/licenses');
  });
});
