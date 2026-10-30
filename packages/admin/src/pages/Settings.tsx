import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { apiError } from '@/lib/errors'
import { API_ORIGIN, SITE_URL, hostOf } from '@/lib/config'
import { isBuilding, rebuiltLabel, useCvStatus, useRegenerateCv } from '@/lib/cv'
import { EMAIL_RE } from '@/lib/validation'
import Icon from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'

const MIN = 6

export const RESUME_KEY = ['resume'] as const

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { say } = useToast()
  const cv = useCvStatus()
  const regen = useRegenerateCv(say)
  const resume = useQuery({
    queryKey: RESUME_KEY,
    queryFn: async () => (await api.get('/upload/resume')).data as { available: boolean; url: string | null },
    retry: false,
  })

  // Profile
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [emailTried, setEmailTried] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const emailBad = emailTried && !EMAIL_RE.test(email)
  const profile = useMutation({
    mutationFn: () => api.put('/auth/profile', { name: name.trim(), email: email.trim() }),
    onSuccess: async () => {
      await refreshUser()
      setProfileSaved(true)
      setEmailTried(false)
      say('Profile saved')
    },
    onError: (e) => say(apiError(e)),
  })
  const saveProfile = (e: FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email)) return setEmailTried(true)
    profile.mutate()
  }

  // Password
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [conf, setConf] = useState('')
  const [pwTried, setPwTried] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [curWrong, setCurWrong] = useState(false)
  const curErr = curWrong ? 'Your current password is wrong.' : pwTried && !cur ? 'Enter your current password.' : null
  const newBad = pwTried && nw.length < MIN
  const confBad = pwTried && conf !== nw
  const left = MIN - nw.length
  const password = useMutation({
    mutationFn: () => api.put('/auth/change-password', { currentPassword: cur, newPassword: nw }),
    onSuccess: () => {
      setCur('')
      setNw('')
      setConf('')
      setPwTried(false)
      setPwSaved(true)
      say('Password changed')
    },
    onError: (e) => {
      const msg = apiError(e, '')
      // H-8 point 3: a wrong current password is a 400 (not a 401), so the session stays.
      if (/current password/i.test(msg)) setCurWrong(true)
      else say(msg || "Couldn't change the password. Try again.")
    },
  })
  const savePw = (e: FormEvent) => {
    e.preventDefault()
    setCurWrong(false)
    if (!cur || nw.length < MIN || conf !== nw) return setPwTried(true)
    password.mutate()
  }

  // CV
  const s = cv.data
  const building = regen.isPending || isBuilding(s)
  const neverBuilt = !!s && !s.generatedAt && s.state !== 'failed'
  const sub = !s
    ? cv.isLoading ? ' ' : 'Your CV PDF status is not available yet.'
    : s.state === 'failed'
      ? 'The last CV build failed. Visitors get the previous PDF.'
      : s.generatedAt
        ? 'Your CV PDF is live behind the Download CV button.'
        : 'No CV PDF yet, so the Download CV button is hidden on the site.'
  const kb = s?.size ? `${Math.round(s.size / 1024)} KB` : ''

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Settings</h1>
          <p className="ad-sub">{sub}</p>
        </div>
      </div>

      <div>
        <section className="set" aria-labelledby="st-cv-t">
          <div>
            <h2 id="st-cv-t" className="set-t">CV for download</h2>
            <p className="set-d">A PDF built from your content, behind the Download CV button on the home and About pages. It rebuilds itself a few seconds after you change something.</p>
            <div style={{ marginTop: 16 }}>
              <p className="mute" style={{ fontSize: 12 }}>On the site now</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="btn btn-primary" aria-hidden="true" style={{ cursor: 'default' }}>Hire me</span>
                {resume.data?.available ? (
                  <span className="btn btn-line" aria-hidden="true" style={{ cursor: 'default' }}>Download CV</span>
                ) : (
                  <span className="empty-slot" style={{ padding: '10px 14px', fontSize: 13 }}>Download CV hidden</span>
                )}
              </div>
            </div>
          </div>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {s?.state === 'failed' && !regen.isPending ? (
              <div className="notice">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p>The last rebuild failed. Visitors still get the previous PDF.</p>
                  {s.error ? <p className="sm">{s.error}</p> : null}
                </div>
                <button type="button" className="btn btn-line" onClick={() => regen.mutate()} style={{ minHeight: 36 }}>Try again</button>
              </div>
            ) : null}
            {!s && !cv.isLoading ? <p className="mute" style={{ fontSize: 13 }}>CV build status isn't available yet.</p> : null}
            {neverBuilt ? (
              <div className="empty-slot" style={{ background: '#fff', padding: 20 }}>
                <div>
                  <p style={{ color: '#241b33', fontWeight: 600 }}>No CV PDF yet</p>
                  {building ? (
                    <p id="st-build-why" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="spin" aria-hidden="true" style={{ borderColor: '#d9cfe6', borderTopColor: '#615a6c', width: 12, height: 12 }} />
                      Rebuilding with your latest changes
                    </p>
                  ) : (
                    <p style={{ fontSize: 13 }}>It builds a few seconds after your next change, or now.</p>
                  )}
                </div>
                <button type="button" className="btn btn-line" onClick={() => regen.mutate()} disabled={building} aria-describedby={building ? 'st-build-why' : undefined}>Build it now</button>
              </div>
            ) : null}
            {s && s.generatedAt ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: '#fff', border: '1px solid #ece4f5', borderRadius: 14, padding: '14px 16px' }} data-testid="cv-card">
                <span className="mark" aria-hidden="true" style={{ borderRadius: 10, background: '#f3e8ff' }}><Icon name="file" size={20} /></span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p className="b">Demi-Taylor-Nimmo-CV.pdf</p>
                  {building ? (
                    <p className="mute" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="spin" aria-hidden="true" style={{ borderColor: '#d9cfe6', borderTopColor: '#615a6c', width: 12, height: 12 }} />
                      Rebuilding with your latest changes
                    </p>
                  ) : (
                    <p className="mute num" style={{ fontSize: 13 }}>Rebuilt {rebuiltLabel(s.generatedAt!)}{kb ? ` · ${kb}` : ''}</p>
                  )}
                </div>
                {s.pdfUrl ? <a className="btn btn-text" href={s.pdfUrl} target="_blank" rel="noopener noreferrer">Download</a> : null}
                <button type="button" className="btn btn-line" onClick={() => regen.mutate()} disabled={building}>Regenerate</button>
              </div>
            ) : null}
            <p className="mute" style={{ fontSize: 13 }}>
              The <a href={`${SITE_URL}/cv`} target="_blank" rel="noopener noreferrer" style={{ color: '#4c1d95', fontWeight: 500 }}>generated CV</a> is the live page. This PDF is the file visitors download.
            </p>
          </div>
        </section>

        <section className="set" aria-labelledby="st-pr-t">
          <div>
            <h2 id="st-pr-t" className="set-t">Profile</h2>
            <p className="set-d">The name in the admin sidebar and the email you sign in with.</p>
          </div>
          <form className="panel" onSubmit={saveProfile} noValidate>
            <div className="pfields">
              <div className="field">
                <label htmlFor="st-name">Name</label>
                <input id="st-name" className="input" value={name} onChange={(e) => { setName(e.target.value); setProfileSaved(false) }} autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="st-email">Email</label>
                <input id="st-email" className={'input' + (emailBad ? ' err' : '')} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setProfileSaved(false) }} autoComplete="email" aria-invalid={emailBad} aria-describedby="st-em-h" />
                <span id="st-em-h" className={emailBad ? 'err-text' : 'hint'}>{emailBad ? 'Enter a full email address, like name@example.com.' : 'Changing it changes how you sign in.'}</span>
              </div>
            </div>
            <div className="pfoot">
              {profileSaved ? <span className="mute" style={{ fontSize: 13 }}>Saved</span> : null}
              <button type="submit" className="btn btn-primary" disabled={profile.isPending}>{profile.isPending ? <><span className="spin" aria-hidden="true" />Saving</> : 'Save profile'}</button>
            </div>
          </form>
        </section>

        <section className="set" aria-labelledby="st-pw-t">
          <div>
            <h2 id="st-pw-t" className="set-t">Password</h2>
            <p className="set-d">You stay signed in here after changing it.</p>
          </div>
          <form className="panel" onSubmit={savePw} noValidate>
            <div className="pfields">
              <div className="field">
                <label htmlFor="st-cur">Current password</label>
                <input id="st-cur" className={'input' + (curErr ? ' err' : '')} type="password" value={cur} onChange={(e) => { setCur(e.target.value); setPwSaved(false); setCurWrong(false) }} autoComplete="current-password" aria-invalid={!!curErr} aria-describedby={curErr ? 'st-cur-m' : undefined} />
                {curErr ? <span id="st-cur-m" className="err-text">{curErr}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="st-new">New password</label>
                <input id="st-new" className={'input' + (newBad ? ' err' : '')} type="password" value={nw} onChange={(e) => { setNw(e.target.value); setPwSaved(false) }} autoComplete="new-password" aria-invalid={newBad} aria-describedby="st-new-h" />
                <span id="st-new-h" className={newBad ? 'err-text' : 'hint'}>{left > 0 ? `At least ${MIN} characters. ${left} to go.` : 'Long enough.'}</span>
              </div>
              <div className="field">
                <label htmlFor="st-conf">Confirm new password</label>
                <input id="st-conf" className={'input' + (confBad ? ' err' : '')} type="password" value={conf} onChange={(e) => { setConf(e.target.value); setPwSaved(false) }} autoComplete="new-password" aria-invalid={confBad} aria-describedby={confBad ? 'st-conf-m' : undefined} />
                {confBad ? <span id="st-conf-m" className="err-text">This doesn't match the new password.</span> : null}
              </div>
            </div>
            <div className="pfoot">
              {pwSaved ? <span className="mute" style={{ fontSize: 13 }}>Password changed</span> : null}
              <button type="submit" className="btn btn-line" disabled={password.isPending}>{password.isPending ? 'Saving' : 'Change password'}</button>
            </div>
          </form>
        </section>

        <section className="set" aria-labelledby="st-sys-t">
          <div>
            <h2 id="st-sys-t" className="set-t">Account and connections</h2>
            <p className="set-d">Where this admin reads and writes. Set at deploy time.</p>
          </div>
          <div className="panel">
            <dl className="kv">
              <dt className="mute">Role</dt><dd className="right">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}</dd>
              <dt className="mute">Account</dt><dd className="right"><span className="pill p-live"><span className="dot" />Active</span></dd>
              <dt className="mute">Site</dt><dd className="right"><a href={SITE_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#4c1d95', textDecoration: 'none', fontWeight: 500 }}>{hostOf(SITE_URL)}</a></dd>
              <dt className="mute">API</dt><dd className="right mono">{hostOf(API_ORIGIN)}</dd>
            </dl>
          </div>
        </section>
      </div>
    </>
  )
}
