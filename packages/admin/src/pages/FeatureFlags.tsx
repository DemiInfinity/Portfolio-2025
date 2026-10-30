import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiError } from '@/lib/errors'
import { BUILT_IN_FLAGS, FLAGS_KEY, KNOWN_DESCRIPTIONS, flagDescription, flagLabel, isOn, useFlags, type FeatureFlag } from '@/lib/flags'
import { useQ } from '@/hooks/useQ'
import { useFlagToggle } from '@/components/useFlagToggle'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Switch from '@/components/ui/Switch'
import Icon from '@/components/ui/Icon'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

export const KEY_RE = /^[a-z][a-z0-9_]{0,63}$/
const KEY_HINT = 'Lower case letters, numbers and underscores, like show_reviews.'

export default function FeatureFlags() {
  const qc = useQueryClient()
  const { say } = useToast()
  const [q] = useQ()
  const { data: flags, isLoading } = useFlags()
  const { toggle, set, confirm } = useFlagToggle()

  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [tried, setTried] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [deleting, setDeleting] = useState<FeatureFlag | null>(null)

  const all = flags || []
  const key = name.trim()
  const taken = all.some((f) => f.name === key)
  const keyErr = serverErr || (tried && taken ? `A flag called ${key} already exists.` : tried && !KEY_RE.test(key) ? KEY_HINT : '')

  const create = useMutation({
    mutationFn: () => api.post('/feature-flags', { name: key, description: desc.trim() || KNOWN_DESCRIPTIONS[key] || '' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FLAGS_KEY })
      setAdding(false)
      say(`Created ${key}, off`)
    },
    onError: (e) => setServerErr(apiError(e, "Couldn't create the flag. Try again.")),
  })

  const remove = useMutation({
    mutationFn: (f: FeatureFlag) => api.delete(`/feature-flags/${f.id}`),
    onSuccess: (_r, f) => {
      qc.invalidateQueries({ queryKey: FLAGS_KEY })
      setDeleting(null)
      say(`Deleted ${f.name}`)
    },
    onError: (e) => {
      setDeleting(null)
      say(apiError(e, "Couldn't delete. Try again."))
    },
  })

  const maintenance = all.find((f) => f.name === 'maintenance_mode')
  const maintenanceOn = !!maintenance?.enabled
  const on = all.filter((f) => f.enabled).length
  const needle = q.trim().toLowerCase()
  const shown = needle ? all.filter((f) => [f.name, flagLabel(f.name), f.description].join(' ').toLowerCase().includes(needle)) : all

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Feature flags</h1>
          <p className="ad-sub">{flags ? `${all.length} flags, ${on} on. Each switches part of the live site.` : ' '}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => { setAdding(true); setName(''); setDesc(''); setTried(false); setServerErr('') }}>
          <Icon name="plus" size={16} />
          New flag
        </button>
      </div>

      {maintenanceOn && maintenance ? (
        <div className="notice" role="status">
          <strong>Maintenance mode is on.</strong> Visitors see the maintenance page instead of the site.
          <button type="button" className="btn btn-line" onClick={() => set(maintenance, false, 'Maintenance mode off. The site is live.')} style={{ marginLeft: 'auto', minHeight: 36 }}>Turn it off</button>
        </div>
      ) : null}

      <div className="rail">
        <section className="card" aria-label="Flags">
          {isLoading ? <SkeletonRows thumb={false} /> : (
            <ul className="rows">
              {shown.map((f) => {
                const label = flagLabel(f.name)
                const builtIn = BUILT_IN_FLAGS.has(f.name)
                return (
                  <li key={f.id} style={{ padding: '16px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 15, fontWeight: 600 }}>{label}</p>
                        <span className={'pill ' + (f.enabled ? (f.name === 'maintenance_mode' ? 'p-draft' : 'p-live') : 'p-off')}>{f.enabled ? 'On' : 'Off'}</span>
                      </div>
                      {flagDescription(f) ? <p className="mute" style={{ fontSize: 14 }}>{flagDescription(f)}</p> : null}
                      <p className="mono mute" style={{ fontSize: 12 }}>{f.name}</p>
                      {!builtIn ? (
                        <button type="button" className="btn btn-text" style={{ alignSelf: 'flex-start', minHeight: 32, padding: '0 8px', marginLeft: -8, color: '#b4235a' }} onClick={() => setDeleting(f)} aria-label={`Delete ${f.name}`}>Delete</button>
                      ) : null}
                    </div>
                    <Switch checked={f.enabled} onChange={() => toggle(f)} aria-label={label} style={{ width: 'auto' }} />
                  </li>
                )
              })}
            </ul>
          )}
          {!isLoading && shown.length === 0 ? <p className="mute" style={{ padding: '16px 24px' }}>{needle ? `No flags match “${q.trim()}”.` : 'No flags yet.'}</p> : null}
        </section>

        <section aria-labelledby="fl-prev-h">
          <h2 id="fl-prev-h" className="rail-h">What visitors see now</h2>
          <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p className="mute" style={{ fontSize: 12 }}>Home page</p>
              {maintenanceOn ? (
                <div className="panel" style={{ marginTop: 6 }}>
                  <p className="b">Back soon</p>
                  <p className="mute" style={{ fontSize: 13 }}>The maintenance page replaces every page of the site.</p>
                </div>
              ) : (
                <div className="panel" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700, fontSize: 26, color: '#5b21b6', lineHeight: 1 }}>Demi Taylor Nimmo</span>
                  {isOn(flags, 'open_to_work') ? <span className="pill p-live"><span className="dot" />Open to work</span> : null}
                </div>
              )}
            </div>
            <div>
              <p className="mute" style={{ fontSize: 12 }}>Privacy and Terms pages, apps covered</p>
              <p style={{ marginTop: 6, fontSize: 14 }}>{isOn(flags, 'show_marbl') ? 'This site, the listed apps and Marbl.' : 'This site and the listed apps. Marbl is left out.'}</p>
            </div>
          </div>
        </section>
      </div>

      {confirm}

      {adding ? (
        <Dialog
          title="New flag"
          sub="New flags start off. Read one in the site with its key."
          maxWidth={520}
          onClose={() => setAdding(false)}
          saving={create.isPending}
          onSubmit={() => {
            setTried(true)
            setServerErr('')
            if (!KEY_RE.test(key) || taken) return
            create.mutate()
          }}
          footer={
            <>
              <button type="button" className="btn btn-line" onClick={() => setAdding(false)} disabled={create.isPending}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={create.isPending}>{create.isPending ? <><span className="spin" aria-hidden="true" />Saving</> : 'Create flag'}</button>
            </>
          }
        >
          <div className="form" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <div className="field">
              <label htmlFor="fl-key">Key</label>
              <input
                id="fl-key"
                className={'input mono' + (keyErr ? ' err' : '')}
                maxLength={64}
                value={name}
                onChange={(e) => { setName(e.target.value); setServerErr('') }}
                aria-invalid={!!keyErr}
                aria-describedby="fl-key-h"
                autoComplete="off"
                spellCheck={false}
              />
              <span id="fl-key-h" className={keyErr ? 'err-text' : 'hint'}>{keyErr || KEY_HINT}</span>
            </div>
            <div className="field">
              <label htmlFor="fl-desc">What it controls</label>
              <textarea id="fl-desc" className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>
        </Dialog>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          description={`Anything on the site that reads ${deleting.name} treats it as off. This can't be undone.`}
          confirmLabel="Delete flag"
          busy={remove.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting)}
        />
      ) : null}
    </>
  )
}
