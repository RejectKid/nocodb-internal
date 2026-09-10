<script setup lang="ts">
import {
  fetchInternalAdminCollection,
  fetchInternalAdminOverview,
  setInternalUserEnabled,
  setInternalBaseFeature,
  type InternalAdminOverview,
} from '~/composables/internalExtensions/useInternalAdmin'

definePageMeta({ hideHeader: true, requiresAuth: true })

const { api } = useApi({ useGlobalInstance: true })
const overview = ref<InternalAdminOverview>()
const users = ref<any[]>([])
const workspaces = ref<any[]>([])
const bases = ref<any[]>([])
const activeTab = ref('overview')
const query = ref('')
const isLoading = ref(false)
const error = ref('')
const userDetails = ref<any>()

async function showUser(id: string) {
  try {
    userDetails.value = (await api.instance.get(`/api/internal/v1/admin/users/${encodeURIComponent(id)}`)).data
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to load user details.'
  }
}

async function toggleDocuments(base: any) {
  const setting = base.featureSettings.find((item: any) => item.featureKey === 'documentPermissions')
  try {
    await setInternalBaseFeature(
      api.instance,
      base.workspaceId,
      base.id,
      'documentPermissions',
      !(setting?.enabled ?? true),
      setting?.revision,
    )
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to update document availability.'
  }
}

async function load() {
  isLoading.value = true
  error.value = ''
  try {
    const [overviewResult, usersResult, workspaceResult, baseResult] = await Promise.all([
      fetchInternalAdminOverview(api.instance),
      fetchInternalAdminCollection<any>(api.instance, 'users', query.value),
      fetchInternalAdminCollection<any>(api.instance, 'workspaces', query.value),
      fetchInternalAdminCollection<any>(api.instance, 'bases', query.value),
    ])
    overview.value = overviewResult
    users.value = usersResult.list
    workspaces.value = workspaceResult.list
    bases.value = baseResult.list
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || 'Unable to load internal administration.'
  } finally {
    isLoading.value = false
  }
}

async function toggleUser(user: any) {
  try {
    await setInternalUserEnabled(api.instance, user.id, Boolean(user.blocked))
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to update user status.'
  }
}

onMounted(load)
</script>

