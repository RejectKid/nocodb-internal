import { Injectable } from '@nestjs/common';
import { INTERNAL_EXTENSION_VERSION } from '../internal-extension.constants';

const authenticated = [{ sessionCookie: [] }, { internalApiToken: [] }];
const response = (description: string, schema?: Record<string, unknown>) => ({
  description,
  ...(schema
    ? {
        content: {
          'application/json': { schema },
        },
      }
    : {}),
});

@Injectable()
export class InternalOpenApiService {
  generate() {
    const paths: Record<string, unknown> = {
      '/api/internal/v1/capabilities': {
        get: this.operation('Read internal capabilities', 'admin:read'),
      },
      '/api/internal/v1/openapi.json': {
        get: this.operation('Read this OpenAPI contract', 'admin:read'),
      },
      '/api/internal/v1/admin/overview': {
        get: this.operation('Read the instance overview', 'admin:read'),
      },
      '/api/internal/v1/admin/users': {
        get: this.operation('Search users', 'admin:read'),
      },
      '/api/internal/v1/admin/users/{userId}': {
        get: this.operation('Read a user administration record', 'admin:read'),
      },
      '/api/internal/v1/admin/users/{userId}/status': {
        patch: this.operation('Disable or re-enable a user', 'admin:write'),
      },
      '/api/internal/v1/admin/workspaces': {
        get: this.operation('Search workspaces', 'admin:read'),
      },
      '/api/internal/v1/admin/bases': {
        get: this.operation('Search bases', 'admin:read'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/members': {
        get: this.operation('List workspace members', 'members:read'),
        post: this.operation('Invite workspace members', 'members:write'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/members/{userId}': {
        patch: this.operation('Change a workspace member', 'members:write'),
        delete: this.operation('Remove a workspace member', 'members:write'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/members': {
        get: this.operation('List base members', 'members:read'),
        post: this.operation('Invite base members', 'members:write'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/members/{userId}':
        {
          patch: this.operation('Change a base member', 'members:write'),
          delete: this.operation('Remove a base member', 'members:write'),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/tokens': {
        get: this.operation('List fine-grained tokens', 'tokens:read'),
        post: this.operation('Create a fine-grained token', 'tokens:write'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/tokens/{tokenId}':
        {
          patch: this.operation('Update a fine-grained token', 'tokens:write'),
          delete: this.operation('Revoke a fine-grained token', 'tokens:write'),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/tokens/{tokenId}/status':
        {
          patch: this.operation(
            'Disable or re-enable a fine-grained token',
            'tokens:write',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/permissions': {
        get: this.operation('Read base permissions', 'admin:read'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/models/{modelId}/validation-rules':
        {
          get: this.operation('List field validation rules', 'schema:read'),
          put: this.operation(
            'Replace field validation rules',
            'schema:update',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/models/{modelId}/views':
        {
          get: this.operation('List Community-compatible views', 'views:read'),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/models/{modelId}/views/{type}':
        {
          post: this.operation(
            'Create a Community-compatible view',
            'views:write',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/models/{modelId}/records/{recordId}/discussion':
        {
          get: this.operation('List record discussion comments', 'data:read'),
          post: this.operation(
            'Create a record discussion comment',
            'data:update',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/models/{modelId}/records/{recordId}/discussion/{commentId}':
        {
          patch: this.operation(
            'Edit a record discussion comment',
            'data:update',
          ),
          delete: this.operation(
            'Delete a record discussion comment',
            'data:update',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/models/{modelId}/records/{recordId}/discussion/{commentId}/resolution':
        {
          patch: this.operation(
            'Resolve or reopen a record discussion thread',
            'data:update',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents': {
        get: this.operation('List discoverable documents', 'documents:read'),
        post: this.operation('Create a document', 'documents:write'),
      },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}':
        {
          get: this.operation('Read a document', 'documents:read'),
          patch: this.operation('Update a document', 'documents:write'),
          delete: this.operation('Delete a document tree', 'documents:write'),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/permissions':
        {
          get: this.operation('List document permissions', 'documents:read'),
          put: this.operation(
            'Replace document permissions',
            'documents:write',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/revisions':
        {
          get: this.operation('List document revisions', 'documents:read'),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/revisions/{revisionId}/restore':
        {
          post: this.operation(
            'Restore a document revision',
            'documents:write',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/comments':
        {
          get: this.operation('List document comments', 'documents:read'),
          post: this.operation('Create a document comment', 'documents:write'),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/comments/{commentId}':
        {
          patch: this.operation('Edit a document comment', 'documents:write'),
          delete: this.operation(
            'Delete a document comment',
            'documents:write',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/comments/{commentId}/resolution':
        {
          patch: this.operation(
            'Resolve or reopen a document comment thread',
            'documents:write',
          ),
        },
      '/api/internal/v1/workspaces/{workspaceId}/bases/{baseId}/documents/{documentId}/export.pdf':
        {
          get: {
            ...this.operation(
              'Export an authorized document as PDF',
              'documents:read',
            ),
            responses: {
              '200': {
                description: 'PDF document',
                content: {
                  'application/pdf': {
                    schema: { type: 'string', format: 'binary' },
                  },
                },
              },
              ...this.errorResponses(),
            },
          },
        },
      '/api/internal/v1/notifications': {
        get: this.operation('List mention notifications', 'admin:read'),
      },
    };
    return {
      openapi: '3.1.0',
      info: {
        title: 'NocoDB Internal Extensions API',
        version: INTERNAL_EXTENSION_VERSION,
        description:
          'Independent organizational extensions. This contract is not connected to NocoDB commercial entitlements.',
      },
      servers: [{ url: '/' }],
      security: authenticated,
      paths,
      components: {
        securitySchemes: {
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'connect.sid',
          },
          internalApiToken: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'nci_ token',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            required: ['statusCode', 'message'],
            properties: {
              statusCode: { type: 'integer' },
              message: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } },
                ],
              },
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
          PageInfo: {
            type: 'object',
            required: ['limit', 'offset', 'total'],
            properties: {
              limit: { type: 'integer', minimum: 1, maximum: 100 },
              offset: { type: 'integer', minimum: 0 },
              total: { type: 'integer', minimum: 0 },
            },
          },
        },
      },
    };
  }

  private operation(summary: string, scope: string) {
    return {
      summary,
      'x-internal-token-scope': scope,
      security: authenticated,
      responses: {
        '200': response('Success'),
        ...this.errorResponses(),
      },
    };
  }

  private errorResponses() {
    const error = {
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
        },
      },
    };
    return {
      '400': { description: 'Invalid request', ...error },
      '401': { description: 'Authentication required', ...error },
      '403': { description: 'Authorization denied', ...error },
      '404': {
        description: 'Resource not found or feature disabled',
        ...error,
      },
      '409': { description: 'Optimistic concurrency conflict', ...error },
      '422': { description: 'Validation failed', ...error },
      '429': { description: 'Rate limited', ...error },
    };
  }
}
