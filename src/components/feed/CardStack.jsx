import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import { useFeed } from '../../hooks/useFeed'
import SwipeCard from './SwipeCard/SwipeCard'
import ExpandedCard from './ExpandedCard/ExpandedCard'
import ShareModal from '../shared/ShareModal'

export default function CardStack() {
  const { deck, isExpanded, setIsExpanded, savedStocks } = useApp()
  const { actionSwipe } = useFeed()
  const [sharePayload, setSharePayload] = useState(null)

  const visibleCards = deck.slice(0, 3)
  const topStock = deck[0]

  if (!deck.length) {
    return (
      <div className="card-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48, color: '#e0e0e0' }}>✓</div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 600, color: '#0a0a0a' }}>
          You're all caught up
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 220 }}>
          Check your saved stocks or come back later for more picks.
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card-stack">
        {/* Render bottom cards first (so top is on top) */}
        {[...visibleCards].reverse().map((stock, revIdx) => {
          const index = visibleCards.length - 1 - revIdx
          return (
            <SwipeCard
              key={stock.ticker}
              stock={stock}
              index={index}
              onSwipeLeft={() => actionSwipe('left', stock.ticker)}
              onSwipeRight={() => actionSwipe('right', stock.ticker)}
              onExpand={() => setIsExpanded(true)}
              onShare={() => setSharePayload({ type: 'stock', ticker: stock.ticker })}
            />
          )
        })}

        {/* Expanded card overlay */}
        {isExpanded && topStock && (
          <ExpandedCard
            stock={topStock}
            onCollapse={() => setIsExpanded(false)}
            onShare={() => setSharePayload({ type: 'stock', ticker: topStock.ticker })}
          />
        )}
      </div>

      <ShareModal
        isOpen={!!sharePayload}
        onClose={() => setSharePayload(null)}
        payload={sharePayload}
      />
    </>
  )
}
