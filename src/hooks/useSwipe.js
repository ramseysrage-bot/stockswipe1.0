import { useRef, useCallback } from 'react'

const SWIPE_THRESHOLD = 80   // px to trigger swipe
const TAP_MAX_MOVE   = 10   // px — treat as tap if moved less than this
const TAP_MAX_TIME   = 300  // ms

export function useSwipe({ onSwipeLeft, onSwipeRight, onTap, disabled, cardRef, stampSaveRef, stampPassRef }) {
  const startX    = useRef(0)
  const startY    = useRef(0)
  const startTime = useRef(0)
  const deltaX    = useRef(0)
  const hasMoved  = useRef(false)
  const isDragging = useRef(false)

  const handleStart = useCallback((e) => {
    if (disabled) return
    const pt = e.touches ? e.touches[0] : e
    startX.current    = pt.clientX
    startY.current    = pt.clientY
    startTime.current = Date.now()
    deltaX.current    = 0
    hasMoved.current  = false
    isDragging.current = true

    const card = cardRef?.current
    if (card) {
      card.style.transition = 'none'
    }
  }, [disabled, cardRef])

  const handleMove = useCallback((e) => {
    if (!isDragging.current || disabled) return
    const pt = e.touches ? e.touches[0] : e
    const dx = pt.clientX - startX.current
    const dy = pt.clientY - startY.current

    // Only handle horizontal swipes
    if (!hasMoved.current && Math.abs(dy) > Math.abs(dx) * 1.5) {
      isDragging.current = false
      return
    }

    hasMoved.current = Math.abs(dx) > TAP_MAX_MOVE
    deltaX.current = dx

    const card = cardRef?.current
    if (card && hasMoved.current) {
      e.preventDefault()
      const rotate = dx * 0.06
      card.style.transform = `translateX(${dx}px) rotate(${rotate}deg)`

      const progress = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1)
      if (stampSaveRef?.current) stampSaveRef.current.style.opacity = dx > 0 ? progress : 0
      if (stampPassRef?.current) stampPassRef.current.style.opacity = dx < 0 ? progress : 0
    }
  }, [disabled, cardRef, stampSaveRef, stampPassRef])

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return
    isDragging.current = false

    const dx   = deltaX.current
    const dt   = Date.now() - startTime.current
    const card = cardRef?.current

    // Reset stamp opacities
    if (stampSaveRef?.current) stampSaveRef.current.style.opacity = 0
    if (stampPassRef?.current) stampPassRef.current.style.opacity = 0

    if (!hasMoved.current && dt < TAP_MAX_TIME) {
      // Tap — reset card position and call onTap
      if (card) {
        card.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
        card.style.transform  = ''
      }
      onTap?.()
      return
    }

    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      // Swipe out
      if (card) {
        card.style.transition = 'transform 0.4s ease, opacity 0.4s ease'
        card.style.transform  = `translateX(${dx > 0 ? 600 : -600}px) rotate(${dx > 0 ? 30 : -30}deg)`
        card.style.opacity    = '0'
      }
      setTimeout(() => {
        if (dx > 0) onSwipeRight?.()
        else        onSwipeLeft?.()
      }, 380)
    } else {
      // Snap back
      if (card) {
        card.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
        card.style.transform  = ''
      }
    }
  }, [cardRef, stampSaveRef, stampPassRef, onTap, onSwipeLeft, onSwipeRight])

  return {
    onMouseDown:  handleStart,
    onMouseMove:  handleMove,
    onMouseUp:    handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: handleStart,
    onTouchMove:  handleMove,
    onTouchEnd:   handleEnd,
  }
}
