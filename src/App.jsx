import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useApp } from './store/AppContext'

import SplashScreen        from './components/auth/SplashScreen'
import AuthScreen          from './components/auth/AuthScreen'
import LogoSplitTransition from './components/auth/LogoSplitTransition'
import UsernameScreen      from './components/auth/UsernameScreen'
import QuizContainer       from './components/auth/Quiz/QuizContainer'
import LoadingScreen       from './components/auth/LoadingScreen'

import FeedTab       from './components/feed/FeedTab'
import WatchlistTab  from './components/watchlist/WatchlistTab'
import NewsTab       from './components/news/NewsTab'
import PortfolioTab  from './components/portfolio/PortfolioTab'
import FriendsTab    from './components/friends/FriendsTab'
import ProfileTab    from './components/profile/ProfileTab'

import TabNav from './components/shared/TabNav'
import Toast  from './components/shared/Toast'

const SCREEN = {
  SPLASH:     'splash',
  AUTH:       'auth',
  LOGO_SPLIT: 'logo_split',
  USERNAME:   'username',
  QUIZ:       'quiz',
  LOADING:    'loading',
  APP:        'app',
}

export default function App() {
  const [screen, setScreen] = useState(SCREEN.SPLASH)
  const [quizProfile, setQuizProfile] = useState(null)
  const { activeTab, setActiveTab, currentUser, setCurrentUser, setUserProfile, isExpanded } = useApp()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user)
        handleExistingUser(session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user)
        handleExistingUser(session.user)
      } else {
        setCurrentUser(null)
        setUserProfile(null)
        setScreen(SCREEN.SPLASH)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleExistingUser(user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('username, categories, experience, horizon, risk, known_stocks')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setUserProfile(data)
      if (!data.username) {
        setScreen(SCREEN.USERNAME)
      } else if (!data.categories || data.categories.length === 0) {
        setScreen(SCREEN.QUIZ)
      } else {
        setScreen(SCREEN.LOGO_SPLIT)
      }
    } else {
      setScreen(SCREEN.USERNAME)
    }
  }

  async function handleQuizComplete(profile) {
    setQuizProfile(profile)
    if (currentUser) {
      await supabase.from('user_profiles').upsert({
        user_id:      currentUser.id,
        categories:   profile.categories,
        experience:   profile.experience,
        horizon:      profile.horizon,
        risk:         profile.risk,
        known_stocks: profile.knownStocks,
      }, { onConflict: 'user_id' })
      setUserProfile(prev => ({ ...prev, ...profile }))
    }
    setScreen(SCREEN.LOADING)
  }

  async function handleUsernameComplete(username) {
    const { data } = await supabase
      .from('user_profiles')
      .select('categories')
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (data?.categories && data.categories.length > 0) {
      setScreen(SCREEN.LOGO_SPLIT)
    } else {
      setScreen(SCREEN.QUIZ)
    }
  }

  const TAB_COMPONENTS = {
    home:      <FeedTab />,
    watchlist: <WatchlistTab />,
    news:      <NewsTab />,
    portfolio: <PortfolioTab />,
    friends:   <FriendsTab />,
    profile:   <ProfileTab />,
  }

  return (
    <>
      {/* Auth flow — shown as full-screen overlays */}
      {screen === SCREEN.SPLASH && (
        <SplashScreen onGetStarted={() => setScreen(SCREEN.AUTH)} />
      )}

      {screen === SCREEN.AUTH && (
        <AuthScreen />
      )}

      {screen === SCREEN.USERNAME && (
        <UsernameScreen
          userId={currentUser?.id}
          onComplete={handleUsernameComplete}
        />
      )}

      {screen === SCREEN.QUIZ && (
        <QuizContainer onComplete={handleQuizComplete} />
      )}

      {screen === SCREEN.LOADING && (
        <LoadingScreen onComplete={() => setScreen(SCREEN.LOGO_SPLIT)} />
      )}

      {screen === SCREEN.LOGO_SPLIT && (
        <LogoSplitTransition onComplete={() => setScreen(SCREEN.APP)} />
      )}

      {/* Main app */}
      {screen === SCREEN.APP && (
        <div className="app-shell">
          <div className="iphone-frame">
            <div className="screen-wrap">
              {TAB_COMPONENTS[activeTab] || <FeedTab />}
            </div>
            {!isExpanded && <TabNav />}
            <Toast />
          </div>
        </div>
      )}
    </>
  )
}
