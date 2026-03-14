function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60)  return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

export default function Inbox({ messages, onOpenStock, onClearAll }) {
  if (!messages.length) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
      No messages yet
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 8px' }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Inbox ({messages.length})
        </span>
        <button
          onClick={onClearAll}
          style={{ background: 'none', border: 'none', color: '#E53935', fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: 'pointer' }}
        >
          Clear All
        </button>
      </div>
      {messages.map(msg => {
        const payload = msg.payload || {}
        const label = payload.type === 'stock'
          ? `📈 ${payload.ticker}`
          : payload.type === 'article'
          ? `📰 ${payload.headline || 'Article'}`
          : `📊 Portfolio`
        const sender = msg.sender_username || 'Someone'

        return (
          <div
            key={msg.id}
            className="fr-row"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (payload.type === 'stock') onOpenStock?.(payload.ticker)
              else if (payload.type === 'article') window.open(payload.url, '_blank')
            }}
          >
            <div className="fr-left">
              <div className="fr-av" style={{ background: '#0a0a0a', fontSize: 16, width: 40, height: 40 }}>
                {payload.type === 'stock' ? '📈' : payload.type === 'article' ? '📰' : '📊'}
              </div>
              <div className="fr-text">
                <div className="fr-name"><strong>{sender}</strong> shared {label}</div>
                <div className="fr-time">{timeAgo(msg.created_at)}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
