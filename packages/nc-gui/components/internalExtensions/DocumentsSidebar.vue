<script setup lang="ts">
import { internalDocumentsPath, type InternalDocumentSummary } from '~/composables/internalExtensions/useInternalDocuments'

const { api } = useApi({ useGlobalInstance: true })
const { activeWorkspaceId } = storeToRefs(useWorkspace())
const { capabilities, refresh: refreshCapabilities } = useInternalCapabilities()
const route = useRoute()
const { isMobileMode } = useGlobal()
const { isLeftSidebarOpen } = storeToRefs(useSidebarStore())
function closeMobileSidebar() {
  if (isMobileMode.value) isLeftSidebarOpen.value = false
}
const groups = ref<Array<{ id: string; title: string; documents: InternalDocumentSummary[] }>>([])
const error = ref('')
const loading = ref(false)
let generation = 0
async function refresh() {
  const current = ++generation
  groups.value = []
  error.value = ''
  loading.value = false
  if (!activeWorkspaceId.value || !capabilities.value?.features.documentPermissions) return
  loading.value = true
  try {
    const workspaceId = activeWorkspaceId.value
    const result = await api.base.list()
    const bases = (result.list ?? []).filter((base) => base.fk_workspace_id === workspaceId)
    const next = await Promise.all(
      bases.map(async (base) => {
        try {
          const result = await api.instance.get<InternalDocumentSummary[]>(internalDocumentsPath(workspaceId, base.id!))
          return { id: base.id!, title: base.title || 'Base', documents: result.data }
        } catch (e: any) {
          // Inaccessible bases must not leak titles or stale document summaries.
          if ([403, 404].includes(e?.response?.status)) return null
          throw e
        }
      }),
    )
    if (current === generation) groups.value = next.filter((group): group is NonNullable<typeof group> => !!group)
  } catch {
    if (current === generation) error.value = 'Could not load documents. Retry to refresh.'
  } finally {
    if (current === generation) loading.value = false
  }
}
watch([activeWorkspaceId, () => capabilities.value?.features.documentPermissions, () => route.fullPath], () => void refresh())
onMounted(async () => {
  await refreshCapabilities().catch(() => undefined)
  await refresh()
})
useEventListener(window, 'focus', () => void refresh())
onBeforeUnmount(() => {
  generation++
})
</script>

<template>
  <nav
    v-if="capabilities?.features.documentPermissions"
    aria-label="Workspace documents"
    class="border-t p-2"
    data-testid="workspace-documents-sidebar"
  >
    <div class="mb-1 flex items-center justify-between">
      <NuxtLink to="/internal/documents" class="font-semibold" @click="closeMobileSidebar">Documents</NuxtLink>
      <button type="button" aria-label="Refresh documents" :disabled="loading" @click="refresh">↻</button>
    </div>
    <p v-if="error" role="alert" class="text-xs">{{ error }}</p>
    <p v-else-if="loading" class="text-xs">Loading documents…</p>
    <div v-else class="max-h-56 overflow-y-auto">
      <div v-for="group in groups" :key="group.id" class="mb-2">
        <NuxtLink
          :to="{ path: '/internal/documents', query: { baseId: group.id } }"
          class="block truncate text-xs opacity-70"
          @click="closeMobileSidebar"
        >
          {{ group.title }} · New / import
        </NuxtLink>
        <NuxtLink
          v-for="document in group.documents"
          :key="document.id"
          :to="{ path: '/internal/documents', query: { baseId: group.id, documentId: document.id } }"
          class="block truncate rounded px-2 py-1 text-sm hover:bg-nc-bg-gray-medium"
          :title="document.title"
          @click="closeMobileSidebar"
        >
          {{ document.parentId ? '↳ ' : '' }}{{ document.title }}
        </NuxtLink>
      </div>
      <p v-if="!groups.some((group) => group.documents.length)" class="text-xs opacity-70">
        No visible documents in this workspace.
      </p>
    </div>
  </nav>
</template>
