import { describe, it, expect } from 'vitest'
import { emptyCase, fromCaseForm, newMetric, newPhase, serverPathToForm, toCaseForm, validateCase } from '../caseStudy'

describe('caseStudy', () => {
  it('sends only the filled keys, and null when everything is empty', () => {
    expect(fromCaseForm({ ...emptyCase(), overview: ' Hello ' }).value).toEqual({ overview: 'Hello' })
    expect(fromCaseForm(emptyCase()).value).toBeNull()
  })

  it('drops items missing their required text', () => {
    const f = { ...emptyCase(), metrics: [{ ...newMetric(), value: '30%' }, { ...newMetric(), value: '50%', label: 'faster builds' }] }
    expect(fromCaseForm(f).value).toEqual({ metrics: [{ value: '50%', label: 'faster builds' }] })
  })

  it('round-trips the API shape', () => {
    const api = { overview: 'O', architecture: { summary: 'S', steps: [{ title: 'Electron app', detail: 'Shell' }] }, process: [{ label: 'Discover', title: 'Talk', body: 'B' }] }
    expect(fromCaseForm(toCaseForm(api)).value).toEqual(api)
  })

  it('requires an image description when there is an image, and caps lengths', () => {
    const f = { ...emptyCase(), overview: 'x'.repeat(5001), process: [{ ...newPhase(), title: 'T', image: 'https://x/y.png' }] }
    const e = validateCase(f)
    expect(e['process.0.image_alt']).toBe('Describe the image.')
    expect(e.overview).toBe('Keep this under 5000 characters.')
  })

  it('maps server paths back to form rows past dropped items', () => {
    const f = { ...emptyCase(), challenges: [{ _k: 'a', title: '', solution: '' }, { _k: 'b', title: 'Real', solution: '' }] }
    const { index } = fromCaseForm(f)
    expect(serverPathToForm('case_study.challenges[0].title', index)).toBe('challenges.1.title')
    expect(serverPathToForm('case_study.architecture.steps[2].detail', index)).toBe('steps.2.detail')
    expect(serverPathToForm('case_study.overview', index)).toBe('overview')
  })
})
