import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '@/lib/api'
import { apiError, fieldErrors } from '@/lib/errors'
import { commas, dayOf, fmtDay, isoDay, slugify, toArray } from '@/lib/format'
import { useQ } from '@/hooks/useQ'
import { useEditParam } from '@/hooks/useEditParam'
import Dialog, { SaveButton } from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Field from '@/components/ui/Field'
import Switch from '@/components/ui/Switch'
import Segmented from '@/components/ui/Segmented'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { ImageUploadButton } from '@/components/ImageUploadButton'

export interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  content?: string
  author?: string
  publish_date?: string
  created_at?: string
  read_time?: number
  category?: string
  tags: string[]
  featured: boolean
  published: boolean
  cover_image?: string | null
}

type Draft = { title: string; slug: string; excerpt: string; cover: string; content: string; category: string; mins: string; tags: string; author: string; date: string; featured: boolean; published: boolean }
type Filter = 'all' | 'pub' | 'draft'

export const BLOG_KEY = ['blog'] as const

export const fetchPosts = async (): Promise<BlogPost[]> => {
  const res = await api.get('/blog/admin/all')
  return ((res.data?.data || []) as BlogPost[]).map((p) => ({ ...p, tags: toArray(p.tags), publish_date: p.publish_date || p.created_at }))
}

export const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length
export const readMins = (words: number) => Math.max(1, Math.round(words / 220))

/** Newest published first. */
export const publishedNewestFirst = (posts: BlogPost[]) =>
  posts.filter((p) => p.published).sort((a, b) => (dayOf(a.publish_date) < dayOf(b.publish_date) ? 1 : -1))

const newDraft = (): Draft => ({ title: '', slug: '', excerpt: '', cover: '', content: '', category: '', mins: '5', tags: '', author: 'Demi Taylor Nimmo', date: isoDay(new Date()), featured: false, published: false })

const toDraft = (p: BlogPost): Draft => ({
  title: p.title || '',
  slug: p.slug || '',
  excerpt: p.excerpt || '',
  cover: p.cover_image || '',
  content: p.content || '',
  category: p.category || '',
  mins: String(p.read_time ?? ''),
  tags: p.tags.join(', '),
  author: p.author || 'Demi Taylor Nimmo',
  date: dayOf(p.publish_date),
  featured: !!p.featured,
  published: !!p.published,
})

const toBody = (d: Draft) => ({
  title: d.title.trim(),
  slug: d.slug.trim() || slugify(d.title),
  excerpt: d.excerpt.trim(),
  content: d.content,
  category: d.category.trim(),
  read_time: Number(d.mins) || readMins(wordCount(d.content)),
  tags: commas(d.tags),
  author: d.author.trim() || 'Demi Taylor Nimmo',
  publish_date: d.date || undefined,
  cover_image: d.cover.trim() || null,
  featured: d.featured,
  published: d.published,
})

const PATH: Record<string, keyof Draft> = { title: 'title', slug: 'slug', excerpt: 'excerpt', content: 'content', category: 'category', read_time: 'mins', tags: 'tags', author: 'author', publish_date: 'date', cover_image: 'cover' }

const GRID = 'minmax(0, 1fr) 120px 100px 120px 80px'

