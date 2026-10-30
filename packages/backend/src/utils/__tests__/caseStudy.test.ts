import { normaliseCaseStudy, featureTitles, hasCaseStudy, readCaseStudy } from '../caseStudy'

describe('normaliseCaseStudy', () => {
  it('null clears', () => {
    expect(normaliseCaseStudy(null)).toEqual({ value: null, errors: [] })
  })

  it('trims, drops empty strings and empty list items', () => {
    const { value, errors } = normaliseCaseStudy({
      overview: '  O  ',
      problem: '',
      process: [{ title: '', body: '' }],
      metrics: [{ value: '30%', label: 'lower costs' }, { value: '', label: 'x' }],
      features: [{ title: ' F ', body: 'b' }]
    })
    expect(errors).toEqual([])
    expect(value).toEqual({
      overview: 'O',
      process: [],
      metrics: [{ value: '30%', label: 'lower costs' }],
      features: [{ title: 'F', body: 'b', image: null }]
    })
  })

  it('caps process at 8 and metrics at 6', () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ title: `P${i}` }))
    expect(normaliseCaseStudy({ process: nine }).errors[0].path).toBe('case_study.process')
    expect(normaliseCaseStudy({ process: nine.slice(0, 8) }).errors).toEqual([])
    const seven = Array.from({ length: 7 }, () => ({ value: '1', label: 'l' }))
    expect(normaliseCaseStudy({ metrics: seven }).errors[0].path).toBe('case_study.metrics')
  })

  it('rejects unknown keys and wrong types with dotted paths', () => {
    expect(normaliseCaseStudy({ foo: 1 }).errors[0].path).toBe('case_study.foo')
    expect(normaliseCaseStudy({ process: [{ title: 'a' }, { title: 5 }] }).errors[0].path).toBe('case_study.process[1].title')
    expect(normaliseCaseStudy({ architecture: { steps: [{ title: 'a', nope: 1 }] } }).errors[0].path).toBe('case_study.architecture.steps[0].nope')
    expect(normaliseCaseStudy({ features: [{ title: 'a', image: 'javascript:x' }] }).errors[0].path).toBe('case_study.features[0].image')
    expect(normaliseCaseStudy({ how_might_we: 'x'.repeat(301) }).errors[0].path).toBe('case_study.how_might_we')
    expect(normaliseCaseStudy('text').errors[0].path).toBe('case_study')
  })

  it('feature titles and has_case_study helpers', () => {
    const cs = readCaseStudy('{"overview":"O","features":[{"title":"A"},{"title":"B"}]}')
    expect(hasCaseStudy(cs)).toBe(true)
    expect(featureTitles(cs)).toEqual(['A', 'B'])
    expect(featureTitles(null)).toEqual([])
    expect(hasCaseStudy({ overview: '  ' })).toBe(false)
  })
})
