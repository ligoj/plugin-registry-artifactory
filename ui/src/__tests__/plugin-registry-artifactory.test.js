/*
 * Contract tests for plugin-registry-artifactory, incl. the parent → child
 * delegation: when registry-artifactory is registered, plugin-registry's
 * renderFeatures/renderDetailsKey/renderDetailsFeatures resolve to this tool
 * for a matching node.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { pluginRegistry, useI18nStore } from '@ligoj/host'
import def from '../index.js'
import parentDef from '../../../../plugin-registry/ui/src/index.js'

beforeEach(() => { setActivePinia(createPinia()) })

/** Extract the mdi icon name from a renderServiceLink (VBtn) or renderDetailsChip (VChip) vnode. */
function iconOf(vnode) {
  const kids = vnode.children.default()
  const iconVNode = Array.isArray(kids) ? kids[0] : kids
  return iconVNode.children.default()
}

// renderDetailsKey now returns a VTooltip wrapping a chip activator.
const chipOf = (tooltip) => tooltip.children.activator({ props: {} })
const linesOf = (tooltip) => tooltip.children.default()
const chipIcon = (chip) => chip.children.default()[0].children.default()
const chipText = (chip) => { const k = chip.children.default(); return k[k.length - 1] }
const vIcon = (iconVNode) => iconVNode.children.default()

describe('plugin-registry-artifactory manifest', () => {
  it('exposes a valid tool-level manifest', () => {
    expect(def.id).toBe('registry-artifactory')
    expect(def.label).toBe('Artifactory')
    expect(def.requires).toEqual(['registry'])
    expect(def.routes).toBeUndefined()
    expect(def.component).toBeUndefined()
    expect(typeof def.install).toBe('function')
    expect(typeof def.feature).toBe('function')
    expect(def.service).toBeTypeOf('object')
    expect(def.meta).toMatchObject({ icon: expect.any(String), color: expect.any(String) })
  })

  it('merges en + fr i18n on install', () => {
    const i18n = useI18nStore()
    def.install()
    expect(i18n.t('service:registry:artifactory:registry')).toBeTypeOf('string')
    expect(i18n.t('service:registry:artifactory:type')).toBe('Artifact type')
    expect(i18n.t('service:registry:artifactory:files')).toBe('Files')
    expect(i18n.t('service:registry:artifactory:size')).toBe('Storage')
    i18n.setLocale('fr')
    expect(i18n.t('service:registry:artifactory:type')).toBe("Type d'artefact")
    expect(i18n.t('service:registry:artifactory:size')).toBe('Stockage')
  })

  it('throws for an unknown feature', () => {
    expect(() => def.feature('nope')).toThrow(/Plugin "registry-artifactory" has no feature "nope"/)
  })

  it('renderFeatures is a home link to the node base URL, trailing slash trimmed', () => {
    def.install()
    const vnodes = def.feature('renderFeatures', {
      parameters: { 'service:registry:artifactory:url': 'https://acme.jfrog.io/artifactory/' },
    })
    expect(vnodes).toHaveLength(1)
    expect(vnodes[0].__v_isVNode).toBe(true)
    expect(vnodes[0].props.target).toBe('_blank')
    expect(vnodes[0].props.href).toBe('https://acme.jfrog.io/artifactory')
    expect(iconOf(vnodes[0])).toBe('mdi-home')
  })

  it('renderFeatures returns [] without the node URL', () => {
    def.install()
    expect(def.feature('renderFeatures', { parameters: {} })).toEqual([])
    expect(def.feature('renderFeatures', {})).toEqual([])
  })

  it('renderDetailsKey builds a type-icon chip + 2-line icon tooltip (type value given directly)', () => {
    def.install()
    const maven = def.feature('renderDetailsKey', { parameters: { 'service:registry:artifactory:registry': 'libs-release-local', 'service:registry:artifactory:type': 'maven' } })
    expect(maven.__v_isVNode).toBe(true)
    const chip = chipOf(maven)
    expect(chipIcon(chip)).toBe('mdi-language-java')
    expect(chipText(chip)).toBe('libs-release-local')
    const lines = linesOf(maven)
    expect(lines).toHaveLength(2)
    expect(lines[0].children[1]).toBe('maven')
    expect(vIcon(lines[0].children[0])).toBe('mdi-language-java')
    expect(lines[1].children).toBe('libs-release-local')
  })

  it('renderDetailsKey resolves the persisted SELECT index to the artifact type', () => {
    def.install()
    // 0=docker, 1=maven, ...
    const docker = def.feature('renderDetailsKey', { parameters: { 'service:registry:artifactory:registry': 'docker-local', 'service:registry:artifactory:type': '0' } })
    expect(chipIcon(chipOf(docker))).toBe('mdi-docker')
    expect(linesOf(docker)[0].children[1]).toBe('docker')
    const maven = def.feature('renderDetailsKey', { parameters: { 'service:registry:artifactory:registry': 'libs', 'service:registry:artifactory:type': '1' } })
    expect(chipIcon(chipOf(maven))).toBe('mdi-language-java')
  })

  it('renderDetailsKey falls back to a generic icon + single-line tooltip when the type is unknown/absent', () => {
    def.install()
    const unknown = def.feature('renderDetailsKey', { parameters: { 'service:registry:artifactory:registry': 'r', 'service:registry:artifactory:type': 'rust' } })
    expect(chipIcon(chipOf(unknown))).toBe('mdi-package-variant')
    const noType = def.feature('renderDetailsKey', { parameters: { 'service:registry:artifactory:registry': 'r' } })
    expect(chipIcon(chipOf(noType))).toBe('mdi-package-variant')
    const lines = linesOf(noType)
    expect(lines).toHaveLength(1)
    expect(lines[0].children).toBe('r')
  })

  it('renderDetailsKey returns null without a registry', () => {
    def.install()
    expect(def.feature('renderDetailsKey', { parameters: {} })).toBeNull()
    expect(def.feature('renderDetailsKey', {})).toBeNull()
  })

  it('renderDetailsFeatures shows the live file count and used space', () => {
    def.install()
    const out = def.feature('renderDetailsFeatures', { data: { files: 123, size: '1.2 GB' } })
    expect(out).toHaveLength(2)
    expect(out[0].__v_isVNode).toBe(true)
    expect(iconOf(out[0])).toBe('mdi-file-multiple-outline')
    const files = out[0].children.default()
    expect(files[files.length - 1]).toBe('123')
    expect(iconOf(out[1])).toBe('mdi-harddisk')
    const size = out[1].children.default()
    expect(size[size.length - 1]).toBe('1.2 GB')
  })

  it('renderDetailsFeatures returns null without status data or stats', () => {
    def.install()
    expect(def.feature('renderDetailsFeatures', {})).toBeNull()
    // Data present but no storage stats (e.g. endpoint unavailable) → no chips.
    expect(def.feature('renderDetailsFeatures', { data: { format: 'maven' } })).toBeNull()
  })
})

