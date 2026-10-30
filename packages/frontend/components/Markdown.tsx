import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ReactNode } from 'react'
import Spark from '@/components/ui/Spark'
import { slugify } from '@/lib/format'
import { resolveMediaUrl } from '@/lib/mediaUrl'

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: ReactNode } }).props.children)
  return ''
}

/** Heading entries for an "On this page" list, from `##` lines. */
export function extractToc(markdown: string | null | undefined): { id: string; label: string }[] {
  if (!markdown) return []
  const items: { id: string; label: string }[] = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) continue
    const match = /^##\s+(.+?)\s*#*\s*$/.exec(line)
    if (match) {
      const label = match[1].replace(/[*_`]/g, '').trim()
      items.push({ id: slugify(label), label })
    }
  }
  return items
}

const components: Components = {
  h2: ({ children }) => (
    <h2 id={slugify(textOf(children))} className="sv">
      {children}
    </h2>
  ),
  blockquote: ({ children }) => (
    <blockquote className="md-quote sv">
      <Spark style={{ position: 'absolute', right: 24, top: -14, width: 32, height: 32, color: 'var(--c1)' }} />
      {children}
    </blockquote>
  ),
  pre: ({ children }) => <pre className="mono sv">{children}</pre>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveMediaUrl(typeof src === 'string' ? src : '')} alt={alt ?? ''} loading="lazy" />
  ),
  a: ({ href, children }) => {
    const external = typeof href === 'string' && /^https?:/.test(href)
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    )
  },
}

/**
 * Markdown in the design's reading styles. `article` = Post body (Source
 * Serif 20px); `case` = case-study text (Poppins, 1.75, 62ch); `lead` =
 * case-study overview at --t-lead.
 */
export default function Markdown({ children, variant = 'case' }: { children: string | null | undefined; variant?: 'article' | 'case' | 'lead' }) {
  if (!children) return null
  return (
    <div className={`markdown md-${variant}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
