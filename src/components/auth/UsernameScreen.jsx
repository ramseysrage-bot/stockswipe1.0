import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../store/AppContext'

function validateUsername(u) {
  if (!u || u.length < 3) return 'Must be at least 3 characters'
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Only letters, numbers, and underscores'
  if (u.length > 20) return 'Max 20 characters'
  return null
}

export default function UsernameScreen({ onComplete }) {
  const { currentUser } = useApp()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validationError = validateUsername(value)

  async function handleSubmit() {
    if (validationError || loading) return
    setLoading(true)
    setError('')

    // Check uniqueness
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('username', value.trim())
      .maybeSingle()

    if (existing) {
      setError('Username already taken')
      setLoading(false)
      return
    }

    const { error: upsertErr } = await supabase
      .from('user_profiles')
      .upsert({ user_id: currentUser.id, username: value.trim() }, { onConflict: 'user_id' })

    if (upsertErr) {
      setError('Something went wrong, try again')
      setLoading(false)
      return
    }
    onComplete(value.trim())
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#fff', zIndex: 500,
      display: 'flex', flexDirection: 'column', padding: '54px 24px 120px',
    }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', background: 'linear-gradient(130deg,#00C853,#69F0AE 55%,#00BFA5)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>
          StockSwype
        </div>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 32, fontWeight: 500, color: '#0a0a0a', letterSpacing: -1.2, marginBottom: 8 }}>
          Choose a username
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#888', lineHeight: 1.6 }}>
          This is how friends will find you on StockSwype.
        </p>
      </div>

      <input
        className="auth-input"
        type="text"
        placeholder="e.g. stockwatcher_99"
        value={value}
        onChange={e => { setValue(e.target.value); setError('') }}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        maxLength={20}
        autoFocus
        autoCapitalize="none"
        autoCorrect="off"
      />
      {error && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#E53935', marginTop: 8 }}>{error}</p>
      )}

      <div style={{ flex: 1 }} />

      <button
        className="cta"
        style={{ opacity: validationError ? 0.4 : 1, pointerEvents: validationError ? 'none' : 'auto' }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Saving…' : 'Continue →'}
      </button>
    </div>
  )
}
