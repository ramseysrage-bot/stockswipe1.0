import { useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { useFeed } from '../../hooks/useFeed'
import CardStack from './CardStack'
import IndexPillRow from './IndexPillRow'
import AlphaScreen from '../shared/AlphaScreen'
import { useState } from 'react'

export default function FeedTab() {
  const { deck, savedStocks, isExpanded, userProfile } = useApp()
  const { initFeed } = useFeed()
  const [alphaOpen, setAlphaOpen] = useState(false)

  useEffect(() => {
    initFeed()
  }, []) // run once on mount

  const remaining = Math.max(0, 7 - (deck.length > 7 ? 0 : 7 - deck.length))

  return (
    <>
      <div className="feed-screen active">
        {/* Nav bar */}
        <div className="nav-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="nav-logo">StockSwype</div>
            <button
              className="alpha-badge"
              onClick={() => setAlphaOpen(true)}
              aria-label="Open Alpha features"
            >
              <span className="alpha-badge-char">α</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="nav-pill" id="feed-count">{deck.length} left</div>
          </div>
        </div>

        <CardStack />
        <IndexPillRow />
      </div>

      <AlphaScreen isOpen={alphaOpen} onClose={() => setAlphaOpen(false)} />
    </>
  )
}
