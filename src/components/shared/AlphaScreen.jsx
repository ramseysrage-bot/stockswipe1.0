import { useEffect, useRef, useState } from 'react'

const TAGLINES = [
  'Real-time AI-generated insights',
  'Advanced portfolio analytics',
  'Institutional-grade research',
]

const FEATURES = [
  { title: 'AI Stock Summaries', desc: 'Get concise AI-generated summaries of earnings calls, SEC filings, and analyst reports — in plain English.' },
  { title: 'Smart Price Alerts', desc: 'Set intelligent alerts based on technical signals, not just price targets. Know when something actually matters.' },
  { title: 'Portfolio X-Ray', desc: 'Deep analysis of your portfolio\'s sector exposure, volatility profile, and correlation to macro trends.' },
  { title: 'Social Sentiment', desc: 'Track what retail and institutional investors are saying — filtered for signal, not noise.' },
]

export default function AlphaScreen({ isOpen, onClose }) {
  const transitionRef = useRef(null)
  const leftRef = useRef(null)
  const rightRef = useRef(null)
  const symRef = useRef(null)
  const screenRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [taglineIdx, setTaglineIdx] = useState(0)
  const [wordOpacity, setWordOpacity] = useState(1)
  const [symOpacity, setSymOpacity] = useState(0)
  const taglineTimer = useRef(null)
  const crossfadeTimer = useRef(null)
  const [notified, setNotified] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    // Animate in
    const ts = transitionRef.current
    const left = leftRef.current
    const right = rightRef.current
    const sym = symRef.current

    if (!ts || !left || !right || !sym) return

    // Reset
    left.style.transition = 'none'; right.style.transition = 'none'; sym.style.transition = 'none'
    left.style.transform = 'translateX(-100%)'; right.style.transform = 'translateX(100%)'; sym.style.transform = 'scale(1)'
    ts.style.display = 'flex'

    requestAnimationFrame(() => requestAnimationFrame(() => {
      sym.style.transition = 'transform 0.5s ease'
      sym.style.transform = 'scale(40)'
    }))
    setTimeout(() => {
      left.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)'
      right.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)'
      left.style.transform = 'translateX(0)'; right.style.transform = 'translateX(0)'
    }, 350)
    setTimeout(() => {
      setVisible(true)
      left.style.transform = 'translateX(-100%)'; right.style.transform = 'translateX(100%)'
    }, 920)
    setTimeout(() => {
      ts.style.display = 'none'
      startTimers()
    }, 1100)

    return () => stopTimers()
  }, [isOpen])

  function startTimers() {
    taglineTimer.current = setInterval(() => {
      setTaglineIdx(i => (i + 1) % TAGLINES.length)
    }, 3500)
    crossfadeTimer.current = setInterval(() => {
      setWordOpacity(0); setSymOpacity(1)
      setTimeout(() => { setWordOpacity(1); setSymOpacity(0) }, 1200)
    }, 4000)
  }

  function stopTimers() {
    clearInterval(taglineTimer.current); clearInterval(crossfadeTimer.current)
    setWordOpacity(1); setSymOpacity(0)
  }

  function handleClose() {
    stopTimers()
    setVisible(false)
    const ts = transitionRef.current
    const left = leftRef.current; const right = rightRef.current; const sym = symRef.current
    if (!ts || !left || !right || !sym) { onClose(); return }
    sym.style.transition = 'none'; sym.style.transform = 'scale(40)'
    left.style.transition = 'none'; left.style.transform = 'translateX(0)'
    right.style.transition = 'none'; right.style.transform = 'translateX(0)'
    ts.style.display = 'flex'
    requestAnimationFrame(() => requestAnimationFrame(() => {
      left.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)'
      right.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)'
      sym.style.transition = 'transform 0.5s ease 0.1s'
      left.style.transform = 'translateX(-100%)'; right.style.transform = 'translateX(100%)'
      sym.style.transform = 'scale(1)'
    }))
    setTimeout(() => { ts.style.display = 'none'; onClose() }, 950)
  }

  if (!isOpen && !visible) return null

  return (
    <>
      {/* Transition overlay */}
      <div ref={transitionRef} id="alpha-transition-screen" style={{ display: 'none' }}>
        <div ref={leftRef} id="alpha-transition-left" />
        <div ref={rightRef} id="alpha-transition-right" />
        <div ref={symRef} id="alpha-transition-symbol">α</div>
      </div>

      {/* Alpha screen */}
      <div id="alpha-screen" ref={screenRef} style={{ display: isOpen ? 'flex' : 'none', opacity: visible ? 1 : 0 }}>
        <button className="alpha-close-btn" onClick={handleClose}>×</button>
        <div className="alpha-screen-inner">
          <div className="alpha-header">
            <span className="alpha-logo-wordmark">StockSwype</span>
            <div className="alpha-word-container">
              <span id="alpha-word-text" className="alpha-word" style={{ opacity: wordOpacity, transition: 'opacity 0.5s ease' }}>Alpha</span>
              <span id="alpha-symbol-text" className="alpha-symbol-big" style={{ opacity: symOpacity, transition: 'opacity 0.5s ease' }}>α</span>
            </div>
          </div>

          <div className="alpha-tagline-wrap">
            {TAGLINES.map((t, i) => (
              <div key={t} className={`alpha-tagline${i === taglineIdx ? ' visible' : ''}`}>{t}</div>
            ))}
          </div>

          <div className="alpha-price-block">
            <div className="alpha-price-amount">$0</div>
            <div className="alpha-price-period">Free during beta</div>
          </div>

          <div className="alpha-divider" style={{ margin: '24px 0 8px' }} />

          <div className="alpha-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="alpha-feature-row">
                <div className="alpha-feature-icon">α</div>
                <div className="alpha-feature-text">
                  <div className="alpha-feature-title">{f.title}</div>
                  <div className="alpha-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            id="alpha-cta-btn"
            className="alpha-cta-btn"
            onClick={() => {
              setNotified(true)
              setTimeout(() => setNotified(false), 3000)
            }}
          >
            {notified ? "You're on the list. We'll let you know. 🚀" : 'Notify Me When Alpha Launches'}
          </button>
        </div>
      </div>
    </>
  )
}
