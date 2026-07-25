<script setup lang="ts">
import { UITypes, type ColumnType } from 'nocodb-sdk'
import {
  authorizeInternalFilePreview,
  type InternalAttachmentPreview,
} from '~/composables/internalExtensions/useInternalFilePreview'

const props = defineProps<{ rowId?: string | null; fields: ColumnType[]; hideSidebar?: boolean }>()
const expanded = useExpandedFormStoreOrThrow()
const { row } = expanded
const meta = inject(MetaInj, ref())
const { activeWorkspaceId } = storeToRefs(useWorkspace())
const { activeProjectId } = storeToRefs(useBases())
const { api } = useApi({ useGlobalInstance: true })

const selectedIndex = ref(0)
const selectedFieldId = ref('')
const authorizedUrl = ref('')
const isLoading = ref(false)
const error = ref('')

function collect(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) return value.flatMap(collect)
  if (value && typeof value === 'object') return [value as Record<string, any>]
  if (typeof value === 'string') {
    try {
      return collect(JSON.parse(value))
    } catch {
      return []
    }
  }
  return []
}

const attachmentFields = computed(() =>
  props.fields
    .filter((field) => field.uidt === UITypes.Attachment && field.title)
    .map((field) => ({
      id: field.id!,
      title: field.title!,
      attachments: collect((row.value as any)?.row?.[field.title!]).map((attachment) => ({
        ...attachment,
        columnId: field.id!,
      })),
    }))
    .filter((field) => field.attachments.length),
)
const attachments = computed<InternalAttachmentPreview[]>(
  () => attachmentFields.value.find((field) => field.id === selectedFieldId.value)?.attachments ?? [],
)
const selected = computed(() => attachments.value[selectedIndex.value])
const mime = computed(() => String(selected.value?.mimetype || selected.value?.type || '').toLowerCase())
const isImagePreview = computed(() => mime.value.startsWith('image/'))
const isPdfPreview = computed(() => mime.value === 'application/pdf' || selected.value?.title?.toLowerCase().endsWith('.pdf'))
const isTextPreview = computed(() => mime.value.startsWith('text/'))
const isAudioPreview = computed(() => mime.value.startsWith('audio/'))
const isVideoPreview = computed(() => mime.value.startsWith('video/'))

watch(
  attachmentFields,
  (fields) => {
    if (!fields.some((field) => field.id === selectedFieldId.value)) {
      selectedFieldId.value = fields[0]?.id ?? ''
    }
  },
  { immediate: true },
)
watch(selectedFieldId, () => {
  selectedIndex.value = 0
})

async function authorize() {
  const attachment = selected.value
  if (!attachment || !props.rowId || !meta.value?.id) return
  isLoading.value = true
  error.value = ''
  try {
    const result = await authorizeInternalFilePreview(
      api.instance,
      {
        workspaceId: activeWorkspaceId.value || (meta.value as any).fk_workspace_id || '',
        baseId: activeProjectId.value || meta.value.base_id || '',
        modelId: meta.value.id,
        recordId: props.rowId,
      },
      attachment,
    )
    authorizedUrl.value = result.path || result.url || ''
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || 'Unable to authorize this attachment.'
    authorizedUrl.value = ''
  } finally {
    isLoading.value = false
  }
}

watch([selectedIndex, attachments], authorize, { immediate: true })
</script>

