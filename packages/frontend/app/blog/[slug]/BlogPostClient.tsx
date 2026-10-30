'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import Markdown from '@/components/Markdown'
import ShareMenu, { SHARE_COPY_FAILED, copyToClipboard } from '@/components/ShareMenu'
import Spark from '@/components/ui/Spark'
import { Tag } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import type { BlogPost } from '@/lib/api'
import { formatLongDate } from '@/lib/format'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { postDate, postTags, readTime } from '@/lib/selectors'
import { author as authorCopy } from '@/lib/content/site'
import { useLocalStorage } from '@/lib/useClientStore'
import { useConsent } from '@/components/consent/useConsent'

export const LINK_COPIED = 'Link copied to your clipboard'
export const sparkleKey = (slug: string) => `post_sparkle:${slug}`

const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` }) as CSSProperties


function LinkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  )
}

/** Post page (Post). The post is fetched on the server and passed in; nothing is refetched here. */
export default function BlogPostClient({ post, url, keepReading = [] }: { post: BlogPost; url: string; keepReading?: BlogPost[] }) {
  const toast = useToast()
  // Q7: remembered per slug in this browser only; if storage is blocked it lasts for this visit.
  const [stored, setStored] = useLocalStorage(sparkleKey(post.slug))
  const [local, setLocal] = useState<boolean | null>(null)
  // A remembered sparkle is a preference: stored only with preference consent.
  const prefsAllowed = useConsent()?.prefs === true
  const sparkled = local ?? (prefsAllowed && stored === '1')
  const [burst, setBurst] = useState(false)
  const cover = resolveMediaUrl(post.cover_image)
  const tags = postTags(post)
  const mins = readTime(post)
  const date = formatLongDate(postDate(post))
  const meta = [mins, date].filter(Boolean).join(' · ')
  const name = post.author?.trim() || authorCopy.name

  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setBurst(false), 700)
    return () => clearTimeout(t)
  }, [burst])

  const copyLink = async () => {
    const ok = await copyToClipboard(url)
    toast.show(ok ? LINK_COPIED : SHARE_COPY_FAILED, ok ? 'info' : 'error')
  }

  const toggleSparkle = () => {
    const next = !sparkled
    setLocal(next)
    setBurst(next)
    if (prefsAllowed) setStored(next ? '1' : null)
  }

  return (
    <>
      <article>
        <header className="reading" style={{ paddingTop: 72, paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Link href="/blog" className="in" style={{ fontSize: 'var(--t-meta)', fontWeight: 600, color: 'var(--b2)', textDecoration: 'none', alignSelf: 'flex-start' }}>
            ← All posts
          </Link>
          <div className="in" style={{ ...delay(100), display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {post.category && <Tag>{post.category}</Tag>}
            {meta && <span style={{ fontSize: 'var(--t-meta)' }}>{meta}</span>}
          </div>
          <h1 className="serif in" style={{ ...delay(180), fontSize: 'clamp(40px, 5vw, 64px)', lineHeight: 1.08 }}>{post.title}</h1>
          <div className="in" style={{ ...delay(280), display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/demi-portrait.jpg" alt="" width={803} height={1000} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 30%' }} />
              <div>
                <p style={{ fontWeight: 600 }}>{name}</p>
                <p style={{ fontSize: 'var(--t-sm)' }}>{authorCopy.role}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-soft post-btn" onClick={copyLink}>
                <LinkIcon />
                Copy link
              </button>
              <ShareMenu url={url} title={post.title} label="Share this post" descriptions />
            </div>
          </div>
        </header>

        {cover && (
          <div className="wrap in" style={{ ...delay(350), maxWidth: 1000, paddingBottom: 56 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 28 }} />
          </div>
        )}

        <div className="reading" style={{ display: 'flex', flexDirection: 'column', gap: 26, paddingBottom: 80 }}>
          <Markdown variant="article">{post.content}</Markdown>
          {tags.length > 0 && (
            <div className="sv" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              {tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          )}
          <div className="sv" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '24px 28px', borderRadius: 24, background: '#fff', marginTop: 12 }}>
            <p style={{ fontSize: 17, fontWeight: 500 }}>Enjoyed this post?</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-fill post-btn" aria-pressed={sparkled} onClick={toggleSparkle} style={{ position: 'relative' }}>
                {burst && <Spark className="burst" style={{ position: 'absolute', left: 10, top: -18, width: 40, height: 40, color: 'var(--c1)' }} />}
                <Spark size={18} />
                {sparkled ? 'Sparkle sent' : 'Send a sparkle'}
              </button>
              <ShareMenu url={url} title={post.title} label="Share this post" descriptions up />
            </div>
          </div>
        </div>
      </article>

      <section style={{ background: '#f5efff', padding: '80px 0 100px' }}>
        <div className="wrap" style={{ maxWidth: 1000 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', padding: 28, borderRadius: 28, background: '#fff', marginBottom: keepReading.length ? 56 : 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/demi-portrait.jpg" alt="Portrait of Demi Taylor Nimmo" width={803} height={1000} loading="lazy" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', objectPosition: '50% 30%' }} />
            <div style={{ flex: 1, minWidth: 'min(240px, 100%)' }}>
              <p className="script" style={{ fontSize: 30, color: 'var(--b2)' }}>{authorCopy.cardTitle}</p>
              <p style={{ fontSize: 'var(--t-meta)', lineHeight: 1.6, marginTop: 4 }}>{authorCopy.bio}</p>
            </div>
            <Link href="/about" className="btn btn-soft post-btn">
              About me
            </Link>
          </div>
          {keepReading.length > 0 && (
            <>
              <h2 className="serif" style={{ fontSize: 32, marginBottom: 24 }}>Keep reading</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
                {keepReading.map((other) => {
                  const img = resolveMediaUrl(other.cover_image)
                  return (
                    <Link key={other.slug} href={`/blog/${other.slug}`} className="next-post">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" loading="lazy" style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 14, flex: 'none' }} />
                      )}
                      <div>
                        {other.category && <Tag>{other.category}</Tag>}
                        <p style={{ fontWeight: 600, marginTop: 8, lineHeight: 1.4 }}>{other.title}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
