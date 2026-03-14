import { useEffect, useState } from 'react'
import { useApp } from '../../store/AppContext'

const TABS = [
  {
    id: 'home',
    label: 'Home',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C853' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'Saved',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C853' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    id: 'news',
    label: 'News',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C853' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
        <line x1="16" y1="13" x2="10" y2="13"/>
        <line x1="16" y1="17" x2="10" y2="17"/>
        <line x1="16" y1="9"  x2="10" y2="9"/>
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C853' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
  {
    id: 'friends',
    label: 'Friends',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C853' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C853' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

// One-time animation: "Alpha" word → "α" symbol, stored in localStorage
function AlphaTabLabel() {
  const [phase, setPhase] = useState(() =>
    localStorage.getItem('alphaTabDone') === '1' ? 'symbol' : 'word'
  )

  useEffect(() => {
    if (phase !== 'word') return
    const t = setTimeout(() => {
      setPhase('out')
      setTimeout(() => {
        setPhase('symbol')
        localStorage.setItem('alphaTabDone', '1')
      }, 600)
    }, 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="alpha-tab-label-wrap">
      <span
        className="alpha-tab-word"
        style={{ opacity: phase === 'word' ? 1 : 0, transform: phase === 'word' ? 'scale(1)' : 'scale(0.6)' }}
      >
        Alpha
      </span>
      <span
        className="alpha-tab-sym"
        style={{ opacity: phase === 'symbol' ? 1 : 0, transform: phase === 'symbol' ? 'scale(1)' : 'scale(1.4)' }}
      >
        α
      </span>
    </div>
  )
}

export default function TabNav({ friendsBadge = 0 }) {
  const { activeTab, setActiveTab, isExpanded, setAlphaOpen } = useApp()

  return (
    <nav className="bottom-nav active" style={isExpanded ? { display: 'none' } : {}}>
      {TABS.map(tab => {
        const active = activeTab === tab.id
        return (
          <div
            key={tab.id}
            className={`nav-item${active ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="nav-icon" style={{ position: 'relative' }}>
              {tab.icon(active)}
              {tab.id === 'friends' && friendsBadge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#E53935', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: 9, fontFamily: "'DM Mono', monospace",
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {friendsBadge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </div>
        )
      })}

      {/* Alpha tab — opens overlay, does not change activeTab */}
      <div
        className="nav-item alpha-nav-item"
        onClick={() => setAlphaOpen(true)}
      >
        <AlphaTabLabel />
      </div>
    </nav>
  )
}
