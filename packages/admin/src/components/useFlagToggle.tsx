import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError } from '@/lib/errors'
import { FLAGS_KEY, flagLabel, type FeatureFlag } from '@/lib/flags'
import ConfirmDialog from './ui/ConfirmDialog'
import { useToast } from './ui/Toast'

/**
 * Flag switching shared by Feature flags and the Dashboard: optimistic `PUT {enabled}` (never `name`, H-8),
 * a toast "{label} on/off", and the maintenance confirm before turning `maintenance_mode` on.
 */
export function useFlagToggle() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [asking, setAsking] = useState<FeatureFlag | null>(null)

  const put = useMutation({
    mutationFn: ({ flag, enabled }: { flag: FeatureFlag; enabled: boolean; msg: string }) => api.put(`/feature-flags/${flag.id}`, { enabled }),
    onMutate: async ({ flag, enabled }) => {
      await qc.cancelQueries({ queryKey: FLAGS_KEY })
      const prev = qc.getQueryData<FeatureFlag[]>(FLAGS_KEY)
      qc.setQueryData<FeatureFlag[]>(FLAGS_KEY, (old) => old?.map((f) => (f.id === flag.id ? { ...f, enabled } : f)))
      return { prev }
    },
    onSuccess: (_r, { msg }) => say(msg),
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(FLAGS_KEY, ctx.prev)
      say(apiError(e, "Couldn't switch it. Try again."))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FLAGS_KEY }),
  })

  const set = (flag: FeatureFlag, enabled: boolean, msg = `${flagLabel(flag.name)} ${enabled ? 'on' : 'off'}`) => put.mutate({ flag, enabled, msg })

  const toggle = (flag: FeatureFlag) => {
    if (flag.name === 'maintenance_mode' && !flag.enabled) {
      setAsking(flag)
      return
    }
    set(flag, !flag.enabled)
  }

  const confirm = asking ? (
    <ConfirmDialog
      title="Turn on maintenance mode?"
      description="Every visitor to demitaylornimmo.com sees the maintenance page until you turn it off. The admin area keeps working."
      cancelLabel="Cancel"
      confirmLabel="Turn it on"
      tone="primary"
      onCancel={() => setAsking(null)}
      onConfirm={() => {
        set(asking, true, 'Maintenance mode on')
        setAsking(null)
      }}
    />
  ) : null

  return { toggle, set, confirm }
}
