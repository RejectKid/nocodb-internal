<script setup lang="ts">
import { parseInternalDocumentImport } from '~/helpers/internalDocumentImport'
import { fetchInternalTeams, type InternalTeam } from '~/composables/internalExtensions/useInternalTeams'
import {
  documentContentToText,
  type InternalDocumentGrant,
  type InternalDocumentPermission,
  useInternalDocuments,
} from '~/composables/internalExtensions/useInternalDocuments'

const props = defineProps<{ workspaceId: string; baseId: string; documentId?: string }>()
const workspaceId = toRef(props, 'workspaceId')
const baseId = toRef(props, 'baseId')
// Community rich-text editor expects base metadata even outside record cells.
provide(MetaInj, computed(() => ({ base_id: props.baseId })) as any)
const {
  documents,
  activeDocument,
  comments,
  revisions,
  grants,
  isLoading,
  refresh,
  open,
  create,
  save,
  remove,
  createComment,
  resolveComment,
  restore,
  replaceGrants,
  download,
} = useInternalDocuments(workspaceId, baseId)

const search = ref('')
const title = ref('')
const body = ref('')
const changeSummary = ref('')
const commentDraft = ref('')
const grantSubjectType = ref<'user' | 'role' | 'team'>('user')
const teams = ref<InternalTeam[]>([])
onMounted(async () => {
  const { api } = useApi({ useGlobalInstance: true })
  try {
    teams.value = await fetchInternalTeams(api.instance, props.workspaceId)
  } catch {
    teams.value = []
  }
})
const grantSubjectId = ref('')
const grantPermission = ref<InternalDocumentPermission>('read')
const isSaving = ref(false)
const saveStatus = ref<'saved' | 'unsaved' | 'saving' | 'error'>('saved')
const isHydrating = ref(false)
const error = ref('')
const importInput = ref<HTMLInputElement>()
const isImporting = ref(false)
let autosaveTimer: ReturnType<typeof setTimeout> | undefined

const canEdit = computed(() => activeDocument.value?.permissions.includes('edit'))
const canManage = computed(() => activeDocument.value?.permissions.includes('manage'))
const canComment = computed(() => activeDocument.value?.permissions.includes('comment'))
const canExport = computed(() => activeDocument.value?.permissions.includes('export'))

watch(activeDocument, (document, previous) => {
  if (isSaving.value && document?.id === previous?.id) return
  isHydrating.value = true
  title.value = document?.title ?? ''
  body.value = document ? documentContentToText(document.content) : ''
  changeSummary.value = ''
  saveStatus.value = 'saved'
  void nextTick(() => {
    isHydrating.value = false
  })
})

async function run(action: () => Promise<unknown>) {
  error.value = ''
  try {
    await action()
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || requestError?.message || 'The request failed.'
  }
}

async function switchDocument(action: () => Promise<unknown>) {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (isSaving.value) return
  if (saveStatus.value === 'unsaved') await saveDocument()
  if (saveStatus.value === 'error') return
  await run(action)
}

async function importDocument(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  isImporting.value = true
  await run(async () => {
    if (file.size > 4 * 1024 * 1024) throw new Error('Import files must be 4 MB or smaller.')
    const parsed = parseInternalDocumentImport(file.name, await file.text())
    await switchDocument(() => create(parsed.title, null, parsed.content))
  })
  input.value = ''
  isImporting.value = false
}

async function saveDocument(summary = changeSummary.value || undefined) {
  if (!activeDocument.value || isSaving.value) return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  const savingTitle = title.value
  const savingBody = body.value
  isSaving.value = true
  saveStatus.value = 'saving'
  await run(() => save({ title: savingTitle, text: savingBody, summary }))
  isSaving.value = false
  saveStatus.value = error.value ? 'error' : title.value === savingTitle && body.value === savingBody ? 'saved' : 'unsaved'
  if (saveStatus.value === 'unsaved') scheduleAutosave()
}

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer)
  if (!activeDocument.value || !canEdit.value) return
  saveStatus.value = 'unsaved'
  autosaveTimer = setTimeout(() => void saveDocument('Auto-saved'), 1500)
}

watch([title, body], ([nextTitle, nextBody], [previousTitle, previousBody]) => {
  if (isHydrating.value) return
  if (nextTitle !== previousTitle || nextBody !== previousBody) scheduleAutosave()
})

async function addComment() {
  if (!commentDraft.value.trim()) return
  await run(() => createComment(commentDraft.value))
  commentDraft.value = ''
}

