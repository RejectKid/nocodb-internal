<script setup lang="ts">
import { ProjectRoles } from 'nocodb-sdk'

const props = defineProps<{ rowId?: string | null }>()
const meta = inject(MetaInj, ref())
const { activeWorkspaceId } = storeToRefs(useWorkspace())
const { activeProjectId } = storeToRefs(useBases())
const { user } = useGlobal()
const { baseRoles } = useRoles()
const workspaceId = computed(() => activeWorkspaceId.value || (meta.value as any)?.fk_workspace_id || '')
const baseId = computed(() => activeProjectId.value || meta.value?.base_id || '')
const modelId = computed(() => meta.value?.id || '')
const recordId = computed(() => props.rowId || '')
const { comments, isLoading, refresh, create, update, remove, resolve } = useInternalDiscussions(
  workspaceId,
  baseId,
  modelId,
  recordId,
)
const draft = ref('')
const replyTo = ref<string | null>(null)
const editingId = ref('')
const editingBody = ref('')

async function submit() {
  if (!draft.value.trim()) return
  await create(draft.value, replyTo.value)
  draft.value = ''
  replyTo.value = null
}

async function saveEdit() {
  if (!editingId.value || !editingBody.value.trim()) return
  await update(editingId.value, editingBody.value)
  editingId.value = ''
  editingBody.value = ''
}

function startEdit(comment: { id: string; body: string }) {
  editingId.value = comment.id
  editingBody.value = comment.body
}

const isModerator = computed(
  () => Boolean(baseRoles.value?.[ProjectRoles.OWNER]) || Boolean(baseRoles.value?.[ProjectRoles.CREATOR]),
)

watch(recordId, refresh, { immediate: true })
</script>

<template>
  <div class="flex h-full flex-col" data-testid="internal-discussion-mode">
    <div class="border-b-1 border-nc-border-gray-medium px-4 py-3">
      <h3 class="font-semibold">Record discussion</h3>
      <p class="text-xs text-nc-content-gray-muted">Threaded comments are stored in the independent internal extension.</p>
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-4">
      <GeneralLoader v-if="isLoading" />
      <div v-else-if="!comments.length" class="py-10 text-center text-nc-content-gray-muted">Start the discussion.</div>
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="mb-3 rounded-lg border-1 border-nc-border-gray-medium p-3"
        :class="comment.parentId ? 'ml-8' : ''"
      >
        <div class="flex items-center justify-between gap-2">
          <strong class="text-sm">{{ comment.author.displayName || comment.author.id }}</strong>
          <div class="flex items-center gap-2">
            <span v-if="comment.resolvedAt" class="rounded bg-nc-bg-green-light px-2 py-0.5 text-xs">Resolved</span>
            <span class="text-xs text-nc-content-gray-muted">{{ new Date(comment.createdAt).toLocaleString() }}</span>
          </div>
        </div>
        <template v-if="editingId === comment.id">
          <a-textarea v-model:value="editingBody" class="mt-2" />
          <div class="mt-2 flex gap-2">
            <NcButton size="xs" type="primary" @click="saveEdit">Save</NcButton>
            <NcButton size="xs" @click="editingId = ''">Cancel</NcButton>
          </div>
        </template>
        <p v-else class="mt-2 whitespace-pre-wrap text-sm">{{ comment.body }}</p>
        <div class="mt-2 flex gap-2">
          <NcButton v-if="!comment.parentId" size="xs" type="text" @click="replyTo = comment.id">Reply</NcButton>
          <NcButton v-if="comment.author.id === user?.id" size="xs" type="text" @click="startEdit(comment)"> Edit </NcButton>
          <NcButton v-if="!comment.parentId" size="xs" type="text" @click="resolve(comment.id, !comment.resolvedAt)">
            {{ comment.resolvedAt ? 'Reopen' : 'Resolve' }}
          </NcButton>
          <NcButton v-if="comment.author.id === user?.id || isModerator" size="xs" type="text" @click="remove(comment.id)">
            Delete
          </NcButton>
        </div>
      </div>
    </div>
    <div class="border-t-1 border-nc-border-gray-medium p-3">
      <div v-if="replyTo" class="mb-2 flex items-center justify-between text-xs text-nc-content-gray-muted">
        Replying in thread
        <button @click="replyTo = null">Cancel</button>
      </div>
      <a-textarea v-model:value="draft" :rows="3" placeholder="Write a comment" @keydown.ctrl.enter="submit" />
      <div class="mt-2 flex justify-end">
        <NcButton type="primary" :disabled="!draft.trim()" @click="submit">Comment</NcButton>
      </div>
    </div>
  </div>
</template>
