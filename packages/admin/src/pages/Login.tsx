import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SITE_URL } from '@/lib/config'

import { EMAIL_RE } from '@/lib/validation'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const pwRef = useRef<HTMLInputElement>(null)

  const emailBad = tried && !EMAIL_RE.test(email)
  const pwBad = tried && pw.length === 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    setFailed(false)
    if (!EMAIL_RE.test(email) || pw.length === 0) return
    setBusy(true)
    try {
      await login(email, pw)
    } catch {
      setFailed(true)
      setPw('')
      setTried(false)
      pwRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '0 29px', borderBottom: '1px solid #ece4f5' }}>
        <a href={SITE_URL} aria-label="Demi Taylor Nimmo, view site" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/logo.svg" alt="" width={128} height={72} style={{ height: 24, width: 'auto' }} />
          <span className="ad-word">Demi</span>
          <span className="mute" style={{ fontSize: 13 }}>Admin</span>
        </a>
        <a className="btn btn-text" href={SITE_URL}>Back to the site</a>
      </header>

      <main className="lg">
        <div className="card" style={{ padding: 32 }}>
          <h1 className="ad-title">Sign in</h1>
          <p className="ad-sub">Edit the projects, posts and roles on demitaylornimmo.com.</p>
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
            <div className="field">
              <label htmlFor="lg-email">Email</label>
              <input
                id="lg-email"
                className={'input' + (emailBad ? ' err' : '')}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailBad}
                aria-describedby={emailBad ? 'lg-email-msg' : undefined}
              />
              {emailBad ? <span id="lg-email-msg" className="err-text">Enter the email you sign in with, like name@example.com.</span> : null}
            </div>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label htmlFor="lg-pw">Password</label>
                <button type="button" className="btn btn-text" onClick={() => setShow(!show)} aria-pressed={show} style={{ minHeight: 32, padding: '0 10px', fontSize: 13 }}>
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                ref={pwRef}
                id="lg-pw"
                className={'input' + (pwBad ? ' err' : '')}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                aria-invalid={pwBad}
                aria-describedby={pwBad ? 'lg-pw-msg' : failed ? 'lg-fail' : undefined}
              />
              {pwBad ? <span id="lg-pw-msg" className="err-text">Enter your password.</span> : null}
            </div>
            {failed ? <p id="lg-fail" className="err-text" role="alert">That email and password don't match. Try again.</p> : null}
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ marginTop: 8 }}>
              {busy ? <span className="spin" aria-hidden="true" /> : null}
              {busy ? 'Signing in' : 'Sign in'}
            </button>
          </form>
          <p className="mute" style={{ fontSize: 13, marginTop: 20 }}>Only the site owner has an account.</p>
        </div>

        <figure className="lg-shot" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ border: '1px solid #ece4f5', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #ece4f5', background: '#f8f4fc' }}>
              <span style={{ padding: '3px 12px', borderRadius: 99, background: '#fff', border: '1px solid #ece4f5', fontSize: 12 }}>demitaylornimmo.com</span>
              <span className="pill p-live" style={{ marginLeft: 'auto' }}><span className="dot" />Live</span>
            </div>
            <img
              src="/login-site.jpg"
              alt="The live portfolio home page: a 3D full-stack hero beside Demi's name in pink script"
              width={1440}
              height={900}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
          <figcaption className="mute" style={{ fontSize: 13 }}>Everything you change here shows on the live site straight away. The CV regenerates from it.</figcaption>
        </figure>
      </main>
    </>
  )
}
