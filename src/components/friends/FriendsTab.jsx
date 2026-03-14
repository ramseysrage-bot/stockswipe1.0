import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../store/AppContext'
import FriendRow from './FriendRow'
import Inbox from './Inbox'
import FriendHistoryModal from './FriendHistoryModal'

export default function FriendsTab() {
  const { currentUser, activeTab } = useApp()
  const [query, setQuery]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [friends, setFriends]     = useState([])
  const [requests, setRequests]   = useState([])
  const [messages, setMessages]   = useState([])
  const [histFriend, setHistFriend] = useState(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    if (activeTab === 'friends') {
      loadFriends()
      loadMessages()
    }
  }, [activeTab])

  async function loadFriends() {
    if (!currentUser) return
    const { data } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`)

    const accepted = (data || []).filter(r => r.status === 'accepted')
    const pending  = (data || []).filter(r => r.status === 'pending' && r.addressee_id === currentUser.id)

    const friendIds  = accepted.map(r => r.requester_id === currentUser.id ? r.addressee_id : r.requester_id)
    const requesterIds = pending.map(r => r.requester_id)

    async function getProfiles(ids) {
      if (!ids.length) return []
      const { data: profiles } = await supabase.from('user_profiles').select('user_id, username, avatar_url').in('user_id', ids)
      return profiles || []
    }

    const [friendProfiles, requestProfiles] = await Promise.all([getProfiles(friendIds), getProfiles(requesterIds)])

    setFriends(friendProfiles.map(p => ({
      id: p.user_id, username: p.username, avatarUrl: p.avatar_url,
      friendshipId: accepted.find(r => r.requester_id === p.user_id || r.addressee_id === p.user_id)?.id,
    })))
    setRequests(requestProfiles.map(p => ({
      id: p.user_id, username: p.username, avatarUrl: p.avatar_url,
      friendshipId: pending.find(r => r.requester_id === p.user_id)?.id,
    })))
  }

  async function loadMessages() {
    if (!currentUser) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch sender usernames
    const senderIds = [...new Set((data || []).map(m => m.sender_id))]
    let profiles = {}
    if (senderIds.length) {
      const { data: profs } = await supabase.from('user_profiles').select('user_id, username').in('user_id', senderIds)
      ;(profs || []).forEach(p => { profiles[p.user_id] = p.username })
    }
    setMessages((data || []).map(m => ({ ...m, sender_username: profiles[m.sender_id] || 'Unknown' })))
  }

  async function search() {
    if (!query.trim() || !currentUser) return
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, username, avatar_url')
      .ilike('username', `%${query.trim()}%`)
      .neq('user_id', currentUser.id)
      .limit(10)
    setSearchResults(data || [])
    setLoading(false)
  }

  async function sendRequest(userId) {
    if (!currentUser) return
    await supabase.from('friendships').insert({ requester_id: currentUser.id, addressee_id: userId, status: 'pending' })
    setSearchResults(prev => prev.filter(p => p.user_id !== userId))
  }

  async function respond(friendshipId, status) {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    loadFriends()
  }

  async function removeFriend(friend) {
    await supabase.from('friendships').delete().eq('id', friend.friendshipId)
    setFriends(prev => prev.filter(f => f.id !== friend.id))
  }

  async function clearInbox() {
    if (!currentUser) return
    await supabase.from('messages').delete().eq('recipient_id', currentUser.id)
    setMessages([])
  }

  return (
    <>
      <div className="friends-screen active">
        {/* Search */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Find friends by username…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              className="fr-search"
              style={{ flex: 1, marginBottom: 0, marginTop: 0 }}
            />
            <button
              onClick={search}
              style={{ padding: '12px 16px', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Search
            </button>
          </div>

          {/* Search results */}
          {searchResults.map(p => (
            <div key={p.user_id} className="fr-row">
              <div className="fr-left">
                <div className="fr-av" style={{ background: '#0a0a0a' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.username} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    : p.username?.[0]?.toUpperCase()}
                </div>
                <div className="fr-text"><div className="fr-name"><strong>{p.username}</strong></div></div>
              </div>
              <button className="fr-btn fr-save" onClick={() => sendRequest(p.user_id)}>+ Add</button>
            </div>
          ))}
        </div>

        <div className="fr-scroll">
          {/* Pending requests */}
          {requests.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
                Friend Requests ({requests.length})
              </div>
              {requests.map(r => (
                <div key={r.id} className="fr-row">
                  <div className="fr-left">
                    <div className="fr-av" style={{ background: '#0a0a0a' }}>{r.username?.[0]?.toUpperCase()}</div>
                    <div className="fr-text"><div className="fr-name"><strong>{r.username}</strong></div></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="fr-btn fr-save" onClick={() => respond(r.friendshipId, 'accepted')}>Accept</button>
                    <button className="fr-btn fr-share" onClick={() => respond(r.friendshipId, 'rejected')}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends list */}
          {friends.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
                Friends ({friends.length})
              </div>
              {friends.map(f => (
                <FriendRow
                  key={f.id}
                  friend={f}
                  onRemove={removeFriend}
                  onViewStocks={() => setHistFriend(f)}
                />
              ))}
            </div>
          )}

          {friends.length === 0 && requests.length === 0 && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 40, color: '#aaa', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
              Search for friends by username above
            </div>
          )}

          {/* Inbox */}
          <Inbox
            messages={messages}
            onOpenStock={() => {}}
            onClearAll={clearInbox}
          />
        </div>
      </div>

      <FriendHistoryModal
        friendId={histFriend?.id}
        username={histFriend?.username}
        avatarUrl={histFriend?.avatarUrl}
        onClose={() => setHistFriend(null)}
      />
    </>
  )
}
