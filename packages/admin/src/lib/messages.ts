import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { MON } from './format'

/*
 * Messages inbox (H-24). Messages are personal data: never log them, never send them anywhere but the API.
 */
export type MessageKind = 'role' | 'freelance' | 'hi'
export type EmailStatus = 'pending' | 'sent' | 'skipped' | 'failed'
export interface Message {
  id: number
  name: string
  email: string
  kind: MessageKind
  message: string
  source_path: string | null
  created_at: string
  read: boolean
  email_status: EmailStatus
}

export const MESSAGES_KEY = ['messages', 'list'] as const
export const UNREAD_KEY = ['messages', 'unread-count'] as const

export const fetchMessages = async (): Promise<{ items: Message[]; unread: number }> => {
  const res = await api.get('/contact', { params: { limit: 100 } })
  const items = (res.data?.data || []) as Message[]
  return { items, unread: typeof res.data?.unread === 'number' ? res.data.unread : items.filter((m) => !m.read).length }
}

/** `GET /api/contact/unread-count` -> `{ success, unread }`. */
export const fetchUnreadCount = async (): Promise<number> => {
  const res = await api.get('/contact/unread-count')
  return Number(res.data?.unread) || 0
}

export const useUnreadCount = (enabled = true) =>
  useQuery({ queryKey: UNREAD_KEY, queryFn: fetchUnreadCount, enabled, retry: false, refetchInterval: 60_000 })

export const KIND_LABEL: Record<MessageKind, string> = { role: 'A full-time role', freelance: 'Freelance work', hi: 'Just saying hi' }
export const MAIL_LABEL: Record<EmailStatus, [string, string]> = {
  sent: ['Emailed to you', 'p-live'],
  skipped: ['Not emailed (email not set up)', 'p-off'],
  failed: ['Email failed', 'p-neg'],
  pending: ['Email pending', 'p-draft'],
}

export type Filter = 'all' | 'unread' | MessageKind
export const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'role', label: 'Roles' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'hi', label: 'Hellos' },
]
export const passes = (m: Message, f: Filter) => f === 'all' || (f === 'unread' ? !m.read : m.kind === f)
export const matches = (m: Message, q: string) => !q || `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q.toLowerCase())

const pad = (n: number) => String(n).padStart(2, '0')
/** "29 Oct" */
export const shortWhen = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MON[d.getMonth()]}`
}
/** "29 Oct 2026, 16:42" */
export const longWhen = (iso: string) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** Auto-delete date, 12 months after arrival: "on 29 Oct 2027". */
export const expiresOn = (iso: string) => {
  const d = new Date(iso)
  d.setFullYear(d.getFullYear() + 1)
  return `on ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`
}
export const replyHref = (email: string) => `mailto:${email}?subject=${encodeURIComponent('Re: your message on demitaylornimmo.com')}`
export const snippet = (message: string) => message.split('\n').find((l) => l.trim())?.trim() || ''
