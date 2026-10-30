import { describe, it, expect } from 'vitest'
import { formatRange, formatLongDate, yearsSince, formatMonthYear, slugify } from '../format'

describe('formatRange', () => {
  it('site style', () => {
    expect(formatRange('2025-08-01', null, 'site')).toBe('Aug 2025 – now')
    expect(formatRange('2024-06-01', '2024-08-01', 'site')).toBe('Jun – Aug 2024')
    expect(formatRange('2022-07-01', '2024-06-01', 'site')).toBe('Jul 2022 – Jun 2024')
  })
  it('cv style', () => {
    expect(formatRange('2024-06-01', '2024-08-01', 'cv')).toBe('Jun 2024 – Aug 2024')
    expect(formatRange('2025-08-01', null, 'cv')).toBe('Aug 2025 – Present')
  })
  it('accepts full ISO timestamps without shifting the month', () => {
    expect(formatRange('2025-08-01T00:00:00.000Z', undefined)).toBe('Aug 2025 – now')
  })
  it('returns an empty string without a start', () => {
    expect(formatRange(null, null)).toBe('')
  })
})

describe('date helpers', () => {
  it('formatLongDate', () => {
    expect(formatLongDate('2026-01-07')).toBe('7 January 2026')
    expect(formatLongDate('2026-04-01')).toBe('1 April 2026')
    expect(formatLongDate(null)).toBe('')
  })
  it('formatMonthYear', () => {
    expect(formatMonthYear('2025-03-14', true)).toBe('March 2025')
  })
  it('yearsSince', () => {
    expect(yearsSince('2021-02-01', new Date('2026-10-27'))).toBe(5)
    expect(yearsSince('2021-11-01', new Date('2026-10-27'))).toBe(4)
  })
  it('slugify', () => {
    expect(slugify('The problem')).toBe('the-problem')
    expect(slugify('What I’ve learned!')).toBe('what-ive-learned')
  })
})
