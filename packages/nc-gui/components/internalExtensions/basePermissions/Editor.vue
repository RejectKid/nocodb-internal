<script setup lang="ts">
import { OrderedProjectRoles, ProjectRoles } from 'nocodb-sdk'
import {
  canManageInternalBasePermissions,
  createInternalBasePermissionDraft,
  fetchInternalBasePermissionState,
  internalBasePermissionErrorStatus,
  normalizeInternalBasePermissionRoles,
  replaceInternalBasePermissionAssignments,
  resolveInternalBasePermissionDisplay,
  updateInternalBasePermissionConfiguration,
  type InternalBasePermissionDraft,
  type InternalBasePermissionEffect,
  type InternalBasePermissionGrantSet,
  type InternalBasePermissionState,
  type InternalBasePermissionSubjectType,
} from '~/composables/internalExtensions/useInternalBasePermissions'

const props = defineProps<{
  baseId: string
}>()

const { activeWorkspaceId } = storeToRefs(useWorkspace())
const basesStore = useBases()
const { basesUser } = storeToRefs(basesStore)
const { api } = useApi({ useGlobalInstance: true })

const state = ref<InternalBasePermissionState>()
const isLoading = ref(false)
const isSaving = ref(false)
const accessDenied = ref(false)
const loadError = ref(false)
const staleWrite = ref(false)
const selectedSubjectType = ref<InternalBasePermissionSubjectType>('role')
const selectedSubjectId = ref('')
const draft = ref<InternalBasePermissionDraft>({})

const workspaceId = computed(() => activeWorkspaceId.value || '')
const canManage = computed(() => canManageInternalBasePermissions(state.value))
const configurationEnabled = computed(() => Boolean(state.value?.configuration?.enabled))
const grantSets = computed(() => state.value?.grantSets ?? [])
const roleGrantSets = computed(() => grantSets.value.filter(({ subjectType }) => subjectType === 'role'))
const userGrantSets = computed(() => grantSets.value.filter(({ subjectType }) => subjectType === 'user'))
const roles = computed(() =>
  OrderedProjectRoles.filter((role) => role !== ProjectRoles.INHERIT && role !== ProjectRoles.NO_ACCESS),
)
const members = computed(() =>
  (basesUser.value.get(props.baseId) ?? []).filter((member) => !(member as unknown as { deleted?: boolean }).deleted),
)
const selectedGrantSet = computed(() =>
  grantSets.value.find(
    ({ subjectType, subjectId }) => subjectType === selectedSubjectType.value && subjectId === selectedSubjectId.value,
  ),
)
const selectedMember = computed(() =>
  members.value.find((candidate: { id?: string }) => candidate.id === selectedSubjectId.value),
)
const effectiveDisplay = computed(() =>
  state.value
    ? resolveInternalBasePermissionDisplay(
        state.value,
        selectedSubjectType.value,
        selectedSubjectId.value,
        normalizeInternalBasePermissionRoles(selectedMember.value?.roles),
      )
    : {},
)
const permissionGroups = computed(() => {
  const groups = new Map<string, string[]>()
  for (const permission of state.value?.catalog ?? []) {
    const group = permission.split(':', 1)[0] ?? 'other'
    groups.set(group, [...(groups.get(group) ?? []), permission])
  }
  return [...groups.entries()]
})

function subjectLabel(grantSet: InternalBasePermissionGrantSet) {
  if (grantSet.subjectType === 'role') return grantSet.subjectId
  const member = members.value.find((candidate: { id?: string }) => candidate.id === grantSet.subjectId)
  return member?.display_name || member?.email || grantSet.subjectId
}

function selectSubject(grantSet: InternalBasePermissionGrantSet) {
  selectedSubjectType.value = grantSet.subjectType
  selectedSubjectId.value = grantSet.subjectId
  draft.value = createInternalBasePermissionDraft(grantSet)
}

function selectNewSubject() {
  const existing = selectedGrantSet.value
  draft.value = createInternalBasePermissionDraft(existing)
}

function changeSubjectType() {
  selectedSubjectId.value = selectedSubjectType.value === 'role' ? roles.value[0] ?? '' : members.value[0]?.id ?? ''
  selectNewSubject()
}

function chooseInitialSubject() {
  const first = roleGrantSets.value[0] ?? userGrantSets.value[0]
  if (first) {
    selectSubject(first)
    return
  }
  selectedSubjectType.value = 'role'
  selectedSubjectId.value = roles.value[0] ?? ''
  draft.value = {}
}

