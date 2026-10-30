import { useRef, useState } from 'react'
import { SITE_URL, hostOf } from '@/lib/config'
import { STARTERS, counterLabel, isOver, linkedInShareUrl, publicUrl, starterText, type ShareItem, type Starter } from '@/lib/share'
import Dialog from './ui/Dialog'
import Segmented from './ui/Segmented'
import { LinkedInMark } from './ui/Icon'
import { useToast } from './ui/Toast'

/** The row action: "Share" with the LinkedIn mark. Render it only for public items. */
export function ShareButton({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-text" onClick={onClick} aria-label={`Share ${title} on LinkedIn`}>
      <LinkedInMark />
      Share
    </button>
  )
}

const COPY_FAILED = "Couldn't copy. The text is selected, so press Ctrl+C (Cmd+C on a Mac) to copy it."

export default function ShareLinkedInDialog({ item, onClose }: { item: ShareItem; onClose: () => void }) {
  const { say } = useToast()
  const [starter, setStarter] = useState<Starter | null>('announce')
  const [text, setText] = useState(() => starterText(item, 'announce'))
  const area = useRef<HTMLTextAreaElement>(null)
  const url = publicUrl(item.kind, item.slug)
  const shareUrl = linkedInShareUrl(url)

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard')
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      area.current?.focus()
      area.current?.select()
      say(COPY_FAILED)
      return false
    }
  }

  const copyOnly = async () => {
    if (await copy()) say('Post text copied')
  }
  const copyAndOpen = async () => {
    if (!(await copy())) return
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    say('Text copied. Paste it into your LinkedIn post.')
  }

  return (
    <Dialog
      title="Share on LinkedIn"
      sub="LinkedIn doesn't let other sites fill in your post, so this copies the text for you to paste."
      maxWidth={820}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-text first" onClick={copyOnly}>Copy text only</button>
          <button type="button" className="btn btn-line" onClick={onClose}>Cancel</button>
          <a
            className="btn btn-primary"
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault()
              copyAndOpen()
            }}
          >
            Copy text and open LinkedIn
          </a>
        </>
      }
    >
      <div className="two" style={{ gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <label htmlFor="sh-text">Your post</label>
            <textarea
              id="sh-text"
              ref={area}
              className={'input' + (isOver(text) ? ' err' : '')}
              rows={10}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setStarter(null)
              }}
              aria-describedby="sh-count"
              aria-invalid={isOver(text)}
            />
          </div>
          <p id="sh-count" className={'counter num' + (isOver(text) ? ' over' : '')} aria-live="polite">{counterLabel(text)}</p>
          <Segmented
            aria-label="Starting text"
            style={{ alignSelf: 'flex-start' }}
            value={(starter ?? '') as Starter}
            onChange={(v) => {
              setStarter(v)
              setText(starterText(item, v))
            }}
            options={STARTERS}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="b" style={{ fontSize: 14 }}>Link preview on LinkedIn</p>
          <div className="li-card" data-testid="li-card">
            <img src={item.image || '/logo.svg'} alt="" width={1400} height={933} style={item.image ? undefined : { objectFit: 'contain', background: '#f3e8ff' }} />
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#191919', lineHeight: 1.35 }}>{item.title}</p>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{hostOf(SITE_URL)}</p>
            </div>
          </div>
          <p className="mute" style={{ fontSize: 12 }}>Built from the page's title, description and cover image. If LinkedIn shows an old preview, refresh it with LinkedIn's Post Inspector.</p>
          <p className="mono mute" style={{ fontSize: 12, wordBreak: 'break-all' }}>{url}</p>
        </div>
      </div>
    </Dialog>
  )
}
