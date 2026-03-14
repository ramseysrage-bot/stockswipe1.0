export default function SharedPortfolioView({ portfolio, senderUsername, onClose }) {
  if (!portfolio) return null
  const { tickers = [], weights = {}, name = 'Portfolio' } = portfolio

  return (
    <div className="pf-shared-screen active">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#0a0a0a', padding: '8px 8px 8px 0' }}>←</button>
        <div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 16, color: '#0a0a0a' }}>{name}</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888' }}>Shared by {senderUsername}</div>
        </div>
        <div className="pf-shared-badge" style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 16 }}>📊</span> Shared
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: '#bbb', marginBottom: 12 }}>
          Allocation
        </div>
        {tickers.map(t => (
          <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: '#0a0a0a' }}>{t}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#00C853' }}>{weights[t] || 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
