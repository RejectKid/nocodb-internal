<script setup lang="ts">
definePageMeta({ requiresAuth: true, hasSidebar: true, hideHeader: true })

const { api } = useApi({ useGlobalInstance: true })
const router = useRouter()
const { isMobileMode } = useGlobal()
const { isLeftSidebarOpen } = storeToRefs(useSidebarStore())
const choices = ref<Array<{ id: string; title: string; fk_workspace_id?: string }>>([])
const baseId = ref(String(router.currentRoute.value.query.baseId || ''))
const error = ref('')
const base = computed(() => choices.value.find((item) => item.id === baseId.value))
const workspaceId = computed(() => base.value?.fk_workspace_id || '')
const { capabilities, isLoading, refresh } = useInternalCapabilities()

onMounted(async () => {
  try {
    await refresh()
    if (!capabilities.value?.features.documentPermissions) return
    const result = await api.base.list()
    choices.value = (result.list ?? []) as typeof choices.value
    if (!baseId.value && choices.value.length === 1) baseId.value = choices.value[0]!.id
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Unable to load documents. Check your login and enabled internal features.'
  }
})
watch(
  () => router.currentRoute.value.query.baseId,
  (value) => {
    baseId.value = String(value || '')
  },
)
watch(baseId, (value) => {
  if (value !== String(router.currentRoute.value.query.baseId || '')) void router.replace({ query: { baseId: value } })
})
</script>

<template>
  <NuxtLayout name="dashboard">
    <template #sidebar><DashboardHomeSidebar /></template>
    <template #content>
      <div class="h-full overflow-auto">
        <div class="mx-auto max-w-[1500px] p-6" data-testid="internal-documents-page">
          <NcButton
            v-if="isMobileMode"
            size="small"
            aria-label="Open workspace navigation"
            class="mb-3"
            @click="isLeftSidebarOpen = true"
          >
            Documents navigation
          </NcButton>
          <NuxtLink to="/">Back to workspace</NuxtLink>
          <div class="mb-5">
            <h1 class="text-2xl font-semibold">Internal documents</h1>
            <p class="mt-1 text-sm text-nc-content-gray-muted">
              Permission-aware documents, comments, snapshots, restore, and PDF export implemented in the independent extension.
            </p>
          </div>
          <NcAlert v-if="error" type="error">{{ error }}</NcAlert>
          <div v-if="isLoading">Loading capabilities…</div>
          <NcAlert v-else-if="capabilities && !capabilities.features.documentPermissions" type="warning">
            The document extension is disabled. Set <code>NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED=true</code>.
          </NcAlert>
          <template v-else-if="capabilities?.features.documentPermissions">
            <label class="my-4 block">
              Base
              <select v-model="baseId" aria-label="Document base" class="ml-3 rounded border p-2">
                <option value="">Select a base</option>
                <option v-for="item in choices" :key="item.id" :value="item.id">{{ item.title }}</option>
              </select>
            </label>
            <p v-if="!choices.length && !error">No accessible bases. Create a base in your workspace first.</p>
            <InternalExtensionsDocumentsEditor
              v-if="base && workspaceId"
              :key="base.id"
              :workspace-id="workspaceId"
              :base-id="base.id"
              :document-id="String(router.currentRoute.value.query.documentId || '')"
            />
          </template>
        </div>
      </div>
    </template>
  </NuxtLayout>
</template>
