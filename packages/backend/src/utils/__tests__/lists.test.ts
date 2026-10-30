import { toStringArray, parseListInput } from '../lists'

describe('toStringArray', () => {
  it('reads arrays, JSON strings, comma strings and empties', () => {
    expect(toStringArray(['a', 'b'])).toEqual(['a', 'b'])
    expect(toStringArray('["a","b"]')).toEqual(['a', 'b'])
    expect(toStringArray('a, b ,')).toEqual(['a', 'b'])
    expect(toStringArray(null)).toEqual([])
    expect(toStringArray('')).toEqual([])
    expect(toStringArray('[broken')).toEqual(['[broken'])
    expect(toStringArray('one, two', null)).toEqual(['one, two'])
  })
})

describe('parseListInput', () => {
  it('splits strings on the separator and drops blanks', () => {
    expect(parseListInput('a\n\n b \r\nc', '\n')).toEqual(['a', 'b', 'c'])
    expect(parseListInput('x, y,', ',')).toEqual(['x', 'y'])
    expect(parseListInput([' a ', '', 'b'], ',')).toEqual(['a', 'b'])
    expect(parseListInput(undefined, ',')).toEqual([])
  })
  it('rejects non-list shapes', () => {
    expect(parseListInput({ a: 1 }, ',')).toBeNull()
    expect(parseListInput([{}], ',')).toBeNull()
  })
})
