import InfinityMark from '@/components/ui/InfinityMark'

/**
 * "Waking the server…" (Interactions). The API cold-starts when idle, so a
 * slow first load should look like something is happening.
 * `label` is kept for older callers; the design copy is fixed.
 */
export default function PageLoading(_props: { label?: string } = {}) {
  return (
    <div role="status" className="state-frame">
      <InfinityMark />
      <p className="script" style={{ fontSize: 40, color: 'var(--b2)' }}>
        Waking the server…
      </p>
      <p style={{ fontSize: 'var(--t-meta)' }}>It naps when nobody’s around. Give it a few seconds.</p>
    </div>
  )
}
