import { useEffect } from 'react'
import { useApp } from '../../store/AppContext'
import { useFeed } from '../../hooks/useFeed'
import CardStack from './CardStack'
import IndexPillRow from './IndexPillRow'

export default function FeedTab() {
  const { deck } = useApp()
  const { initFeed } = useFeed()

  useEffect(() => {
    initFeed()
  }, []) // run once on mount

  return (
    <div className="feed-screen active">
      {/* Nav bar */}
      <div className="nav-bar" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div className="nav-logo">StockSwype</div>
        </div>
        <div className="nav-pill" id="feed-count">{deck.length} left</div>
        <div style={{ flex: 1 }} />
      </div>

      <CardStack />
      <IndexPillRow />
    </div>
  )
}
