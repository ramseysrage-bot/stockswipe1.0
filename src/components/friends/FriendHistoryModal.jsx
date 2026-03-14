import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import CompanyLogo from '../shared/CompanyLogo'

export default function FriendHistoryModal({ friendId, username, avatarUrl, onClose }) {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!friendId) return
    setLoading(true)
    supabase
      .from('saved_stocks')
      .select('ticker')
      .eq('user_id', friendId)
      .order('saved_at', { ascending: false })
      .then(({ data }) => {
        setStocks((data || []).map(r => r.ticker))
        setLoading(false)
      })
  }, [friendId])

  if (!friendId) return null

  return (
    <div className={`fr-hist-modal${friendId ? ' active' : ''}`}>
      <div className="fr-hist-header">
        <div className="fr-hist-title">
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={username} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              : username?.[0]?.toUpperCase()}
          </div>
          {username}'s Stocks
        </div>
        <button className="fr-hist-close" onClick={onClose}>×</button>
      </div>
      <div className="fr-hist-body">
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Loading…</div>
        ) : stocks.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60, color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>No saved stocks</div>
        ) : (
          <div style={{ padding: '0 24px' }}>
            {stocks.map(ticker => (
              <div key={ticker} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                <CompanyLogo ticker={ticker} size={44} className="logo-avatar" />
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 15, color: '#0a0a0a' }}>{ticker}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
