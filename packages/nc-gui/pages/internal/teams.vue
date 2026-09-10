<script setup lang="ts">
import { fetchInternalTeams, internalTeamsPath, type InternalTeam } from '~/composables/internalExtensions/useInternalTeams'
definePageMeta({ requiresAuth: true })
const { api } = useApi({ useGlobalInstance: true })
const route = useRoute()
const workspaceId = ref(String(route.query.workspaceId || ''))
const workspaceIds = ref<string[]>([])
const teams = ref<InternalTeam[]>([])
const members = ref<Array<{ id: string; email: string }>>([])
const canManage = ref(false)
const selected = ref<InternalTeam>()
const name = ref('')
const newName = ref('')
const selectedMembers = ref<string[]>([])
const error = ref('')
const busy = ref(false)
const { capabilities, refresh } = useInternalCapabilities()

async function run(action: () => Promise<unknown>) {
  error.value = ''
  busy.value = true
  try {
    await action()
  } catch (e: any) {
    error.value = e?.response?.data?.message || e.message || 'Request failed'
  } finally {
    busy.value = false
  }
}
function select(team: InternalTeam) {
  selected.value = team
  name.value = team.name
  selectedMembers.value = [...team.memberIds]
}
async function load() {
  selected.value = undefined
  teams.value = []
  canManage.value = false
  if (!workspaceId.value) return
  teams.value = await fetchInternalTeams(api.instance, workspaceId.value)
  try {
    const result = await api.instance.get(`/api/internal/v1/workspaces/${encodeURIComponent(workspaceId.value)}/members`)
    members.value = result.data.list ?? []
    canManage.value = true
  } catch {
    members.value = []
  }
}
async function create() {
  await run(async () => {
    const result = await api.instance.post<InternalTeam>(internalTeamsPath(workspaceId.value), { name: newName.value })
    await load()
    select(result.data)
    newName.value = ''
  })
}
async function save(archived = false) {
  if (!selected.value) return
  const team = selected.value
  await run(async () => {
    await api.instance.patch(`${internalTeamsPath(workspaceId.value)}/${encodeURIComponent(team.id)}`, {
      name: name.value,
      memberIds: selectedMembers.value,
      expectedRevision: team.revision,
      ...(archived ? { archived: true } : {}),
    })
    await load()
    const updated = teams.value.find((t) => t.id === team.id)
    if (updated) select(updated)
  })
}
watch(workspaceId, () => void run(load))
onMounted(() =>
  run(async () => {
    await refresh()
    if (!capabilities.value?.features.teams) return
    const result = await api.base.list()
    workspaceIds.value = [...new Set((result.list ?? []).map((base) => base.fk_workspace_id).filter(Boolean))] as string[]
    if (!workspaceId.value) workspaceId.value = workspaceIds.value[0] ?? ''
    else await load()
  }),
)
</script>

<template>
  <main class="mx-auto max-w-5xl p-6" data-testid="internal-teams-page">
    <NuxtLink to="/">Back to workspace</NuxtLink>
    <h1 class="my-4 text-2xl font-semibold">Internal teams</h1>
    <p>Group existing workspace members for internal base and document permissions.</p>
    <NcAlert v-if="error" type="error" class="my-3">{{ error }}</NcAlert>
    <NcAlert v-if="capabilities && !capabilities.features.teams" type="warning"
      >Enable NC_INTERNAL_TEAMS_ENABLED on the server to use teams.</NcAlert
    >
    <template v-if="capabilities?.features.teams">
      <label class="my-4 block"
        >Workspace
        <select v-model="workspaceId" aria-label="Team workspace" class="ml-3 rounded border p-2" :disabled="busy">
          <option value="">Select a workspace</option>
          <option v-for="id in workspaceIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </label>
      <p v-if="!workspaceIds.length">Create or join a base first, then reload this page.</p>
      <div v-if="canManage" class="my-4 flex flex-wrap gap-2">
        <input
          v-model="newName"
          aria-label="New team name"
          placeholder="New team name"
          maxlength="128"
          class="rounded border p-2"
        />
        <NcButton :disabled="busy || !newName.trim()" @click="create">Create team</NcButton>
      </div>
      <div class="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside>
          <button
            v-for="team in teams"
            :key="team.id"
            class="mb-2 block w-full rounded border p-3 text-left"
            :disabled="busy"
            @click="select(team)"
          >
            {{ team.name }} <span class="block text-xs">{{ team.memberIds.length }} members</span>
          </button>
        </aside>
        <section v-if="selected" class="rounded border p-4">
          <p class="mb-3 text-xs">
            Team ID: <code>{{ selected.id }}</code>
          </p>
          <input
            v-model="name"
            aria-label="Team name"
            maxlength="128"
            :disabled="!canManage || busy"
            class="mb-3 w-full rounded border p-2"
          />
          <fieldset v-if="canManage" :disabled="busy">
            <legend class="font-semibold">Workspace members</legend>
            <label v-for="member in members" :key="member.id" class="my-2 block break-all">
              <input v-model="selectedMembers" type="checkbox" :value="member.id" /> {{ member.email || member.id }}
            </label>
          </fieldset>
          <p v-else>Only workspace managers can change membership.</p>
          <div v-if="canManage" class="mt-4 flex flex-wrap gap-3">
            <NcButton :disabled="busy" @click="save()">Save team</NcButton>
            <NcButton :disabled="busy" type="danger" @click="save(true)">Archive team and revoke team access</NcButton>
          </div>
          <p class="mt-4 text-sm">
            Assign this team in Base settings → Internal permissions or a document's Permissions tab. Membership alone does not
            grant Community base access.
          </p>
        </section>
      </div>
    </template>
  </main>
</template>
