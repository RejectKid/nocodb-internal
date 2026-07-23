<script lang="ts" setup>
import { INTERNAL_CAPABILITY_KEYS, type InternalCapabilityKey } from '~/composables/internalExtensions/useInternalCapabilities'

definePageMeta({
  hideHeader: true,
})

const labels: Record<InternalCapabilityKey, string> = {
  internalAdmin: 'Internal administration',
  fineGrainedApiTokens: 'Fine-grained API tokens',
  basePermissions: 'Base permissions',
  inputValidation: 'Input validation',
  documentPermissions: 'Document permissions',
  filePreviewMode: 'File preview mode',
  discussionMode: 'Discussion mode',
}

const { capabilities, error, isLoading, refresh } = useInternalCapabilities()

onMounted(() => {
  refresh().catch(() => undefined)
})
</script>

<template>
  <NuxtLayout name="empty">
    <main class="mx-auto max-w-3xl p-8">
      <div class="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-nc-content-gray-emphasis">Internal capabilities</h1>
          <p class="mt-1 text-sm text-nc-content-gray-muted">
            Independently implemented features enabled for this self-hosted instance.
          </p>
        </div>

        <NcButton type="secondary" :loading="isLoading" @click="refresh">Refresh</NcButton>
      </div>

      <NcAlert v-if="error" type="error" class="mb-4"> Unable to load internal capabilities. </NcAlert>

      <div v-if="capabilities" class="rounded-lg border-1 border-nc-border-gray-medium bg-nc-bg-default">
        <div
          v-for="key in INTERNAL_CAPABILITY_KEYS"
          :key="key"
          class="flex items-center justify-between border-b-1 border-nc-border-gray-medium px-5 py-4 last:border-b-0"
        >
          <span class="font-medium text-nc-content-gray-emphasis">{{ labels[key] }}</span>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            :class="
              capabilities.features[key]
                ? 'bg-nc-bg-green-light text-nc-content-green-dark'
                : 'bg-nc-bg-gray-medium text-nc-content-gray-muted'
            "
          >
            {{ capabilities.features[key] ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>

      <div v-else-if="isLoading" class="py-12 text-center text-nc-content-gray-muted">Loading capabilities…</div>

      <p v-if="capabilities" class="mt-3 text-xs text-nc-content-gray-muted">
        Internal schema version {{ capabilities.schemaVersion }}
      </p>
    </main>
  </NuxtLayout>
</template>
