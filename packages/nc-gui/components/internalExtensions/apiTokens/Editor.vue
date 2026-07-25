<script setup lang="ts">
import {
  createInternalApiToken,
  fetchInternalApiTokenState,
  internalApiTokenErrorStatus,
  revokeInternalApiToken,
  setInternalApiTokenEnabled,
  tokenLifecycle,
  updateInternalApiToken,
  type InternalApiTokenDraft,
  type InternalApiTokenSummary,
  type InternalApiTokenState,
  type IssuedInternalApiToken,
} from '~/composables/internalExtensions/useInternalApiTokens'

const props = defineProps<{ baseId: string }>()
const { activeWorkspaceId } = storeToRefs(useWorkspace())
const { basesList } = storeToRefs(useBases())
const { api } = useApi({ useGlobalInstance: true })

const state = ref<InternalApiTokenState>()
const issued = ref<IssuedInternalApiToken>()
const editingToken = ref<InternalApiTokenSummary>()
const editDraft = ref<InternalApiTokenDraft>()
const isLoading = ref(false)
const isSaving = ref(false)
const accessDenied = ref(false)
const loadError = ref(false)
const draft = ref<InternalApiTokenDraft>({
  displayName: '',
  expiresAt: null,
  allowedWorkspaceIds: [],
  allowedBaseIds: [],
  scopes: [],
})

const workspaceId = computed(() => activeWorkspaceId.value || '')
const availableBases = computed(() =>
  basesList.value.filter(
    (base: { id?: string; fk_workspace_id?: string; title?: string; name?: string }) =>
      base.id && (!base.fk_workspace_id || base.fk_workspace_id === workspaceId.value),
  ),
)
const groupedScopes = computed(() => {
  const groups = new Map<string, InternalApiTokenState['scopeCatalog']>()
  for (const scope of state.value?.scopeCatalog ?? []) {
    groups.set(scope.family, [...(groups.get(scope.family) ?? []), scope])
  }
  return [...groups.entries()]
})
const orderedTokens = computed(() =>
  [...(state.value?.tokens ?? [])].sort((left, right) => {
    const leftActive = tokenLifecycle(left) === 'active' ? 0 : 1
    const rightActive = tokenLifecycle(right) === 'active' ? 0 : 1
    return leftActive - rightActive || right.created_at.localeCompare(left.created_at)
  }),
)

function resetDraft() {
  draft.value = {
    displayName: '',
    expiresAt: null,
    allowedWorkspaceIds: [workspaceId.value],
    allowedBaseIds: [props.baseId],
    scopes: [],
  }
}

function setScope(scope: string, checked: boolean) {
  draft.value.scopes = checked
    ? [...new Set([...draft.value.scopes, scope])]
    : draft.value.scopes.filter((candidate) => candidate !== scope)
}

function setEditScope(scope: string, checked: boolean) {
  if (!editDraft.value) return
  editDraft.value.scopes = checked
    ? [...new Set([...editDraft.value.scopes, scope])]
    : editDraft.value.scopes.filter((candidate) => candidate !== scope)
}

function startEditing(token: InternalApiTokenSummary) {
  editingToken.value = token
  editDraft.value = {
    displayName: token.display_name,
    expiresAt: token.expires_at?.slice(0, 16) ?? null,
    allowedWorkspaceIds: [...token.allowed_workspace_ids],
    allowedBaseIds: [...token.allowed_base_ids],
    scopes: [...token.scopes],
  }
}

function cancelEditing() {
  editingToken.value = undefined
  editDraft.value = undefined
}

async function saveEdit() {
  if (!editingToken.value || !editDraft.value) return
  isSaving.value = true
  try {
    await updateInternalApiToken(api.instance, workspaceId.value, props.baseId, editingToken.value.id, {
      ...editDraft.value,
      expiresAt: editDraft.value.expiresAt ? new Date(editDraft.value.expiresAt).toISOString() : null,
    })
    cancelEditing()
    await loadState()
    message.success('Token updated')
  } catch (error) {
    message.error(await extractSdkResponseErrorMsg(error as Error & { response?: unknown }))
  } finally {
    isSaving.value = false
  }
}

async function setEnabled(token: InternalApiTokenSummary, enabled: boolean) {
  isSaving.value = true
  try {
    await setInternalApiTokenEnabled(api.instance, workspaceId.value, props.baseId, token.id, enabled)
    await loadState()
    message.success(enabled ? 'Token enabled' : 'Token disabled')
  } catch (error) {
    message.error(await extractSdkResponseErrorMsg(error as Error & { response?: unknown }))
  } finally {
    isSaving.value = false
  }
}

async function loadState() {
  if (!workspaceId.value || !props.baseId) return
  isLoading.value = true
  accessDenied.value = false
  loadError.value = false
  try {
    state.value = await fetchInternalApiTokenState(api.instance, workspaceId.value, props.baseId)
    if (!draft.value.allowedBaseIds.length) resetDraft()
  } catch (error) {
    accessDenied.value = internalApiTokenErrorStatus(error) === 403
    loadError.value = !accessDenied.value
  } finally {
    isLoading.value = false
  }
}

