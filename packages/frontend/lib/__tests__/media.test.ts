import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveMediaUrl, toMediaPath, CV_FILENAME, PDF_ROBOTS } from '../mediaUrl'
import { GET } from '../../app/media/[ref]/[...path]/route'

const SUPA = 'https://vtkekrttdxohsqqadzwu.supabase.co/storage/v1/object/public'

afterEach(() => vi.restoreAllMocks())

describe('own-domain media URLs (D-14)', () => {
  it('maps Supabase public storage to /media and leaves other URLs alone', () => {
    expect(resolveMediaUrl(`${SUPA}/portfolio-media/projects/luna.png`)).toBe('/media/vtkekrttdxohsqqadzwu/portfolio-media/projects/luna.png')
    expect(resolveMediaUrl(`${SUPA}/portfolio-media/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1730000000`)).toBe(
      '/media/vtkekrttdxohsqqadzwu/portfolio-media/site/cv/Demi-Taylor-Nimmo-CV.pdf?v=1730000000'
    )
    expect(resolveMediaUrl('//vtkekrttdxohsqqadzwu.supabase.co/storage/v1/object/public/a.png')).toBe('/media/vtkekrttdxohsqqadzwu/a.png')
    expect(resolveMediaUrl('https://cdn.example.com/x.png')).toBe('https://cdn.example.com/x.png')
    expect(toMediaPath('https://x.supabase.co/rest/v1/projects')).toBeNull()
  })

  it('no resolved URL ever points at supabase.co', () => {
    for (const src of [`${SUPA}/a.png`, `${SUPA.replace('https', 'http')}/b.jpg`, `//abcdefgh.supabase.co/storage/v1/object/public/c.webp`]) {
      expect(resolveMediaUrl(src)).not.toMatch(/supabase\.co/)
    }
  })
})

describe('/media route', () => {
  const call = (path: string[], ref = 'vtkekrttdxohsqqadzwu') =>
    GET(new Request(`https://demitaylornimmo.com/media/${ref}/${path.join('/')}`), { params: Promise.resolve({ ref, path }) })

  it('passes the body and safe headers, never Set-Cookie', async () => {
    const upstream = new Response('png-bytes', {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=60', 'set-cookie': '__cf_bm=abc; Domain=supabase.co' },
    })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream)
    const res = await call(['portfolio-media', 'projects', 'luna.png'])
    expect(fetchSpy.mock.calls[0][0]).toBe(`${SUPA}/portfolio-media/projects/luna.png`)
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(await res.text()).toBe('png-bytes')
    // No visitor cookies are forwarded upstream.
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toEqual({})
  })

  it('PDFs carry noindex and the CV download name', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('%PDF', { status: 200, headers: { 'content-type': 'application/pdf' } }))
    const res = await call(['portfolio-media', 'site', 'cv', 'Demi-Taylor-Nimmo-CV.pdf'])
    expect(res.headers.get('x-robots-tag')).toBe(PDF_ROBOTS)
    expect(res.headers.get('content-disposition')).toBe(`inline; filename="${CV_FILENAME}"`)
  })

  it('rejects bad refs and path tricks without contacting upstream', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect((await call(['a.png'], 'evil.example.com')).status).toBe(404)
    expect((await call(['..', 'secret'])).status).toBe(404)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
