/**
 * Same-origin proxy for Supabase public storage (D-14, compliance MUST-1).
 * The browser only ever talks to this site; Supabase (and its Cloudflare edge,
 * which sets `__cf_bm`) only ever sees this server. Only safe headers are
 * passed back, so no Set-Cookie can reach the visitor.
 */

import { CV_FILENAME, PDF_ROBOTS } from '@/lib/mediaUrl'

export const dynamic = 'force-dynamic'

const PASS_HEADERS = ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified', 'accept-ranges', 'content-range']
const REF = /^[a-z0-9]{6,40}$/

export async function GET(request: Request, { params }: { params: Promise<{ ref: string; path: string[] }> }) {
  const { ref, path } = await params
  if (!REF.test(ref) || !path?.length || path.some((p) => p === '..' || p === '.' || p === '')) {
    return new Response('Not found', { status: 404 })
  }
  const upstream = `https://${ref}.supabase.co/storage/v1/object/public/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`

  let response: Response
  try {
    const headers: Record<string, string> = {}
    const range = request.headers.get('range')
    if (range) headers.range = range
    // No cookies, referrer or client IP are forwarded upstream.
    response = await fetch(upstream, { headers, cache: 'no-store', redirect: 'follow' })
  } catch {
    return new Response('Bad gateway', { status: 502 })
  }

  const headers = new Headers()
  for (const name of PASS_HEADERS) {
    const value = response.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=3600')
  const fileName = path[path.length - 1]
  if (/\.pdf$/i.test(fileName) || (headers.get('content-type') || '').includes('application/pdf')) {
    // The CV and any other PDF stay out of search engines (D-5) and download with a readable name.
    headers.set('x-robots-tag', PDF_ROBOTS)
    const name = /cv/i.test(fileName) ? CV_FILENAME : fileName.replace(/[^\w.-]+/g, '-')
    headers.set('content-disposition', `inline; filename="${name}"`)
  }
  headers.set('x-content-type-options', 'nosniff')
  return new Response(response.body, { status: response.status, headers })
}