async function createToken() {
  if (!draft.value.displayName.trim() || !draft.value.allowedBaseIds.includes(props.baseId)) return
  isSaving.value = true
  issued.value = undefined
  try {
    issued.value = await createInternalApiToken(api.instance, workspaceId.value, props.baseId, {
      ...draft.value,
      expiresAt: draft.value.expiresAt ? new Date(draft.value.expiresAt).toISOString() : null,
    })
    resetDraft()
    await loadState()
    message.success('Internal API token created')
  } catch (error) {
    message.error(await extractSdkResponseErrorMsg(error as Error & { response?: unknown }))
  } finally {
    isSaving.value = false
  }
}

async function copySecret() {
  if (!issued.value) return
  await navigator.clipboard.writeText(issued.value.value)
  message.success('Token copied. Store it securely; it cannot be retrieved again.')
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

function dismissSecret() {
  issued.value = undefined
}

async function revokeToken(tokenId: string) {
  isSaving.value = true
  try {
    await revokeInternalApiToken(api.instance, workspaceId.value, props.baseId, tokenId)
    await loadState()
    message.success('Token revoked')
  } catch (error) {
    message.error(await extractSdkResponseErrorMsg(error as Error & { response?: unknown }))
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  resetDraft()
  await loadState()
})
onBeforeUnmount(dismissSecret)
</script>

<template>
  <section class="flex flex-col gap-5" data-testid="internal-api-token-editor">
    <div class="flex items-start justify-between gap-6">
      <div>
        <h2 class="text-lg font-semibold text-nc-content-gray-emphasis">Fine-grained API tokens</h2>
        <p class="mt-1 text-sm text-nc-content-gray-muted">
          Create independently scoped tokens. Secrets are displayed once and only secure hashes are stored.
        </p>
      </div>
      <NcButton type="secondary" size="small" :loading="isLoading" @click="loadState">Refresh</NcButton>
    </div>

    <NcAlert v-if="accessDenied" type="warning">You do not have permission to manage tokens for this base.</NcAlert>
    <NcAlert v-else-if="loadError" type="error">Unable to load internal API tokens.</NcAlert>

    <NcAlert v-if="issued" type="warning" data-testid="internal-token-secret">
      <div class="flex flex-col gap-2">
        <strong>Copy this token now. It will not be shown again.</strong>
        <code class="break-all rounded bg-nc-bg-gray-light p-2">{{ issued.value }}</code>
        <div class="flex gap-2">
          <NcButton size="small" type="primary" data-testid="copy-internal-token" @click="copySecret">Copy token</NcButton>
          <NcButton size="small" type="secondary" @click="dismissSecret">I stored it</NcButton>
        </div>
      </div>
    </NcAlert>

    <template v-if="state && !accessDenied">
      <div class="rounded-lg border-1 border-nc-border-gray-medium p-4">
        <h3 class="font-medium text-nc-content-gray-emphasis">Create token</h3>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <label class="text-xs font-medium text-nc-content-gray">
            Display name
            <input
              v-model="draft.displayName"
              class="mt-1 w-full rounded border-1 border-nc-border-gray-medium px-3 py-2 text-sm"
              maxlength="255"
              data-testid="internal-token-name"
            />
          </label>
          <label class="text-xs font-medium text-nc-content-gray">
            Expiration
            <input
              v-model="draft.expiresAt"
              type="datetime-local"
              class="mt-1 w-full rounded border-1 border-nc-border-gray-medium px-3 py-2 text-sm"
            />
          </label>
          <label class="col-span-2 text-xs font-medium text-nc-content-gray">
            Allowed workspace
            <NcSelect v-model:value="draft.allowedWorkspaceIds" mode="multiple" class="mt-1 w-full" disabled>
              <a-select-option :value="workspaceId">{{ workspaceId }}</a-select-option>
            </NcSelect>
            <span class="mt-1 block text-nc-content-gray-muted">
              This base-settings view securely fixes the token to the current workspace.
            </span>
          </label>
          <label class="col-span-2 text-xs font-medium text-nc-content-gray">
            Allowed bases in this workspace
            <NcSelect v-model:value="draft.allowedBaseIds" mode="multiple" class="mt-1 w-full">
              <a-select-option
                v-for="base in availableBases"
                :key="base.id"
                :value="base.id"
                :disabled="base.id === props.baseId"
              >
                {{ base.title || base.id }}
              </a-select-option>
            </NcSelect>
            <span class="mt-1 block text-nc-content-gray-muted"
              >The current base is required. The server verifies every selected base.</span
            >
          </label>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-4">
          <div v-for="[family, scopes] in groupedScopes" :key="family" class="rounded border-1 border-nc-border-gray-medium p-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-nc-content-gray-muted">{{ family }}</div>
            <label v-for="definition in scopes" :key="definition.scope" class="mb-2 flex items-center gap-2 text-sm">
              <NcCheckbox
                :checked="draft.scopes.includes(definition.scope)"
                @update:checked="setScope(definition.scope, Boolean($event))"
              />
              <span>{{ definition.label }}</span>
              <span v-if="definition.mutation" class="text-xs text-nc-content-gray-muted">write</span>
            </label>
          </div>
        </div>

        <NcButton
          class="mt-4"
          type="primary"
          :loading="isSaving"
          :disabled="!draft.displayName.trim() || !draft.allowedBaseIds.includes(props.baseId)"
          data-testid="create-internal-token"
          @click="createToken"
        >
          Create token
        </NcButton>
      </div>

      <div
        v-if="editingToken && editDraft"
        class="rounded-lg border-1 border-nc-border-brand p-4"
        data-testid="internal-token-edit-form"
      >
        <div class="flex items-center justify-between gap-4">
          <h3 class="font-medium text-nc-content-gray-emphasis">Edit {{ editingToken.display_name }}</h3>
          <NcButton size="small" type="text" @click="cancelEditing">Cancel</NcButton>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <label class="text-xs font-medium text-nc-content-gray">
            Display name
            <input
              v-model="editDraft.displayName"
              maxlength="255"
              class="mt-1 w-full rounded border-1 border-nc-border-gray-medium px-3 py-2 text-sm"
              data-testid="internal-token-edit-name"
            />
          </label>
          <label class="text-xs font-medium text-nc-content-gray">
            Expiration
            <input
              v-model="editDraft.expiresAt"
              type="datetime-local"
              class="mt-1 w-full rounded border-1 border-nc-border-gray-medium px-3 py-2 text-sm"
            />
          </label>
          <label class="col-span-2 text-xs font-medium text-nc-content-gray">
            Allowed bases in this workspace
            <NcSelect v-model:value="editDraft.allowedBaseIds" mode="multiple" class="mt-1 w-full">
              <a-select-option
                v-for="base in availableBases"
                :key="base.id"
                :value="base.id"
                :disabled="base.id === props.baseId"
              >
                {{ base.title || base.id }}
              </a-select-option>
            </NcSelect>
          </label>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div
            v-for="[family, scopes] in groupedScopes"
            :key="`edit-${family}`"
            class="rounded border-1 border-nc-border-gray-medium p-3"
          >
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-nc-content-gray-muted">{{ family }}</div>
            <label v-for="definition in scopes" :key="definition.scope" class="mb-2 flex items-center gap-2 text-sm">
              <NcCheckbox
                :checked="editDraft.scopes.includes(definition.scope)"
                @update:checked="setEditScope(definition.scope, Boolean($event))"
              />
              <span>{{ definition.label }}</span>
            </label>
          </div>
        </div>
        <NcButton
          class="mt-4"
          type="primary"
          :loading="isSaving"
          :disabled="!editDraft.displayName.trim() || !editDraft.allowedBaseIds.includes(props.baseId)"
          data-testid="save-internal-token-edit"
          @click="saveEdit"
        >
          Save changes
        </NcButton>
      </div>

      <div class="rounded-lg border-1 border-nc-border-gray-medium">
        <div class="border-b-1 border-nc-border-gray-medium p-4 font-medium">Tokens</div>
        <div v-if="!orderedTokens.length" class="p-4 text-sm text-nc-content-gray-muted">No tokens for this base.</div>
        <div
          v-for="token in orderedTokens"
          :key="token.id"
          class="flex items-center justify-between gap-4 border-b-1 border-nc-border-gray-medium p-4 last:border-b-0"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="truncate font-medium">{{ token.display_name }}</span>
              <span class="rounded bg-nc-bg-gray-light px-2 py-0.5 text-xs">{{ tokenLifecycle(token) }}</span>
            </div>
            <div class="mt-1 text-xs text-nc-content-gray-muted">
              {{ token.token_prefix }} · Last used {{ token.last_used_at ? formatTimestamp(token.last_used_at) : 'never' }}
            </div>
            <div class="mt-1 truncate text-xs text-nc-content-gray-muted">{{ token.scopes.join(', ') || 'No scopes' }}</div>
          </div>
          <div v-if="tokenLifecycle(token) !== 'revoked'" class="flex shrink-0 items-center gap-2">
            <NcButton
              size="small"
              type="secondary"
              :disabled="isSaving"
              :data-testid="`edit-internal-token-${token.id}`"
              @click="startEditing(token)"
            >
              Edit
            </NcButton>
            <NcButton
              v-if="tokenLifecycle(token) === 'active'"
              size="small"
              type="secondary"
              :disabled="isSaving"
              :data-testid="`disable-internal-token-${token.id}`"
              @click="setEnabled(token, false)"
            >
              Disable
            </NcButton>
            <NcButton
              v-else-if="tokenLifecycle(token) === 'disabled'"
              size="small"
              type="secondary"
              :disabled="isSaving"
              :data-testid="`enable-internal-token-${token.id}`"
              @click="setEnabled(token, true)"
            >
              Enable
            </NcButton>
            <NcButton
              size="small"
              type="danger"
              :disabled="isSaving"
              :data-testid="`revoke-internal-token-${token.id}`"
              @click="revokeToken(token.id)"
            >
              Revoke
            </NcButton>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
