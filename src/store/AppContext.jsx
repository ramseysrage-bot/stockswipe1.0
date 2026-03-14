import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)   // { categories, experience, horizon, risk, knownStocks }
  const [isGuest, setIsGuest] = useState(false)

  // ── App navigation ────────────────────────────────────────────────────────
  // Values: 'home' | 'watchlist' | 'news' | 'portfolio' | 'friends' | 'profile'
  const [activeTab, setActiveTab] = useState('home')

  // ── Feed state ────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState([])                   // array of stock card objects
  const [savedStocks, setSavedStocks] = useState([])     // watchlist
  const seenTickers = useRef(new Set())                  // never re-renders on change

  // ── Card UI state ─────────────────────────────────────────────────────────
  const [topCard, setTopCard] = useState(null)           // DOM ref to top card element
  const [isExpanded, setIsExpanded] = useState(false)    // card expanded into detail view
  const [expandCardSource, setExpandCardSource] = useState('feed') // 'feed' | 'saved'

  // ── Alpha overlay ─────────────────────────────────────────────────────────
  const [alphaOpen, setAlphaOpen] = useState(false)

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState('')
  const toastTimerRef = useRef(null)

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMsg(msg)
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 2500)
  }, [])

  // ── Caches (refs — mutations don't need re-renders) ───────────────────────
  // logoCache[ticker] = URL string (or '') once fetched; undefined = not yet fetched
  const logoCache = useRef({})
  // expChartCache[`${ticker}:${range}`] = [{t, y}, ...]
  const expChartCache = useRef({})

  // ── Supabase session restore on mount ────────────────────────────────────
  useEffect(() => {
    let ignore = false

    async function restoreSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!ignore && session?.user) {
          setCurrentUser(session.user)
        }
      } catch (err) {
        console.error('AppContext: getSession error', err)
      }
    }

    restoreSession()

    // Listen for sign-in / sign-out events that happen after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (ignore) return
      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user)
      }
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setUserProfile(null)
        setIsGuest(false)
        setSavedStocks([])
        setDeck([])
        seenTickers.current.clear()
        setActiveTab('home')
      }
    })

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    // Auth
    currentUser,
    setCurrentUser,
    userProfile,
    setUserProfile,
    isGuest,
    setIsGuest,

    // App navigation
    activeTab,
    setActiveTab,

    // Feed
    deck,
    setDeck,
    savedStocks,
    setSavedStocks,
    seenTickers,      // useRef — access as seenTickers.current

    // Card UI
    topCard,
    setTopCard,
    isExpanded,
    setIsExpanded,
    expandCardSource,
    setExpandCardSource,

    // Alpha overlay
    alphaOpen,
    setAlphaOpen,

    // Toast
    toastMsg,
    showToast,

    // Caches (useRef — access as logoCache.current / expChartCache.current)
    logoCache,
    expChartCache,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
