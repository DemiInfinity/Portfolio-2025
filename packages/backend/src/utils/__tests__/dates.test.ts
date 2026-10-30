import { normaliseDate, InvalidDateError } from '../dates'

describe('normaliseDate', () => {
  it.each([
    ['2025-08', '2025-08-01'],
    ['2025-08-15', '2025-08-15'],
    ['2025-08-15T10:20:30.000Z', '2025-08-15'],
    ['2024-02-29', '2024-02-29'],
    [' 2025-08 ', '2025-08-01']
  ])('%s → %s', (input, expected) => {
    expect(normaliseDate(input)).toBe(expected)
  })

  it.each([[''], [null], [undefined], ['   ']])('%p → null', (input) => {
    expect(normaliseDate(input)).toBeNull()
  })

  it.each([['Aug 2025'], ['2025-13'], ['2025-02-30'], ['2023-02-29'], ['25-08'], [20250801], ['not a date']])(
    '%p is invalid',
    (input) => {
      expect(() => normaliseDate(input)).toThrow(InvalidDateError)
    }
  )
})
