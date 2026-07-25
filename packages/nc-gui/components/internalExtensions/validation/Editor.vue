<script setup lang="ts">
import { UITypes, type ColumnType } from 'nocodb-sdk'
import {
  fetchInternalValidationRules,
  previewInternalValidation,
  replaceInternalValidationRules,
  type InternalFieldValidationConfiguration,
  type InternalValidationRule,
} from '~/composables/internalExtensions/useInternalValidation'

const props = defineProps<{ baseId: string }>()
const { activeWorkspaceId } = storeToRefs(useWorkspace())
const tablesStore = useTablesStore()
const { baseTables } = storeToRefs(tablesStore)
const { getMeta } = useMetas()
const { api } = useApi({ useGlobalInstance: true })

const selectedModelId = ref('')
const selectedFieldKey = ref('')
const columns = ref<ColumnType[]>([])
const configurations = ref<InternalFieldValidationConfiguration[]>([])
const rules = ref<InternalValidationRule[]>([])
const previewValue = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref('')
const workspaceId = computed(() => activeWorkspaceId.value || '')
const tables = computed(() => baseTables.value.get(props.baseId) ?? [])
const selectedColumn = computed(() => columns.value.find((column) => column.title === selectedFieldKey.value))
const existing = computed(() => configurations.value.find((item) => item.fieldKey === selectedFieldKey.value))
const previewErrors = computed(() => previewInternalValidation(previewValue.value, rules.value))

const textTypes: Set<ColumnType['uidt']> = new Set([
  UITypes.SingleLineText,
  UITypes.LongText,
  UITypes.Email,
  UITypes.URL,
  UITypes.PhoneNumber,
])
const numberTypes: Set<ColumnType['uidt']> = new Set([
  UITypes.Number,
  UITypes.Decimal,
  UITypes.Currency,
  UITypes.Percent,
  UITypes.Rating,
])
const dateTypes: Set<ColumnType['uidt']> = new Set([
  UITypes.Date,
  UITypes.DateTime,
  UITypes.CreatedTime,
  UITypes.LastModifiedTime,
])

const compatibleRules = computed(() => {
  const common = ['required', 'allowedValues']
  const uidt = selectedColumn.value?.uidt
  if (uidt && textTypes.has(uidt)) return [...common, 'minLength', 'maxLength', 'regex']
  if (uidt && numberTypes.has(uidt)) return [...common, 'min', 'max', 'integer', 'decimalPrecision']
  if (uidt && dateTypes.has(uidt)) return [...common, 'earliestDate', 'latestDate']
  if (uidt === UITypes.Attachment) return ['required', 'fileType', 'fileSize', 'maxAttachmentCount']
  return common
})

async function selectModel() {
  selectedFieldKey.value = ''
  rules.value = []
  if (!selectedModelId.value) return
  isLoading.value = true
  try {
    const meta = await getMeta(props.baseId, selectedModelId.value, true)
    columns.value = meta?.columns ?? []
    configurations.value = await fetchInternalValidationRules(
      api.instance,
      workspaceId.value,
      props.baseId,
      selectedModelId.value,
    )
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || 'Unable to load validation rules.'
  } finally {
    isLoading.value = false
  }
}

function selectField() {
  rules.value = structuredClone(existing.value?.rules ?? [])
}

function addRule(type: string) {
  const defaults: Record<string, InternalValidationRule> = {
    required: { type: 'required' },
    integer: { type: 'integer' },
    minLength: { type: 'minLength', value: 1 },
    maxLength: { type: 'maxLength', value: 255 },
    regex: { type: 'regex', value: '', flags: '' },
    min: { type: 'min', value: 0 },
    max: { type: 'max', value: 100 },
    decimalPrecision: { type: 'decimalPrecision', value: 2 },
    earliestDate: { type: 'earliestDate', value: new Date().toISOString() },
    latestDate: { type: 'latestDate', value: new Date().toISOString() },
    allowedValues: { type: 'allowedValues', value: [] },
    fileType: { type: 'fileType', value: ['image/*', 'application/pdf'] },
    fileSize: { type: 'fileSize', value: 10 * 1024 * 1024 },
    maxAttachmentCount: { type: 'maxAttachmentCount', value: 5 },
  }
  if (defaults[type]) rules.value.push(defaults[type])
}

function listValue(rule: InternalValidationRule) {
  return Array.isArray((rule as any).value) ? (rule as any).value.join(', ') : ''
}