async function loadState() {
  if (!workspaceId.value || !props.baseId) return
  isLoading.value = true
  accessDenied.value = false
  loadError.value = false
  try {
    state.value = await fetchInternalBasePermissionState(api.instance, workspaceId.value, props.baseId)
    if (!selectedSubjectId.value) chooseInitialSubject()
    else selectNewSubject()
  } catch (error) {
    accessDenied.value = internalBasePermissionErrorStatus(error) === 403
    loadError.value = !accessDenied.value
  } finally {
    isLoading.value = false
  }
}

async function toggleConfiguration(enabled: boolean) {
  if (!state.value || !canManage.value) return
  isSaving.value = true
  staleWrite.value = false
  try {
    await updateInternalBasePermissionConfiguration(api.instance, workspaceId.value, props.baseId, state.value, enabled)
    await loadState()
    message.success(enabled ? 'Internal base permissions enabled' : 'Internal base permissions disabled')
  } catch (error) {
    if (internalBasePermissionErrorStatus(error) === 409) {
      staleWrite.value = true
      await loadState()
    } else {
      message.error(await extractSdkResponseErrorMsg(error as Error & { response?: unknown }))
    }
  } finally {
    isSaving.value = false
  }
}

async function saveAssignments() {
  if (!state.value || !canManage.value || !selectedSubjectId.value.trim()) return
  isSaving.value = true
  staleWrite.value = false
  try {
    await replaceInternalBasePermissionAssignments(
      api.instance,
      workspaceId.value,
      props.baseId,
      state.value,
      selectedSubjectType.value,
      selectedSubjectId.value,
      draft.value,
    )
    await loadState()
    message.success('Permission assignments saved')
  } catch (error) {
    if (internalBasePermissionErrorStatus(error) === 409) {
      staleWrite.value = true
      await loadState()
    } else {
      message.error(await extractSdkResponseErrorMsg(error as Error & { response?: unknown }))
    }
  } finally {
    isSaving.value = false
  }
}

function setEffect(permission: string, effect?: InternalBasePermissionEffect) {
  draft.value = { ...draft.value, [permission]: effect }
}

onMounted(async () => {
  await basesStore.getBaseUsers({ baseId: props.baseId, force: true }).catch(() => undefined)
  await loadState()
})
</script>

