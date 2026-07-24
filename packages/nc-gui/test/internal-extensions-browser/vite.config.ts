import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const attempts = new Map<string, number>()

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
              fineGrainedApiTokens: false,
              basePermissions: !scenario.startsWith('capability-off'),
              inputValidation: false,
              documentPermissions: false,
              filePreviewMode: false,
              discussionMode: false,
            },
          })
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
