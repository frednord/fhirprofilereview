import { formatMovePaths, formatPath } from '../diff/formatPath'
import type { DiffChange, DiffResult, PathSegment } from '../diff/types'
import type { FhirResource } from '../../types/fhir'
import type { JsonObject, JsonValue } from '../../types/json'
import { getArray, getOwn, getPrimitiveAtPath, getString, isJsonArray, isJsonObject } from '../parser/narrowing'
import { codeLabel, codingName, formatValue } from './formatValue'
import type { ChangeDescription, ItemCondition, LabelSet, ProfileLabels, SliceLabel } from './types'

type ItemSegment = Extract<PathSegment, { kind: 'item' }>

/** The deepest point on the path that label data has a name for. */
interface Anchor {
  label: string
  elementPath: string
  slice?: SliceLabel
}

/** State while walking a change path through both versions of the resource. */
interface Walk {
  before: JsonValue | undefined
  after: JsonValue | undefined
  elementPath: string
  profiles: readonly ProfileLabels[]
  prefix: string[]
  anchor: Anchor | undefined
  /** Path segments below the anchor, still to be named. */
  rest: PathSegment[]
}

function canonical(url: string): string {
  const bar = url.indexOf('|')
  return bar === -1 ? url : url.slice(0, bar)
}

function declaredProfiles(resource: JsonObject): string[] {
  const meta = resource['meta']
  if (!isJsonObject(meta)) return []
  return getArray(meta, 'profile')
    .filter((p): p is string => typeof p === 'string')
    .map(canonical)
}

/**
 * Picks the label data for a resource: the profiles it declares in
 * meta.profile, otherwise every profile for its resource type. HVO examples
 * often lack meta.profile, and labels for the same element agree across
 * profiles, so falling back to the resource type gives the same wording.
 */
export function selectProfiles(labels: LabelSet, resources: readonly (JsonValue | undefined)[]): ProfileLabels[] {
  const objects = resources.filter(isJsonObject)
  const declared = new Set(objects.flatMap(declaredProfiles))
  const byUrl = labels.profiles.filter((p) => declared.has(p.url))
  if (byUrl.length > 0) return byUrl
  const type = objects.map((o) => getString(o, 'resourceType')).find((t) => t !== undefined)
  return labels.profiles.filter((p) => p.resourceType === type)
}

function step(value: JsonValue | undefined, segment: PathSegment, side: 'before' | 'after'): JsonValue | undefined {
  if (segment.kind === 'property') return isJsonObject(value) ? value[segment.name] : undefined
  const index = side === 'before' ? segment.beforeIndex : segment.afterIndex
  return isJsonArray(value) && index !== undefined ? value[index] : undefined
}

function conditionHolds(item: JsonValue | undefined, when: ItemCondition): boolean {
  if (item === undefined) return false
  return Object.entries(when).every(([path, expected]) => {
    const actual = getPrimitiveAtPath(item, path)
    if (actual === undefined) return false
    return typeof expected === 'string' ? String(actual) === expected : expected.test(String(actual))
  })
}

function renderPlaceholder(item: JsonValue, spec: string, labels: LabelSet): string {
  const [path = '', system] = spec.split('|')
  let value: JsonValue | undefined = item
  for (const part of path.split('.')) {
    value = isJsonArray(value) ? value[Number(part)] : isJsonObject(value) ? value[part] : undefined
  }
  if (isJsonObject(value)) return codingName(value, labels.codes) ?? '?'
  if (typeof value !== 'string') return '?'
  return codeLabel(labels.codes, system, value) ?? value
}

function renderLabel(template: string, item: JsonValue, labels: LabelSet): string {
  return template.replace(/\{([^}]+)\}/g, (_, spec: string) => renderPlaceholder(item, spec, labels))
}

function resourceName(profiles: readonly ProfileLabels[], resource: JsonObject): string {
  const name = profiles[0]?.resourceLabel ?? getString(resource, 'resourceType') ?? 'Resurs'
  const id = getString(resource, 'id')
  return id === undefined ? name : `${name} ${id}`
}

function findElementLabel(profiles: readonly ProfileLabels[], elementPath: string): string | undefined {
  for (const profile of profiles) {
    const label = getOwn(profile.elements, elementPath)
    if (label !== undefined) return label
  }
  return undefined
}

function findSlice(profiles: readonly ProfileLabels[], elementPath: string, item: JsonValue | undefined): SliceLabel | undefined {
  for (const profile of profiles) {
    const slice = profile.slices.find((s) => s.element === elementPath && conditionHolds(item, s.when))
    if (slice !== undefined) return slice
  }
  return undefined
}

