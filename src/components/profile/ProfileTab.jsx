import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../store/AppContext'
import AvatarUpload from './AvatarUpload'
import InfoOverlay from '../shared/InfoOverlay'

export default function ProfileTab() {
  const { currentUser, userProfile, setCurrentUser, setUserProfile, savedStocks, activeTab } = useApp()
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [infoType, setInfoType] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (activeTab === 'profile' && currentUser) loadProfile()
  }, [activeTab, currentUser])

  async function loadProfile() {
    const { data } = await supabase
      .from('user_profiles')
      .select('username, avatar_url, categories')
      .eq('user_id', currentUser.id)
      .maybeSingle()
    if (data) {
      setUsername(data.username || '')
      setAvatarUrl(data.avatar_url || null)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setUserProfile(null)
  }

  async function deleteAccount() {
    if (!window.confirm('Permanently delete your account and all data? This cannot be undone.')) return
    setDeleting(true)
    await Promise.allSettled([
      supabase.from('saved_stocks').delete().eq('user_id', currentUser.id),
      supabase.from('seen_stocks').delete().eq('user_id', currentUser.id),
      supabase.from('user_profiles').delete().eq('user_id', currentUser.id),
    ])
    await supabase.auth.signOut()
    setCurrentUser(null)
    setUserProfile(null)
    setDeleting(false)
  }

  const displayName = username || currentUser?.email?.split('@')[0] || 'User'
  const categories = userProfile?.categories || []

  return (
    <>
      <div className="profile-screen active">
        <div className="pr-scroll">
          {/* Avatar + username */}
          <div className="pr-header">
            <AvatarUpload
              userId={currentUser?.id}
              currentUrl={avatarUrl}
              username={displayName}
              onUpdate={url => setAvatarUrl(url)}
            />
            <div className="pr-handle" style={{ marginTop: 16 }}>@{displayName}</div>
            <div className="pr-member">Member · StockSwype</div>
          </div>

          {/* Stats */}
          <div className="pr-stats">
            <div className="pr-stat">
              <div className="pr-s-val">{savedStocks.length}</div>
              <div className="pr-s-lbl">Saved</div>
            </div>
            <div className="pr-stat">
              <div className="pr-s-val">{categories.length}</div>
              <div className="pr-s-lbl">Interests</div>
            </div>
            <div className="pr-stat">
              <div className="pr-s-val">{userProfile?.experience === 'advanced' ? '★★★' : userProfile?.experience === 'intermediate' ? '★★' : '★'}</div>
              <div className="pr-s-lbl">Level</div>
            </div>
          </div>

          {/* Interests */}
          {categories.length > 0 && (
            <>
              <div className="pr-sect-title">Interests</div>
              <div className="pr-chips">
                {categories.map(c => <span key={c} className="pr-chip">{c}</span>)}
              </div>
            </>
          )}

          {/* Settings */}
          <div className="pr-settings">
            <div className="pr-sect-title">Settings</div>
            {[
              { label: 'About StockSwype', onClick: () => setInfoType('about') },
              { label: 'Privacy Policy',   onClick: () => setInfoType('privacy') },
              { label: 'Terms of Service', onClick: () => setInfoType('terms') },
            ].map(item => (
              <div key={item.label} className="pr-st-row" onClick={item.onClick}>
                <span className="pr-st-lbl">{item.label}</span>
                <span className="pr-st-val">›</span>
              </div>
            ))}

            <div className="pr-st-row" onClick={signOut}>
              <span className="pr-st-lbl">Sign Out</span>
              <span className="pr-st-val">›</span>
            </div>

            <div className="pr-st-row" onClick={deleteAccount}>
              <span className="pr-st-lbl text-red">{deleting ? 'Deleting…' : 'Delete Account'}</span>
              <span className="pr-st-val">›</span>
            </div>
          </div>
        </div>
      </div>

      <InfoOverlay isOpen={!!infoType} type={infoType} onClose={() => setInfoType(null)} />
    </>
  )
}
