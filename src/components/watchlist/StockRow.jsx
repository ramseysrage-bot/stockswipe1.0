import { useRef, useState } from 'react'
import CompanyLogo from '../shared/CompanyLogo'

export default function StockRow({ stock, onDelete, onOpen }) {
  const itemRef    = useRef(null)
  const startX     = useRef(0)
  const isDragging = useRef(false)
  const [offset, setOffset]   = useState(0)
  const [swiped, setSwiped]   = useState(false)

  const THRESHOLD = 80

  function onTouchStart(e) {
    startX.current  = e.touches[0].clientX
    isDragging.current = true
  }

  function onTouchMove(e) {
    if (!isDragging.current) return
    const dx = e.touches[0].clientX - startX.current
    if (dx < 0) setOffset(Math.max(dx, -THRESHOLD))
  }

  function onTouchEnd() {
    isDragging.current = false
    if (offset <= -THRESHOLD) {
      setSwiped(true)
      setOffset(-THRESHOLD)
    } else {
      setOffset(0)
    }
  }

  const color = stock.color || '#888'
  const bg    = color === '#00C853' ? 'rgba(0,200,83,0.1)' : 'rgba(229,57,53,0.1)'

  return (
    <div className="wl-row-wrap">
      {/* Delete button revealed on swipe */}
      <button
        className="wl-remove-btn"
        onClick={() => onDelete(stock.ticker)}
        style={{ opacity: swiped ? 1 : Math.abs(offset) / THRESHOLD }}
      >
        Remove
      </button>

      {/* Sliding row */}
      <div
        className="wl-item-sliding"
        ref={itemRef}
        style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.25s ease' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => !swiped && onOpen(stock)}
      >
        <div className="wl-item">
          <div className="wl-item-left">
            <CompanyLogo ticker={stock.ticker} size={44} className="logo-avatar" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div className="wl-names">
                <span className="wl-t">{stock.ticker}</span>
                {stock.name && <span className="wl-n">{stock.name}</span>}
              </div>
              {stock.change && stock.change !== '—' && (
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
                  color, background: bg, padding: '3px 8px', borderRadius: 8,
                  whiteSpace: 'nowrap', display: 'inline-block',
                }}>
                  {stock.change}
                </div>
              )}
              {stock.pnl && (
                <div className="wl-pnl-line" style={{ color: stock.pnlColor || '#888' }}>
                  {stock.pnl}
                </div>
              )}
            </div>
          </div>
          <div className="wl-item-right">
            <span className="wl-p">{stock.price}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
