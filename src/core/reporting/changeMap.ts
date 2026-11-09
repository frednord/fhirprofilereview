import { formatMovePaths } from '../diff/formatPath'
import type { ChangeKind, PathSegment } from '../diff/types'
import { getString, isJsonArray, isJsonObject } from '../parser/narrowing'
import type { FhirResource } from '../../types/fhir'
import type { JsonValue } from '../../types/json'
import { findElementLabel, findSlice, renderLabel, resourceName, selectProfiles } from './describeChanges'
import { formatValue } from './formatValue'
import type { ChangeDescription, LabelSet, ProfileLabels } from './types'

export type MapSide = 'before' | 'after'
export type NodeStatus = ChangeKind | 'unchanged'

/** One field or list item in one version of the resource. */
export interface MapNode {
  /** Unique across both trees, e.g. "before:/contact/0/telecom". */
  id: string
  side: MapSide
  /** JSON key, "[0]" for a list item, or the resource type at the root. */
  name: string
  /** Swedish name from the profile labels, when there is one. */
  label?: string
  /** The value as shown in a change description; for a container, a short summary. */
  value: string
  container: boolean
  /**
   * The change this node is part of. A field inside a removed or added parent
   * carries the parent's kind, but only the parent is `own`.
   */
  status: NodeStatus
  own: boolean
  /** The link that starts or ends here; only set when `own` is true. */
  linkId?: string
  /** Kinds of the own changes anywhere below, so the view knows which branches to open. */
  changesBelow: readonly ChangeKind[]
  children: MapNode[]
}

/**
 * One change drawn as an arrow. Moved and changed fields have both ends,
 * a removed field only a start and an added field only an end.
 */
export interface MapLink {
  id: string
  kind: ChangeKind
  description: ChangeDescription
  from?: string
  to?: string
  /** Short text next to the field in Före, also used where no arrows are drawn. */
  beforeNote?: string
  /** Short text next to the field in Efter. */
  afterNote?: string
}

export interface ChangeMap {
  before: MapNode
  after: MapNode
  links: MapLink[]
}

/** Long JSON summaries would push the tree columns apart. */
const MAX_SUMMARY_LENGTH = 80

function pointerAt(path: readonly PathSegment[], side: MapSide): string | undefined {
  let pointer = ''
  for (const segment of path) {
    if (segment.kind === 'property') pointer += `/${encodeURIComponent(segment.name)}`
    else {
      const index = side === 'before' ? segment.beforeIndex : segment.afterIndex
      if (index === undefined) return undefined
      pointer += `/${String(index)}`
    }
  }
  return pointer
}

function nodeId(side: MapSide, pointer: string | undefined): string | undefined {
  return pointer === undefined ? undefined : `${side}:${pointer}`
}

function notes(description: ChangeDescription, codes: LabelSet['codes']): Pick<MapLink, 'beforeNote' | 'afterNote'> {
  const { change } = description
  const before = formatValue(change.before ?? null, codes)
  const after = formatValue(change.after ?? null, codes)
  if (change.kind === 'removed') return { beforeNote: `Borttagen (var ${before})` }
  if (change.kind === 'added') return { afterNote: `Ny: ${after}` }
  if (change.kind === 'changed') return { beforeNote: `Ändrad till ${after}`, afterNote: `Ändrad från ${before}` }
  const fromLabel = description.fromLabel ?? ''
  const [fromPath, toPath] = change.from === undefined ? ['', ''] : formatMovePaths(change.from.path, change.path)
  // Two places with the same label, e.g. two contacts, are told apart by path.
  const [fromName, toName] = fromLabel === description.label ? [fromPath, toPath] : [fromLabel, description.label]
  return { beforeNote: `Flyttad till ${toName}`, afterNote: `Flyttad hit från ${fromName}` }
}

function buildLink(description: ChangeDescription, index: number, codes: LabelSet['codes']): MapLink {
  const { change } = description
  const link: MapLink = { id: `link:${String(index)}`, kind: change.kind, description, ...notes(description, codes) }
  const fromPath = change.kind === 'moved' && change.from !== undefined ? change.from.path : change.path
  const from = change.kind === 'added' ? undefined : nodeId('before', pointerAt(fromPath, 'before'))
  const to = change.kind === 'removed' ? undefined : nodeId('after', pointerAt(change.path, 'after'))
  if (from !== undefined) link.from = from
  if (to !== undefined) link.to = to
  return link
}

interface BuildContext {
  side: MapSide
  labels: LabelSet
  /** Node id to the link that starts or ends there. The first link wins. */
  owners: ReadonlyMap<string, MapLink>
}

