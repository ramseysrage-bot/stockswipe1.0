import CompanyLogo from '../../shared/CompanyLogo'

export default function CompanyHeader({ stock, showExpanded = false }) {
  const isPos = stock.change && !stock.change.startsWith('-')
  const color  = isPos ? '#00C853' : '#E53935'

  return (
    <div className="c-header">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <CompanyLogo ticker={stock.ticker} size={52} className="card-logo-avatar" />
        <div>
          <div className="c-ticker">{stock.ticker}</div>
          <div className="c-name">{stock.name}</div>
          {stock.sector && (
            <div className="c-sect" style={{ marginTop: 6 }}>{stock.sector}</div>
          )}
        </div>
      </div>
      <div className="c-price-box">
        <div className="c-price">{stock.price ?? '—'}</div>
        {stock.change && (
          <div className="c-change" style={{ color }}>{stock.change}</div>
        )}
      </div>
    </div>
  )
}
