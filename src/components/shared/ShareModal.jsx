import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../store/AppContext'

export default function ShareModal({ isOpen, onClose, payload }) {
  // payload: { type: 'stock'|'article'|'portfolio', ticker?, article?, portfolioId? }
  const { currentUser, showToast } = useApp()
  const [friends, setFriends] = useState([])
  const [sent, setSent] = useState({}) // { userId: true }
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !currentUser) return
    setLoading(true)
    setSent({})
    supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)
      .then(async ({ data }) => {
        if (!data) { setFriends([]); setLoading(false); return }
        const ids = data.map(r => r.requester_id === currentUser.id ? r.addressee_id : r.requester_id)
        if (!ids.length) { setFriends([]); setLoading(false); return }
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', ids)
        setFriends(profiles || [])
        setLoading(false)
      })
  }, [isOpen, currentUser])

  async function sendTo(friend) {
    if (!currentUser || sent[friend.user_id]) return
    const msgPayload = payload?.type === 'stock'
      ? { type: 'stock', ticker: payload.ticker }
      : payload?.type === 'article'
      ? { type: 'article', url: payload.article?.url, headline: payload.article?.headline, ticker: payload.ticker }
      : { type: 'portfolio', id: payload.portfolioId }

    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      recipient_id: friend.user_id,
      content_type: payload?.type || 'stock',
      payload: msgPayload,
    })
    if (!error) {
      setSent(s => ({ ...s, [friend.user_id]: true }))
      showToast(`Sent to ${friend.username}!`)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className={`share-overlay${isOpen ? ' active' : ''}`} onClick={onClose} />
      <div className={`share-modal${isOpen ? ' active' : ''}`}>
        <div className="share-modal-handle" />
        <div className="share-modal-header">
          <span className="share-modal-title">
            {payload?.type === 'stock' ? `Share ${payload.ticker}` :
             payload?.type === 'article' ? 'Share Article' : 'Share Portfolio'}
          </span>
          <button className="share-modal-close" onClick={onClose}>×</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            Loading friends…
          </div>
        ) : friends.length === 0 ? (
          <div className="share-modal-body">
            <div className="share-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <p className="share-empty-text">Add friends to share stocks with them</p>
            <button className="share-find-btn" onClick={onClose}>Find Friends</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {friends.map(f => (
              <div key={f.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#0a0a0a', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14,
                  }}>
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt={f.username} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      : f.username?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 15, color: '#0a0a0a' }}>
                    {f.username}
                  </span>
                </div>
                <button
                  onClick={() => sendTo(f)}
                  style={{
                    padding: '8px 18px', borderRadius: 100,
                    background: sent[f.user_id] ? '#e8f8ef' : '#00C853',
                    color: sent[f.user_id] ? '#00C853' : '#fff',
                    border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13,
                    transition: 'all 0.2s',
                  }}
                >
                  {sent[f.user_id] ? '✓ Sent' : 'Send'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
