/*
 * Service layer for plugin "registry-artifactory".
 *
 * Tool-level plugin (lives at `service:registry:artifactory`). The parent
 * `plugin-registry` delegates the subscription-row hooks to us:
 *
 *   - renderFeatures        → a "home" link to the Artifactory web UI (the
 *     node base URL, i.e. the main tool resource).
 *   - renderDetailsKey      → the registry chip, prefixed with the icon of the
 *     configured artifact type, with a two-line tooltip (type + name).
 *   - renderDetailsFeatures → the live storage statistics (file count and used
 *     space), refreshed from the subscription status data.
 *
 * Kept free of Vue SFC imports so it can be unit-tested without a DOM.
 */
import { h } from 'vue'
import { renderServiceLink, renderDetailsChip, useI18nStore, VChip, VIcon, VTooltip } from '@ligoj/host'

const PARAM_URL = 'service:registry:artifactory:url'
const PARAM_TYPE = 'service:registry:artifactory:type'
const PARAM_REGISTRY = 'service:registry:artifactory:registry'

/**
 * Artifact types in the SELECT parameter's declared order — MUST match
 * csv/parameter.csv: `["docker","maven","nuget","npm","python"]`. A
 * subscription persists a SELECT as its option INDEX, so this resolves that
 * index back to the value.
 */
const TYPE_VALUES = ['docker', 'maven', 'nuget', 'npm', 'python']

/** Artifact-type → icon. Shared shape across the registry tools. */
const TYPE_ICONS = {
  docker: 'mdi-docker',
  maven: 'mdi-language-java',
  nuget: 'mdi-nuget',
  npm: 'mdi-npm',
  python: 'mdi-language-python',
}

/**
 * Resolve the stored artifact type. A SELECT is persisted as its option INDEX
 * (e.g. "1"), so map that back to the value; a value passed straight through
 * (e.g. "maven") is kept as-is. Returns "" when there is nothing to resolve.
 */
function resolveType(raw) {
  return String(TYPE_VALUES[Number(raw)] ?? raw ?? '').toLowerCase()
}

/** Icon of a (resolved) artifact type, with a generic package fallback. */
function typeIcon(type) {
  return TYPE_ICONS[type] || 'mdi-package-variant'
}

/** "Home" link to the Artifactory web UI (the main tool resource). */
function renderFeatures(subscription) {
  const url = subscription?.parameters?.[PARAM_URL]
  if (!url) return []
  const { t } = useI18nStore()
  return [renderServiceLink({ icon: 'mdi-home', href: url.replace(/\/+$/, ''), title: t('service:registry:artifactory') })]
}

/**
 * Registry chip prefixed with the artifact-type icon. The tooltip has two
 * lines: the type (with its icon) and the repository name.
 */
function renderDetailsKey(subscription) {
  const params = subscription?.parameters
  const registry = params?.[PARAM_REGISTRY]
  if (!registry) return null
  const type = resolveType(params[PARAM_TYPE])
  const icon = typeIcon(type)
  return h(VTooltip, { location: 'bottom' }, {
    activator: ({ props }) => h(VChip, { ...props, size: 'small', variant: 'tonal', class: 'mr-1' },
      () => [h(VIcon, { start: true, size: 'small' }, () => icon), ' ', registry]),
    default: () => (type
      ? [h('div', { class: 'd-flex align-center ga-1' }, [h(VIcon, { size: 'x-small' }, () => icon), type]), h('div', registry)]
      : [h('div', registry)]),
  })
}

/** Live storage stats (file count + used space), from the subscription status data. */
function renderDetailsFeatures(subscription) {
  const data = subscription?.data
  if (!data) return null
  const { t } = useI18nStore()
  const chips = []
  if (data.files != null) {
    chips.push(renderDetailsChip({ icon: 'mdi-file-multiple-outline', text: String(data.files), title: t('service:registry:artifactory:files') }))
  }
  if (data.size != null) {
    chips.push(renderDetailsChip({ icon: 'mdi-harddisk', text: String(data.size), title: t('service:registry:artifactory:size') }))
  }
  return chips.length ? chips : null
}

export default { renderFeatures, renderDetailsKey, renderDetailsFeatures }
