import { computed, createApp, defineComponent, h, inject, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import BaseSettings from '../../../components/dashboard/settings/base/index.vue'
import PermissionEditor from '../../../components/internalExtensions/basePermissions/Editor.vue'
import TokenEditor from '../../../components/internalExtensions/apiTokens/Editor.vue'
import CellColors from '../../../components/internalExtensions/CellColors.vue'
import DocumentsSidebar from '../../../components/internalExtensions/DocumentsSidebar.vue'
import { evaluateInternalCellColor, readInternalColorRules } from '../../../helpers/internalCellColors'

declare global {
  interface Window {
    __internalBrowserRequests: Array<{
      method: string
      url: string
      body?: unknown
    }>
  }
}

const query = new URLSearchParams(window.location.search)
const scenario = query.get('scenario') ?? 'authorized'
const screen = query.get('screen') ?? 'editor'
window.__internalBrowserRequests = []

async function request<T>(method: string, url: string, body?: unknown) {
  window.__internalBrowserRequests.push({ method, url, body })
  const response = await fetch(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-internal-browser-scenario': scenario,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw Object.assign(new Error(`Request failed with ${response.status}`), {
      response: { status: response.status },
    })
  }
  return { data: (await response.json()) as T }
}

const client = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
}

const activeWorkspaceId = ref('workspace-1')
const basesUser = ref(
  new Map([
    [
      'base-1',
      [
        {
          id: 'user-2',
          email: 'user-2@example.test',
          display_name: 'Example User',
          roles: { viewer: true },
        },
      ],
    ],
  ]),
)
const basesList = ref([
  { id: 'base-1', title: 'Primary Base', fk_workspace_id: 'workspace-1' },
  { id: 'base-2', title: 'Secondary Base', fk_workspace_id: 'workspace-1' },
])
const router = {
  currentRoute: ref({ query: {} as Record<string, string> }),
  push: async (route: { query?: Record<string, string> }) => {
    router.currentRoute.value = { query: route.query ?? {} }
  },
}
const colorView = ref({ id: 'view-1', meta: { icon: 'star' } as Record<string, unknown> })
const colorColumns = [{ id: 'status', title: 'Status' }, { id: 'total', title: 'Total' }]
const colorMetaKey = Symbol('internal-color-meta')

Object.assign(globalThis, {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  inject,
  MetaInj: colorMetaKey,
  parseProp: (value: any) => typeof value === 'string' ? JSON.parse(value) : value,
  useViewsStore: () => ({
    activeView: colorView,
    updateView: async (_id: string, changes: any) => {
      await client.patch('/api/internal/v1/views/view-1', changes)
      colorView.value.meta = changes.meta
    },
  }),
  usePersonalViewPermissions: () => ({ canModifyView: computed(() => scenario !== 'colors-readonly') }),
  useRoute: () => ({ fullPath: '/' }),
  useEventListener: () => undefined,
  storeToRefs: (store: object) => store,
  useWorkspace: () => ({ activeWorkspaceId }),
  useBases: () => ({
    basesUser,
    basesList,
    getBaseUsers: async () => ({ users: basesUser.value.get('base-1') }),
  }),
  useApi: () => ({ api: { instance: client, base: { list: async () => ({ list: basesList.value }) } } }),
  useRoles: () => ({ isUIAllowed: () => false }),
  useBetaFeatureToggle: () => ({ isFeatureEnabled: () => false }),
  useEeConfig: () => ({ showEEFeatures: ref(false) }),
  useBase: () => ({ base: ref({ id: 'base-1', version: 'v3' }) }),
  useRouter: () => router,
  useInternalCapabilities: () => {
    const capabilities = ref()
    return {
      capabilities,
      refresh: async () => {
        capabilities.value = (await client.get('/api/internal/v1/capabilities')).data
        return capabilities.value
      },
    }
  },
  FEATURE_FLAG: { BASES_V3: 'BASES_V3' },
  isEeUI: false,
  message: {
    error: () => undefined,
    success: () => undefined,
  },
  extractSdkResponseErrorMsg: async (error: Error) => error.message,
})