async function addGrant() {
  if (!grantSubjectId.value.trim()) return
  const next: InternalDocumentGrant[] = [
    ...grants.value.map(({ subjectType, subjectId, permission }) => ({
      subjectType,
      subjectId,
      permission,
    })),
    {
      subjectType: grantSubjectType.value,
      subjectId: grantSubjectId.value.trim(),
      permission: grantPermission.value,
    },
  ]
  await run(() => replaceGrants(next))
  grantSubjectId.value = ''
}

async function deleteGrant(index: number) {
  await run(() =>
    replaceGrants(
      grants.value
        .filter((_, grantIndex) => grantIndex !== index)
        .map(({ subjectType, subjectId, permission }) => ({ subjectType, subjectId, permission })),
    ),
  )
}

watch(
  () => [props.workspaceId, props.baseId, props.documentId],
  () => void switchDocument(async () => {
    await refresh(search.value)
    if (props.documentId) await open(props.documentId)
  }),
  { immediate: true },
)
onBeforeUnmount(() => {
  if (autosaveTimer) clearTimeout(autosaveTimer)
})
</script>

<template>
  <NcAlert v-if="error" type="error" class="mb-3" data-testid="document-error">{{ error }}</NcAlert>
  <section class="flex min-h-[620px] overflow-hidden rounded-xl border-1 border-nc-border-gray-medium bg-nc-bg-default">
    <aside class="flex w-72 shrink-0 flex-col border-r-1 border-nc-border-gray-medium">
      <div class="border-b-1 border-nc-border-gray-medium p-3">
        <a-input-search v-model:value="search" placeholder="Search documents" @search="run(() => refresh(search))" />
        <div class="mt-2 flex gap-2">
          <NcButton size="small" type="primary" :disabled="isSaving" @click="switchDocument(() => create('Untitled document'))"
            >New document</NcButton
          >
          <NcButton
            size="small"
            :disabled="!activeDocument || isSaving"
            @click="switchDocument(() => create('Untitled child', activeDocument?.id))"
          >
            New child
          </NcButton>
        </div>
        <input
          ref="importInput"
          type="file"
          accept=".txt,.md,.markdown,.json"
          class="hidden"
          data-testid="document-import-input"
          @change="importDocument"
        />
        <NcButton class="mt-2" size="small" :loading="isImporting" :disabled="isSaving" @click="importInput?.click()"
          >Import document</NcButton
        >
        <p class="mt-2 text-xs">
          Text, Markdown, or Internal documents JSON (up to 4 MB). PDF/Office originals belong in an Attachment field.
        </p>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-2">
        <GeneralLoader v-if="isLoading" />
        <button
          v-for="document in documents"
          :key="document.id"
          class="mb-1 block w-full rounded-lg px-3 py-2 text-left hover:bg-nc-bg-gray-light"
          :class="activeDocument?.id === document.id ? 'bg-nc-bg-brand text-nc-content-brand' : ''"
          :style="{ paddingLeft: document.parentId ? '28px' : '12px' }"
          :disabled="isSaving"
          @click="switchDocument(() => open(document.id))"
        >
          <div class="truncate text-sm font-medium">{{ document.title }}</div>
          <div class="text-[11px] opacity-70">
            v{{ document.version }} · {{ new Date(document.updatedAt).toLocaleDateString() }}
          </div>
        </button>
        <div v-if="!isLoading && !documents.length" class="p-6 text-center text-sm text-nc-content-gray-muted">
          No visible documents.
        </div>
      </div>
    </aside>

    <div v-if="activeDocument" class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2 border-b-1 border-nc-border-gray-medium p-3">
        <a-input v-model:value="title" :disabled="!canEdit" class="max-w-lg font-semibold" />
        <span class="text-xs text-nc-content-gray-muted" aria-live="polite">
          {{
            saveStatus === 'saving'
              ? 'Saving…'
              : saveStatus === 'unsaved'
              ? 'Unsaved changes'
              : saveStatus === 'error'
              ? 'Save failed'
              : 'Saved'
          }}
        </span>
        <div class="ml-auto flex gap-2">
          <NcButton v-if="canExport" size="small" :disabled="isSaving" @click="switchDocument(() => download('pdf'))"
            >Export PDF</NcButton
          >
          <NcButton v-if="canExport" size="small" :disabled="isSaving" @click="switchDocument(() => download('json'))"
            >Export JSON</NcButton
          >
          <NcButton
            v-if="canManage"
            size="small"
            type="danger"
            :disabled="isSaving"
            @click="switchDocument(() => remove(activeDocument!.id))"
          >
            Delete
          </NcButton>
          <NcButton v-if="canEdit" size="small" type="primary" :loading="isSaving" @click="saveDocument()"> Save </NcButton>
        </div>
      </div>
      <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px]">
        <div class="flex min-h-0 flex-col p-4">
          <CellRichText
            :key="activeDocument.id"
            v-model:value="body"
            :read-only="!canEdit"
            :show-menu="canEdit"
            sync-value-change
            full-mode
            hide-mention
            class="min-h-0 flex-1 overflow-auto rounded-lg border-1 border-nc-border-gray-medium p-4"
            placeholder="Start writing…"
          />
          <a-input v-if="canEdit" v-model:value="changeSummary" class="mt-2" placeholder="Optional revision summary" />
          <details class="mt-3 text-xs">
            <summary>Your access sources</summary>
            <p v-for="(source, index) in activeDocument.permissionSources" :key="index">
              {{ source.permission }} via {{ source.subjectType }} {{ source.subjectId
              }}{{ source.inherited ? ' (inherited from a parent document)' : '' }}
            </p>
          </details>
        </div>
        <a-tabs class="min-h-0 border-l-1 border-nc-border-gray-medium px-3">
          <a-tab-pane key="comments" tab="Comments">
            <div class="max-h-[470px] overflow-auto">
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="mb-2 rounded-lg border-1 border-nc-border-gray-medium p-2"
              >
                <div class="text-xs font-semibold">{{ comment.author.displayName || comment.author.id }}</div>
                <p class="my-1 whitespace-pre-wrap text-sm">{{ comment.body }}</p>
                <NcButton v-if="!comment.resolvedAt" size="xs" type="text" @click="run(() => resolveComment(comment.id, true))">
                  Resolve
                </NcButton>
                <span v-else class="text-xs text-nc-content-green">Resolved</span>
              </div>
            </div>
            <template v-if="canComment">
              <a-textarea v-model:value="commentDraft" :rows="3" placeholder="Add a comment" />
              <NcButton class="mt-2" size="small" type="primary" @click="addComment">Comment</NcButton>
            </template>
          </a-tab-pane>
          <a-tab-pane key="history" tab="History">
            <div v-for="revision in revisions" :key="revision.id" class="mb-2 rounded-lg bg-nc-bg-gray-extralight p-2">
              <div class="text-sm font-medium">Revision {{ revision.revision }}</div>
              <div class="text-xs text-nc-content-gray-muted">{{ revision.summary || 'No summary' }}</div>
              <NcButton
                v-if="canEdit"
                size="xs"
                type="text"
                :disabled="isSaving"
                @click="switchDocument(() => restore(revision.id))"
                >Restore</NcButton
              >
            </div>
          </a-tab-pane>
          <a-tab-pane v-if="canManage" key="permissions" tab="Permissions">
            <div
              v-for="(grant, index) in grants"
              :key="`${grant.subjectType}:${grant.subjectId}:${grant.permission}`"
              class="mb-2 flex items-center gap-1 text-xs"
            >
              <span class="min-w-0 flex-1 truncate">{{ grant.subjectType }}:{{ grant.subjectId }} · {{ grant.permission }}</span>
              <NcButton size="xs" type="text" @click="deleteGrant(index)">Remove</NcButton>
            </div>
            <a-select v-model:value="grantSubjectType" class="mb-2 w-full">
              <a-select-option value="user">User ID</a-select-option>
              <a-select-option value="role">Base role</a-select-option>
              <a-select-option v-if="teams.length" value="team">Internal team</a-select-option>
            </a-select>
            <a-select
              v-if="grantSubjectType === 'team'"
              v-model:value="grantSubjectId"
              class="mb-2 w-full"
              placeholder="Select a team"
            >
              <a-select-option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }}</a-select-option>
            </a-select>
            <a-input v-else v-model:value="grantSubjectId" class="mb-2" placeholder="Subject ID or role name" />
            <a-select v-model:value="grantPermission" class="mb-2 w-full">
              <a-select-option
                v-for="permission in ['discover', 'read', 'comment', 'edit', 'manage', 'export']"
                :key="permission"
                :value="permission"
              >
                {{ permission }}
              </a-select-option>
            </a-select>
            <NcButton size="small" type="primary" @click="addGrant">Add grant</NcButton>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
    <div v-else class="flex flex-1 items-center justify-center text-nc-content-gray-muted">Select or create a document.</div>
  </section>
</template>