<template>
  <div class="flex h-full min-h-0" data-testid="internal-file-preview">
    <div class="flex min-w-0 flex-1 flex-col bg-nc-bg-gray-extralight">
      <div class="flex items-center justify-between border-b-1 border-nc-border-gray-medium p-3">
        <div class="min-w-0">
          <div class="truncate font-medium">{{ selected?.title || selected?.name || 'Attachment' }}</div>
          <div class="text-xs text-nc-content-gray-muted">
            {{ selected ? `${selectedIndex + 1} of ${attachments.length}` : 'No attachments' }}
          </div>
        </div>
        <label v-if="attachmentFields.length > 1" class="mx-4 flex items-center gap-2 text-xs text-nc-content-gray-muted">
          Attachment field
          <select
            v-model="selectedFieldId"
            class="rounded border-1 border-nc-border-gray-medium bg-white px-2 py-1 text-sm text-nc-content-gray"
            data-testid="internal-preview-field"
          >
            <option v-for="field in attachmentFields" :key="field.id" :value="field.id">{{ field.title }}</option>
          </select>
        </label>
        <div class="flex gap-1">
          <NcButton size="xs" type="secondary" :disabled="selectedIndex <= 0" @click="selectedIndex--">Previous</NcButton>
          <NcButton size="xs" type="secondary" :disabled="selectedIndex >= attachments.length - 1" @click="selectedIndex++">
            Next
          </NcButton>
          <a v-if="authorizedUrl" :href="authorizedUrl" download>
            <NcButton size="xs">Download</NcButton>
          </a>
        </div>
      </div>
      <div class="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <GeneralLoader v-if="isLoading" />
        <NcAlert v-else-if="error" type="error">{{ error }}</NcAlert>
        <img
          v-else-if="authorizedUrl && isImagePreview"
          :src="authorizedUrl"
          class="max-h-full max-w-full object-contain"
          alt=""
        />
        <iframe
          v-else-if="authorizedUrl && (isPdfPreview || isTextPreview)"
          :src="authorizedUrl"
          sandbox=""
          class="h-full min-h-[420px] w-full rounded border-1 border-nc-border-gray-medium bg-white"
          title="Authorized attachment preview"
        />
        <audio v-else-if="authorizedUrl && isAudioPreview" :src="authorizedUrl" controls class="w-full max-w-2xl">
          Audio preview is not supported by this browser.
        </audio>
        <video v-else-if="authorizedUrl && isVideoPreview" :src="authorizedUrl" controls class="max-h-full max-w-full bg-black">
          Video preview is not supported by this browser.
        </video>
        <div v-else-if="selected" class="max-w-md text-center text-nc-content-gray-muted">
          <GeneralIcon icon="ncFileText" class="mx-auto h-12 w-12" />
          <p class="mt-3">Inline preview is not available for this file type.</p>
          <p class="mt-1 text-xs">{{ mime || 'Unknown type' }} · {{ selected.size || 0 }} bytes</p>
        </div>
        <div v-else class="text-nc-content-gray-muted">This record has no attachments.</div>
      </div>
      <div v-if="attachments.length > 1" class="flex gap-2 overflow-x-auto border-t-1 border-nc-border-gray-medium p-2">
        <button
          v-for="(attachment, index) in attachments"
          :key="`${attachment.columnId}-${attachment.path || attachment.url || index}`"
          class="w-28 shrink-0 rounded border-1 p-2 text-left"
          :class="index === selectedIndex ? 'border-nc-border-brand bg-nc-bg-brand' : 'border-nc-border-gray-medium bg-white'"
          :aria-current="index === selectedIndex ? 'true' : undefined"
          @click="selectedIndex = index"
        >
          <span class="block truncate text-xs font-medium">{{ attachment.title || attachment.name || `File ${index + 1}` }}</span>
          <span class="mt-1 block truncate text-[10px] text-nc-content-gray-muted">
            {{ attachment.mimetype || attachment.type || 'file' }}
          </span>
        </button>
      </div>
    </div>
    <aside v-if="!hideSidebar" class="w-64 overflow-auto border-l-1 border-nc-border-gray-medium p-3">
      <div class="mb-3 text-xs font-semibold uppercase text-nc-content-gray-muted">Record fields</div>
      <div v-for="field in fields.filter((candidate) => candidate.uidt !== UITypes.Attachment)" :key="field.id" class="mb-3">
        <div class="text-xs text-nc-content-gray-muted">{{ field.title }}</div>
        <div class="break-words text-sm">{{ (row as any)?.row?.[field.title!] ?? '—' }}</div>
      </div>
    </aside>
  </div>
</template>