/** Stepping into a nested resource (contained, Bundle.entry.resource) starts over with that resource's profiles. */
function enterResource(walk: Walk, labels: LabelSet, isRoot: boolean): void {
  const resource = [walk.after, walk.before].find(isJsonObject)
  const type = resource === undefined ? undefined : getString(resource, 'resourceType')
  if (resource === undefined || type === undefined) return
  walk.elementPath = type
  walk.profiles = selectProfiles(labels, [walk.after, walk.before])
  if (!isRoot) walk.prefix.push(resourceName(walk.profiles, resource))
  walk.anchor = undefined
  walk.rest = []
}

function visitProperty(walk: Walk, segment: Extract<PathSegment, { kind: 'property' }>): void {
  walk.elementPath = `${walk.elementPath}.${segment.name}`
  const label = findElementLabel(walk.profiles, walk.elementPath)
  if (label !== undefined) {
    walk.anchor = { label, elementPath: walk.elementPath }
    walk.rest = []
  } else {
    walk.rest.push(segment)
  }
}

function visitItem(walk: Walk, segment: ItemSegment, labels: LabelSet, isLast: boolean): void {
  const item = step(walk.after, segment, 'after') ?? step(walk.before, segment, 'before')
  if (isJsonObject(item) && typeof item['resourceType'] === 'string') {
    walk.anchor = { label: resourceName(selectProfiles(labels, [item]), item), elementPath: walk.elementPath }
    walk.rest = []
    return
  }
  const slice = findSlice(walk.profiles, walk.elementPath, item)
  if (slice !== undefined && item !== undefined) {
    walk.anchor = { label: renderLabel(slice.label, item, labels), elementPath: walk.elementPath, slice }
    walk.rest = []
  } else if (walk.anchor?.elementPath === walk.elementPath && walk.rest.length === 0) {
    // A labelled list item that fits no slice is told apart by its match key, e.g. "Identifierare (X)".
    // When the whole item is added or removed, its value already says which one it is.
    if (!isLast && segment.key !== undefined) {
      walk.anchor = { ...walk.anchor, label: `${walk.anchor.label} (${Object.values(segment.key).join(' ')})` }
    }
  } else {
    walk.rest.push(segment)
  }
}

function walkPath(change: DiffChange, before: FhirResource, after: FhirResource, labels: LabelSet): Walk {
  const walk: Walk = {
    before,
    after,
    elementPath: after.resourceType,
    profiles: [],
    prefix: [],
    anchor: undefined,
    rest: [],
  }
  enterResource(walk, labels, true)
  change.path.forEach((segment, index) => {
    const current = walk.after ?? walk.before
    if (segment.kind === 'property' && isJsonObject(current) && typeof current['resourceType'] === 'string' && current !== after && current !== before) {
      enterResource(walk, labels, false)
    }
    if (segment.kind === 'property') visitProperty(walk, segment)
    else visitItem(walk, segment, labels, index === change.path.length - 1)
    walk.before = step(walk.before, segment, 'before')
    walk.after = step(walk.after, segment, 'after')
  })
  return walk
}

/** "valuePeriod.end" → "value[x].end", so choice types can be named once. */
function normaliseChoice(path: string): string {
  return path.replace(/^value[A-Z]\w*/, 'value[x]')
}

function stripValueElement(relative: string, valueElement: string | undefined): string {
  if (valueElement === undefined) return relative
  const normalised = normaliseChoice(relative)
  if (normalised === valueElement) return ''
  return normalised.startsWith(`${valueElement}.`) ? normalised.slice(valueElement.length + 1) : relative
}

interface NamedLabel {
  label: string
  complete: boolean
}

/**
 * Names what lies below the anchor. List items below it are skipped when
 * looking up the child label, so "telecom[system=phone].value" is found as
 * "telecom.value"; the anchor label already says which item it is.
 */
function nameChild(anchor: Anchor, rest: readonly PathSegment[], labels: LabelSet): NamedLabel {
  if (rest.length === 0) return { label: anchor.label, complete: true }
  const relative = rest.flatMap((s) => (s.kind === 'property' ? [s.name] : [])).join('.')
  const child = stripValueElement(relative, anchor.slice?.valueElement)
  if (child === '') return { label: anchor.label, complete: true }
  const sliceChildren = anchor.slice?.children
  const childLabel =
    (sliceChildren === undefined ? undefined : getOwn(sliceChildren, child)) ?? getOwn(labels.childLabels, normaliseChoice(child))
  if (childLabel !== undefined) return { label: `${anchor.label}, ${childLabel}`, complete: true }
  return { label: `${anchor.label}, ${formatPath(rest)}`, complete: false }
}

