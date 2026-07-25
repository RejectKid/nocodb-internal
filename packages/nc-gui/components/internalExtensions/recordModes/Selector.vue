<script setup lang="ts">
import { ExpandedFormMode } from 'nocodb-sdk'

defineProps<{ fileEnabled: boolean; discussionEnabled: boolean }>()
const modelValue = defineModel<string>({ required: true })
const modes = [
  { value: ExpandedFormMode.FIELD, label: 'Fields', icon: 'menu' },
  { value: ExpandedFormMode.ATTACHMENT, label: 'Files', icon: 'ncFileText' },
  {
    value: ExpandedFormMode.DISCUSSION,
    label: 'Discussion',
    icon: 'ncMessageSquare1Outline',
  },
] as const
</script>

<template>
  <div
    class="flex h-7 overflow-hidden rounded-lg border-1 border-nc-border-gray-medium bg-nc-bg-default"
    data-testid="internal-record-mode-selector"
  >
    <button
      v-for="item in modes.filter(
        (item) =>
          item.value === ExpandedFormMode.FIELD ||
          (item.value === ExpandedFormMode.ATTACHMENT && fileEnabled) ||
          (item.value === ExpandedFormMode.DISCUSSION && discussionEnabled),
      )"
      :key="item.value"
      class="flex items-center gap-1 border-r-1 border-nc-border-gray-medium px-2 text-xs last:border-r-0"
      :class="modelValue === item.value ? 'bg-nc-bg-brand text-nc-content-brand' : 'text-nc-content-gray-muted'"
      :title="item.label"
      @click="modelValue = item.value"
    >
      <GeneralIcon :icon="item.icon" class="h-4 w-4" />
      <span class="hidden xl:inline">{{ item.label }}</span>
    </button>
  </div>
</template>
