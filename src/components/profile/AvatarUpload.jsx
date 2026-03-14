import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AvatarUpload({ userId, currentUrl, username, onUpdate }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setLoading(true)
    const ext  = file.name.split('.').pop()
    const path = `user_avatars/${userId}/avatar.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) { setLoading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('user_id', userId)
    onUpdate(publicUrl)
    setLoading(false)
  }

  async function remove() {
    if (!userId) return
    await supabase.from('user_profiles').update({ avatar_url: null }).eq('user_id', userId)
    onUpdate(null)
  }

  const initials = username?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }} onClick={() => inputRef.current?.click()}>
      {currentUrl ? (
        <img src={currentUrl} alt="Avatar" className="pr-avatar" style={{ objectFit: 'cover' }} />
      ) : (
        <div className="pr-avatar">{initials}</div>
      )}
      {loading && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#00C853', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
