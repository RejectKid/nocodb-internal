<script setup lang="ts">
import { OrgUserRoles, extractRolesObj } from 'nocodb-sdk'

const emit = defineEmits<{ (event: 'navigate'): void }>()
const { user } = useGlobal()
const { capabilities, refresh } = useInternalCapabilities()
const isAdmin = computed(() => Boolean(extractRolesObj(user.value?.roles ?? {})?.[OrgUserRoles.SUPER_ADMIN]))
onMounted(() => void refresh().catch(() => undefined))
</script>

<template>
  <template v-if="capabilities">
    <NuxtLink v-if="capabilities.features.teams" to="/internal/teams">
      <NcMenuItem @click="emit('navigate')">Internal teams</NcMenuItem>
    </NuxtLink>
    <NuxtLink v-if="capabilities.features.internalAdmin && isAdmin" to="/internal/admin" data-testid="internal-admin-link">
      <NcMenuItem @click="emit('navigate')">Internal administration</NcMenuItem>
    </NuxtLink>
    <NuxtLink v-if="capabilities.features.documentPermissions" to="/internal/documents" data-testid="internal-documents-link">
      <NcMenuItem @click="emit('navigate')">Documents</NcMenuItem>
    </NuxtLink>
    <NuxtLink to="/internal/settings/capabilities">
      <NcMenuItem @click="emit('navigate')">Internal capabilities</NcMenuItem>
    </NuxtLink>
  </template>
</template>
