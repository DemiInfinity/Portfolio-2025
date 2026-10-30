import * as cvPdf from '../cvPdf'
import { markCvDirty, debouncedBuild, kickIfOverdue, CV_PDF_PATH } from '../cvBuild'
import { buildCvData } from '../cvData'
import { setBackgroundRunner } from '../../utils/background'
import { mockServices } from '../../test/supabaseMock'

const T0 = new Date('2026-10-27T10:00:00.000Z')

describe('CV build pipeline', () => {
  let db: ReturnType<typeof mockServices>
  let tasks: Promise<void>[]
  let render: jest.SpyInstance

  const uploads = () =>
    (db.client.storage.from as jest.Mock).mock.results.reduce((n: number, r: any) => n + r.value.upload.mock.calls.length, 0)
  const row = () => db.rows('cv_build')[0]
  const settle = async () => {
    for (let i = 0; i < 5; i++) await Promise.all(tasks)
  }

  beforeEach(() => {
    jest.useFakeTimers({ now: T0 })
    delete process.env.CV_DEBOUNCE_MS
    tasks = []
    setBackgroundRunner((fn) => {
      tasks.push(fn())
    })
    db = mockServices({ tables: { cv_build: [{ id: 1, state: 'idle', requested_at: null, started_at: null, generated_at: null, content_hash: null, pdf_path: null, size_bytes: null, error: null }] } })
    render = jest.spyOn(cvPdf, 'renderCvPdf').mockResolvedValue(Buffer.from('%PDF-1.7 fake'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    setBackgroundRunner(() => {})
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('a burst of three edits 1 s apart → one render and one upload, after the last edit + debounce', async () => {
    await markCvDirty()
    await jest.advanceTimersByTimeAsync(1000)
    await markCvDirty()
    await jest.advanceTimersByTimeAsync(1000)
    await markCvDirty()
    expect(row().state).toBe('pending')
    await jest.advanceTimersByTimeAsync(7999)
    expect(render).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(1)
    await settle()
    expect(render).toHaveBeenCalledTimes(1)
    expect(uploads()).toBe(1)
    expect(row()).toMatchObject({ state: 'idle', pdf_path: CV_PDF_PATH, size_bytes: 13, error: null })
    expect(db.storage['portfolio-media'][CV_PDF_PATH]).toBeDefined()
  })

  it('records state pending on the row with a requested_at', async () => {
    await markCvDirty()
    const update = db.callsFor('cv_build', 'update')[0]
    expect(update.payload).toMatchObject({ state: 'pending', requested_at: T0.toISOString() })
  })

  it('two instances: the one that loses the claim does nothing', async () => {
    db.rows('cv_build')[0] = { ...row(), state: 'pending', requested_at: T0.toISOString() }
    const a = debouncedBuild(T0.toISOString())
    const b = debouncedBuild(T0.toISOString())
    await jest.advanceTimersByTimeAsync(8000)
    await Promise.all([a, b])
    expect(render).toHaveBeenCalledTimes(1)
    expect(uploads()).toBe(1)
  })

  it('identical content hash → no render, no upload, state idle', async () => {
    db.rows('cv_build')[0] = {
      ...row(),
      content_hash: cvPdf.cvContentHash(await buildCvData()),
      pdf_path: CV_PDF_PATH,
      generated_at: '2026-10-01T00:00:00.000Z'
    }
    await markCvDirty()
    await jest.advanceTimersByTimeAsync(8000)
    await settle()
    expect(render).not.toHaveBeenCalled()
    expect(uploads()).toBe(0)
    expect(row().state).toBe('idle')
    expect(row().generated_at).toBe('2026-10-01T00:00:00.000Z')
  })

  it('render throws → state failed with the error; previous PDF info kept', async () => {
    db.rows('cv_build')[0] = { ...row(), generated_at: '2026-10-01T00:00:00.000Z', pdf_path: CV_PDF_PATH }
    render.mockRejectedValue(new Error('font exploded'))
    await markCvDirty()
    await jest.advanceTimersByTimeAsync(8000)
    await settle()
    expect(row()).toMatchObject({ state: 'failed', error: 'font exploded', generated_at: '2026-10-01T00:00:00.000Z' })
  })

  it('an edit during the build → ends pending and schedules another debounced build', async () => {
    render.mockImplementation(async () => {
      db.rows('cv_build')[0].requested_at = new Date(Date.now() + 500).toISOString()
      return Buffer.from('%PDF-1.7 fake')
    })
    await markCvDirty()
    await jest.advanceTimersByTimeAsync(8000)
    await Promise.all(tasks.slice(0, 1))
    expect(row().state).toBe('pending')
    expect(tasks.length).toBe(2)
  })

  it('a database without the cv_build table: markCvDirty logs and does not throw', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    db = mockServices({ errors: { cv_build: { code: 'PGRST205', message: "Could not find the table 'public.cv_build'" } } })
    await expect(markCvDirty()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalled()
    expect(tasks).toHaveLength(0)
  })

  it('kickIfOverdue: pending > 60 s or building > 120 s schedules a build; fresh ones do not', () => {
    const now = T0.getTime()
    const base = { id: 1, generated_at: null, content_hash: null, pdf_path: null, size_bytes: null, error: null } as any
    expect(kickIfOverdue({ ...base, state: 'pending', requested_at: new Date(now - 30_000).toISOString(), started_at: null }, now)).toBe(false)
    expect(kickIfOverdue({ ...base, state: 'pending', requested_at: new Date(now - 61_000).toISOString(), started_at: null }, now)).toBe(true)
    expect(kickIfOverdue({ ...base, state: 'building', requested_at: null, started_at: new Date(now - 60_000).toISOString() }, now)).toBe(false)
    expect(kickIfOverdue({ ...base, state: 'building', requested_at: null, started_at: new Date(now - 121_000).toISOString() }, now)).toBe(true)
    expect(kickIfOverdue({ ...base, state: 'idle', requested_at: null, started_at: null }, now)).toBe(false)
    expect(kickIfOverdue(null, now)).toBe(false)
  })
})
