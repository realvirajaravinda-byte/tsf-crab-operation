import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>TSF <span style={{ color: 'var(--accent)' }}>Crab Operation</span></h1>
        <p className="sub">Sign in to continue</p>
        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Email</label>
            <input
              type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  )
}
