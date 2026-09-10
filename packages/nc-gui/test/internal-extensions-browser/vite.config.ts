import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const attempts = new Map<string, number>()
const tokenState = new Map<string, Array<Record<string, unknown>>>()

function json(response: import('node:http').ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify(body))
}

function permissionState(revision = 'editor-revision') {
  return {
    configuration: {
      enabled: true,
      updated_at: '2026-07-24T12:00:00.000Z',
    },
    grants: [],
    grantSets: [
      {
        subjectType: 'role',
        subjectId: 'editor',
        assignments: [{ permission: 'records:read', effect: 'allow' }],
        revision,
      },
    ],
    emptyGrantRevision: 'empty-revision',
    catalog: ['base:manage_members', 'records:read'],
    currentActorEffectivePermissions: [
      {
        permission: 'base:manage_members',
        allowed: true,
        mode: 'internal',
        source: 'role',
      },
    ],
  }
}

function internalApi(): Plugin {
  return {
    name: 'internal-extension-browser-api',
    configureServer(server) {
      server.middlewares.use('/api/internal/v1', (request, response) => {
        const scenario = String(request.headers['x-internal-browser-scenario'] ?? 'authorized')
        const path = request.url ?? ''

        if (path === '/capabilities') {
          return json(response, 200, {
            schemaVersion: 1,
            features: {
              internalAdmin: false,
              fineGrainedApiTokens: !scenario.startsWith('token-capability-off'),
              basePermissions: !scenario.startsWith('capability-off'),
              inputValidation: false,
              documentPermissions: false,
              filePreviewMode: false,
              discussionMode: false,
              teams: false,
            },
          })
        }

        if (path.includes('/tokens')) {
          if (scenario.startsWith('token-unauthorized')) {
            return json(response, 403, { message: 'Internal token administration denied' })
          }
          const tokens = tokenState.get(scenario) ?? [
            {
              id: 'token-existing',
              user_id: 'user-1',
              display_name: 'Existing token',
              token_prefix: 'nci_existing001',
              created_at: '2026-07-24T12:00:00.000Z',
              expires_at: null,
              last_used_at: null,
              disabled_at: null,
              revoked_at: null,
              allowed_workspace_ids: ['workspace-1'],
              allowed_base_ids: ['base-1'],
              scopes: ['data:read'],
            },
          ]
          tokenState.set(scenario, tokens)
          if (request.method === 'GET') {
            return json(response, 200, {
              tokens,
              scopeCatalog: [
                { scope: 'data:read', family: 'data', label: 'Read records', mutation: false },
                { scope: 'data:update', family: 'data', label: 'Update records', mutation: true },
              ],
              boundary: { workspaceId: 'workspace-1', baseId: 'base-1' },
            })
          }
          if (request.method === 'DELETE') {
            const tokenId = path.split('/').at(-1)
            const token = tokens.find(({ id }) => id === tokenId)
            if (token) token.revoked_at = '2026-07-24T13:00:00.000Z'
            return json(response, 200, token)
          }
          if (request.method === 'PATCH') {
            const segments = path.split('/')
            const statusMutation = segments.at(-1) === 'status'
            const tokenId = statusMutation ? segments.at(-2) : segments.at(-1)
            const token = tokens.find(({ id }) => id === tokenId)
            if (token) {
              if (statusMutation) {
                token.disabled_at = token.disabled_at ? null : '2026-07-24T13:00:00.000Z'
              } else {
                token.display_name = 'Renamed token'
                token.scopes = ['data:update']
              }
            }
            return json(response, 200, token)
          }
          if (request.method === 'POST') {
            const created = {
              id: 'token-created',
              user_id: 'user-1',
              display_name: 'Browser automation',
              token_prefix: 'nci_created001',
              created_at: '2026-07-24T12:30:00.000Z',
              expires_at: null,
              last_used_at: null,
              disabled_at: null,
              revoked_at: null,
              allowed_workspace_ids: ['workspace-1'],
              allowed_base_ids: ['base-1'],
              scopes: ['data:read'],
            }
            tokens.unshift(created)
            return json(response, 201, {
              token: created,
              value: 'nci_created001_shown-once-secret',
            })
          }
        }

        if (!path.includes('/permissions')) return json(response, 404, { message: 'Not found' })
        if (scenario.startsWith('unauthorized')) {
          return json(response, 403, { message: 'Base permission administration denied' })
        }

        const attempt = attempts.get(scenario) ?? 0
        if (request.method === 'GET') {
          return json(response, 200, permissionState(attempt ? 'reloaded-revision' : 'editor-revision'))
        }
        if (scenario.startsWith('stale') && attempt === 0) {
          attempts.set(scenario, 1)
          return json(response, 409, { message: 'Base permission assignments changed; reload and retry' })
        }
        return json(response, 200, [])
      })
    },
  }
}

function stripApplicationStyles(): Plugin {
  return {
    name: 'internal-extension-browser-strip-application-styles',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('.vue')) return
      return source.replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '')
    },
  }
}

export default defineConfig({
  root: resolve(__dirname, 'harness'),
  plugins: [stripApplicationStyles(), vue(), internalApi()],
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  resolve: {
    alias: [
      {
        find: 'nocodb-sdk',
        replacement: resolve(__dirname, 'harness/nocodb-sdk.ts'),
      },
      {
        find: '~',
        replacement: resolve(__dirname, '../..'),
      },
    ],
  },
  server: {
    port: 4187,
    strictPort: true,
  },
})