<template>
  <section class="flex flex-col gap-5" data-testid="internal-base-permissions-editor">
    <div class="flex items-start justify-between gap-6">
      <div>
        <h2 class="text-lg font-semibold text-nc-content-gray-emphasis">Base permissions</h2>
        <p class="mt-1 text-sm text-nc-content-gray-muted">
          Assign independent internal permissions directly to users or inherit them through existing base roles.
        </p>
      </div>
      <NcButton type="secondary" size="small" :loading="isLoading" @click="loadState"> Refresh </NcButton>
    </div>

    <NcAlert v-if="accessDenied" type="warning"> You do not have permission to administer this base. </NcAlert>
    <NcAlert v-else-if="loadError" type="error"> Unable to load internal base permissions. </NcAlert>
    <NcAlert v-if="staleWrite" type="warning">
      Another administrator changed these permissions. The latest values were reloaded; review them before saving again.
    </NcAlert>

    <template v-if="state && !accessDenied">
      <div class="flex items-center justify-between rounded-lg border-1 border-nc-border-gray-medium p-4">
        <div>
          <div class="font-medium text-nc-content-gray-emphasis">Internal permission enforcement</div>
          <div class="text-xs text-nc-content-gray-muted">
            Disabled bases continue using unchanged Community authorization behavior.
          </div>
        </div>
        <NcSwitch
          :checked="configurationEnabled"
          :disabled="!canManage || isSaving"
          data-testid="internal-base-permissions-enabled"
          @change="toggleConfiguration"
        />
      </div>

      <div v-if="configurationEnabled" class="grid min-h-110 grid-cols-[220px_minmax(0,1fr)] gap-5">
        <aside class="rounded-lg border-1 border-nc-border-gray-medium p-3">
          <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-nc-content-gray-muted">Inherited roles</div>
          <button
            v-for="grantSet in roleGrantSets"
            :key="`role:${grantSet.subjectId}`"
            class="subject-row"
            :class="{ active: selectedGrantSet === grantSet }"
            @click="selectSubject(grantSet)"
          >
            <GeneralIcon icon="ncUsers" />
            <span class="truncate capitalize">{{ subjectLabel(grantSet) }}</span>
          </button>

          <div class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-nc-content-gray-muted">Direct users</div>
          <button
            v-for="grantSet in userGrantSets"
            :key="`user:${grantSet.subjectId}`"
            class="subject-row"
            :class="{ active: selectedGrantSet === grantSet }"
            @click="selectSubject(grantSet)"
          >
            <GeneralIcon icon="user" />
            <span class="truncate">{{ subjectLabel(grantSet) }}</span>
          </button>
        </aside>

        <div class="min-w-0 rounded-lg border-1 border-nc-border-gray-medium">
          <div class="grid grid-cols-2 gap-3 border-b-1 border-nc-border-gray-medium p-4">
            <label class="text-xs font-medium text-nc-content-gray">
              Assignment source
              <NcSelect v-model:value="selectedSubjectType" class="mt-1 w-full" @change="changeSubjectType">
                <a-select-option value="role">Inherited base role</a-select-option>
                <a-select-option value="user">Direct user</a-select-option>
              </NcSelect>
            </label>
            <label class="text-xs font-medium text-nc-content-gray">
              Subject
              <NcSelect
                v-if="selectedSubjectType === 'role'"
                v-model:value="selectedSubjectId"
                class="mt-1 w-full"
                @change="selectNewSubject"
              >
                <a-select-option v-for="role in roles" :key="role" :value="role">
                  <span class="capitalize">{{ role }}</span>
                </a-select-option>
              </NcSelect>
              <NcSelect v-else v-model:value="selectedSubjectId" class="mt-1 w-full" show-search @change="selectNewSubject">
                <a-select-option v-for="member in members" :key="member.id" :value="member.id">
                  {{ member.display_name || member.email }}
                </a-select-option>
              </NcSelect>
            </label>
          </div>

          <div class="max-h-96 overflow-auto p-4 nc-scrollbar-thin">
            <div v-for="[group, permissions] in permissionGroups" :key="group" class="mb-5 last:mb-0">
              <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-nc-content-gray-muted">
                {{ group }}
              </div>
              <div
                v-for="permission in permissions"
                :key="permission"
                class="grid grid-cols-[minmax(0,1fr)_240px] items-center gap-3 border-b-1 border-nc-border-gray-light py-2 last:border-b-0"
              >
                <div class="min-w-0">
                  <code class="block truncate text-xs text-nc-content-gray-emphasis">{{ permission }}</code>
                  <span class="text-[11px] text-nc-content-gray-muted">
                    Effective:
                    <template v-if="effectiveDisplay[permission]?.effect">
                      <span class="capitalize">{{ effectiveDisplay[permission].effect }}</span>
                      via
                      {{
                        effectiveDisplay[permission].source === 'direct'
                          ? 'direct assignment'
                          : `${effectiveDisplay[permission].sourceId} role`
                      }}
                    </template>
                    <template v-else>not assigned</template>
                  </span>
                </div>
                <div class="grid grid-cols-3 overflow-hidden rounded-md border-1 border-nc-border-gray-medium">
                  <button class="effect-button" :class="{ active: !draft[permission] }" @click="setEffect(permission)">
                    Unset
                  </button>
                  <button
                    class="effect-button allow"
                    :class="{ active: draft[permission] === 'allow' }"
                    @click="setEffect(permission, 'allow')"
                  >
                    Allow
                  </button>
                  <button
                    class="effect-button deny"
                    :class="{ active: draft[permission] === 'deny' }"
                    @click="setEffect(permission, 'deny')"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end border-t-1 border-nc-border-gray-medium p-4">
            <NcButton
              v-if="canManage"
              type="primary"
              :disabled="!selectedSubjectId"
              :loading="isSaving"
              data-testid="internal-base-permissions-save"
              @click="saveAssignments"
            >
              Save assignments
            </NcButton>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.subject-row {
  @apply flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-nc-content-gray hover:bg-nc-bg-gray-light;

  &.active {
    @apply bg-nc-bg-brand text-nc-content-brand font-medium;
  }

  :deep(svg) {
    @apply h-4 w-4 flex-none;
  }
}

.effect-button {
  @apply border-r-1 border-nc-border-gray-medium px-2 py-1 text-xs text-nc-content-gray-muted last:border-r-0;

  &.active {
    @apply bg-nc-bg-gray-medium font-medium text-nc-content-gray-emphasis;
  }

  &.allow.active {
    @apply bg-nc-bg-green-light text-nc-content-green-dark;
  }

  &.deny.active {
    @apply bg-nc-bg-red-light text-nc-content-red-dark;
  }
}
</style>
