<script setup lang="ts">
import {
  INTERNAL_CELL_COLORS_KEY,
  INTERNAL_COLOR_OPERATORS,
  readInternalColorRules,
  type InternalCellColorRule,
} from '~/helpers/internalCellColors'

const { activeView } = storeToRefs(useViewsStore())
const { updateView } = useViewsStore()
const meta = inject(MetaInj, ref())
const { canModifyView: canSave } = usePersonalViewPermissions(activeView)
const visible = ref(false)
const rules = ref<InternalCellColorRule[]>([])
const error = ref('')
const saving = ref(false)
const { capabilities, refresh } = useInternalCapabilities()
onMounted(() => void refresh().catch(() => undefined))
watch(
  () => activeView.value?.id,
  () => {
    visible.value = false
  },
)
watch(visible, (open) => {
  if (open) {
    rules.value = readInternalColorRules(activeView.value?.meta).map((rule) => ({ ...rule }))
    error.value = ''
  }
})
const columns = computed(() => (meta.value?.columns ?? []).filter((column: any) => column.id && column.title))
function add() {
  if (columns.value.length && rules.value.length < 100)
    rules.value.push({
      fieldId: columns.value[0].id,
      operator: 'equals',
      value: '',
      color: '#fef3c7',
      target: 'cell',
    })
}
async function save() {
  if (!activeView.value?.id || !canSave.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const oldMeta = parseProp(activeView.value.meta) ?? {}
    await updateView(activeView.value.id, { meta: { ...oldMeta, [INTERNAL_CELL_COLORS_KEY]: rules.value } })
    visible.value = false
  } catch (e: any) {
    error.value = await extractSdkResponseErrorMsg(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <NcButton
    v-if="capabilities?.features.cellColoring"
    size="small"
    type="text"
    data-testid="internal-cell-colors"
    @click="visible = true"
    >Cell coloring</NcButton
  >
  <a-modal v-model:visible="visible" title="Cell coloring" :footer="null" :width="760">
    <p class="mb-3">First matching rule wins. Rules belong to this view; they do not change record values.</p>
    <div
      v-for="(rule, index) in rules"
      :key="index"
      class="mb-3 flex flex-wrap items-center gap-2"
      data-testid="internal-color-rule"
    >
      <select v-model="rule.fieldId" aria-label="Color field" :disabled="!canSave" class="max-w-40 rounded border p-2">
        <option v-for="column in columns" :key="column.id" :value="column.id">{{ column.title }}</option>
      </select>
      <select v-model="rule.operator" aria-label="Color condition" :disabled="!canSave" class="rounded border p-2">
        <option v-for="operator in INTERNAL_COLOR_OPERATORS" :key="operator" :value="operator">{{ operator }}</option>
      </select>
      <input
        v-if="!['empty', 'notEmpty'].includes(rule.operator)"
        v-model="rule.value"
        aria-label="Color comparison"
        :disabled="!canSave"
        class="w-28 rounded border p-2"
      />
      <input v-model="rule.color" type="color" aria-label="Cell color" :disabled="!canSave" />
      <select v-model="rule.target" aria-label="Color target" :disabled="!canSave" class="rounded border p-2">
        <option value="cell">Cell</option>
        <option value="row">Entire row</option>
      </select>
      <NcButton v-if="canSave" size="small" :disabled="saving" @click="rules.splice(index, 1)">Remove</NcButton>
    </div>
    <p v-if="!rules.length" class="mb-3">No coloring rules.</p>
    <NcAlert v-if="error" type="error">{{ error }}</NcAlert>
    <div v-if="canSave" class="mt-3 flex gap-2">
      <NcButton :disabled="saving || rules.length >= 100 || !columns.length" @click="add">Add rule</NcButton>
      <NcButton type="primary" :disabled="saving" data-testid="internal-color-save" @click="save">Save colors</NcButton>
    </div>
    <p v-else>Read-only: your role or this view's permissions prevent changes.</p>
  </a-modal>
</template>
