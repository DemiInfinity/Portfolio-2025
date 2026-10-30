import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import { statusOf } from './errors'

export type CvStatus = {
  state: 'idle' | 'pending' | 'building' | 'failed'
  generatedAt: string | null
  requestedAt?: string | null
  startedAt?: string | null
  error: string | null
  pdfUrl: string | null
  size: number | null
}

export const CV_STATUS_KEY = ['cv-status'] as const

export const isBuilding = (s?: CvStatus | null) => s?.state === 'pending' || s?.state === 'building'

/** `GET /api/cv/status` (H-21). Polls every 3 s while a build is pending or building. null when the endpoint isn't there yet. */
export function useCvStatus() {
  return useQuery({
    queryKey: CV_STATUS_KEY,
    queryFn: async (): Promise<CvStatus | null> => {
      try {
        const res = await api.get('/cv/status')
        return res.data.data as CvStatus
      } catch (e) {
        if (statusOf(e) === 404) return null
        throw e
      }
    },
    retry: false,
    refetchInterval: (q) => (isBuilding(q.state.data) ? 3000 : false),
  })
}

/** `POST /api/cv/regenerate`: 200 -> "CV rebuilt"; 409 -> already running (keeps polling); 500 -> failed state. */
export function useRegenerateCv(say: (m: string) => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/cv/regenerate'),
    onSuccess: (res) => {
      if (res.data?.data) qc.setQueryData(CV_STATUS_KEY, res.data.data)
      qc.invalidateQueries({ queryKey: CV_STATUS_KEY })
      qc.invalidateQueries({ queryKey: ['resume'] })
      say('CV rebuilt')
    },
    onError: (e) => {
      const data = (e as { response?: { data?: { data?: CvStatus } } }).response?.data?.data
      const code = statusOf(e)
      if (code === 409) {
        qc.setQueryData<CvStatus | null>(CV_STATUS_KEY, (old) => data || (old ? { ...old, state: 'building' } : old))
        say('A rebuild is already running.')
      } else {
        qc.setQueryData<CvStatus | null>(CV_STATUS_KEY, (old) => data || { ...(old || { generatedAt: null, pdfUrl: null, size: null }), state: 'failed', error: old?.error ?? null })
        say('CV build failed')
      }
    },
  })
}

/** "today, 09:41" or "20 Oct 2026". */
export const rebuiltLabel = (iso: string, now = new Date()) => {
  const g = new Date(iso)
  const same = g.getFullYear() === now.getFullYear() && g.getMonth() === now.getMonth() && g.getDate() === now.getDate()
  if (same) return `today, ${String(g.getHours()).padStart(2, '0')}:${String(g.getMinutes()).padStart(2, '0')}`
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${g.getDate()} ${M[g.getMonth()]} ${g.getFullYear()}`
}
