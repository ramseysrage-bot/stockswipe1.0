export default function WatchlistSummary({ stocks }) {
  if (!stocks.length) return null

  const posCount = stocks.filter(s => s.color === '#00C853').length
  const negCount = stocks.length - posCount

  return (
    <div className="wl-summary-card">
      <div className="wl-sector-pills">
        {posCount > 0 && (
          <span className="wl-sector-pill" style={{ background: 'rgba(0,200,83,0.1)', color: '#00C853' }}>
            ▲ {posCount} up
          </span>
        )}
        {negCount > 0 && (
          <span className="wl-sector-pill" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935' }}>
            ▼ {negCount} down
          </span>
        )}
      </div>
      <div className="wl-summary-line">{stocks.length} stocks saved</div>
      <div className="wl-pnl-line" style={{ color: '#888' }}>
        Tap a row to view details · Swipe left to remove
      </div>
    </div>
  )
}
