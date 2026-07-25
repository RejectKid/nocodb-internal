<script setup lang="ts">
definePageMeta({ requiresAuth: true })

const { activeWorkspaceId } = storeToRefs(useWorkspace())
const { activeProjectId } = storeToRefs(useBases())
const router = useRouter()
const workspaceId = computed(() => String(router.currentRoute.value.query.workspaceId || activeWorkspaceId.value || ''))
const baseId = computed(() => String(router.currentRoute.value.query.baseId || activeProjectId.value || ''))
const { capabilities, refresh } = useInternalCapabilities()

onMounted(() => void refresh().catch(() => undefined))
</script>

<template>
  <div class="mx-auto max-w-[1500px] p-6" data-testid="internal-documents-page">
    <div class="mb-5">
      <h1 class="text-2xl font-semibold">Internal documents</h1>
      <p class="mt-1 text-sm text-nc-content-gray-muted">
        Permission-aware documents, comments, snapshots, restore, and PDF export implemented in the independent extension.
      </p>
    </div>
    <NcAlert v-if="!workspaceId || !baseId" type="warning">
      Open a base first, or supply <code>workspaceId</code> and <code>baseId</code> query parameters.
    </NcAlert>
    <NcAlert v-else-if="capabilities && !capabilities.features.documentPermissions" type="warning">
      The document extension is disabled. Set <code>NC_INTERNAL_DOCUMENT_PERMISSIONS=true</code>.
    </NcAlert>
    <InternalExtensionsDocumentsEditor v-else-if="workspaceId && baseId" :workspace-id="workspaceId" :base-id="baseId" />
  </div>
</template>
