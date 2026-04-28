export type SortSpec = Record<string, 1 | -1>

/** Parses "fieldName: value" from a search string. Returns null for plain queries. */
function parseFieldSearch(q: string): { field: string; value: string } | null {
  const m = q.match(/^(\w+):\s*(.+)$/)
  return m ? { field: m[1], value: m[2].trim() } : null
}

/**
 * Builds a MongoDB filter from a search string.
 * Supports plain multi-field search or "field: value" syntax.
 * Returns null when the user specifies an unknown/invalid field — caller should
 * short-circuit and return { data: [], total: 0 } rather than hit the DB.
 */
export function buildSearchFilter(
  q: string,
  textFields: readonly string[],
  numericFields: readonly string[],
  fallback: Record<string, unknown>
): Record<string, unknown> | null {
  if (!q) return {}

  const parsed = parseFieldSearch(q)
  if (parsed) {
    const { field, value } = parsed
    if (numericFields.includes(field)) {
      const n = Number(value)
      return isNaN(n) ? null : { [field]: n }
    }
    if (textFields.includes(field)) {
      return { [field]: { $regex: value, $options: 'i' } }
    }
    return null // unrecognised field
  }

  return fallback
}

/** Builds a Mongoose sort spec, validating the field against an allowlist. */
export function buildSortSpec(
  field: string | null,
  dir: string | null,
  allowed: readonly string[],
  defaultSpec: SortSpec
): SortSpec {
  if (field && allowed.includes(field)) {
    return { [field]: dir === 'desc' ? -1 : 1 }
  }
  return defaultSpec
}