function sentence(change: DiffChange, label: string, labels: LabelSet): string {
  const before = formatValue(change.before ?? null, labels.codes)
  const after = formatValue(change.after ?? null, labels.codes)
  if (change.kind === 'changed') return `${label} ändrades från ${before} till ${after}`
  if (change.kind === 'added') return `${label} lades till: ${after}`
  // A move always carries its origin from detectMoves; this only covers a hand-made change without one.
  if (change.kind === 'moved') return `${label} flyttades hit: ${after}`
  return `${label} togs bort (var ${before})`
}

interface NamedPlace {
  named: NamedLabel
  prefix: string[]
  profiles: readonly ProfileLabels[]
}

function namePlace(change: DiffChange, before: FhirResource, after: FhirResource, labels: LabelSet): NamedPlace {
  const walk = walkPath(change, before, after, labels)
  if (walk.anchor === undefined) {
    // A fallback inside a nested resource still names the path from the root, which identifies the resource already.
    return { named: { label: `Fältet ${formatPath(change.path)}`, complete: false }, prefix: [], profiles: walk.profiles }
  }
  return { named: nameChild(walk.anchor, walk.rest, labels), prefix: walk.prefix, profiles: walk.profiles }
}

function withPrefix(prefix: readonly string[], text: string): string {
  return `${prefix.map((p) => `${p}: `).join('')}${text}`
}

/** "Verksamhet X, Telefon", for a move between two resources in the same Bundle. */
function placeName(place: NamedPlace): string {
  return [...place.prefix, place.named.label].join(', ')
}

/**
 * "Telefon flyttades till Kontakt (Professionell), telefon: telefon 08-123".
 * When both places have the same label, e.g. between two contacts that are
 * named alike, the paths are what tells them apart.
 */
function describeMove(
  change: DiffChange & { from: NonNullable<DiffChange['from']> },
  before: FhirResource,
  after: FhirResource,
  labels: LabelSet,
): ChangeDescription {
  const to = namePlace(change, before, after, labels)
  const from = namePlace({ ...change, path: change.from.path, elementPath: change.from.elementPath }, before, after, labels)
  const value = formatValue(change.after ?? null, labels.codes)
  const samePrefix = from.prefix.join('\u0000') === to.prefix.join('\u0000')
  let text: string
  if (from.named.label === to.named.label && samePrefix) {
    const [fromPath, toPath] = formatMovePaths(change.from.path, change.path)
    text = withPrefix(to.prefix, `${to.named.label} flyttades från ${fromPath} till ${toPath}: ${value}`)
  } else if (samePrefix) {
    text = withPrefix(to.prefix, `${from.named.label} flyttades till ${to.named.label}: ${value}`)
  } else {
    text = `${placeName(from)} flyttades till ${placeName(to)}: ${value}`
  }
  return {
    change,
    profiles: to.profiles.map((p) => p.profile),
    label: to.named.label,
    fromLabel: from.named.label,
    text,
    source: from.named.complete && to.named.complete ? 'rule' : 'fallback',
  }
}

/** Describes one change; see describeChanges. */
export function describeChange(change: DiffChange, before: FhirResource, after: FhirResource, labels: LabelSet): ChangeDescription {
  const { from } = change
  if (change.kind === 'moved' && from !== undefined) return describeMove({ ...change, from }, before, after, labels)
  const place = namePlace(change, before, after, labels)
  return {
    change,
    profiles: place.profiles.map((p) => p.profile),
    label: place.named.label,
    text: withPrefix(place.prefix, sentence(change, place.named.label, labels)),
    source: place.named.complete ? 'rule' : 'fallback',
  }
}

/**
 * Turns the changes from diffResources into Swedish sentences such as
 * "HSA-id ändrades från ”X” till ”Y”" or "Telefon flyttades till Kontakt, telefon". Deterministic and free of IG knowledge:
 * everything profile specific comes from the label set. Both versions of the
 * resource are needed because slices are recognised from the whole list item,
 * which a change below the item does not carry.
 */
export function describeChanges(before: FhirResource, after: FhirResource, result: DiffResult, labels: LabelSet): ChangeDescription[] {
  return result.changes.map((change) => describeChange(change, before, after, labels))
}
