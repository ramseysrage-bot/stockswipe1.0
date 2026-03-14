export default function FriendRow({ friend, onRemove, onViewStocks }) {
  const initials = friend.username?.[0]?.toUpperCase() || '?'
  const colors   = ['#1a1a2e','#16213e','#0f3460','#533483','#2b2d42','#006d77']
  const bg       = colors[(friend.username?.charCodeAt(0) || 0) % colors.length]

  return (
    <div className="fr-row">
      <div className="fr-left">
        <div className="fr-av" style={{ background: bg }}>
          {friend.avatarUrl
            ? <img src={friend.avatarUrl} alt={friend.username} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            : initials}
        </div>
        <div className="fr-text">
          <div className="fr-name"><strong>{friend.username}</strong></div>
          {friend.status === 'pending' && <div className="fr-time">Pending request</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onViewStocks && (
          <button className="fr-btn fr-save" onClick={() => onViewStocks(friend)}>Stocks</button>
        )}
        {onRemove && (
          <button className="fr-btn" style={{ background: '#fef0f0', color: '#E53935' }} onClick={() => onRemove(friend)}>Remove</button>
        )}
      </div>
    </div>
  )
}
