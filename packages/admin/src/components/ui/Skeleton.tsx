/** Loading state for a rows area: 3 skeleton rows of `.row` height. */
export function SkeletonRows({ n = 3, thumb = true }: { n?: number; thumb?: boolean }) {
  return (
    <ul className="rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="skel-row">
          {thumb ? <span className="skel sq" /> : null}
          <span className="skel" />
        </li>
      ))}
    </ul>
  )
}
