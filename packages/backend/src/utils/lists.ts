/**
 * Reads a list column that may be stored as a JSON array, a JSON-encoded
 * string, a comma-separated string, or a single plain string. Always returns
 * `string[]` and never throws.
 */
export function toStringArray(value: unknown, plainSeparator: ',' | null = ','): string[] {
  if (value === null || value === undefined || value === '') return []
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined).map(String)
  if (typeof value === 'string') {
    const s = value.trim()
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed)) return parsed.filter((v) => v !== null && v !== undefined).map(String)
      } catch {
        // fall through to plain-string handling
      }
    }
    if (plainSeparator === null) return [s]
    return s.split(plainSeparator).map((t) => t.trim()).filter(Boolean)
  }
  return []
}

/**
 * Parses list input from a write: an array, or a string split on `separator`
 * (comma or newline). Items are trimmed and empties dropped. Returns null when
 * the value is not a list shape at all (caller turns that into a 400).
 */
export function parseListInput(value: unknown, separator: ',' | '\n'): string[] | null {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    if (!value.every((v) => typeof v === 'string' || typeof v === 'number')) return null
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const parts = separator === '\n' ? value.split(/\r?\n/) : value.split(',')
    return parts.map((t) => t.trim()).filter(Boolean)
  }
  return null
}