function setListValue(rule: InternalValidationRule, value: string) {
  ;(rule as any).value = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function save() {
  if (!selectedModelId.value || !selectedFieldKey.value) return
  const savedFieldKey = selectedFieldKey.value
  isSaving.value = true
  error.value = ''
  try {
    await replaceInternalValidationRules(api.instance, workspaceId.value, props.baseId, selectedModelId.value, {
      fieldKey: selectedFieldKey.value,
      rules: rules.value,
      expectedRevision: existing.value?.revision,
    })
    await selectModel()
    selectedFieldKey.value = savedFieldKey
    selectField()
    message.success('Validation rules saved')
  } catch (requestError: any) {
    error.value = requestError?.response?.data?.message || 'Unable to save validation rules.'
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await tablesStore.loadProjectTables(props.baseId)
  if (tables.value[0]?.id) {
    selectedModelId.value = tables.value[0].id
    await selectModel()
  }
})
</script>

<template>
  <section data-testid="internal-validation-editor">
    <div class="mb-5">
      <h2 class="text-xl font-semibold">Field validation</h2>
      <p class="mt-1 text-sm text-nc-content-gray-muted">
        These independent rules run on the server for API, form, bulk, and supported import write paths.
      </p>
    </div>
    <NcAlert v-if="error" type="error" class="mb-4">{{ error }}</NcAlert>

    <div class="grid gap-4 sm:grid-cols-2">
      <label>
        <span class="mb-1 block text-xs font-medium">Table</span>
        <a-select v-model:value="selectedModelId" class="w-full" @change="selectModel">
          <a-select-option v-for="table in tables" :key="table.id" :value="table.id">{{ table.title }}</a-select-option>
        </a-select>
      </label>
      <label>
        <span class="mb-1 block text-xs font-medium">Field</span>
        <a-select v-model:value="selectedFieldKey" class="w-full" :loading="isLoading" @change="selectField">
          <a-select-option v-for="column in columns" :key="column.id" :value="column.title">
            {{ column.title }} · {{ column.uidt }}
          </a-select-option>
        </a-select>
      </label>
    </div>

    <template v-if="selectedFieldKey">
      <div class="mt-5 flex flex-wrap gap-2">
        <NcButton
          v-for="type in compatibleRules"
          :key="type"
          size="small"
          type="secondary"
          :disabled="rules.some((rule) => rule.type === type)"
          @click="addRule(type)"
        >
          + {{ type }}
        </NcButton>
      </div>

      <div class="mt-4 space-y-3">
        <div
          v-for="(rule, index) in rules"
          :key="`${rule.type}-${index}`"
          class="rounded-lg border-1 border-nc-border-gray-medium p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <strong>{{ rule.type }}</strong>
            <NcButton size="xs" type="text" @click="rules.splice(index, 1)">Remove</NcButton>
          </div>
          <a-input-number
            v-if="
              ['minLength', 'maxLength', 'min', 'max', 'decimalPrecision', 'fileSize', 'maxAttachmentCount'].includes(rule.type)
            "
            v-model:value="(rule as any).value"
            class="mt-3 w-full"
          />
          <a-input v-else-if="rule.type === 'regex'" v-model:value="rule.value" class="mt-3" placeholder="Regular expression" />
          <a-input
            v-else-if="['earliestDate', 'latestDate'].includes(rule.type)"
            v-model:value="(rule as any).value"
            class="mt-3"
            placeholder="ISO date/time"
          />
          <a-input
            v-else-if="['allowedValues', 'fileType'].includes(rule.type)"
            :value="listValue(rule)"
            class="mt-3"
            placeholder="Comma-separated values"
            @update:value="setListValue(rule, $event)"
          />
          <a-input v-model:value="rule.message" class="mt-3" placeholder="Custom error message (optional)" />
        </div>
      </div>

      <div class="mt-5 rounded-lg bg-nc-bg-gray-extralight p-4">
        <div class="text-sm font-semibold">Preview</div>
        <a-input v-model:value="previewValue" class="mt-2" placeholder="Try a value" />
        <ul v-if="previewErrors.length" class="mt-2 list-disc pl-5 text-sm text-nc-content-red">
          <li v-for="previewError in previewErrors" :key="previewError">{{ previewError }}</li>
        </ul>
        <div v-else class="mt-2 text-sm text-nc-content-green">Value passes the configured client preview.</div>
      </div>

      <div class="mt-5 flex justify-end">
        <NcButton type="primary" :loading="isSaving" @click="save">Save validation rules</NcButton>
      </div>
    </template>
  </section>
</template>