describe('plugin-registry → plugin-registry-artifactory delegation', () => {
  beforeEach(() => {
    parentDef.install({ router: { addRoute() {} } })
    def.install()
    pluginRegistry.register('registry-artifactory', def)
  })
  afterEach(() => { pluginRegistry.remove('registry-artifactory') })

  it('parent renderFeatures resolves to this tool for a matching node', () => {
    const out = parentDef.feature('renderFeatures', {
      node: { id: 'service:registry:artifactory:1' },
      parameters: { 'service:registry:artifactory:url': 'https://acme.jfrog.io/artifactory' },
    })
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBe(1)
    expect(out[0].__v_isVNode).toBe(true)
  })

  it('parent renderDetailsKey resolves to this tool for a matching node', () => {
    const out = parentDef.feature('renderDetailsKey', {
      node: { id: 'service:registry:artifactory:1' },
      parameters: { 'service:registry:artifactory:registry': 'libs-release-local', 'service:registry:artifactory:type': 'maven' },
    })
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBe(1)
    expect(out[0].__v_isVNode).toBe(true)
  })

  it('parent renderDetailsFeatures resolves to this tool for a matching node', () => {
    const out = parentDef.feature('renderDetailsFeatures', {
      node: { id: 'service:registry:artifactory:1' },
      data: { files: 5, size: '10 MB' },
    })
    expect(Array.isArray(out)).toBe(true)
    expect(out.length).toBe(2)
    expect(out[0].__v_isVNode).toBe(true)
  })

  it('does not delegate for a different tool', () => {
    const out = parentDef.feature('renderDetailsKey', {
      node: { id: 'service:registry:other:1' },
      parameters: {},
    })
    expect(out).toBeNull()
  })
})