const NcButton = defineComponent({
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    loading: Boolean,
  },
  emits: ['click'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        'button',
        {
          ...attrs,
          disabled: props.disabled || props.loading,
          onClick: () => emit('click'),
        },
        slots.default?.(),
      )
  },
})
const NcSwitch = defineComponent({
  inheritAttrs: false,
  props: {
    checked: Boolean,
    disabled: Boolean,
  },
  emits: ['change'],
  setup(props, { attrs, emit }) {
    return () =>
      h('button', {
        ...attrs,
        'aria-checked': String(props.checked),
        'role': 'switch',
        'disabled': props.disabled,
        'onClick': () => emit('change', !props.checked),
      })
  },
})
const NcAlert = defineComponent({
  setup(_, { attrs, slots }) {
    return () => h('div', { ...attrs, role: 'alert' }, slots.default?.())
  },
})
const NcSelect = defineComponent({
  inheritAttrs: false,
  props: {
    value: [String, Array],
    mode: String,
  },
  emits: ['update:value', 'change'],
  setup(props, { attrs, emit, slots }) {
    return () =>
      h(
        'select',
        {
          ...attrs,
          multiple: props.mode === 'multiple',
          value: props.value as any,
          onChange: (event: Event) => {
            const select = event.target as HTMLSelectElement
            const value = props.mode === 'multiple' ? [...select.selectedOptions].map((option) => option.value) : select.value
            emit('update:value', value)
            emit('change', value)
          },
        },
        slots.default?.(),
      )
  },
})
const SelectOption = defineComponent({
  props: {
    value: String,
    disabled: Boolean,
  },
  setup(props, { slots }) {
    return () => h('option', { value: props.value, disabled: props.disabled }, slots.default?.())
  },
})
const NcCheckbox = defineComponent({
  props: { checked: Boolean },
  emits: ['update:checked'],
  setup(props, { attrs, emit }) {
    return () =>
      h('input', {
        ...attrs,
        type: 'checkbox',
        checked: props.checked,
        onChange: (event: Event) => emit('update:checked', (event.target as HTMLInputElement).checked),
      })
  },
})
const Empty = defineComponent({
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const components: Record<string, unknown> = {
  AModal: defineComponent({
    props: { visible: Boolean },
    setup: (props, { slots }) => () => props.visible ? h('section', { role: 'dialog' }, slots.default?.()) : null,
  }),
  NuxtLink: defineComponent({
    props: { to: [String, Object] },
    setup: (props, { slots }) => () => h('a', { href: typeof props.to === 'string' ? props.to : `${(props.to as any).path}?${new URLSearchParams((props.to as any).query)}` }, slots.default?.()),
  }),
  NcButton,
  NcSwitch,
  NcAlert,
  NcSelect,
  NcCheckbox,
  ASelectOption: SelectOption,
  GeneralIcon: Empty,
  DashboardSettingsBaseAccess: Empty,
  DashboardSettingsBaseVisibility: Empty,
  DashboardSettingsBaseMigrateToV3: Empty,
  DashboardSettingsBaseMigrate: Empty,
  InternalExtensionsBasePermissionsEditor:
    screen === 'settings'
      ? defineComponent({
          setup() {
            return () => h('div', { 'data-testid': 'permission-editor-mounted' })
          },
        })
      : PermissionEditor,
  InternalExtensionsApiTokensEditor:
    screen === 'settings'
      ? defineComponent({
          setup() {
            return () => h('div', { 'data-testid': 'token-editor-mounted' })
          },
        })
      : TokenEditor,
}

const ColorsScreen = defineComponent({
  setup() {
    provide(colorMetaKey, ref({ columns: colorColumns }))
    return () => h('main', [h(CellColors), h('div', {
      'data-testid': 'colored-example',
      'style': { backgroundColor: evaluateInternalCellColor(readInternalColorRules(colorView.value.meta), colorColumns, { Status: 'Done' }, 'status') || '' },
    }, 'Done')])
  },
})
const app = createApp(screen === 'colors' ? ColorsScreen : screen === 'documents-sidebar' ? DocumentsSidebar : screen === 'settings' ? BaseSettings : screen === 'tokens' ? TokenEditor : PermissionEditor, {
  baseId: 'base-1',
})
for (const [name, component] of Object.entries(components)) app.component(name, component)
app.mount('#app')
