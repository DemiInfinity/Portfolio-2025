'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import Spark from '@/components/ui/Spark'
import { Tag } from '@/components/ui/Chip'
import type { BlogPost } from '@/lib/api'
import { formatLongDate } from '@/lib/format'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { categoryCounts, postDate, readTime, selectBlogView } from '@/lib/selectors'
import { contact } from '@/lib/content/site'

const tw = (style: CSSProperties, d: string) => ({ ...style, ['--d' as string]: d }) as CSSProperties

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function FeaturedCard({ post }: { post: BlogPost }) {
  const cover = resolveMediaUrl(post.cover_image)
  const mins = readTime(post)
  return (
    <section className="wrap" style={{ paddingTop: 72 }}>
      <Link href={`/blog/${post.slug}`} className="post blog-featured pop-in" aria-label={`Featured post: ${post.title}`}>
        <div style={{ overflow: 'clip', minHeight: 320, background: '#f1e8ff' }}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          )}
        </div>
        <div style={{ padding: 'clamp(28px, 4vw, 52px)', display: 'flex', flexDirection: 'column', gap: 18, justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tag fill>Featured</Tag>
            {post.category && <Tag>{post.category}</Tag>}
            {mins && <span style={{ fontSize: 'var(--t-sm)' }}>{mins}</span>}
          </div>
          <h2 className="serif" style={{ fontSize: 'clamp(30px, 2.8vw, 42px)', lineHeight: 1.15 }}>{post.title}</h2>
          {post.excerpt && <p style={{ lineHeight: 1.65 }}>{post.excerpt}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, width: '100%', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--t-meta)' }}>{formatLongDate(postDate(post))}</span>
            <span className="readmore">
              Read the post <Arrow />
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}

function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const cover = resolveMediaUrl(post.cover_image)
  const mins = readTime(post)
  return (
    <Link href={`/blog/${post.slug}`} className="post pop-in" style={{ ['--d' as string]: `${index * 90}ms` } as CSSProperties}>
      <div style={{ overflow: 'clip', aspectRatio: '16 / 10', background: '#f1e8ff' }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>
      <div style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {post.category && <Tag>{post.category}</Tag>}
          {mins && <span style={{ fontSize: 'var(--t-sm)' }}>{mins}</span>}
        </div>
        <h3 className="serif" style={{ fontSize: 24, lineHeight: 1.25 }}>{post.title}</h3>
        {post.excerpt && <p style={{ fontSize: 'var(--t-meta)', lineHeight: 1.6 }}>{post.excerpt}</p>}
        <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--t-sm)' }}>{formatLongDate(postDate(post))}</span>
          <span className="readmore" style={{ fontSize: 'var(--t-meta)' }}>
            Read <Arrow size={16} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function BlogClient({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState<string | null>(null)
  const categories = categoryCounts(posts)
  const { featured, rest } = selectBlogView(posts, category)
  const filters = [{ id: null as string | null, label: 'All', count: posts.length }, ...categories.map((c) => ({ id: c.name, label: c.name, count: c.count }))]

  return (
    <>
      <div className="under-header" style={{ background: 'linear-gradient(160deg, #f8f4ff 0%, #fff8f0 55%, #efe4ff 100%)' }}>
        <section className="wrap" style={{ paddingTop: 90, paddingBottom: 80, position: 'relative' }}>
          <Spark className="twinkle" style={tw({ position: 'absolute', right: '10%', top: 60, width: 30, height: 30, color: 'var(--c1)' }, '.2s')} />
          <Spark className="twinkle hide-sm" style={tw({ position: 'absolute', right: '26%', top: 150, width: 18, height: 18, color: '#b9a6ff' }, '1.3s')} />
          <h1 className="serif in" style={{ fontSize: 'clamp(52px, 6.4vw, 96px)', lineHeight: 1.05 }}>
            The{' '}
            <span className="script grad-text" style={{ fontSize: '1.15em', color: 'var(--c2)', paddingRight: '.1em' }}>
              blog
            </span>
          </h1>
          <p className="in" style={{ ['--d' as string]: '200ms', marginTop: 18, fontSize: 'var(--t-lead)', lineHeight: 1.6, maxWidth: '50ch' } as CSSProperties}>
            Tutorials, architecture notes and lessons learned from building real applications.
          </p>
          {posts.length > 0 && (
            <div className="in" role="group" aria-label="Filter posts by topic" style={{ ['--d' as string]: '350ms', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 32 } as CSSProperties}>
              {filters.map((f) => (
                <button key={f.label} type="button" className="blog-filter" aria-pressed={category === f.id} onClick={() => setCategory(f.id)}>
                  {f.label} <span style={{ opacity: 0.7 }}>{f.count}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {posts.length === 0 ? (
        <section className="wrap" style={{ paddingTop: 72, paddingBottom: 120 }}>
          <p style={{ fontSize: 'var(--t-lead)' }}>The first post is on its way.</p>
        </section>
      ) : (
        <>
          {featured && <FeaturedCard post={featured} />}
          {rest.length > 0 && (
            <section className="wrap" style={{ paddingTop: 72, paddingBottom: 120 }}>
              <h2 className="serif sv" style={{ fontSize: 'clamp(28px, 2.6vw, 38px)', marginBottom: 32 }}>
                {category ? `${category} posts` : 'More posts'}
              </h2>
              <div className="blog-grid" key={category ?? 'all'}>
                {rest.map((post, i) => (
                  <PostCard key={post.slug} post={post} index={i} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="wrap" style={{ paddingBottom: 110, paddingTop: rest.length > 0 ? 0 : 72 }}>
        <div className="sv" style={{ position: 'relative', overflow: 'clip', borderRadius: 36, background: 'linear-gradient(135deg, var(--c1) 0%, var(--b1) 55%, var(--b2) 100%)', color: '#fff', padding: 'clamp(36px, 5vw, 64px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <Spark className="twinkle" style={tw({ position: 'absolute', right: '4%', top: '12%', width: 26, height: 26, color: '#fff' }, '.5s')} />
          <div>
            <h2 className="script" style={{ fontSize: 'clamp(44px, 5vw, 72px)', lineHeight: 1.05 }}>Never miss a post</h2>
            <p style={{ marginTop: 10, fontSize: 'var(--t-lead)', maxWidth: '40ch', lineHeight: 1.6 }}>I share every new article on LinkedIn first.</p>
          </div>
          <a className="btn" href={contact.linkedin} style={{ background: '#fff', color: 'var(--b2)' }}>
            Follow on LinkedIn
          </a>
        </div>
      </section>
    </>
  )
}
