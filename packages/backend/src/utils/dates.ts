/**
 * Normalises a date input to `YYYY-MM-DD`.
 *
 * Accepts `YYYY-MM` (month inputs → first of the month), `YYYY-MM-DD`, and a
 * full ISO timestamp (date part kept). `''`, null and undefined → null.
 * Anything else throws `InvalidDateError`.
 */
export class InvalidDateError extends Error {
  constructor(value: unknown) {
    super(`Invalid date: ${String(value)}`)
    this.name = 'InvalidDateError'
  }
}

function validYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return d <= days
}

export function normaliseDate(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new InvalidDateError(value)
  const v = value.trim()
  if (v === '') return null

  let m = /^(\d{4})-(\d{2})$/.exec(v)
  if (m) {
    if (!validYmd(+m[1], +m[2], 1)) throw new InvalidDateError(value)
    return `${m[1]}-${m[2]}-01`
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.exec(v)
  if (m) {
    if (!validYmd(+m[1], +m[2], +m[3])) throw new InvalidDateError(value)
    return `${m[1]}-${m[2]}-${m[3]}`
  }
  throw new InvalidDateError(value)
}

/** express-validator custom validator: passes for anything normaliseDate accepts. */
export function isDateInput(value: unknown): boolean {
  normaliseDate(value)
  return true
}

/** Like isDateInput but the value must not be empty. */
export function isRequiredDateInput(value: unknown): boolean {
  if (normaliseDate(value) === null) throw new Error('Date is required')
  return true
}
