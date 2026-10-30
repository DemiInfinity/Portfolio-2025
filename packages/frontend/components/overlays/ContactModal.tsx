'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import Modal from './Modal'
import IconButton, { CloseIcon } from '@/components/ui/IconButton'
import Button from '@/components/ui/Button'
import { ChipButton } from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import { SPARK_PATH } from '@/components/ui/Spark'
import { useToast } from '@/components/ui/Toast'
import { submitContact } from '@/lib/api'
import type { ContactKind } from '@/lib/api'
import { contact } from '@/lib/content/site'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const SEND_ERROR = 'Couldn’t send. Check your connection and try again.'

const KINDS: { id: ContactKind; label: string }[] = [
  { id: 'role', label: 'A full-time role' },
  { id: 'freelance', label: 'Freelance work' },
  { id: 'hi', label: 'Just saying hi' },
]

export function firstName(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.split(/\s+/)[0] : 'friend'
}

const CONFETTI = [
  { x: '-120px', y: '-60px', d: '0ms', size: 22, color: '#f472b6' },
  { x: '130px', y: '-70px', d: '80ms', size: 28, color: '#7c3aed' },
  { x: '-90px', y: '50px', d: '140ms', size: 16, color: '#7c3aed' },
  { x: '100px', y: '60px', d: '200ms', size: 20, color: '#f472b6' },
]

/** Hire me modal (Overlays, contact branch). Posts to /api/contact (H-10). */
export default function ContactModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const titleId = useId()
  const kindId = useId()
  const [kind, setKind] = useState<ContactKind>('role')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [tried, setTried] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [serverErrors, setServerErrors] = useState<string[]>([])

  const emailOk = EMAIL_PATTERN.test(email)
  const emailBad = (tried && !emailOk) || serverErrors.includes('email')
  const emailState = emailBad ? 'error' : emailOk ? 'ok' : 'default'

  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    if (sending) return
    if (!emailOk) {
      setTried(true)
      return
    }
    setSending(true)
    setServerErrors([])
    const result = await submitContact({
      kind,
      name,
      email,
      message,
      website: website as '',
      source_path: typeof window !== 'undefined' ? window.location.pathname : '/',
    })
    setSending(false)
    if (result.ok) {
      setSent(true)
      return
    }
    if (result.reason === 'invalid') {
      setServerErrors(result.fields)
      setTried(true)
      return
    }
    toast.show(SEND_ERROR, 'error')
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose}>
      {sent ? (
        <div
          style={{
            padding: '48px 36px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            position: 'relative',
            overflow: 'clip',
          }}
        >
          {CONFETTI.map((c, i) => (
            <svg
              key={i}
              className="ov-confetti"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{
                ['--x' as string]: c.x,
                ['--y' as string]: c.y,
                ['--d' as string]: c.d,
                position: 'absolute',
                left: '50%',
                top: 90,
                width: c.size,
                height: c.size,
                color: c.color,
              }}
            >
              <path d={SPARK_PATH} fill="currentColor" />
            </svg>
          ))}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(45deg, #f472b6, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </div>
          <h2 id={titleId} className="ov-title">
            Message sent!
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: '34ch' }}>
            Thank you, {firstName(name)}. I’ll reply to your inbox within a couple of days.
          </p>
          <Button variant="soft" onClick={onClose}>
            Back to the site
          </Button>
        </div>
      ) : (
        <form onSubmit={send} noValidate>
          <div style={{ padding: '32px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <h2 id={titleId} className="ov-title">
                Let’s build something
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 15 }}>Tell me a little about it. I read every message.</p>
            </div>
            <IconButton aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </div>
          <div className="ov-stagger" style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <span id={kindId}>I’m getting in touch about</span>
              <div role="group" aria-labelledby={kindId} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {KINDS.map((k) => (
                  <ChipButton key={k.id} pressed={kind === k.id} onClick={() => setKind(k.id)}>
                    {k.label}
                  </ChipButton>
                ))}
              </div>
            </div>
            <Field
              label="Your name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              maxLength={120}
              value={name}
              state={serverErrors.includes('name') ? 'error' : 'default'}
              onChange={(e) => setName(e.target.value)}
            />
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              state={emailState}
              hint={emailBad ? 'That email looks unfinished.' : 'I only use it to reply.'}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              multiline
              label="Message"
              name="message"
              placeholder="What are you building?"
              value={message}
              state={serverErrors.includes('message') ? 'error' : 'default'}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="visually-hidden" aria-hidden="true">
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
            <Button type="submit" block loading={sending}>
              {sending ? 'Sending' : 'Send message'}
            </Button>
            <p style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>
              Prefer email?{' '}
              <a href={`mailto:${contact.email}`} style={{ color: '#5b21b6', fontWeight: 600 }}>
                {contact.email}
              </a>
            </p>
            <p style={{ margin: 0, fontSize: 12, textAlign: 'center', color: '#6b5a7e' }}>
              I keep your message for 12 months so I can reply.{' '}
              <Link href="/privacy" onClick={onClose} style={{ color: '#5b21b6', fontWeight: 600 }}>
                Privacy
              </Link>
            </p>
          </div>
        </form>
      )}
    </Modal>
  )
}
