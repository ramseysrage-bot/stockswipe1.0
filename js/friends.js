        // ───────────────────────────────────────────────────────────

        // --- Render Screens ---
        async function renderFriends() {
            const list = document.getElementById('fr-list');
            if (!list) return;
            if (!currentUser) {
                list.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#888;text-align:center;padding:40px 24px;">Sign in to connect with friends.</div>`;
                return;
            }

            list.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;text-align:center;padding:24px;">Loading...</div>`;

            try {
                // Fetch all friendships involving current user
                const { data: rows } = await supabaseClient
                    .from('friendships')
                    .select('*')
                    .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

                const friendships = rows || [];

                // Separate into categories
                const accepted = friendships.filter(f => f.status === 'accepted');
                const sentPending = friendships.filter(f => f.status === 'pending' && f.requester_id === currentUser.id);
                const incoming = friendships.filter(f => f.status === 'pending' && f.addressee_id === currentUser.id);

                let html = '';

                // ── Incoming requests ──────────────────────────────────────────
                if (incoming.length > 0) {
                    html += `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:0 20px 10px;">Friend Requests</div>`;
                    for (const f of incoming) {
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('username, avatar_url').eq('user_id', f.requester_id).maybeSingle();
                        const uname = prof?.username || 'Unknown';
                        html += `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #f0f0f0;">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    ${avatarHTML(uname, prof?.avatar_url, 40, 13)}
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;">@${uname}</div>
                                </div>
                                <div style="display:flex;gap:8px;">
                                    <button onclick="respondFriendRequest('${f.id}','accepted')" style="background:#00C853;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Accept</button>
                                    <button onclick="respondFriendRequest('${f.id}','declined')" style="background:#f4f4f5;color:#888;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Decline</button>
                                </div>
                            </div>`;
                    }
                }

                // ── Accepted friends ───────────────────────────────────────────
                if (accepted.length > 0) {
                    html += `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:16px 20px 10px;">Friends</div>`;

                    // Collect all friend profiles + tickers first
                    const friendData = [];
                    for (const f of accepted) {
                        const friendId = f.requester_id === currentUser.id ? f.addressee_id : f.requester_id;
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('username, avatar_url').eq('user_id', friendId).maybeSingle();
                        const { data: saved } = await supabaseClient
                            .from('saved_stocks').select('ticker').eq('user_id', friendId).order('saved_at', { ascending: false }).limit(5);
                        friendData.push({ f, friendId, prof, tickerList: (saved || []).map(s => s.ticker) });
                    }

                    // Batch-fetch change % from stock_editorial (same data shown in Swyped feed cards)
                    const allUniqTickers = [...new Set(friendData.flatMap(fd => fd.tickerList))];
                    let friendChanges = {};
                    if (allUniqTickers.length > 0) {
                        const { data: editRows } = await supabaseClient
                            .from('stock_editorial')
                            .select('ticker, change')
                            .in('ticker', allUniqTickers);
                        for (const row of (editRows || [])) {
                            const pct = parseFloat(row.change);
                            if (!isNaN(pct)) friendChanges[row.ticker] = pct;
                        }
                    }

                    // Build HTML with avg % pill per friend
                    for (const { f, friendId, prof, tickerList } of friendData) {
                        const uname = prof?.username || 'Unknown';

                        let avgHtml = '';
                        if (tickerList.length > 0) {
                            const changes = tickerList.map(t => {
                                const pct = friendChanges[t];
                                return pct != null ? pct : null;
                            }).filter(v => v !== null);
                            if (changes.length > 0) {
                                const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
                                const avgSign = avg >= 0 ? '+' : '';
                                const avgBg = avg >= 0 ? '#00C853' : '#E53935';
                                avgHtml = `<div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;color:#fff;background:${avgBg};padding:3px 8px;border-radius:8px;">${avgSign}${avg.toFixed(2)}%</div>`;
                            }
                        }

                        const tickerPills = tickerList.map(t =>
                            `<div style="background:#f4f4f5;border-radius:8px;padding:4px 8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#0a0a0a;">${t}</div>`
                        ).join('');

                        html += `
                            <div style="padding:14px 20px;border-bottom:1px solid #f0f0f0;">
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                                    <div onclick="showFriendHistory('${friendId}', '${uname}', '${prof?.avatar_url || ''}')" style="display:flex;align-items:center;gap:12px;cursor:pointer;-webkit-tap-highlight-color:transparent;">
                                        ${avatarHTML(uname, prof?.avatar_url, 40, 13)}
                                        <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;">@${uname}</div>
                                        ${avgHtml}
                                    </div>
                                    <div style="position:relative;">
                                        <button onclick="toggleFriendMenu('fmenu-${f.id}', event)" data-menu-toggle style="background:none;border:none;font-size:20px;color:#bbb;cursor:pointer;padding:2px 8px;line-height:1;font-family:'DM Sans',sans-serif;">⋮</button>
                                        <div id="fmenu-${f.id}" class="friend-action-menu" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.14);border:1px solid #f0f0f0;z-index:200;min-width:176px;overflow:hidden;">
                                            <div onclick="reportFriend('${f.id}', '${uname}')" style="padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#E53935;cursor:pointer;border-bottom:1px solid #f4f4f5;-webkit-tap-highlight-color:transparent;">Report @${uname}</div>
                                            <div onclick="removeFriend('${f.id}')" style="padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#0a0a0a;cursor:pointer;-webkit-tap-highlight-color:transparent;">Remove @${uname}</div>
                                        </div>
                                    </div>
                                </div>
                                ${tickerList.length > 0 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">${tickerPills}</div>` : `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#bbb;">No saved stocks yet</div>`}
                            </div>`;
                    }
                }

                // ── Sent pending ───────────────────────────────────────────────
                if (sentPending.length > 0) {
                    html += `<div style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#aaa;letter-spacing:1px;text-transform:uppercase;padding:16px 20px 10px;">Pending</div>`;
                    for (const f of sentPending) {
                        const { data: prof } = await supabaseClient
                            .from('user_profiles').select('username, avatar_url').eq('user_id', f.addressee_id).maybeSingle();
                        const uname = prof?.username || 'Unknown';
                        html += `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #f0f0f0;">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    ${avatarHTML(uname, prof?.avatar_url, 40, 13)}
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:15px;color:#0a0a0a;">@${uname}</div>
                                </div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;background:#f4f4f5;border-radius:10px;padding:6px 12px;">Pending</div>
                            </div>`;
                    }
                }

                // ── Empty state ────────────────────────────────────────────────
                if (accepted.length === 0 && incoming.length === 0 && sentPending.length === 0) {
                    html = `
                        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 32px;text-align:center;">
                            <div style="width:64px;height:64px;border-radius:32px;background:rgba(0,200,83,0.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00C853" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            </div>
                            <div style="font-family:'DM Sans',sans-serif;font-weight:700;font-size:17px;color:#0a0a0a;margin-bottom:8px;">No friends yet</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#888;line-height:1.5;">Search for friends by username above.</div>
                        </div>`;
                }

                list.innerHTML = html;

            } catch (e) {
                console.error('renderFriends error:', e);
                list.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#888;text-align:center;padding:40px;">Something went wrong.</div>`;
            }
            updateFriendsBadge();
        }

        let _searchTimeout = null;
        async function searchFriends(query) {
            const results = document.getElementById('fr-search-results');
            if (!results) return;
            if (!query || query.trim().length < 2) { results.innerHTML = ''; return; }

            clearTimeout(_searchTimeout);
            _searchTimeout = setTimeout(async () => {
                results.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;padding:8px 4px;">Searching...</div>`;
                try {
                    const { data: users } = await supabaseClient
                        .from('user_profiles')
                        .select('user_id, username, avatar_url')
                        .ilike('username', `%${query.trim()}%`)
                        .neq('user_id', currentUser?.id || '')
                        .limit(5);

                    if (!users || users.length === 0) {
                        results.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;padding:8px 4px;">No users found.</div>`;
                        return;
                    }

                    // Check existing friendship statuses
                    const { data: existing } = await supabaseClient
                        .from('friendships')
                        .select('*')
                        .or(`requester_id.eq.${currentUser.id},addressee_id.eq.${currentUser.id}`);

                    const friendMap = {};
                    (existing || []).forEach(f => {
                        const otherId = f.requester_id === currentUser.id ? f.addressee_id : f.requester_id;
                        friendMap[otherId] = f;
                    });

                    let html = '';
                    for (const u of users) {
                        const f = friendMap[u.user_id];
                        let btn = '';
                        if (!f) {
                            btn = `<button onclick="sendFriendRequest('${u.user_id}')" style="background:#00C853;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Add</button>`;
                        } else if (f.status === 'pending' && f.requester_id === currentUser.id) {
                            btn = `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;background:#f4f4f5;border-radius:10px;padding:6px 12px;">Pending</div>`;
                        } else if (f.status === 'accepted') {
                            btn = `<div style="font-family:'DM Sans',sans-serif;font-size:12px;color:#00C853;background:rgba(0,200,83,0.1);border-radius:10px;padding:6px 12px;">Friends ✓</div>`;
                        } else if (f.status === 'pending' && f.addressee_id === currentUser.id) {
                            btn = `<button onclick="respondFriendRequest('${f.id}','accepted')" style="background:#00C853;color:#fff;border:none;border-radius:10px;padding:7px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Accept</button>`;
                        }
                        html += `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 4px;border-bottom:1px solid #f4f4f5;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${avatarHTML(u.username, u.avatar_url, 36, 12)}
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:600;font-size:14px;color:#0a0a0a;">@${u.username}</div>
                                </div>
                                ${btn}
                            </div>`;
                    }
                    results.innerHTML = `<div style="background:#fff;border-radius:14px;border:1px solid #f0f0f0;padding:4px 12px;">${html}</div>`;
                } catch (e) {
                    results.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;padding:8px 4px;">Search failed.</div>`;
                }
            }, 350);
        }

        async function sendFriendRequest(addresseeId) {
            if (!currentUser) return;
            try {
                await supabaseClient.from('friendships').insert({
                    requester_id: currentUser.id,
                    addressee_id: addresseeId,
                    status: 'pending'
                });
                showToast('Friend request sent!');
                searchFriends(document.getElementById('fr-search-input')?.value || '');
            } catch (e) { showToast('Could not send request.'); }
        }

        async function respondFriendRequest(friendshipId, newStatus) {
            try {
                await supabaseClient.from('friendships')
                    .update({ status: newStatus })
                    .eq('id', friendshipId);
                showToast(newStatus === 'accepted' ? 'Friend added!' : 'Request declined.');
                renderFriends();
            } catch (e) { showToast('Something went wrong.'); }
        }

        function closeFriendHistory() {
            document.getElementById('fr-hist-modal').classList.remove('active');
        }

        async function showFriendHistory(friendId, uname, avatar_url) {
            if (!currentUser) return;
            const modal = document.getElementById('fr-hist-modal');
            const titleEl = document.getElementById('fr-hist-title');
            const bodyEl = document.getElementById('fr-hist-body');

            titleEl.innerHTML = `
                ${avatarHTML(uname, avatar_url, 32, 11)}
                <span>${uname}'s History</span>
            `;
            bodyEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:24px;text-align:center;">Loading history...</div>`;
            modal.classList.add('active');

            try {
                const { data: msgs } = await supabaseClient
                    .from('messages')
                    .select('*')
                    .eq('sender_id', friendId)
                    .eq('recipient_id', currentUser.id)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!msgs || msgs.length === 0) {
                    bodyEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:24px;text-align:center;">No history from this friend yet.</div>`;
                    return;
                }

                bodyEl.innerHTML = '';
                const frag = document.createDocumentFragment();
                for (const msg of msgs) {
                    const timeAgo = getTimeAgo(new Date(msg.created_at));
                    let pfData = null;
                    try { const p = JSON.parse(msg.message); if (p.type === 'portfolio_share') pfData = p; } catch { }
                    const isArticle = !pfData && msg.message && msg.message.startsWith('http');

                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid #f4f4f5;cursor:pointer;-webkit-tap-highlight-color:transparent;';

                    const textWrap = document.createElement('div');
                    textWrap.style.cssText = 'flex:1;min-width:0;';
                    const labelEl = document.createElement('div');
                    labelEl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;line-height:1.4;";

                    if (pfData) {
                        labelEl.innerHTML = `Sent you portfolio: <span style="color:#00C853;">"${pfData.name}"</span>`;
                    } else if (isArticle) {
                        labelEl.innerHTML = `Sent you an article about <span style="color:#00C853;font-weight:700;">${msg.ticker || ''}</span>`;
                    } else {
                        labelEl.innerHTML = `Sent you <span style="color:#00C853;font-weight:700;">${msg.ticker || ''}</span>`;
                    }

                    const timeEl = document.createElement('div');
                    timeEl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:12px;color:#aaa;margin-top:2px;";
                    timeEl.textContent = timeAgo;

                    textWrap.appendChild(labelEl);
                    textWrap.appendChild(timeEl);
                    row.appendChild(textWrap);

                    const delBtn = document.createElement('button');
                    delBtn.textContent = '×';
                    delBtn.style.cssText = 'background:none;border:none;color:#666;font-size:18px;line-height:1;padding:0 0 0 10px;cursor:pointer;flex-shrink:0;transition:color 0.15s;font-family:"DM Sans",sans-serif;';
                    delBtn.addEventListener('mouseenter', () => delBtn.style.color = '#E53935');
                    delBtn.addEventListener('mouseleave', () => delBtn.style.color = '#666');
                    delBtn.addEventListener('touchstart', () => delBtn.style.color = '#E53935', { passive: true });
                    delBtn.addEventListener('touchend', () => delBtn.style.color = '#666', { passive: true });
                    delBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await supabaseClient.from('messages').delete().eq('id', msg.id);
                        showFriendHistory(friendId, uname, avatar_url); // Refresh the list
                    });
                    row.appendChild(delBtn);

                    if (pfData) {
                        const captured = pfData;
                        row.addEventListener('click', () => { closeFriendHistory(); openSharedPortfolio(captured, uname); });
                    } else if (isArticle) {
                        const url = msg.message;
                        row.addEventListener('click', () => window.open(url, '_blank', 'noopener,noreferrer'));
                    } else {
                        const ticker = msg.ticker;
                        row.addEventListener('click', () => { closeFriendHistory(); openStockFromMessage(ticker); });
                    }

                    frag.appendChild(row);
                }
                bodyEl.appendChild(frag);
            } catch (err) {
                console.error('Error loading friend history:', err);
                bodyEl.innerHTML = `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#bbb;padding:24px;text-align:center;">Could not load history.</div>`;
            }
        }

        function toggleFriendMenu(menuId, event) {
            event.stopPropagation();
            document.querySelectorAll('.friend-action-menu').forEach(m => {
                if (m.id !== menuId) m.style.display = 'none';
            });
            const menu = document.getElementById(menuId);
            if (!menu) return;
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }

        function reportFriend(friendshipId, uname) {
            document.querySelectorAll('.friend-action-menu').forEach(m => m.style.display = 'none');
            if (confirm(`Are you sure you want to report @${uname}?\n\nThis will also remove them from your friends.`)) {
                const reporter = window._username || currentUser?.email || 'unknown';
                fetch('https://rzvrdvvzxgwccldqnxbm.supabase.co/functions/v1/report-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reporter, reported: uname })
                }).catch(() => {});
                removeFriend(friendshipId);
            }
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('[data-menu-toggle]') && !e.target.closest('.friend-action-menu')) {
                document.querySelectorAll('.friend-action-menu').forEach(m => m.style.display = 'none');
            }
        });

        async function removeFriend(friendshipId) {
            try {
                // Look up the friend's user ID before deleting the friendship
                const { data: fs } = await supabaseClient.from('friendships').select('requester_id,addressee_id').eq('id', friendshipId).maybeSingle();
                await supabaseClient.from('friendships').delete().eq('id', friendshipId);
                if (fs && currentUser) {
                    const friendId = fs.requester_id === currentUser.id ? fs.addressee_id : fs.requester_id;
                    // Delete messages in both directions so History clears on unfriend
                    await supabaseClient.from('messages').delete().match({ sender_id: friendId, recipient_id: currentUser.id });
                    await supabaseClient.from('messages').delete().match({ sender_id: currentUser.id, recipient_id: friendId });
                }
                showToast('Friend removed.');
                renderFriends();
            } catch (e) { showToast('Something went wrong.'); }
        }

        async function updateFriendsBadge() {
            if (!currentUser) return;
            try {
                const { data } = await supabaseClient
                    .from('friendships')
                    .select('id')
                    .eq('addressee_id', currentUser.id)
                    .eq('status', 'pending');
                const badge = document.getElementById('friends-badge');
                if (!badge) return;
                badge.style.display = (data && data.length > 0) ? 'block' : 'none';
            } catch (e) { }
        }

        function subscribeToFriendships() {
            if (!currentUser || window._friendshipSubscribed) return;
            window._friendshipSubscribed = true;

            supabaseClient
                .channel('friendships-changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'friendships',
                    filter: `addressee_id=eq.${currentUser.id}`
                }, (payload) => {
                    updateFriendsBadge();
                    const friendsScene = document.getElementById('friends-scene');
                    if (friendsScene && friendsScene.classList.contains('active')) {
                        renderFriends();
                    }
                })
                .subscribe();

            supabaseClient
                .channel('messages-changes')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${currentUser.id}`
                }, (payload) => {
                    updateMessagesBadge();
                    const friendsScene = document.getElementById('friends-scene');
                    if (friendsScene && friendsScene.classList.contains('active')) {
                        loadInbox();
                    }
                })
                .subscribe();
        }