interface Place {
  pointer: string
  name: string
  label: string | undefined
  /** FHIR element path without list positions; for a list item, the path of the list. */
  elementPath: string
  profiles: readonly ProfileLabels[]
  inherited: NodeStatus
}

function summarize(value: JsonValue, codes: LabelSet['codes']): string {
  const text = formatValue(value, codes)
  return text.length <= MAX_SUMMARY_LENGTH ? text : `${text.slice(0, MAX_SUMMARY_LENGTH - 1)}…`
}

/** Same rule as the diff: an object with a resourceType starts its own element paths and profiles. */
function enterValue(value: JsonValue, place: Place, labels: LabelSet): Pick<Place, 'elementPath' | 'profiles'> {
  if (!isJsonObject(value)) return place
  const type = getString(value, 'resourceType')
  if (type === undefined || type === '') return place
  return { elementPath: type, profiles: selectProfiles(labels, [value]) }
}

function itemLabel(item: JsonValue, place: Place, labels: LabelSet): string | undefined {
  if (isJsonObject(item) && typeof item['resourceType'] === 'string') return resourceName(selectProfiles(labels, [item]), item)
  const slice = findSlice(place.profiles, place.elementPath, item)
  return slice === undefined ? undefined : renderLabel(slice.label, item, labels)
}

function childPlaces(value: JsonValue, place: Place, status: NodeStatus, labels: LabelSet): [JsonValue, Place][] {
  const entered = enterValue(value, place, labels)
  if (isJsonObject(value)) {
    return Object.keys(value).map((key) => {
      const elementPath = `${entered.elementPath}.${key}`
      const child: Place = {
        pointer: `${place.pointer}/${encodeURIComponent(key)}`,
        name: key,
        label: findElementLabel(entered.profiles, elementPath),
        elementPath,
        profiles: entered.profiles,
        inherited: status,
      }
      return [value[key] ?? null, child]
    })
  }
  if (isJsonArray(value)) {
    return value.map((item, index) => {
      const child: Place = { ...place, pointer: `${place.pointer}/${String(index)}`, name: `[${String(index)}]`, inherited: status }
      child.label = itemLabel(item, place, labels)
      return [item, child]
    })
  }
  return []
}

function buildNode(value: JsonValue, place: Place, ctx: BuildContext): MapNode {
  const id = `${ctx.side}:${place.pointer}`
  const link = ctx.owners.get(id)
  const status: NodeStatus = link?.kind ?? place.inherited
  const children = childPlaces(value, place, status, ctx.labels).map(([child, childPlace]) => buildNode(child, childPlace, ctx))
  const below = new Set<ChangeKind>()
  for (const child of children) {
    if (child.own && child.status !== 'unchanged') below.add(child.status)
    for (const kind of child.changesBelow) below.add(kind)
  }
  const node: MapNode = {
    id,
    side: ctx.side,
    name: place.name,
    value: summarize(value, ctx.labels.codes),
    container: isJsonObject(value) || isJsonArray(value),
    status,
    own: link !== undefined,
    changesBelow: [...below],
    children,
  }
  if (place.label !== undefined) node.label = place.label
  if (link !== undefined) node.linkId = link.id
  return node
}

function ownersOf(links: readonly MapLink[]): Map<string, MapLink> {
  const owners = new Map<string, MapLink>()
  for (const link of links) {
    for (const end of [link.from, link.to]) if (end !== undefined && !owners.has(end)) owners.set(end, link)
  }
  return owners
}

function buildTree(resource: FhirResource, side: MapSide, labels: LabelSet, owners: ReadonlyMap<string, MapLink>): MapNode {
  const profiles = selectProfiles(labels, [resource])
  const place: Place = {
    pointer: '',
    name: resource.resourceType,
    label: profiles[0]?.resourceLabel,
    elementPath: resource.resourceType,
    profiles,
    inherited: 'unchanged',
  }
  return buildNode(resource, place, { side, labels, owners })
}

/**
 * The data behind the change map: both versions of the resource as trees,
 * and one link per change that says which node in Före it starts at and which
 * node in Efter it ends at. Pure and free of layout, so the view only has to
 * place rows and draw arrows between them.
 */
export function buildChangeMap(
  before: FhirResource,
  after: FhirResource,
  descriptions: readonly ChangeDescription[],
  labels: LabelSet,
): ChangeMap {
  const links = descriptions.map((description, index) => buildLink(description, index, labels.codes))
  const owners = ownersOf(links)
  return {
    before: buildTree(before, 'before', labels, owners),
    after: buildTree(after, 'after', labels, owners),
    links,
  }
}
