import { describe, it, expect } from 'vitest'
import { commas, daysUntil, duration, fmtDay, fmtMon, fmtMonth, lines, monthOf, monthRange, monthToApi, monthsInclusive, slugify, toArray } from '../format'

describe('format', () => {
  it('formats days and months', () => {
    expect(fmtDay('2026-04-01T00:00:00Z')).toBe('1 Apr 2026')
    expect(fmtDay(null)).toBe('—')
    expect(fmtMon('2025-08-01')).toBe('Aug 2025')
    expect(fmtMonth('2025-12-01')).toBe('December 2025')
  })

  it('maps month inputs to and from the API', () => {
    expect(monthToApi('2025-08')).toBe('2025-08-01')
    expect(monthToApi('')).toBeNull()
    expect(monthOf('2025-08-01T00:00:00.000Z')).toBe('2025-08')
  })

  it('builds the work ranges and lengths from the design', () => {
    expect(monthRange('2025-08-01', null)).toBe('Aug 2025 – now')
    expect(duration(monthsInclusive('2025-08-01', '2026-10'))).toBe('1 yr 3 mos')
    expect(monthRange('2024-06-01', '2024-08-01')).toBe('Jun – Aug 2024')
    expect(duration(monthsInclusive('2024-06-01', '2024-08-01'))).toBe('3 mos')
    expect(monthRange('2022-07-01', '2024-06-01')).toBe('Jul 2022 – Jun 2024')
    expect(duration(12)).toBe('1 yr')
    expect(duration(25)).toBe('2 yrs 1 mo')
  })

  it('counts days until a date', () => {
    const today = new Date(2026, 9, 27)
    expect(daysUntil('2026-12-01', today)).toBe(35)
    expect(daysUntil('2026-01-01', today)).toBeLessThan(0)
  })

  it('splits lines and commas, dropping blanks', () => {
    expect(lines('a\n\n b \n')).toEqual(['a', 'b'])
    expect(commas('A, B ,C,')).toEqual(['A', 'B', 'C'])
    expect(toArray('["x","y"]')).toEqual(['x', 'y'])
    expect(toArray('x, y')).toEqual(['x', 'y'])
    expect(toArray(null)).toEqual([])
  })

  it('slugifies titles', () => {
    expect(slugify('My New App!')).toBe('my-new-app')
  })
})
