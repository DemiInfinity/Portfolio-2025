import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

/** `?edit={id}` opens that item's editor once the list has loaded (T15), then the param is removed. */
export function useEditParam<T extends { id: number | string }>(items: T[] | undefined, open: (item: T) => void) {
  const [params, setParams] = useSearchParams()
  const edit = params.get('edit')
  useEffect(() => {
    if (!edit || !items) return
    const item = items.find((i) => String(i.id) === edit)
    if (item) open(item)
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        n.delete('edit')
        return n
      },
      { replace: true },
    )
    // open is recreated each render; run only when the param or data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, items])
}