<template>
  <NuxtLayout name="empty">
    <main class="mx-auto max-w-6xl p-8" data-testid="internal-admin-page">
      <nav class="mb-4 flex flex-wrap gap-4">
        <NuxtLink to="/">Back to workspace</NuxtLink>
        <NuxtLink to="/account/users">Instance users and invitations</NuxtLink>
        <NuxtLink to="/account/setup">Email and integrations setup</NuxtLink>
        <NuxtLink to="/internal/documents">Documents</NuxtLink>
      </nav>
      <div class="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-nc-content-gray-emphasis">Internal administration</h1>
          <p class="mt-1 text-sm text-nc-content-gray-muted">
            Redacted operational health, users, workspaces, bases, and internal feature state.
          </p>
        </div>
        <NcButton :loading="isLoading" @click="load">Refresh</NcButton>
      </div>

      <NcAlert v-if="error" type="error" class="mb-4">{{ error }}</NcAlert>
      <section v-if="userDetails" class="mb-4 rounded border p-4">
        <h2>{{ userDetails.email }}</h2>
        <NcButton size="small" @click="userDetails = undefined">Close details</NcButton>
        <h3 class="mt-3 font-semibold">Workspace memberships</h3>
        <p v-for="membership in userDetails.workspaceMemberships" :key="membership.workspaceId">
          {{ membership.workspaceId }} — {{ membership.roles }}
        </p>
        <h3 class="mt-3 font-semibold">Base memberships</h3>
        <p v-for="membership in userDetails.baseMemberships" :key="membership.baseId">
          {{ membership.baseId }} — {{ membership.roles }}
        </p>
        <h3 class="mt-3 font-semibold">Recent security events</h3>
        <p v-for="event in userDetails.recentSecurityEvents" :key="event.id">{{ event.occurred_at }} — {{ event.action }}</p>
      </section>

      <div class="mb-5 flex gap-2 border-b-1 border-nc-border-gray-medium">
        <button
          v-for="tab in ['overview', 'users', 'workspaces', 'bases']"
          :key="tab"
          class="px-3 py-2 capitalize"
          :class="activeTab === tab ? 'border-b-2 border-nc-content-brand text-nc-content-brand' : 'text-nc-content-gray-muted'"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <template v-if="activeTab === 'overview' && overview">
        <div class="grid gap-4 sm:grid-cols-3">
          <div
            v-for="(value, label) in overview.counts"
            :key="label"
            class="rounded-lg border-1 border-nc-border-gray-medium bg-nc-bg-default p-5"
          >
            <div class="text-xs uppercase text-nc-content-gray-muted">{{ label }}</div>
            <div class="mt-2 text-3xl font-bold">{{ value }}</div>
          </div>
        </div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="rounded-lg border-1 border-nc-border-gray-medium p-5">
            <h2 class="font-semibold">Runtime</h2>
            <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt>Application</dt>
              <dd>{{ overview.applicationVersion }}</dd>
              <dt>Internal suite</dt>
              <dd>{{ overview.internalExtensionVersion }}</dd>
              <dt>Node</dt>
              <dd>{{ overview.nodeVersion }}</dd>
              <dt>Database</dt>
              <dd>{{ overview.database.status }} ({{ overview.database.latencyMs }} ms)</dd>
              <dt>Queue</dt>
              <dd>{{ overview.queue.status }}</dd>
              <dt>Storage</dt>
              <dd>{{ overview.storage.provider }}</dd>
              <dt>Email</dt>
              <dd>{{ overview.email.configured ? 'configured' : 'not configured' }}</dd>
            </dl>
          </div>
          <div class="rounded-lg border-1 border-nc-border-gray-medium p-5">
            <h2 class="font-semibold">Internal features</h2>
            <div v-for="(enabled, feature) in overview.features" :key="feature" class="mt-2 flex justify-between text-sm">
              <span>{{ feature }}</span>
              <span :class="enabled ? 'text-nc-content-green' : 'text-nc-content-gray-muted'">
                {{ enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="mb-4 flex gap-2">
          <a-input v-model:value="query" placeholder="Search" class="max-w-sm" @press-enter="load" />
          <NcButton @click="load">Search</NcButton>
        </div>

        <div v-if="activeTab === 'users'" class="overflow-hidden rounded-lg border-1 border-nc-border-gray-medium">
          <div
            v-for="user in users"
            :key="user.id"
            class="flex items-center justify-between border-b-1 border-nc-border-gray-medium p-4 last:border-b-0"
          >
            <div>
              <div class="font-medium">{{ user.display_name || user.email }}</div>
              <NcButton size="small" @click="showUser(user.id)">Inspect user</NcButton>
              <div class="text-xs text-nc-content-gray-muted">{{ user.email }} · {{ user.roles }}</div>
            </div>
            <NcButton
              size="small"
              :type="user.blocked ? 'primary' : 'secondary'"
              :data-testid="`internal-user-status-${user.id}`"
              @click="toggleUser(user)"
            >
              {{ user.blocked ? 'Re-enable' : 'Disable' }}
            </NcButton>
          </div>
        </div>

        <div v-else-if="activeTab === 'workspaces'" class="overflow-hidden rounded-lg border-1 border-nc-border-gray-medium">
          <div v-for="workspace in workspaces" :key="workspace.id" class="border-b-1 p-4 last:border-b-0">
            <div class="font-medium">{{ workspace.title }}</div>
            <NuxtLink :to="`/${workspace.id}`">Open workspace</NuxtLink>
            <div class="text-xs text-nc-content-gray-muted">
              {{ workspace.memberCount }} members · {{ workspace.baseCount }} bases · owner
              {{ workspace.ownerId || 'unassigned' }}
            </div>
          </div>
        </div>

        <div v-else class="overflow-hidden rounded-lg border-1 border-nc-border-gray-medium">
          <div v-for="base in bases" :key="base.id" class="border-b-1 p-4 last:border-b-0">
            <div class="flex items-center gap-2 font-medium">
              {{ base.title }}
              <span v-if="base.orphaned" class="rounded bg-nc-bg-red-light px-2 py-0.5 text-xs text-nc-content-red"
                >Orphaned</span
              >
            </div>
            <div class="text-xs text-nc-content-gray-muted">
              {{ base.memberCount }} members · workspace {{ base.workspaceId }}
            </div>
            <div class="mt-2 flex gap-3">
              <NuxtLink :to="{ path: '/internal/documents', query: { baseId: base.id } }">Open documents</NuxtLink>
              <NcButton size="small" @click="toggleDocuments(base)">
                {{
                  base.featureSettings.find((item: any) => item.featureKey === 'documentPermissions')?.enabled === false
                    ? 'Enable documents'
                    : 'Disable documents'
                }}
              </NcButton>
            </div>
          </div>
        </div>
      </template>
    </main>
  </NuxtLayout>
</template>
