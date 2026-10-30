import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError } from '@/lib/errors'
import { plural } from '@/lib/format'
import {
  FILTERS, KIND_LABEL, MAIL_LABEL, MESSAGES_KEY, UNREAD_KEY, expiresOn, fetchMessages, longWhen, matches, passes, replyHref, shortWhen, snippet,
  type Filter, type Message,
} from '@/lib/messages'
import { useQ } from '@/hooks/useQ'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Segmented from '@/components/ui/Segmented'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

type Data = { items: Message[]; unread: number }

export default function Messages() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q, setQ] = useQ()
  const [filter, setFilter] = useState<Filter>('all')
  const [selId, setSelId] = useState<number | null>(null)
  const [reading, setReading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: MESSAGES_KEY, queryFn: fetchMessages })

  const setReadLocal = (id: number, read: boolean) =>
    qc.setQueryData<Data>(MESSAGES_KEY, (old) =>
      old ? { items: old.items.map((m) => (m.id === id ? { ...m, read } : m)), unread: old.items.filter((m) => (m.id === id ? !read : !m.read)).length } : old,
    )

  const patch = useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean; toast?: string }) => api.patch(`/contact/${id}`, { read }),
    onMutate: async ({ id, read }) => {
      await qc.cancelQueries({ queryKey: MESSAGES_KEY })
      const prev = qc.getQueryData<Data>(MESSAGES_KEY)
      setReadLocal(id, read)
      return { prev }
    },
    onSuccess: (_r, { toast }) => {
      if (toast) say(toast)
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(MESSAGES_KEY, ctx.prev)
      say(apiError(e, "Couldn't update the message. Try again."))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: UNREAD_KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/contact/${id}`),
    onSuccess: (_r, id) => {
      qc.setQueryData<Data>(MESSAGES_KEY, (old) => {
        if (!old) return old
        const items = old.items.filter((m) => m.id !== id)
        return { items, unread: items.filter((m) => !m.read).length }
      })
      qc.invalidateQueries({ queryKey: MESSAGES_KEY })
      qc.invalidateQueries({ queryKey: UNREAD_KEY })
      setConfirming(false)
      setSelId(null)
      setReading(false)
      say('Message deleted')
    },
    onError: (e) => {
      setConfirming(false)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const items = data?.items || []
  const unread = items.filter((m) => !m.read).length
  const needle = q.trim()
  const inQ = items.filter((m) => matches(m, needle))
  const shown = inQ.filter((m) => passes(m, filter)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const sel = items.find((m) => m.id === selId) || null

  const open = (m: Message) => {
    setSelId(m.id)
    setReading(true)
    if (!m.read) patch.mutate({ id: m.id, read: true })
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Messages</h1>
          <p className="ad-sub">{data ? `${plural(items.length, 'message', 'messages')} from the Hire me form, ${unread} unread.` : ' '}</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <label className="sr" htmlFor="ib-q">Search messages</label>
          <Icon name="search" size={16} />
          <input id="ib-q" className="input" type="search" placeholder="Name, email or words in the message" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented aria-label="Filter messages" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: inQ.filter((m) => passes(m, f.value)).length }))} />
      </div>

      {isError && !data ? (
        <div className="notice" role="alert">
          Couldn't load the messages.
          <button type="button" className="btn btn-line" onClick={() => refetch()} style={{ marginLeft: 'auto', minHeight: 36 }}>Try again</button>
        </div>
      ) : (
        <div className={'ib' + (reading && sel ? ' reading' : '')}>
          <section className="card ib-list" aria-label="Message list" style={{ overflow: 'hidden' }}>
            {isLoading ? <SkeletonRows thumb={false} /> : null}
            {shown.map((m) => (
              <button key={m.id} type="button" className="ib-item" aria-current={m.id === selId ? 'true' : 'false'} onClick={() => open(m)}>
                <span className={'ib-dot' + (m.read ? ' read' : '')} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontWeight: m.read ? 500 : 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name || m.email}</span>
                    <span className="mute num" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{shortWhen(m.created_at)}</span>
                  </span>
                  <span className="pill p-hue" style={{ alignSelf: 'flex-start', height: 20, fontSize: 11 }}>{KIND_LABEL[m.kind] || m.kind}</span>
                  <span className="ib-snip">{snippet(m.message)}</span>
                  <span className="sr">{m.read ? 'Read' : 'Unread'}</span>
                </span>
              </button>
            ))}
            {!isLoading && shown.length === 0 ? (
              <div style={{ padding: 20 }}>
                <div className="empty-slot">
                  <span>{needle ? `No messages match “${needle}”.` : items.length ? 'Nothing in this filter.' : 'No messages yet. They’ll appear here when someone uses Hire me.'}</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className="card card-pad ib-read" aria-labelledby={sel ? 'ib-subject' : undefined} aria-label={sel ? undefined : 'Message'}>
            {sel ? (
              <>
                <button type="button" className="btn btn-text ib-back" onClick={() => setReading(false)} style={{ margin: '-8px 0 8px -12px' }}>&#8592; All messages</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 id="ib-subject" style={{ fontSize: 20, fontWeight: 600 }}>{sel.name || sel.email}</h2>
                    <p className="mute" style={{ fontSize: 14 }}>
                      <a href={`mailto:${sel.email}`} style={{ color: '#4c1d95' }}>{sel.email}</a> · {longWhen(sel.created_at)}
                    </p>
                    <div className="chips" style={{ marginTop: 8 }}>
                      <span className="pill p-hue">{KIND_LABEL[sel.kind] || sel.kind}</span>
                      {sel.source_path ? <span className="chip">Sent from {sel.source_path}</span> : null}
                      <span className={'pill ' + (MAIL_LABEL[sel.email_status]?.[1] || 'p-off')}>{MAIL_LABEL[sel.email_status]?.[0] || sel.email_status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a className="btn btn-primary" href={replyHref(sel.email)}>Reply by email</a>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={() => patch.mutate({ id: sel.id, read: !sel.read, toast: sel.read ? 'Marked as unread' : 'Marked as read' })}
                    >
                      {sel.read ? 'Mark as unread' : 'Mark as read'}
                    </button>
                    <button type="button" className="btn btn-neg" onClick={() => setConfirming(true)}>Delete</button>
                  </div>
                </div>
                <div className="panel" style={{ marginTop: 18 }}><p className="ib-body" data-testid="ib-body">{sel.message}</p></div>
                <p className="mute" style={{ fontSize: 12, marginTop: 14 }}>Messages are deleted automatically 12 months after they arrive ({expiresOn(sel.created_at)}). Delete it now if the sender asks you to.</p>
              </>
            ) : (
              <div className="empty-slot"><span>Choose a message to read it.</span></div>
            )}
          </section>
        </div>
      )}

      {confirming && sel ? (
        <ConfirmDialog
          title={`Delete the message from ${sel.name || sel.email}?`}
          description="It's removed permanently, along with their name and email. Do this when someone asks you to delete their data."
          confirmLabel="Delete message"
          busy={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => remove.mutate(sel.id)}
        />
      ) : null}
    </>
  )
}
