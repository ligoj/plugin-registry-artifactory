/*
 * Plugin "registry-artifactory" — JFrog Artifactory implementation of
 * plugin-registry.
 *
 * Tool-level plugin (`service:registry:artifactory`). Augments the parent
 * `plugin-registry` via i18n parameter labels + row features (home link +
 * type-prefixed registry chip + live storage stats) merged in through
 * plugin-registry's `subPluginIdFor` delegation hook.
 *
 * Artifactory is multi-format, so the artifact `type` is a real choice
 * (`docker` / `maven` / `nuget` / `npm` / `python`) — see csv/parameter.csv.
 *
 * Authored as source — compiled to `/main/registry-artifactory/vue/index.js`.
 */
import { useI18nStore } from '@ligoj/host'
import enMessages from './i18n/en.js'
import frMessages from './i18n/fr.js'
import service from './service.js'

const features = {
  renderFeatures: service.renderFeatures,
  renderDetailsKey: service.renderDetailsKey,
  renderDetailsFeatures: service.renderDetailsFeatures,
}

export default {
  id: 'registry-artifactory',
  label: 'Artifactory',
  requires: ['registry'],
  install() {
    const i18n = useI18nStore()
    i18n.merge(enMessages, 'en')
    i18n.merge(frMessages, 'fr')
  },
  feature(action, ...args) {
    const fn = features[action]
    if (!fn) throw new Error(`Plugin "registry-artifactory" has no feature "${action}"`)
    return fn(...args)
  },
  service,
  meta: { icon: 'mdi-cube-send', color: 'teal-darken-2' },
}

export { service }
