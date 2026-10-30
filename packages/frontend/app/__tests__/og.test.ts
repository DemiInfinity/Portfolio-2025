import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateMetadata as postMetadata } from '../blog/[slug]/page'
import { generateMetadata as projectMetadata } from '../projects/[slug]/page'
import { metadata as rootMetadata } from '../layout'

vi.mock('next/font/google', () => {
  const font = () => ({ variable: 'f', className: 'f' })
  return { Poppins: font, Playfair_Display: font, Dancing_Script: font, JetBrains_Mono: font, Source_Serif_4: font }
})

function api(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data }) }) as any
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://demitaylornimmo.com'
})

describe('Open Graph for sharing', () => {
  it('blog post: article, absolute url, cover image, large card', async () => {
    api({ slug: 'updates', title: 'Updates', excerpt: 'How it works', cover_image: 'https://cdn/x.jpg', tags: [] })
    const meta = await postMetadata({ params: Promise.resolve({ slug: 'updates' }) })
    const og = meta.openGraph as any
    expect(og.type).toBe('article')
    expect(og.url).toBe('https://demitaylornimmo.com/blog/updates')
    expect(og.description).toBe('How it works')
    expect(og.images[0].url).toBe('https://cdn/x.jpg')
    expect((meta.twitter as any).card).toBe('summary_large_image')
  })

  it('blog post without a cover falls back to the 1200×630 site image', async () => {
    api({ slug: 'plain', title: 'Plain', excerpt: 'x', cover_image: null, tags: [] })
    const og = (await postMetadata({ params: Promise.resolve({ slug: 'plain' }) })).openGraph as any
    expect(og.images[0]).toMatchObject({ url: 'https://demitaylornimmo.com/og-default.png', width: 1200, height: 630 })
  })

  it('case study: absolute url and image, falling back to the default', async () => {
    api({ slug: 'lunalore', title: 'LunaLore', description: 'Lore for VTubers', image: null })
    const meta = await projectMetadata({ params: Promise.resolve({ slug: 'lunalore' }) })
    const og = meta.openGraph as any
    expect(og.url).toBe('https://demitaylornimmo.com/projects/lunalore')
    expect(og.title).toContain('LunaLore')
    expect(og.description).toBe('Lore for VTubers')
    expect(og.images[0].url).toBe('https://demitaylornimmo.com/og-default.png')
    expect((meta.twitter as any).card).toBe('summary_large_image')
  })

  it('every other page gets the site default image', () => {
    expect((rootMetadata.openGraph as any).images[0]).toMatchObject({ url: '/og-default.png', width: 1200, height: 630 })
    expect((rootMetadata.twitter as any).card).toBe('summary_large_image')
  })
})
