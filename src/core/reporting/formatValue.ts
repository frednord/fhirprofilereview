import type { JsonObject, JsonValue } from '../../types/json'
import { getArray, getOwn, getString, isJsonArray, isJsonObject } from '../parser/narrowing'

export const CONTACT_POINT_SYSTEM = 'http://hl7.org/fhir/contact-point-system'

const MAX_JSON_LENGTH = 120

type CodeLabels = Readonly<Record<string, string>>

/** Swedish name of a code, or undefined when the label data does not cover it. */
export function codeLabel(codes: CodeLabels, system: string | undefined, code: string): string | undefined {
  return system === undefined ? undefined : getOwn(codes, `${system}|${code}`)
}

/** Name of a Coding without its code, for use inside a label. */
export function codingName(coding: JsonObject, codes: CodeLabels): string | undefined {
  const code = getString(coding, 'code')
  if (code === undefined) return getString(coding, 'display')
  return codeLabel(codes, getString(coding, 'system'), code) ?? getString(coding, 'display') ?? code
}

function formatCoding(coding: JsonObject, codes: CodeLabels): string {
  const code = getString(coding, 'code') ?? ''
  const name = codeLabel(codes, getString(coding, 'system'), code) ?? getString(coding, 'display')
  return name === undefined ? code : `${name} (${code})`
}

function joinParts(parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join(', ')
}

function formatAddress(address: JsonObject): string {
  const lines = getArray(address, 'line').filter((line): line is string => typeof line === 'string')
  const place = [getString(address, 'postalCode'), getString(address, 'city')].filter((p) => p !== undefined).join(' ')
  return joinParts([...lines, place])
}

function formatContactPoint(point: JsonObject, codes: CodeLabels): string {
  const system = getString(point, 'system') ?? ''
  const name = codeLabel(codes, CONTACT_POINT_SYSTEM, system) ?? system
  return `${name} ${getString(point, 'value') ?? ''}`.trim()
}

function formatPeriod(period: JsonObject): string {
  return `${getString(period, 'start') ?? '?'} – ${getString(period, 'end') ?? 'tills vidare'}`
}

function choiceValue(extension: JsonObject): JsonValue | undefined {
  const key = Object.keys(extension).find((k) => /^value[A-Z]/.test(k))
  return key === undefined ? undefined : extension[key]
}

function isContactPoint(obj: JsonObject, codes: CodeLabels): boolean {
  const system = getString(obj, 'system')
  return system !== undefined && codeLabel(codes, CONTACT_POINT_SYSTEM, system) !== undefined && 'value' in obj
}

/**
 * Recognises common FHIR data types by shape, because a diff value carries no
 * type information. Checked from most to least specific; anything unknown is
 * shown as compact JSON.
 */
function formatObject(obj: JsonObject, codes: CodeLabels): string {
  if (typeof obj['resourceType'] === 'string') return `${obj['resourceType']}/${getString(obj, 'id') ?? '?'}`
  if (typeof obj['url'] === 'string' && choiceValue(obj) !== undefined) return formatValue(choiceValue(obj) ?? null, codes)
  if (typeof obj['code'] === 'string' && ('system' in obj || 'display' in obj)) return formatCoding(obj, codes)
  if (isJsonArray(obj['coding'])) return joinParts(getArray(obj, 'coding').filter(isJsonObject).map((c) => formatCoding(c, codes)))
  if (typeof obj['reference'] === 'string') return getString(obj, 'reference') ?? ''
  if (isContactPoint(obj, codes)) return formatContactPoint(obj, codes)
  if (typeof obj['value'] === 'string') return quote(getString(obj, 'value') ?? '')
  if ('start' in obj || 'end' in obj) return formatPeriod(obj)
  if ('line' in obj || 'city' in obj || 'postalCode' in obj) return formatAddress(obj)
  if ('telecom' in obj || 'address' in obj) return formatContactDetail(obj, codes)
  return truncate(JSON.stringify(obj))
}

function formatContactDetail(contact: JsonObject, codes: CodeLabels): string {
  const telecom = getArray(contact, 'telecom').filter(isJsonObject).map((t) => formatContactPoint(t, codes))
  const address = isJsonObject(contact['address']) ? [formatAddress(contact['address'])] : []
  return joinParts([...telecom, ...address])
}

function quote(text: string): string {
  return `”${text}”`
}

function truncate(text: string): string {
  return text.length <= MAX_JSON_LENGTH ? text : `${text.slice(0, MAX_JSON_LENGTH - 1)}…`
}

/** Renders a value from a diff for a Swedish sentence. */
export function formatValue(value: JsonValue, codes: CodeLabels): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'ja' : 'nej'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return quote(value)
  if (isJsonArray(value)) return joinParts(value.map((item) => formatValue(item, codes)))
  return formatObject(value, codes)
}