export default function Blog() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q, setQ] = useQ()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const { data: posts, isLoading } = useQuery({ queryKey: BLOG_KEY, queryFn: fetchPosts })

  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [d, setD] = useState<Draft>(newDraft)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)

  const open = (p: BlogPost | null) => {
    setEditId(p ? p.id : 'new')
    setD(p ? toDraft(p) : newDraft())
    setTab('write')
    setTried(false)
    setServerErr({})
    setConfirming(false)
  }
  const close = () => setEditId(null)
  useEditParam(posts, open)

  // ?new=1 (from the Dashboard's "Write a post") opens the new-post dialog, then the param goes.
  const wantsNew = params.get('new') === '1'
  useEffect(() => {
    if (!wantsNew) return
    open(null)
    setParams((p) => {
      const n = new URLSearchParams(p)
      n.delete('new')
      return n
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((p) => {
      const next = { ...p, [k]: v }
      if (k === 'title' && editId === 'new') next.slug = slugify(String(v))
      return next
    })
    setServerErr((e) => ({ ...e, [k]: '' }))
  }

  const clientErr = (k: keyof Draft): string | null => {
    if (!tried) return null
    if (k === 'title' && !d.title.trim()) return 'Give the post a title.'
    if (!d.published) return null
    if (k === 'excerpt' && !d.excerpt.trim()) return 'Add an excerpt.'
    if (k === 'content' && !d.content.trim()) return 'Write the post before publishing.'
    if (k === 'category' && !d.category.trim()) return 'Add a category.'
    return null
  }
  const err = (k: keyof Draft) => clientErr(k) || serverErr[k] || null

  const save = useMutation({
    mutationFn: (draft: Draft) => (editId === 'new' ? api.post('/blog', toBody(draft)) : api.put(`/blog/${editId}`, toBody(draft))),
    onSuccess: (_r, draft) => {
      qc.invalidateQueries({ queryKey: BLOG_KEY })
      close()
      say(draft.published ? `Published “${draft.title.trim().split(':')[0]}”` : 'Draft saved')
    },
    onError: (e) => {
      const mapped: Record<string, string> = {}
      for (const [p, m] of Object.entries(fieldErrors(e))) if (PATH[p]) mapped[PATH[p]] = m
      if (Object.keys(mapped).length) {
        setServerErr(mapped)
        if (mapped.content) setTab('write')
      } else say(apiError(e))
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/blog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BLOG_KEY })
      setConfirming(false)
      close()
      say('Post deleted')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const submit = () => {
    setTried(true)
    const bad = !d.title.trim() || (d.published && (!d.excerpt.trim() || !d.content.trim() || !d.category.trim()))
    if (bad) {
      if (d.published && !d.content.trim()) setTab('write')
      return
    }
    save.mutate(d)
  }

  const all = posts || []
  const needle = q.trim().toLowerCase()
  const inQ = all.filter((p) => !needle || [p.title, p.category || '', ...p.tags].join(' ').toLowerCase().includes(needle))
  const shown = inQ.filter((p) => filter === 'all' || (filter === 'pub' ? p.published : !p.published))
  const pubCount = all.filter((p) => p.published).length
  const latest = publishedNewestFirst(all)[0]
  const words = wordCount(d.content)

  const saveLabel = d.published ? (editId === 'new' ? 'Publish post' : 'Save changes') : 'Save draft'

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Blog</h1>
          <p className="ad-sub">
            {posts ? `${pubCount} published, ${all.length - pubCount} drafts.${latest ? ` Latest: ${fmtDay(latest.publish_date)}.` : ''}` : ' '}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => open(null)}>
          <Icon name="plus" size={16} />
          New post
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <label className="sr" htmlFor="bl-q">Search posts</label>
          <Icon name="search" size={16} />
          <input id="bl-q" className="input" type="search" placeholder="Title, category or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented
          aria-label="Filter by status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: inQ.length },
            { value: 'pub', label: 'Published', count: inQ.filter((p) => p.published).length },
            { value: 'draft', label: 'Drafts', count: inQ.filter((p) => !p.published).length },
          ]}
        />
      </div>

      <section className="card" aria-label="Posts">
        <div className="lh" style={{ gridTemplateColumns: GRID }}>
          <span>Post</span>
          <span>Status</span>
          <span>Home page</span>
          <span className="right">Publish date</span>
          <span className="sr">Actions</span>
        </div>
        {isLoading ? (
          <SkeletonRows />
        ) : (
          <ul className="rows">
            {shown.map((p) => (
              <li key={p.id} className="row" style={{ gridTemplateColumns: GRID }}>
                <div className="cell-id">
                  <img className="thumb" src={p.cover_image || '/logo.svg'} alt="" width={1400} height={933} loading="lazy" style={p.cover_image ? undefined : { objectFit: 'contain' }} />
                  <div>
                    <p className="r1">{p.title}</p>
                    <p className="r2">{[p.category || 'No category', `${p.read_time ?? 0} min read`, p.tags.length ? p.tags.join(', ') : 'no tags'].join(' · ')}</p>
                  </div>
                </div>
                <span className="hide-sm">
                  <span className={'pill ' + (p.published ? 'p-live' : 'p-draft')}><span className="dot" />{p.published ? 'Published' : 'Draft'}</span>
                </span>
                <span className="hide-sm" style={{ fontSize: 13, color: p.featured ? '#4c1d95' : '#615a6c' }}>{p.featured ? 'Featured' : '—'}</span>
                <span className="right num mute hide-sm" style={{ fontSize: 13 }}>{fmtDay(p.publish_date)}</span>
                <button type="button" className="btn btn-text right" onClick={() => open(p)} aria-label={`Edit ${p.title}`}>Edit</button>
              </li>
            ))}
          </ul>
        )}
        {!isLoading && shown.length === 0 ? (
          <div style={{ padding: '0 24px 20px' }}>
            <div className="empty-slot">
              <span>{needle ? `No posts match “${q.trim()}”.` : filter === 'draft' ? 'No drafts. Every post is live.' : 'No posts yet.'}</span>
              <button type="button" className="btn btn-text" onClick={() => open(null)}>Start a draft</button>
            </div>
          </div>
        ) : null}
      </section>

      {editId !== null ? (
        <Dialog
          title={editId === 'new' ? 'New post' : 'Edit post'}
          sub={d.published ? `Live at /blog/${d.slug}` : 'Draft. Only you can see it.'}
          size="wide"
          onClose={close}
          saving={save.isPending}
          onSubmit={submit}
          footer={
            <>
              {editId !== 'new' ? <button type="button" className="btn btn-neg first" onClick={() => setConfirming(true)}>Delete post</button> : null}
              <Switch checked={d.published} onChange={(v) => set('published', v)} style={{ width: 'auto', gap: 10, marginRight: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Published</span>
              </Switch>
              <button type="button" className="btn btn-line" onClick={close} disabled={save.isPending}>Cancel</button>
              <SaveButton saving={save.isPending} label={saveLabel} />
            </>
          }
        >
          <div className="form">
            <Field label="Title" span2 error={err('title')}>{(p) => <input {...p} value={d.title} onChange={(e) => set('title', e.target.value)} />}</Field>
            <Field label="URL slug" span2 error={err('slug')} hint={`demitaylornimmo.com/blog/${d.slug}`}>{(p) => <input {...p} value={d.slug} onChange={(e) => set('slug', e.target.value)} />}</Field>
            <Field label="Excerpt" span2 error={err('excerpt')} hint="On the blog card and in social previews.">{(p) => <textarea {...p} rows={2} value={d.excerpt} onChange={(e) => set('excerpt', e.target.value)} />}</Field>
            <Field label="Cover image" span2 error={err('cover')}>
              {(p) => (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img className="thumb" src={d.cover || '/logo.svg'} alt="" width={1400} height={933} style={{ width: 88, height: 60, objectFit: d.cover ? 'cover' : 'contain' }} />
                  <div className="joined" style={{ flex: 1, minWidth: 0 }}>
                    <input {...p} placeholder="https://" value={d.cover} onChange={(e) => set('cover', e.target.value)} />
                    <ImageUploadButton onUploaded={(url) => set('cover', url)} />
                  </div>
                </div>
              )}
            </Field>
            <div className="field span2">
              <div className="tabs" role="tablist" aria-label="Content">
                <button type="button" role="tab" id="bl-tab-w" aria-selected={tab === 'write'} aria-controls="bl-panel" onClick={() => setTab('write')}>Write</button>
                <button type="button" role="tab" id="bl-tab-p" aria-selected={tab === 'preview'} aria-controls="bl-panel" onClick={() => setTab('preview')}>Preview</button>
                <span className="mute num" style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 12, fontWeight: 400 }}>{words} words · about {readMins(words)} min read</span>
              </div>
              <div id="bl-panel" role="tabpanel" aria-labelledby={tab === 'write' ? 'bl-tab-w' : 'bl-tab-p'}>
                {tab === 'write' ? (
                  <>
                    <label className="sr" htmlFor="bl-body">Post content in Markdown</label>
                    <textarea
                      id="bl-body"
                      className={'input code' + (err('content') ? ' err' : '')}
                      style={{ minHeight: 240, width: '100%' }}
                      value={d.content}
                      onChange={(e) => set('content', e.target.value)}
                      aria-invalid={!!err('content')}
                      aria-describedby={err('content') ? 'bl-body-e' : undefined}
                    />
                    {err('content') ? <span id="bl-body-e" className="err-text">{err('content')}</span> : null}
                  </>
                ) : (
                  <div className="panel md-preview" style={{ minHeight: 240, display: 'flex', flexDirection: 'column', gap: 12, fontWeight: 400, fontSize: 15, lineHeight: 1.7 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.content || '_Nothing written yet._'}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
            <Field label="Category" error={err('category')}>{(p) => <input {...p} value={d.category} onChange={(e) => set('category', e.target.value)} />}</Field>
            <Field label="Read time" error={err('mins')}>
              {(p) => (
                <span className="joined">
                  <input {...p} className={p.className + ' num'} type="number" min={1} value={d.mins} onChange={(e) => set('mins', e.target.value)} />
                  <span className="btn" style={{ cursor: 'default' }} aria-hidden="true">min</span>
                </span>
              )}
            </Field>
            <Field label="Tags" error={err('tags')} hint="Separate with commas.">{(p) => <input {...p} value={d.tags} onChange={(e) => set('tags', e.target.value)} />}</Field>
            <Field label="Author" error={err('author')}>{(p) => <input {...p} value={d.author} onChange={(e) => set('author', e.target.value)} />}</Field>
            <Field label="Publish date" error={err('date')}>{(p) => <input {...p} type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />}</Field>
            <div className="field" style={{ justifyContent: 'flex-end', gap: 0 }}>
              <Switch checked={d.featured} onChange={(v) => set('featured', v)}>
                <span style={{ fontWeight: 500 }}>Feature on the blog</span>
              </Switch>
            </div>
          </div>
        </Dialog>
      ) : null}

      {confirming && typeof editId === 'number' ? (
        <ConfirmDialog
          title="Delete this post?"
          description={`“${d.title}” comes off the blog and its link stops working. This can't be undone. Unpublish it instead to keep it as a draft.`}
          confirmLabel="Delete post"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(editId)}
        />
      ) : null}
    </>
  )
}
