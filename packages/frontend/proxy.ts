import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Real HTTP status codes for detail pages.
 *
 * The root loading.tsx gives every client navigation an immediate "Waking the
 * server…" boundary (QA B-2), but it also means detail pages start streaming
 * (status 200) before notFound()/redirect() can run. Next's docs: check the
 * resource in proxy, before the response streams. So here:
 *   - /projects/:slug and /blog/:slug that the API 404s → the not-found page, HTTP 404
 *   - /projects/:id (numeric) → 307 to /projects/:slug
 * Any API error or timeout falls through to the page, whose error.tsx handles it.
 * Kept self-contained (no shared modules), as the proxy docs advise.
 */

export const config = {
  matcher: ['/projects/:slug', '/blog/:slug'],
}

const API = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'https://api.demitaylornimmo.com/api'
const NOT_FOUND_PATH = '/__not-found'
const TIMEOUT_MS = 8000

async function lookup(url: string): Promise<{ status: number; slug?: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (response.status === 404) return { status: 404 }
    if (!response.ok) return null
    const body = await response.json().catch(() => null)
    return { status: 200, slug: typeof body?.data?.slug === 'string' ? body.data.slug : undefined }
  } catch {
    return null // unreachable or slow: let the page and its error.tsx decide
  } finally {
    clearTimeout(timer)
  }
}

function notFound(request: NextRequest) {
  // An unmatched path renders app/not-found.tsx with a real 404 status. The
  // original path goes along so the header and footer render for the URL the
  // visitor sees (components/SitePathname.tsx), avoiding a hydration mismatch.
  const headers = new Headers(request.headers)
  headers.set('x-original-pathname', request.nextUrl.pathname)
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url), { request: { headers } })
}

export async function proxy(request: NextRequest) {
  const [, section, rawSlug] = request.nextUrl.pathname.split('/')
  const slug = decodeURIComponent(rawSlug || '')
  if (!slug) return NextResponse.next()

  if (section === 'projects') {
    if (/^\d+$/.test(slug)) {
      const found = await lookup(`${API}/projects/${slug}`)
      if (found?.status === 404) return notFound(request)
      if (found?.slug) {
        const target = new URL(`/projects/${encodeURIComponent(found.slug)}`, request.url)
        target.search = request.nextUrl.search
        return NextResponse.redirect(target, 307)
      }
      return NextResponse.next()
    }
    const found = await lookup(`${API}/projects/slug/${encodeURIComponent(slug)}`)
    return found?.status === 404 ? notFound(request) : NextResponse.next()
  }

  if (section === 'blog') {
    const found = await lookup(`${API}/blog/${encodeURIComponent(slug)}`)
    return found?.status === 404 ? notFound(request) : NextResponse.next()
  }

  return NextResponse.next()
}
