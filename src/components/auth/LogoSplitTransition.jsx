import { useEffect, useRef } from 'react'

export default function LogoSplitTransition({ onComplete }) {
  const leftRef  = useRef(null)
  const rightRef = useRef(null)
  const wordRef  = useRef(null)

  useEffect(() => {
    const left  = leftRef.current
    const right = rightRef.current
    const word  = wordRef.current
    if (!left || !right || !word) return

    // Phase 1: fade in wordmark
    setTimeout(() => { word.style.opacity = '1' }, 100)
    // Phase 2: slide panels out
    setTimeout(() => {
      left.style.transition  = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)'
      right.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)'
      left.style.transform   = 'translateX(-100%)'
      right.style.transform  = 'translateX(100%)'
      word.style.opacity     = '0'
    }, 600)
    // Phase 3: done
    const timer = setTimeout(onComplete, 1200)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Left panel */}
      <div ref={leftRef} style={{
        position: 'absolute', left: 0, top: 0, width: '50%', height: '100%',
        background: '#00C853',
      }} />
      {/* Right panel */}
      <div ref={rightRef} style={{
        position: 'absolute', right: 0, top: 0, width: '50%', height: '100%',
        background: '#00C853',
      }} />
      {/* Wordmark */}
      <span ref={wordRef} style={{
        position: 'relative', zIndex: 1,
        fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 800,
        letterSpacing: 4, textTransform: 'uppercase',
        background: 'linear-gradient(130deg, #00C853, #69F0AE 55%, #00BFA5)',
        WebkitBackgroundClip: 'text', backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        opacity: 0, transition: 'opacity 0.4s ease',
      }}>
        StockSwype
      </span>
    </div>
  )
}
