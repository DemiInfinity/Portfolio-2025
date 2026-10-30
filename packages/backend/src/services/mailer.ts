/**
 * Hire me notification email via Resend (H-20 / D-7). Uses `fetch`, no SDK.
 *
 * Env (set by the owner, never hard-coded here):
 * - RESEND_API_KEY   required to send
 * - CONTACT_TO_EMAIL required to send (the recipient)
 * - CONTACT_FROM_EMAIL optional; defaults to Resend's test sender, which only
 *   delivers to the Resend account's own address until a domain is verified.
 */

export const RESEND_URL = 'https://api.resend.com/emails'
export const DEFAULT_FROM = 'Portfolio <onboarding@resend.dev>'
export const SEND_TIMEOUT_MS = 5000

export const KIND_LABELS: Record<string, string> = {
  role: 'A full-time role',
  freelance: 'Freelance work',
  hi: 'Just saying hi'
}

export interface ContactEmail {
  kind: string
  name: string
  email: string
  message: string
  source_path?: string | null
  received_at: string
}

export type EmailResult = { status: 'sent' } | { status: 'skipped' } | { status: 'failed'; error: string }

/** Strips CR/LF (header injection) and collapses whitespace. */
export function oneLine(value: string): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

export function buildEmail(msg: ContactEmail, env: NodeJS.ProcessEnv = process.env) {
  const label = KIND_LABELS[msg.kind] || msg.kind
  const who = oneLine(msg.name) || 'someone'
  const text = [
    `Kind: ${label}`,
    `Name: ${oneLine(msg.name) || '(not given)'}`,
    `Email: ${oneLine(msg.email)}`,
    `Page: ${oneLine(msg.source_path || '') || '(unknown)'}`,
    `Received: ${msg.received_at}`,
    '',
    msg.message
  ].join('\n')
  return {
    from: env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
    to: [String(env.CONTACT_TO_EMAIL)],
    reply_to: oneLine(msg.email),
    subject: oneLine(`Hire me: ${label} from ${who}`),
    text
  }
}

export async function sendContactEmail(msg: ContactEmail, env: NodeJS.ProcessEnv = process.env): Promise<EmailResult> {
  const key = env.RESEND_API_KEY
  const to = env.CONTACT_TO_EMAIL
  if (!key || !to) {
    console.warn('Contact email skipped: RESEND_API_KEY or CONTACT_TO_EMAIL not set')
    return { status: 'skipped' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildEmail(msg, env)),
      signal: controller.signal
    })
    if (!res.ok) {
      let detail = ''
      try {
        detail = await res.text()
      } catch {
        // ignore
      }
      return { status: 'failed', error: `Resend ${res.status}: ${detail}`.slice(0, 500) }
    }
    return { status: 'sent' }
  } catch (error) {
    const message = error instanceof Error ? (error.name === 'AbortError' ? 'Timed out' : error.message) : String(error)
    return { status: 'failed', error: message.slice(0, 500) }
  } finally {
    clearTimeout(timer)
  }
}
