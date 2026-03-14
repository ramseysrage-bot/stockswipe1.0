import { useRef } from 'react'
import { useSwipe } from '../../../hooks/useSwipe'
import CardStamps from './CardStamps'
import CompanyHeader from './CompanyHeader'
import CardSparkline from './CardSparkline'

// depth styles for cards behind the top card
function getDepthStyle(index) {
  if (index === 0) return {}
  const scale = 1 - index * 0.03
  const translateY = -index * 8
  return {
    transform: `scale(${scale}) translateY(${translateY}px)`,
    zIndex: 10 - index,
    pointerEvents: 'none',
    opacity: index === 1 ? 1 : 0.6,
  }
}

export default function SwipeCard({ stock, index, onSwipeLeft, onSwipeRight, onExpand, onShare }) {
  const cardRef      = useRef(null)
  const stampSaveRef = useRef(null)
  const stampPassRef = useRef(null)

  const isTop = index === 0
  const swipeHandlers = useSwipe({
    cardRef, stampSaveRef, stampPassRef,
    disabled: !isTop,
    onSwipeLeft,
    onSwipeRight,
    onTap: onExpand,
  })

  const isPos   = stock.change && !stock.change.startsWith('-')
  const color   = isPos ? '#00C853' : '#E53935'

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{
        ...getDepthStyle(index),
        cursor: isTop ? 'grab' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y',
      }}
      {...(isTop ? swipeHandlers : {})}
    >
      {isTop && (
        <>
          <div ref={stampSaveRef} className="card-stamp stamp-save" style={{ opacity: 0 }}>BULL</div>
          <div ref={stampPassRef} className="card-stamp stamp-pass" style={{ opacity: 0 }}>BEAR</div>
        </>
      )}

      <div className="card-inner">
        <CompanyHeader stock={stock} />
        <CardSparkline ticker={stock.ticker} color={color} />

        {/* Stats */}
        {(stock.pe || stock.marketCap) && (
          <div className="c-stats" style={{ marginTop: 16 }}>
            {stock.pe && (
              <div className="stat-box">
                <div className="stat-lbl">P/E Ratio</div>
                <div className="stat-val">{stock.pe}</div>
              </div>
            )}
            {stock.marketCap && (
              <div className="stat-box">
                <div className="stat-lbl">Market Cap</div>
                <div className="stat-val">{stock.marketCap}</div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {stock.description && (
          <div className="c-short-desc" style={{ marginTop: 8 }}>{stock.description}</div>
        )}

        {/* Action row */}
        {isTop && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <button
              className="card-share-btn"
              onClick={e => { e.stopPropagation(); onShare?.() }}
              aria-label="Share"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onExpand?.() }}
              style={{
                background: 'none', border: '1px solid #e8e8e8', borderRadius: 100,
                padding: '6px 14px', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888',
              }}
            >
              Details ↗
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
