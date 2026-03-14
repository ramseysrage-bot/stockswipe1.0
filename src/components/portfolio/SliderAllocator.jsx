import CompanyLogo from '../shared/CompanyLogo'

export default function SliderAllocator({ stocks, weights, onChange, onAnalyze, onEqualWeight }) {
  const total = stocks.reduce((sum, t) => sum + (weights[t] || 0), 0)
  const valid = Math.abs(total - 100) < 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 20 }}>
        {stocks.map(ticker => (
          <div key={ticker} className="pf-slider-row">
            <div className="pf-slider-top">
              <CompanyLogo ticker={ticker} size={32} className="" style={{ borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700 }}>{ticker}</div>
              <div className="pf-slider-pct">{(weights[ticker] || 0).toFixed(0)}%</div>
            </div>
            <input
              type="range" min="0" max="100" step="1"
              value={weights[ticker] || 0}
              onChange={e => onChange(ticker, Number(e.target.value))}
              className="pf-range"
            />
          </div>
        ))}
      </div>

      {/* Total indicator */}
      <div style={{
        textAlign: 'center', marginBottom: 12,
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        color: valid ? '#00C853' : total > 100 ? '#E53935' : '#888',
      }}>
        Total: {total.toFixed(0)}% {valid ? '✓' : total > 100 ? '(over 100%)' : '(must sum to 100%)'}
      </div>

      <button
        onClick={onEqualWeight}
        style={{
          marginBottom: 10, padding: '12px', borderRadius: 100, border: '1px solid #e8e8e8',
          background: '#fff', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#0a0a0a',
        }}
      >
        Equal Weight
      </button>

      <button
        className="cta"
        style={{ opacity: valid ? 1 : 0.4, pointerEvents: valid ? 'auto' : 'none' }}
        onClick={onAnalyze}
        disabled={!valid}
      >
        Analyze Portfolio →
      </button>
    </div>
  )
}
