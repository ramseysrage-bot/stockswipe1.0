        let sessionSaves = []; // tracks stocks saved in current swipe session
        let sessionWildcardSaves = []; // tracks wildcard cards saved this session

        function startQuiz() {
            document.getElementById('splash-screen').style.opacity = '0';
            document.getElementById('splash-screen').style.pointerEvents = 'none';
            setTimeout(() => {
                document.getElementById('quiz').classList.add('active');
                document.getElementById('quiz-footer').classList.add('active');
                updateBtnState();
            }, 300);
        }

        function toggleOpt(el) {
            el.classList.toggle('selected');
            updateBtnState();
        }

        function selectSingle(el) {
            const siblings = el.parentElement.querySelectorAll('.opt-card');
            siblings.forEach(sib => sib.classList.remove('selected'));
            el.classList.add('selected');
            updateBtnState();
        }

        function updateBtnState() {
            const stepEl = document.getElementById('step-' + currentStep);
            const selected = stepEl.querySelectorAll('.opt-card.selected').length;
            const btn = document.getElementById('btn-next');
            if (selected > 0) {
                btn.classList.add('enabled');
            } else {
                btn.classList.remove('enabled');
            }
        }

        function prevStep() {
            if (currentStep > 1) {
                document.getElementById('step-' + currentStep).classList.remove('active');
                currentStep--;
                document.getElementById('step-' + currentStep).classList.add('active');
                updateProgress();
                updateBtnState();
            } else {
                // Back to auth (or splash for guests)
                document.getElementById('quiz').classList.remove('active');
                document.getElementById('quiz-footer').classList.remove('active');
                setTimeout(() => {
                    if (isGuest) {
                        const auth = document.getElementById('auth-screen');
                        auth.style.opacity = '1';
                        auth.style.pointerEvents = 'auto';
                    } else {
                        document.getElementById('splash-screen').style.opacity = '1';
                        document.getElementById('splash-screen').style.pointerEvents = 'auto';
                    }
                }, 300);
            }
        }

        function nextStep() {
            const btn = document.getElementById('btn-next');
            if (!btn.classList.contains('enabled')) return;

            if (currentStep < totalSteps) {
                document.getElementById('step-' + currentStep).classList.remove('active');
                currentStep++;
                document.getElementById('step-' + currentStep).classList.add('active');
                updateProgress();
                updateBtnState();
            } else {
                finishQuiz();
            }
        }

        function updateProgress() {
            const dots = document.querySelectorAll('.dot');
            dots.forEach((dot, idx) => {
                if (idx < currentStep) dot.classList.add('active');
                else dot.classList.remove('active');
            });
        }

        function finishQuiz() {
            const btnNext = document.getElementById('btn-next');
            if (btnNext) { btnNext.style.pointerEvents = 'none'; btnNext.style.display = 'none'; }
            document.getElementById('quiz').classList.remove('active');
            document.getElementById('quiz-footer').classList.remove('active');

            userProfile = buildUserProfile();
            console.log('QUIZ RESULT:', JSON.stringify(userProfile));
            userInterests = userProfile.categories;

            // Persist quiz profile to Supabase for logged-in users
            if (currentUser && !isGuest) {
                (async () => {
                    try {
                        await supabaseClient.from('user_profiles').upsert({
                            user_id: currentUser.id,
                            categories: userProfile.categories,
                            experience: userProfile.experience,
                            horizon: userProfile.horizon,
                            risk: userProfile.risk,
                        });
                    } catch (e) { console.error('Profile save error:', e); }
                })();
            }

            // Always show bucket recommendation after quiz — clear any stale window state
            window.activeBucket = null;
            window.activeBucketId = null;
            const recommendedId = (typeof recommendTopBuckets === 'function') ? recommendTopBuckets(userProfile, 3) : null;
            if (recommendedId && recommendedId.length) {
                showBucketConfirmScreen(recommendedId, () => _runLoadingThenFeed());
            } else {
                _runLoadingThenFeed();
            }
        }

        function _runLoadingThenFeed() {
            const loading = document.getElementById('loading');
            loading.classList.add('active');

            const pillsContainer = document.getElementById('loader-pills');
            pillsContainer.innerHTML = '';
            (userInterests || []).forEach(text => {
                const pill = document.createElement('div');
                pill.className = 'loader-pill';
                pill.innerText = text;
                pillsContainer.appendChild(pill);
            });

            const bar = document.getElementById('loader-bar');
            bar.style.width = '0%';
            let progress = 0;
            const interval = setInterval(() => {
                progress += 2;
                bar.style.width = progress + '%';
                if (progress >= 100) clearInterval(interval);
            }, 40);

            document.querySelectorAll('.loader-pill').forEach((pill, idx) => {
                setTimeout(() => pill.classList.add('visible'), 500 + idx * 300);
            });

            setTimeout(() => {
                loading.classList.remove('active');
                loading.style.display = 'none';
                setTimeout(() => { loading.style.display = ''; }, 50);
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                const homeBtn = document.getElementById('nav-btn-home');
                if (homeBtn) homeBtn.classList.add('active');
                const navEl = document.getElementById('app-nav');
                if (navEl) {
                    navEl.classList.add('active');
                    navEl.style.pointerEvents = 'auto';
                    navEl.style.opacity = '1';
                }
                ['feed', 'watchlist', 'news-scene', 'friends-scene', 'profile-scene', 'portfolio-scene'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.pointerEvents = 'auto';
                });
                initFeed();
            }, 3500);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // FEED RANKING ALGORITHM
        // Scores every stock in the pool against the user's quiz profile and
        // returns a 30-card feed that is ~65 % aligned + ~35 % exploratory.
        // All logic runs client-side; no separate backend required.
        // ─────────────────────────────────────────────────────────────────────────

        /**
         * Maps quiz step-1 labels → lowercase keywords to match against stock.cats.
         * We check whether any element in the DB cats array CONTAINS a keyword
         * (or vice-versa), so partial matches work (e.g. "tech" matches "fintech").
         */
        const CATEGORY_KEYWORDS = {
            'AI & Tech': ['ai & technology', 'technology', 'tech', 'software', 'cloud', 'saas', 'internet'],
            'EVs & Clean Energy': ['evs & clean energy', 'clean energy', 'ev', 'electric vehicle', 'renewable', 'solar', 'battery', 'wind'],
            'Energy': ['commodities & energy', 'energy', 'oil', 'gas', 'petroleum', 'commodities', 'mining', 'natural gas', 'crude'],
            'Healthcare': ['healthcare & biotech', 'healthcare', 'biotech', 'pharma', 'medical', 'health'],
            'Finance': ['banking & finance', 'banking', 'finance', 'financial', 'insurance', 'fintech', 'investment'],
            'Retail': ['retail & consumer', 'retail', 'consumer', 'e-commerce', 'shopping', 'apparel'],
            'Gaming': ['gaming & entertainment', 'gaming', 'entertainment', 'game', 'esports'],
            'Real Estate': ['real estate', 'reit', 'property', 'housing', 'realty'],
            'Travel': ['travel', 'airline', 'hotel', 'tourism', 'hospitality', 'cruise'],
            'Semis': ['semiconductors', 'semiconductor', 'semis', 'chips', 'hardware'],
            'Social Media': ['social media', 'social', 'media', 'digital media', 'advertising'],
            'Food': ['food & consumer', 'food', 'restaurant', 'beverage', 'agriculture', 'grocery'],
            'Defense': ['defense & aerospace', 'defense', 'aerospace', 'military', 'security'],
            'Emerging Mkts': ['emerging markets', 'emerging', 'international', 'china', 'india', 'latam'],
            'Crypto': ['crypto', 'blockchain', 'bitcoin', 'digital assets', 'web3', 'cryptocurrency'],
        };

        // Category keywords that signal strong dividend / income potential
        const INCOME_CATS = ['finance', 'banking', 'reit', 'real estate', 'utilities', 'consumer staples',
            'insurance', 'energy', 'telecom', 'dividend'];
        // Category keywords that signal high revenue-growth potential
        const GROWTH_CATS = ['tech', 'ai', 'software', 'cloud', 'saas', 'semiconductor', 'semis',
            'chips', 'ev', 'electric', 'biotech', 'internet'];
        // Category keywords that signal high volatility / speculation suitability
        const SPEC_CATS = ['crypto', 'blockchain', 'gaming', 'biotech', 'ev', 'electric',
            'emerging', 'china', 'cannabis', 'spac'];

        /**
         * Safely parses stock.cats (may be a JSON string, a plain array, or a raw string).
         * Always returns a lowercase string array.
         */
        function parseCats(cats) {
            try {
                // Supabase can return: a JS array, a JSON string "["Gaming"]",
                // a Postgres array literal "{Gaming,Tech}", or a plain string.
                let arr;
                if (Array.isArray(cats)) {
                    arr = cats;
                } else {
                    const raw = String(cats || '').trim();
                    if (raw.startsWith('{') && raw.endsWith('}')) {
                        // Postgres array literal: {Gaming,Tech} or {"AI & Tech"}
                        arr = raw.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim());
                    } else {
                        arr = JSON.parse(raw || '[]');
                    }
                }
                // Always lowercase so all comparisons are case-insensitive
                return arr.map(c => String(c).toLowerCase().trim());
            } catch {
                return cats ? [String(cats).toLowerCase().trim()] : [];
            }
        }

        /**
         * Reads all five quiz steps from the DOM and returns a structured userProfile.
         * Called once at the end of the quiz before initFeed().
         */
        function buildUserProfile() {
            const sel = id =>
                Array.from(document.querySelectorAll(`#${id} .opt-card.selected .opt-title`))
                    .map(el => el.innerText.trim());

            const categories = sel('step-1');       // multi — e.g. ['AI & Tech', 'Gaming']
            const [experience] = sel('step-2');        // single
            const [horizon] = sel('step-3');        // single
            const [risk] = sel('step-4');        // single
            const knownStocks = sel('step-5');        // multi — known big-cap names

            const expMap = {
                'Complete beginner': 'beginner',
                'Still learning': 'learning',
                'Have a portfolio': 'portfolio',
                'Experienced trader': 'experienced',
            };
            const horizonMap = {
                'Long-term wealth': 'long',
                'Medium-term (1–3 yrs)': 'medium',
                'Short-term gains': 'short',
                'Just learning': 'medium',
            };
            const riskMap = {
                'Safe': 'safe',
                'Balanced': 'balanced',
                'Aggressive': 'aggressive',
            };

            return {
                categories,                                    // ['AI & Tech', ...]
                experience: expMap[experience] || 'learning',
                horizon: horizonMap[horizon] || 'medium',
                risk: riskMap[risk] || 'balanced',
                knownStocks,                                   // ['Apple', 'Tesla', ...]
            };
        }

        /**
         * Scores a single stock row (from stock_editorial) against the user profile.
         *
         * Scoring pillars
         * ───────────────
         * 1. Category match         +40 per matching quiz category
         * 2. Risk alignment         ±15–35 based on stock.risk vs profile.risk
         * 3. Experience / tier      ±10–35 — beginners see large caps, experts see niche
         * 4. Horizon + goal combos  +0–25 for income / growth / speculation signals
         * 5. Randomness             ±10 so the feed feels fresh every session
         *
         * @param {Object} stock   Raw row from stock_editorial
         * @param {Object} profile Output of buildUserProfile()
         * @returns {number}       Score (higher = better match)
         */
        function scoreStock(stock, profile) {
            const cats = parseCats(stock.cats);
            const risk = (stock.risk || 'moderate').toLowerCase(); // 'high'|'moderate'|'safe'
            const tier = Number(stock.tier) || 3;                  // 1=mega/large, 2=mid, 3+=niche
            let score = 0;

            // Debug: log raw vs parsed cats for the first run (remove after diagnosis)
            if (profile._debug) {
                console.log(stock.ticker, '| raw cats:', stock.cats, '| parsed:', cats);
            }

            // ── 1. CATEGORY MATCH ──────────────────────────────────────────────
            let categoryScore = 0;
            for (const selectedCat of profile.categories) {
                // Always compare fully lowercased strings on both sides
                const keywords = (CATEGORY_KEYWORDS[selectedCat] || [selectedCat]).map(k => k.toLowerCase());
                const matched = keywords.some(kw =>
                    cats.some(c => c.includes(kw) || kw.includes(c))
                );
                if (matched) categoryScore += 40;
            }
            score += categoryScore;

            // ── ZERO-MATCH PENALTY ─────────────────────────────────────────────
            // If the user chose categories but this stock matches none of them,
            // push it to the back of the feed rather than polluting the aligned pool.
            if (profile.categories.length > 0 && categoryScore === 0) {
                score -= 80;
            }

            // ── 2. RISK ALIGNMENT ──────────────────────────────────────────────
            if (profile.risk === 'safe') {
                if (risk === 'safe') score += 30;
                if (risk === 'moderate') score += 10;
                if (risk === 'high') score -= 30;
            } else if (profile.risk === 'balanced') {
                if (risk === 'moderate') score += 25;
                if (risk === 'safe') score += 12;
                if (risk === 'high') score += 8;
            } else { // aggressive
                if (risk === 'high') score += 35;
                if (risk === 'moderate') score += 10;
                if (risk === 'safe') score -= 15;
            }

            // ── 3. EXPERIENCE / TIER ───────────────────────────────────────────
            // tier 1 = well-known mega/large-caps  (Apple, MSFT, JPM…)
            // tier 2 = recognisable mid-caps
            // tier 3+ = niche / small-cap / obscure
            //
            // Beginners benefit most from recognisable names; experienced
            // traders find large-caps boring and want discovery.
            // We ALWAYS keep some niche stocks in the exploratory slice
            // regardless of experience level (see rankStocksForUser).
            if (profile.experience === 'beginner') {
                if (tier === 1) score += 35;
                if (tier === 2) score += 10;
                if (tier >= 3) score -= 20;
            } else if (profile.experience === 'learning') {
                if (tier === 1) score += 20;
                if (tier === 2) score += 15;
                if (tier >= 3) score -= 5;
            } else if (profile.experience === 'portfolio') {
                if (tier === 1) score += 5;
                if (tier === 2) score += 20;
                if (tier >= 3) score += 12;
            } else { // experienced
                // Experienced traders want niche picks — penalise obvious names
                if (tier === 1) score -= 10;
                if (tier === 2) score += 15;
                if (tier >= 3) score += 30;
            }

            // ── 4. HORIZON + GOAL COMBOS ───────────────────────────────────────
            const hasIncome = INCOME_CATS.some(kw => cats.some(c => c.includes(kw)));
            const hasGrowth = GROWTH_CATS.some(kw => cats.some(c => c.includes(kw)));
            const hasSpec = SPEC_CATS.some(kw => cats.some(c => c.includes(kw)));

            if (profile.horizon === 'long') {
                // Long-term → reward stable income / dividend-friendly sectors
                if (hasIncome) score += 20;
                if (risk === 'safe' && profile.risk !== 'aggressive') score += 10;
                // Heavy preservation penalty for high-risk names
                if (profile.risk === 'safe') {
                    if (risk === 'high') score -= 40;
                    if (tier >= 3) score -= 15;
                }
            }

            if (profile.horizon === 'short') {
                // Short-term / speculation → boost volatile, high-beta names
                if (hasSpec) score += 25;
                if (risk === 'high') score += 20;
                // Boring safe stocks are a poor fit for short-term traders
                if (risk === 'safe' && profile.risk !== 'safe') score -= 15;
            }

            // Growth: reward high-growth sectors regardless of horizon
            if (profile.risk === 'aggressive' || profile.horizon === 'long') {
                if (hasGrowth) score += 20;
            }

            // ── 5. KNOWN STOCKS BOOST ──────────────────────────────────────────
            const knownStockCategoryMap = {
                'Apple': 'AI & Tech',
                'Google': 'AI & Tech',
                'Amazon': 'AI & Tech',
                'Microsoft': 'AI & Tech',
                'Tesla': 'EVs & Clean Energy',
                'Nvidia': 'AI & Tech',
                'JPMorgan': 'Finance',
                'Visa': 'Finance',
                'Johnson & Johnson': 'Healthcare',
                'ExxonMobil': 'EVs & Clean Energy',
                'Netflix': 'Social Media',
                'Meta': 'Social Media',
            };
            (profile.knownStocks || []).forEach(name => {
                const cat = knownStockCategoryMap[name];
                if (cat && profile.categories.includes(cat)) score += 15;
            });

            // ── FINANCE DEBUG ──────────────────────────────────────────────────
            if (stock.cats && stock.cats.toString().includes('Banking')) {
                console.log('FINANCE STOCK:', stock.ticker, 'score:', score, 'cats:', cats, 'categoryScore:', categoryScore);
            }

            // ── 6. RANDOMNESS ±10 (fresh feed every session) ──────────────────
            score += (Math.random() * 20) - 10;

            return score;
        }

        /**
         * Takes the full stock pool, scores every stock, and returns exactly 30
         * stocks ordered for the feed.
         *
         * Composition: ~65 % aligned (best matches) + ~35 % exploratory
         * (slightly outside the user's comfort zone to encourage discovery).
         *
         * For beginners the exploratory slice is pulled from tier 2–3 stocks
         * that don't necessarily match their categories — giving them safe
         * exposure to ideas they haven't considered.
         * For experienced traders the exploratory slice skews toward niche
         * tier-3 stocks they're unlikely to know.
         *
         * Interleaving pattern: 2 aligned → 1 exploratory → repeat,
         * which produces a natural ~67/33 split in-feed.
         *
         * @param {Array}  stocks  Raw rows from stock_editorial
         * @param {Object} profile Output of buildUserProfile()
         * @returns {Array}        Up to 30 raw stock rows, ordered for the feed
         */
        function rankStocksForUser(stocks, profile) {
            // Score every stock
            const scored = stocks.map(s => ({ s, score: scoreStock(s, profile) }));

            // Sort by score descending — top scorers guaranteed at front
            scored.sort((a, b) => b.score - a.score);

            console.log('TOP 10 SCORED:', scored.slice(0, 10).map(x => x.s.ticker + ' score:' + Math.round(x.score) + ' cats:' + x.s.cats));

            // Top 7 aligned stocks — always appear first, no shuffling
            const top7 = scored.slice(0, 7).map(x => x.s);

            // Exploratory stocks from positions 7–80, lightly shuffled
            const exploratoryStocks = scored.slice(7, 80).sort(() => Math.random() - 0.5).slice(0, 10).map(x => x.s);

            // Interleave: 2 aligned, 1 exploratory, repeat
            const feed = [];
            let ai = 0, ei = 0;
            while (feed.length < 7 && (ai < top7.length || ei < exploratoryStocks.length)) {
                if (ai < top7.length && feed.length < 7) feed.push(top7[ai++]);
                if (ai < top7.length && feed.length < 7) feed.push(top7[ai++]);
                if (ei < exploratoryStocks.length && feed.length < 7) feed.push(exploratoryStocks[ei++]);
            }

            // Pad to exactly 7 if pool was too small
            if (feed.length < 7) {
                const feedSet = new Set(feed.map(s => s.ticker));
                const extras = scored.filter(x => !feedSet.has(x.s.ticker)).map(x => x.s);
                extras.sort(() => Math.random() - 0.5);
                for (let i = 0; feed.length < 7 && i < extras.length; i++) {
                    feed.push(extras[i]);
                }
            }
            return feed.slice(0, 7);
        }

        // --- Streak Logic ---
        function checkAndUpdateStreak() {
            const uid = (currentUser && !isGuest) ? currentUser.id : 'guest';
            const keyDate = `streak_last_date_${uid}`;
            const keyCount = `streak_count_${uid}`;

            const today = new Date().toISOString().split('T')[0];
            const lastDate = localStorage.getItem(keyDate);
            let count = parseInt(localStorage.getItem(keyCount) || '0', 10);

            if (!lastDate) {
                count = 1;
            } else if (lastDate === today) {
                // same day — no change
            } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yStr = yesterday.toISOString().split('T')[0];
                count = (lastDate === yStr) ? count + 1 : 1;
            }

            localStorage.setItem(keyCount, count);
            localStorage.setItem(keyDate, today);

            const homeEl = document.getElementById('home-streak-num');
            if (homeEl) homeEl.textContent = count;
            const profEl = document.getElementById('pr-streak-num');
            if (profEl) profEl.textContent = count;
        }

        // --- Feed & Swiping Logic ---
        async function initFeed() {
            if (window._feedInitialized) return;
            window._feedInitialized = true;
            checkAndUpdateStreak();
            cleanupAuthScreens();
            updateFriendsBadge();
            updateMessagesBadge();
            subscribeToFriendships();
            // Activate nav and feed IMMEDIATELY before any async calls
            const feedEl = document.getElementById('feed');
            feedEl.classList.add('active');
            feedEl.style.pointerEvents = 'auto';
            feedEl.style.zIndex = '';
            const navEl = document.getElementById('app-nav');
            navEl.classList.add('active');
            navEl.style.pointerEvents = 'auto';

            sessionSaves = [];
            sessionWildcardSaves = [];
            window._currentWildcardBucketId = null;
            seenTickers.clear();
            await loadSeenTickers();
            await loadActiveBucket();
            updateFeedBucketBar();

            // If user has no bucket yet (existing account, skipped quiz flow),
            // show bucket picker before loading the feed.
            if (!window.activeBucket && typeof showBucketConfirmScreen === 'function') {
                const recommendedId = (userProfile && typeof recommendTopBuckets === 'function')
                    ? recommendTopBuckets(userProfile, 3)
                    : ['tech-titans'];
                window._feedInitialized = false; // allow re-init after bucket is picked
                showBucketConfirmScreen(recommendedId, () => {
                    window._feedInitialized = false;
                    initFeed();
                });
                return;
            }

            try {
                // Fetch the full pool so the ranking algorithm has enough candidates.
                // stock_editorial is ~474 rows — tiny for client-side scoring.
                const { data: stocks, error } = await supabaseClient
                    .from('stock_editorial')
                    .select('*')
                    .limit(500);

                if (error) console.error("Supabase error:", error);
                window._allStocks = stocks || [];
                const DEAD_TICKERS = new Set(['DIDI', 'RIDE', 'XELA', 'SPCE', 'BBBY', 'CLOV', 'WKHS', 'NKLA', 'ATVI', 'TWTR']);
                const savedSet = window._savedTickerSet || new Set();
                const bucketUniverse = window.activeBucket ? window.activeBucket.universe : null;
                const fetchedStocks = (stocks || []).filter(s =>
                    !DEAD_TICKERS.has(s.ticker) &&
                    !seenTickers.has(s.ticker) &&
                    !savedSet.has(s.ticker) &&
                    (!bucketUniverse || bucketUniverse.has(s.ticker))
                );
                const remainingSlots = Math.max(0, 7 - seenTickers.size);
                console.log('seenTickers.size:', seenTickers.size, 'remainingSlots:', remainingSlots);

                // Rank the full pool against the user's profile.
                // Falls back to a simple shuffle if no profile exists (e.g. dev reload).
                let rankedStocks;
                if (userProfile) {
                    rankedStocks = rankStocksForUser(fetchedStocks, userProfile).slice(0, remainingSlots);
                    console.log('PROFILE USED:', JSON.stringify(userProfile));
                    console.log('TOP 5 RANKED:', rankedStocks.slice(0, 5).map(s => s.ticker + ' | ' + s.cats));
                    console.log('SAMPLE FINANCE SCORES:', fetchedStocks.filter(s => s.cats && s.cats.toString().includes('Finance')).slice(0, 3).map(s => s.ticker + ' score:' + scoreStock(s, userProfile) + ' cats:' + s.cats));
                } else {
                    rankedStocks = fetchedStocks.sort(() => Math.random() - 0.5).slice(0, remainingSlots);
                }

                // ── Wildcard injection ────────────────────────────────────────────
                // Replace 2 of the 7 bucket cards with picks from an adjacent bucket.
                // Wildcards appear as card 3 and card 6 in the session (positions 2 and 5
                // in the pre-reverse array). Only injected when bucket is active and pool
                // has enough candidates.
                let deckStocks = rankedStocks;
                window._currentWildcardBucketId = null;
                if (window.activeBucket && typeof pickAdjacentBucket === 'function' && rankedStocks.length >= 5) {
                    const wcBucketId = pickAdjacentBucket(window.activeBucketId);
                    const wcBucket = typeof BUCKET_DATA !== 'undefined' ? BUCKET_DATA[wcBucketId] : null;
                    if (wcBucket) {
                        const deckSet = new Set(rankedStocks.map(s => s.ticker));
                        const wcPool = (stocks || []).filter(s =>
                            !DEAD_TICKERS.has(s.ticker) &&
                            !seenTickers.has(s.ticker) &&
                            !savedSet.has(s.ticker) &&
                            !deckSet.has(s.ticker) &&
                            wcBucket.universe.has(s.ticker)
                        );
                        const picks = wcPool.sort(() => Math.random() - 0.5).slice(0, 2);
                        if (picks.length === 2) {
                            picks.forEach(s => { s._isWildcard = true; s._wildcardBucketId = wcBucketId; });
                            const five = rankedStocks.slice(0, 5);
                            // Layout: [b0, b1, wc0, b2, b3, wc1, b4] → reversed → wc0 is card 3, wc1 is card 6
                            deckStocks = [five[0], five[1], picks[0], five[2], five[3], picks[1], five[4]];
                            window._currentWildcardBucketId = wcBucketId;
                            console.log('Wildcard bucket:', wcBucketId, 'picks:', picks.map(s => s.ticker));
                        }
                    }
                }

                deck = deckStocks.map(s => {
                    let chartData = {};
                    ['1D', '1W', '1M', '3M', '1Y'].forEach(r => {
                        let pts = [];
                        let p = 100;
                        for (let i = 0; i <= 20; i++) {
                            p += (Math.random() - 0.5) * 2;
                            pts.push({ x: i, y: p });
                        }
                        chartData[r] = pts;
                    });

                    window[`chartData_${s.ticker}`] = chartData;

                    return {
                        ticker: s.ticker || '???',
                        name: s.name || s.ticker,
                        desc: s.description || '',
                        why: s.why || '',
                        tags: s.tags ? (Array.isArray(s.tags) ? s.tags : s.tags.split(',').map(t => t.trim())) : [],
                        similar: s.similar || [],
                        risk: s.risk || 'Moderate',
                        ceo: s.ceo || '-',
                        hq: s.hq || '-',
                        founded: s.founded || '-',
                        employees: s.employees || '-',
                        bizModel: s.biz || '',
                        short_desc: s.short_desc || '',
                        sector: (() => { try { const a = JSON.parse(s.cats || '[]'); return Array.isArray(a) ? a[0] : s.cats; } catch (e) { return s.cats || ''; } })(),
                        price: '...',
                        change: '...',
                        color: 'grey',
                        analystClass: 'ab-hold',
                        analyst: 'Hold',
                        mcap: '-', pe: '-', ps: '-', div: '-', eps: '-', high52: '-', low52: '-', rev: '-', netInc: '-', vol: '-', beta: '-',
                        ret1w: '0', ret1m: '0', ret6m: '0', ret1y: '0', perfDesc: 'Performance data...',
                        sentiment: 50,
                        riskIcon: s.risk === 'High' ? '▲' : (s.risk === 'Safe' ? '●' : '◆'),
                        riskDesc: s.risk === 'High' ? 'High volatility growth play' : (s.risk === 'Safe' ? 'Stable blue-chip company' : 'Balanced growth potential'),
                        bullets: s.why ? (Array.isArray(s.why) ? s.why : (() => { try { return JSON.parse(s.why); } catch (e) { return [s.why]; } })()) : ['Matches your interest profile.'],
                        anBuyPct: 33, anHoldPct: 33, anSellPct: 34, anStr: 'Loading...', anTarget: '-', anUpside: '-',
                        chartData: chartData,
                        _isWildcard: s._isWildcard || false,
                        _wildcardBucketId: s._wildcardBucketId || null
                    };
                }).reverse();

                // Safety guard: wildcard must never be the first card shown (deck[deck.length-1])
                if (deck.length > 1 && deck[deck.length - 1]._isWildcard) {
                    const tmp = deck[deck.length - 1];
                    deck[deck.length - 1] = deck[deck.length - 2];
                    deck[deck.length - 2] = tmp;
                }

                // Restore saved stocks — use RAW stocks array (fetchedStocks has saved tickers filtered out)
                if (window._savedTickers && window._savedTickers.length > 0) {
                    const rawByTicker = {};
                    (stocks || []).forEach(s => { rawByTicker[s.ticker] = s; });
                    window._savedTickers.forEach(row => {
                        const s = rawByTicker[row.ticker];
                        if (!s) return;
                        savedStocks.push({
                            ticker: s.ticker, name: s.name || s.ticker,
                            desc: s.description || '', why: s.why || '',
                            tags: s.tags ? (Array.isArray(s.tags) ? s.tags : s.tags.split(',').map(t => t.trim())) : [],
                            similar: s.similar || [],
                            risk: s.risk || 'Moderate',
                            ceo: s.ceo || '-', hq: s.hq || '-', founded: s.founded || '-',
                            employees: s.employees || '-', bizModel: s.biz || '',
                            short_desc: s.short_desc || '',
                            sector: (() => { try { const a = JSON.parse(s.cats || '[]'); return Array.isArray(a) ? a[0] : s.cats; } catch { return s.cats || ''; } })(),
                            price: '...', change: '...', color: 'grey',
                            analystClass: 'ab-hold', analyst: 'Hold', sentiment: 50,
                            riskIcon: s.risk === 'High' ? '▲' : (s.risk === 'Safe' ? '●' : '◆'),
                            riskDesc: s.risk === 'High' ? 'High volatility growth play' : (s.risk === 'Safe' ? 'Stable blue-chip company' : 'Balanced growth potential'),
                            bullets: s.why ? (Array.isArray(s.why) ? s.why : (() => { try { return JSON.parse(s.why); } catch { return [s.why]; } })()) : [],
                            mcap: '-', pe: '-', ps: '-', div: '-', eps: '-', high52: '-', low52: '-',
                            rev: '-', netInc: '-', vol: '-', beta: '-',
                            ret1w: '0', ret1m: '0', ret6m: '0', ret1y: '0', perfDesc: 'Performance data...',
                            anBuyPct: 33, anHoldPct: 33, anSellPct: 34, anStr: 'Loading...', anTarget: '-', anUpside: '-',
                            chartData: {}
                        });
                    });
                    document.getElementById('saved-count').innerText = savedStocks.length;
                    window._savedTickers = null;
                    fetchSavedStockPrices(); // fetch live prices for watchlist stats
                }

                renderStack();
                // Fetch logos for the top 5 visible cards first (sequential, 250ms apart),
                // then lazily fetch the rest in the background as the user swipes through.
                const topTickers = deck.slice(-5).map(s => s.ticker);
                const restTickers = deck.slice(0, -5).map(s => s.ticker);
                fetchLogosSequentially(topTickers).then(() => {
                    topTickers.forEach(ticker => {
                        const imgEl = document.getElementById('card-logo-' + ticker);
                        const fbEl = document.getElementById('card-logo-fallback-' + ticker);
                        if (imgEl && fbEl) injectLogo(imgEl, fbEl, ticker);
                    });
                    // Now fetch the rest quietly in the background
                    fetchLogosSequentially(restTickers);
                });
            } catch (err) {
                console.error("Feed error:", err);
            }
        }

        function fetchTopCardPrice() {
            const stock = deck[deck.length - 1];
            if (!stock || stock.priceLoaded) return;
            stock.priceLoaded = true;
            fetch('https://finnhub.io/api/v1/quote?symbol=' + stock.ticker + '&token=' + FINNHUB_KEY)
                .then(r => r.json())
                .then(data => {
                    const c = data.c, pc = data.pc;
                    if (!c) return;
                    const changePct = ((c - pc) / pc * 100).toFixed(2);
                    stock.price = '$' + c.toFixed(2);
                    stock.change = (changePct >= 0 ? '+' : '') + changePct + '%';
                    stock.color = changePct >= 0 ? 'green' : 'red';

                    const pEl = document.getElementById('price-' + stock.ticker);
                    const cEl = document.getElementById('change-' + stock.ticker);
                    if (pEl) pEl.innerHTML = stock.price;
                    if (cEl) { cEl.innerHTML = stock.change; cEl.className = 'c-change ' + stock.color; }

                    loadSparkline(stock.ticker, '1D', stock.price, stock.change, stock.color);
                }).catch(() => {});
        }

        async function fetchSavedStockPrices() {
            if (!savedStocks || savedStocks.length === 0) return;
            const unloaded = savedStocks.filter(s => !s.priceLoaded);
            if (!unloaded.length) return;
            try {
                const tickers = unloaded.map(s => s.ticker).join(',');
                const data = await fetch(EDGE_FN_URL + '?tickers=' + encodeURIComponent(tickers) + '&mode=price&interval=1d&range=1d', {
                    headers: { 'Authorization': 'Bearer ' + SUPABASE_ANON_JWT, 'apikey': SUPABASE_ANON_JWT }
                }).then(r => r.json());
                for (const stock of unloaded) {
                    const d = data[stock.ticker];
                    if (d && d.price != null) {
                        const c = d.price;
                        const o = d.prev || c;
                        const changePct = ((c - o) / o * 100).toFixed(2);
                        stock.price = '$' + c.toFixed(2);
                        stock.change = (changePct >= 0 ? '+' : '') + changePct + '%';
                        stock.color = changePct >= 0 ? 'green' : 'red';
                        stock.priceLoaded = true;
                    }
                }
            } catch (_) { }
            // Re-render watchlist only if it's currently visible
            const wl = document.getElementById('watchlist');
            if (wl && wl.classList.contains('active')) renderWatchlist();
        }

        function removeCardFromDeck(ticker) {
            const idx = deck.findIndex(s => s.ticker === ticker);
            if (idx === -1) return;
            deck.splice(idx, 1);
            const cardEl = document.getElementById('card-' + idx);
            if (cardEl) cardEl.remove();
            renderStack();
        }

        function renderStack() {
            const stack = document.getElementById('card-stack');
            stack.innerHTML = '';
            document.getElementById('feed-count').innerText = `${deck.length} left`;

            deck.forEach((stock, idx) => {
                const isTop = idx === deck.length - 1;
                const _dist = deck.length - 1 - idx;
                const _initScale = _dist > 2 ? 0 : 1 - (_dist * 0.05);
                const _initTy = _dist > 2 ? 0 : _dist * 12;



                const priceDisplay = stock.priceLoaded ? stock.price : '<div style="width:60px;height:24px;background:#333;border-radius:12px;opacity:0.5"></div>';
                const changeDisplay = stock.priceLoaded ? stock.change : '';

                const _wcGlow = stock._isWildcard ? ';box-shadow:0 0 0 2px #FFB800,0 0 22px rgba(255,184,0,0.3)' : '';
                const _wcBucketName = stock._isWildcard && stock._wildcardBucketId && typeof BUCKET_DATA !== 'undefined'
                    ? (BUCKET_DATA[stock._wildcardBucketId] ? BUCKET_DATA[stock._wildcardBucketId].name : '') : '';
                const _exBucket = stock._isExplore && stock._exploreBucketId && typeof BUCKET_DATA !== 'undefined' ? BUCKET_DATA[stock._exploreBucketId] : null;
                const _exGlow = _exBucket ? `;box-shadow:0 0 0 2px ${_exBucket.color},0 0 22px ${_exBucket.color}40` : '';
                const cardHTML = `
                <div class="swipe-card" id="card-${idx}" style="z-index:${idx};transform:translateY(${_initTy}px) scale(${_initScale})${_wcGlow}${_exGlow}">
                    <div class="card-stamp stamp-pass">BEAR</div>
                    <div class="card-stamp stamp-save">BULL</div>
                    <div class="pull-down-btn" onclick="collapseCard()">↓ Close</div>
                    ${stock._isWildcard ? `<div style="position:absolute;top:13px;left:50%;transform:translateX(-50%);background:rgba(255,184,0,0.12);border:1px solid rgba(255,184,0,0.55);border-radius:100px;padding:3px 11px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:#FFB800;letter-spacing:0.4px;z-index:10;pointer-events:none;white-space:nowrap;">✦ ${_wcBucketName}</div>` : ''}
                    ${_exBucket ? `<div style="position:absolute;top:13px;left:50%;transform:translateX(-50%);background:${_exBucket.color}14;border:1px solid ${_exBucket.color}60;border-radius:100px;padding:3px 11px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;color:${_exBucket.color};letter-spacing:0.4px;z-index:10;pointer-events:none;white-space:nowrap;">Exploring ${_exBucket.name}</div>` : ''}
                    <div class="card-inner">
                        <div class="c-header" style="align-items:flex-start;position:relative;">
                            <div style="display:flex;flex-direction:row;align-items:flex-start;gap:12px;">
                                <div style="position:relative;flex-shrink:0;margin-top:-4px;">
                                    <img id="card-logo-${stock.ticker}" class="card-logo-avatar" src="" alt="" style="display:none;width:56px;height:56px;border-radius:14px;">
                                    <div id="card-logo-fallback-${stock.ticker}" style="width:56px;height:56px;border-radius:14px;background:#f2f2f2;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#555;font-family:'DM Mono',monospace;flex-shrink:0;">${stock.ticker.slice(0, 2)}</div>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:6px;padding-top:0px;">
                                    <div class="c-ticker">${stock.ticker}</div>
                                    <div class="c-name">${stock.name}</div>
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-start;gap:6px;padding-top:0px;">
                                <div class="c-price" id="price-${stock.ticker}">${priceDisplay}</div>
                                <div class="c-change ${stock.color}" id="change-${stock.ticker}">${changeDisplay}</div>
                            </div>
                        </div>

                        <!-- Collapsed sparkline: interactive Chart.js with tabs -->
                        <div class="chart-container collapsed-only" id="chart-cont-${stock.ticker}">
                            <canvas id="sparkline-${stock.ticker}" style="width:100%;height:100%;display:block;"></canvas>
                        </div>
                        <!-- Time tabs for collapsed card -->
                        <div class="spk-tab-row collapsed-only" id="spk-tabs-${stock.ticker}">
                            <div class="spk-tab spk-active" onclick="switchSparkline('${stock.ticker}','1D',this)">1D</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','1W',this)">1W</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','1M',this)">1M</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','3M',this)">3M</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','6M',this)">6M</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','1Y',this)">1Y</div>
                            <div class="spk-tab" onclick="switchSparkline('${stock.ticker}','5Y',this)">5Y</div>
                        </div>

                        <!-- Expanded-card Chart.js interactive canvas + tabs -->
                        <div class="exp-chart-wrap expanded-only" id="exp-chart-wrap-${stock.ticker}">
                            <div class="exp-chart-loading" id="exp-chart-loading-${stock.ticker}">Loading chart…</div>
                            <canvas id="exp-canvas-${stock.ticker}" height="200" style="width:100%;display:block;"></canvas>
                            <div class="exp-tab-row" id="exp-tabs-${stock.ticker}">
                                <div class="exp-tab exp-tab-active" onclick="switchExpandedChart('${stock.ticker}', '1D', this)">1D</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '1W', this)">1W</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '1M', this)">1M</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '3M', this)">3M</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '6M', this)">6M</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '1Y', this)">1Y</div>
                                <div class="exp-tab" onclick="switchExpandedChart('${stock.ticker}', '5Y', this)">5Y</div>
                            </div>
                        </div>

                        <div class="c-short-desc collapsed-only">${stock.bizModel}</div>
                        <div class="collapsed-only" style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                            <div class="c-sect">${stock.sector}</div>
                            <button class="card-share-btn" onclick="shareCardStock('${stock.ticker}', event)" aria-label="Share ${stock.ticker}" style="margin-left:auto;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#00C853" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </div>

                        <div class="expanded-only">
                            <div class="badge-row">
                                <div class="c-sect">${stock.sector}</div>
                            </div>

                            <div class="c-section">
                                <div class="c-sec-title">Company Snapshot</div>
                            <div class="c-desc">${stock.desc}</div>
                            <div class="snap-grid">
                                <div class="snap-cell"><div class="snap-lbl">Founded</div><div class="snap-val">${stock.founded}</div></div>
                                <div class="snap-cell"><div class="snap-lbl">HQ</div><div class="snap-val">${stock.hq}</div></div>
                                <div class="snap-cell"><div class="snap-lbl">Employees</div><div class="snap-val">${stock.employees}</div></div>
                                <div class="snap-cell"><div class="snap-lbl">CEO</div><div class="snap-val">${stock.ceo}</div></div>
                            </div>
                            <div class="snap-biz">${stock.bizModel}</div>
                        </div>

                        <div class="c-section">
                            <div class="c-sec-title">Why this stock</div>
                            <div class="why-title">WHY IT'S IN YOUR FEED</div>
                            <div class="why-bullets">
                                ${stock.bullets.map(b => `<div class="why-bullet">${b}</div>`).join('')}
                            </div>
                        </div>

                        <div class="c-section">
                            <div class="c-sec-title">Key Metrics</div>
                            <div class="metrics-grid">
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">P/E RATIO</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'pe')">i</div>
                                    </div>
                                    <div class="metric-val" id="pe-${stock.ticker}">${stock.pe}</div>
                                    <div class="metric-tooltip">Price-to-Earnings. How much investors pay for $1 of profit. A high P/E means investors expect strong future growth. The S&P 500 average is around 25.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">P/S RATIO</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'ps')">i</div>
                                    </div>
                                    <div class="metric-val" id="ps-${stock.ticker}">${stock.ps}</div>
                                    <div class="metric-tooltip">Price-to-Sales. Compares the stock price to revenue. Useful for companies that aren't profitable yet. Lower usually means cheaper.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">EPS</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'eps')">i</div>
                                    </div>
                                    <div class="metric-val" id="eps-${stock.ticker}">${stock.eps}</div>
                                    <div class="metric-tooltip">Earnings Per Share. The company's total profit divided by number of shares. Higher is better — it means the company earns more per share you own.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">MARKET CAP</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'mcap')">i</div>
                                    </div>
                                    <div class="metric-val" id="mcap-${stock.ticker}">${stock.mcap}</div>
                                    <div class="metric-tooltip">The total value of all shares combined. Large-cap (over $10B) companies are generally more stable. Small-cap companies can grow faster but carry more risk.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">DIV YIELD</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'div')">i</div>
                                    </div>
                                    <div class="metric-val" id="div-${stock.ticker}">${stock.div}</div>
                                    <div class="metric-tooltip">The annual cash payment to shareholders as a % of the stock price. A 3% yield means you earn $3/year for every $100 invested, just for holding the stock.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">BETA</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'beta')">i</div>
                                    </div>
                                    <div class="metric-val" id="beta-${stock.ticker}">${stock.beta}</div>
                                    <div class="metric-tooltip">Measures how volatile the stock is vs. the market. Beta of 1 = moves with the market. Above 1 = more volatile. Below 1 = more stable.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">52W HIGH/LOW</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'highlow')">i</div>
                                    </div>
                                    <div class="metric-val" id="highlow-${stock.ticker}">${stock.high52} / ${stock.low52}</div>
                                    <div class="metric-tooltip">The highest and lowest price the stock traded at over the last 52 weeks. Useful for understanding where the current price sits in its recent range.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">REVENUE</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'rev')">i</div>
                                    </div>
                                    <div class="metric-val" id="rev-${stock.ticker}">${stock.rev}</div>
                                    <div class="metric-tooltip">Total money the company brought in before expenses. Growing revenue is a positive sign even if the company isn't profitable yet.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">NET INCOME</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'netinc')">i</div>
                                    </div>
                                    <div class="metric-val" id="netinc-${stock.ticker}">${stock.netInc}</div>
                                    <div class="metric-tooltip">What's left after all expenses, taxes, and costs. This is the actual profit. Negative means the company is still burning cash.</div>
                                </div>
                                <div class="metric-cell">
                                    <div class="metric-name-row">
                                        <div class="metric-lbl">VOLUME</div>
                                        <div class="metric-btn" onclick="toggleMetricTooltip(event, 'vol')">i</div>
                                    </div>
                                    <div class="metric-val" id="vol-${stock.ticker}">${stock.vol}</div>
                                    <div class="metric-tooltip">How many shares traded today. High volume means lots of interest. Unusually high volume can signal big news or institutional buying.</div>
                                </div>
                            </div>
                        </div>

                        <div class="c-section">
                            <div class="c-sec-title">How It Performed vs The Market</div>
                            <div class="perf-desc" style="color:#999;font-size:12px;margin-bottom:10px;">Excess return vs S&amp;P 500</div>
                            <div class="perf-row">
                                <div class="perf-badge neg" id="rel-1m-${stock.ticker}"><span class="pb-label">1M</span><span class="pb-val">-</span></div>
                                <div class="perf-badge neg" id="rel-3m-${stock.ticker}"><span class="pb-label">3M</span><span class="pb-val">-</span></div>
                                <div class="perf-badge neg" id="rel-6m-${stock.ticker}"><span class="pb-label">6M</span><span class="pb-val">-</span></div>
                                <div class="perf-badge neg" id="rel-1y-${stock.ticker}"><span class="pb-label">1Y</span><span class="pb-val">-</span></div>
                            </div>
                        </div>

                        <div class="c-section">
                            <div class="c-sec-title">Risk & Sentiment</div>
                            <div class="rs-row">
                                <div class="rs-card">
                                    <div class="rs-lbl">Risk level</div>
                                    <div class="rs-val-row"><span class="rs-icon">${stock.riskIcon}</span><span class="rs-val" id="risk-val-${stock.ticker}">${stock.risk}</span></div>
                                    <div class="rs-desc" id="risk-desc-${stock.ticker}">${stock.riskDesc}</div>
                                </div>
                                <div class="rs-card">
                                    <div class="rs-lbl">Market sentiment</div>
                                    <div class="rs-val-row"><span class="rs-val" id="sentiment-val-${stock.ticker}">${stock.sentiment}% Bullish</span></div>
                                    <div class="sentiment-bar-bg">
                                        <div class="sentiment-bar-fill" id="sentiment-fill-${stock.ticker}" style="width: ${stock.sentiment}%; background: ${stock.sentiment > 50 ? '#00C853' : '#E53935'}"></div>
                                    </div>
                                    <div class="sentiment-labels"><span>Bearish</span><span>Bullish</span></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="c-section">
                            <div class="c-sec-title">Wall Street Says</div>
                            <div class="tgt-row">
                                <div class="tgt-buy" id="tgt-buy-${stock.ticker}" style="width: ${stock.anBuyPct}%;"></div>
                                <div class="tgt-hold" id="tgt-hold-${stock.ticker}" style="width: ${stock.anHoldPct}%;"></div>
                                <div class="tgt-sell" id="tgt-sell-${stock.ticker}" style="width: ${stock.anSellPct}%;"></div>
                            </div>
                            <div class="tgt-lbls" id="tgt-lbls-${stock.ticker}">${stock.anStr}</div>
                        </div>

                        <button class="card-share-pill" onclick="shareCardStock('${stock.ticker}', event)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#00C853" stroke="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            Share this stock
                        </button>
                    </div> <!-- /expanded-only -->
                    </div>
                </div>`;

                stack.insertAdjacentHTML('beforeend', cardHTML);
                switchRange(stock.ticker, '1D', document.querySelector(`#card-${idx} .time-pill`), stock.color);
            });

            // Adjust stacking visuals
            const cards = document.querySelectorAll('.swipe-card');
            cards.forEach((card, i) => {
                const dist = deck.length - 1 - i;
                let scale = 1 - (dist * 0.05);
                let ty = dist * parseInt('12px');
                if (dist > 2) { scale = 0; ty = 0; }

                if (_initialDeckRender) {
                    card.style.transform = `translateY(${ty + 60}px) scale(${scale * 0.85})`;
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.transform = `translateY(${ty}px) scale(${scale})`;
                        card.style.opacity = '1';
                    }, 50 + (dist * 40));
                } else {
                    card.style.transform = `translateY(${ty}px) scale(${scale})`;
                }
            });
            _initialDeckRender = false;

            // Re-apply top card dragging; sparkline renders via fetchTopCardPrice (after DOM is ready)
            if (deck.length > 0) {
                topCard = document.getElementById(`card-${deck.length - 1}`);
                if (_cardSwipePop) {
                    _cardSwipePop = false;
                    topCard.style.animation = 'none';
                    void topCard.offsetWidth;
                    topCard.style.transition = 'none';
                    topCard.style.animation = 'bubblyPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
                    setTimeout(() => { topCard.style.animation = ''; topCard.style.transition = ''; }, 520);
                }
                initDrag(topCard);
                resetCardState();
                // drawChart loop removed — SVG sparkline replaced with Chart.js canvas
                fetchTopCardPrice();
                // Apply logo to the top card
                const topStock = deck[deck.length - 1];
                if (topStock) {
                    const applyCardLogo = () => {
                        const imgEl = document.getElementById('card-logo-' + topStock.ticker);
                        const fbEl = document.getElementById('card-logo-fallback-' + topStock.ticker);
                        if (imgEl && fbEl) injectLogo(imgEl, fbEl, topStock.ticker);
                    };
                    if (logoCache[topStock.ticker] !== undefined) { applyCardLogo(); }
                    else { fetchLogo(topStock.ticker).then(applyCardLogo); }
                }
                // Start explore timer if top card is an explore card; clear it otherwise
                if (topStock && topStock._isExplore) {
                    _startExploreCardTimer(topStock._exploreBucketId);
                } else {
                    if (window._exploreTimer) { clearTimeout(window._exploreTimer); window._exploreTimer = null; }
                    if (window._exploreTimerRAF) { cancelAnimationFrame(window._exploreTimerRAF); window._exploreTimerRAF = null; }
                }
            } else {
                resetCardState();
                const stack = document.getElementById('card-stack');
                if (stack) {
                    const bucket = window.activeBucket;
                    const savedCount = sessionSaves.length;
                    const passedCount = (deck ? 0 : 0) + (7 - savedCount); // approximation
                    const accentColor = bucket ? bucket.color : '#00C853';
                    const avgUpside = sessionSaves.length
                        ? (sessionSaves.reduce((sum, s) => sum + (parseFloat(s.anUpside) || 8), 0) / sessionSaves.length).toFixed(1)
                        : null;

                    // Wildcard upsell — shown when user saved at least 1 wildcard card
                    let wildcardUpsellHTML = '';
                    if (sessionWildcardSaves.length > 0 && window._currentWildcardBucketId && typeof BUCKET_DATA !== 'undefined') {
                        const wcB = BUCKET_DATA[window._currentWildcardBucketId];
                        if (wcB) {
                            const wcCount = sessionWildcardSaves.length;
                            const wcLabel = wcCount === 2 ? 'both' : 'a';
                            wildcardUpsellHTML = `
                            <div style="background:linear-gradient(135deg,#001a0d,#002215);border:1.5px solid #00FF88;border-radius:18px;padding:18px;margin-bottom:10px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
                                    <span style="font-size:15px;color:#00FF88;">✦</span>
                                    <div style="font-family:'DM Sans',sans-serif;font-weight:700;font-size:14px;color:#00FF88;">You saved ${wcLabel} ${wcB.name} pick${wcCount > 1 ? 's' : ''}</div>
                                </div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;margin-bottom:14px;">${wcB.tagline} — looks like it caught your eye. Want to explore this bucket?</div>
                                <button onclick="openAlphaScreen()" style="width:100%;padding:12px;background:linear-gradient(90deg,#00FF88,#00E676);border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;color:#0a0a0a;cursor:pointer;">Explore ${wcB.name} →</button>
                            </div>`;
                        }
                    }

                    stack.innerHTML = `
                    <canvas id="confetti-canvas" style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;"></canvas>
                    <div style="display:flex;flex-direction:column;width:100%;height:100%;overflow-y:auto;padding:40px 20px 32px;">

                        <div style="text-align:center;margin-bottom:28px;">
                            <div style="margin-bottom:14px;"><svg width="48" height="48" viewBox="0 0 52 52" fill="none"><circle cx="26" cy="26" r="25" stroke="${accentColor}" stroke-width="2" fill="${accentColor}15"/><path d="M16 26l7 7 13-14" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                            <div style="font-family:'DM Sans',sans-serif;font-weight:800;font-size:24px;color:#0a0a0a;margin-bottom:4px;">Session complete</div>
                            ${bucket ? `<div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#888;">${bucket.name} feed</div>` : ''}
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                            <div style="background:#fff;border:1.5px solid #f0f0f0;border-radius:18px;padding:18px;text-align:center;">
                                <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:${savedCount > 0 ? accentColor : '#ccc'};">${savedCount}</div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#888;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">Swyped</div>
                            </div>
                            <div style="background:#fff;border:1.5px solid #f0f0f0;border-radius:18px;padding:18px;text-align:center;">
                                <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:#888;">${7 - savedCount}</div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#888;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">Passed</div>
                            </div>
                        </div>

                        ${bucket ? `
                        <div style="display:grid;grid-template-columns:${avgUpside ? '1fr 1fr' : '1fr'};gap:10px;margin-bottom:10px;">
                            <div style="background:#fff;border:1.5px solid #f0f0f0;border-radius:18px;padding:18px;text-align:center;">
                                <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:#0a0a0a;">${bucket.sharpe_5y}</div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#888;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">${bucket.name} Sharpe</div>
                            </div>
                            ${avgUpside ? `
                            <div style="background:#fff;border:1.5px solid #f0f0f0;border-radius:18px;padding:18px;text-align:center;">
                                <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:${accentColor};">+${avgUpside}%</div>
                                <div style="font-family:'DM Sans',sans-serif;font-size:11px;color:#888;margin-top:3px;text-transform:uppercase;letter-spacing:1px;">Avg 1yr Upside</div>
                            </div>` : ''}
                        </div>` : ''}

                        ${wildcardUpsellHTML}

                        ${savedCount > 0 ? `
                        <button onclick="showWatchlist()" style="width:100%;padding:15px;background:${accentColor};border:none;border-radius:100px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:700;color:#fff;cursor:pointer;margin-bottom:10px;">
                            View ${savedCount} Swyped →
                        </button>` : `
                        <div style="background:#f7f7f7;border-radius:18px;padding:16px;text-align:center;margin-bottom:10px;">
                            <div style="font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#0a0a0a;margin-bottom:4px;">Nothing caught your eye</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#888;">Try a different bucket — new picks refresh soon.</div>
                        </div>`}

                        <div style="text-align:center;margin-top:8px;margin-bottom:4px;">
                            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;margin-bottom:6px;">Fresh picks arrive in</div>
                            <div id="refresh-countdown" style="font-family:'DM Mono',monospace;font-size:26px;font-weight:700;color:#0a0a0a;">--:--:--</div>
                        </div>

                    </div>`;
                    // Confetti burst
                    (() => {
                        const canvas = document.getElementById('confetti-canvas');
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                        const pieces = Array.from({ length: 120 }, () => ({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height - canvas.height,
                            w: Math.random() * 10 + 5,
                            h: Math.random() * 6 + 3,
                            color: ['#00C853', '#0a0a0a', '#FFD600', '#2979FF', '#FF6D00', '#E53935'][Math.floor(Math.random() * 6)],
                            rot: Math.random() * 360,
                            vx: (Math.random() - 0.5) * 3,
                            vy: Math.random() * 4 + 2,
                            vr: (Math.random() - 0.5) * 6,
                            opacity: 1
                        }));
                        let frame = 0;
                        const animate = () => {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            pieces.forEach(p => {
                                p.x += p.vx; p.y += p.vy; p.rot += p.vr;
                                if (frame > 80) p.opacity -= 0.015;
                                ctx.save();
                                ctx.globalAlpha = Math.max(0, p.opacity);
                                ctx.translate(p.x, p.y);
                                ctx.rotate(p.rot * Math.PI / 180);
                                ctx.fillStyle = p.color;
                                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                                ctx.restore();
                            });
                            frame++;
                            if (frame < 160) requestAnimationFrame(animate);
                            else canvas.remove();
                        };
                        animate();
                    })();
                    // Start live countdown to next batch
                    (async () => {
                        try {
                            const { data: prof } = await supabaseClient
                                .from('user_profiles')
                                .select('batch_created_at')
                                .eq('user_id', currentUser.id)
                                .maybeSingle();
                            if (!prof?.batch_created_at) return;
                            const batchCreatedAt = new Date(prof.batch_created_at).getTime();
                            const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
                            const tick = () => {
                                const el = document.getElementById('refresh-countdown');
                                if (!el) return;
                                const msLeft = (batchCreatedAt + TWENTY_FOUR_HOURS) - Date.now();
                                if (msLeft <= 0) {
                                    el.innerText = 'Refreshing...';
                                    setTimeout(() => {
                                        window._feedInitialized = false;
                                        initFeed();
                                    }, 1000);
                                    return;
                                }
                                const h = Math.floor(msLeft / 3600000);
                                const m = Math.floor((msLeft % 3600000) / 60000);
                                const s = Math.floor((msLeft % 60000) / 1000);
                                el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                                setTimeout(tick, 1000);
                            };
                            tick();
                        } catch (e) { console.error('countdown error:', e); }
                    })();
                }
            }
        }

        // --- Unified Gesture Handler ---
        let startX = 0;
        let startY = 0;
        let deltaX = 0;
        let deltaY = 0;
        let startTime = 0;
        let hasMoved = false;
        let isDragging = false;
        let topCard = null;
        let _cardSwipePop = false;
        let isExpanded = false;
        let expandCardSource = 'feed'; // 'feed' | 'saved'

        function initDrag(card) {
            if (card._dragInit) return; // prevent duplicate listeners
            card._dragInit = true;
            card.addEventListener('mousedown', handleStart);
            card.addEventListener('touchstart', handleStart, { passive: true });
        }

        function handleStart(e) {
            if (e.target.closest('.time-pill') || e.target.closest('.time-range') || e.target.closest('.chart-container') || e.target.closest('.metric-btn') || e.target.closest('.share-btn-full') || e.target.closest('.sim-chip') || e.target.closest('.also-chip') || e.target.closest('.card-share-btn')) {
                return;
            }
            if (!topCard) return;
            const inner = topCard.querySelector('.card-inner');
            if (inner && inner.scrollTop > 0) return;

            startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            startTime = Date.now();
            hasMoved = false;
            isDragging = true;
            deltaX = 0;
            deltaY = 0;

            if (!isExpanded) {
                topCard.style.transition = 'none';
            }

            document.addEventListener('mousemove', handleMove);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchend', handleEnd);
        }

        function handleMove(e) {
            if (!isDragging || !topCard) return;

            const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            deltaX = currentX - startX;
            deltaY = currentY - startY;

            const totalMove = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (totalMove > 8) hasMoved = true;

            if (isExpanded) {
                if (hasMoved && deltaY > 0) {
                    topCard.style.transition = 'none';
                    topCard.style.transform = `translateY(${deltaY}px)`;
                    if (e.cancelable) e.preventDefault();
                }
                return;
            }

            if (hasMoved) {
                // Block horizontal drag on explore cards — timer dismisses them
                if (!isExpanded && deck.length > 0 && deck[deck.length - 1]._isExplore) return;
                topCard.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.04}deg)`;
                const swipeFade = Math.min(1, Math.max(0, (Math.abs(deltaX) - 10) / 40));
                topCard.querySelector('.stamp-pass').style.opacity = deltaX < 0 ? swipeFade : 0;
                topCard.querySelector('.stamp-save').style.opacity = deltaX > 0 ? swipeFade : 0;
                if (e.cancelable) e.preventDefault();
            }
        }

        function handleEnd(e) {
            if (!isDragging || !topCard) return;
            if (e.type === 'mouseup' && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
            isDragging = false;

            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchend', handleEnd);

            const duration = Date.now() - startTime;

            if (hasMoved === false && duration < 250) {
                if (!isExpanded) {
                    expandCard();
                }
            } else if (Math.abs(deltaX) > 80 && isExpanded === false) {
                if (deck.length > 0 && deck[deck.length - 1]._isExplore) {
                    // Snap back — explore cards can't be swiped
                    topCard.style.transition = 'transform 0.4s cubic-bezier(.34,1.56,.64,1)';
                    topCard.style.transform = 'translateY(0) scale(1) rotate(0)';
                    topCard.querySelector('.stamp-pass').style.opacity = 0;
                    topCard.querySelector('.stamp-save').style.opacity = 0;
                } else {
                    actionSwipe(deltaX > 0 ? 'right' : 'left');
                }
            } else {
                if (isExpanded) {
                    if (deltaY > 60) {
                        collapseCard();
                    } else {
                        topCard.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                        topCard.style.transform = 'translateY(0)';
                    }
                } else {
                    topCard.style.transition = 'transform 0.4s cubic-bezier(.34,1.56,.64,1)';
                    topCard.style.transform = 'translateY(0) scale(1) rotate(0)';
                    topCard.querySelector('.stamp-pass').style.opacity = 0;
                    topCard.querySelector('.stamp-save').style.opacity = 0;
                }
            }
        }

        function expandCard() {
            if (!topCard || isExpanded) return;
            isExpanded = true;
            const _bucketBar = document.getElementById('feed-bucket-bar');
            if (_bucketBar) _bucketBar.style.display = 'none';
            topCard.style.transition = 'transform 0.4s cubic-bezier(.34, 1.56, .64, 1), opacity 0.4s ease, box-shadow 0.4s ease, border-radius 0.4s ease, max-height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            topCard.style.overflow = 'scroll';
            topCard.style.overflowY = 'scroll';
            topCard.classList.add('expanded');

            const stockForChart = deck[deck.length - 1];
            if (stockForChart) {
                setTimeout(() => loadExpandedChart(stockForChart.ticker, '1D'), 80);
            }

            const stock = deck[deck.length - 1];
            if (stock) {
                const t = stock.ticker; const el = (id) => document.getElementById(id + '-' + t);
                if (el('pe')) el('pe').innerText = stock.pe || '-';
                if (el('mcap')) el('mcap').innerText = stock.marketCap || '-';
                if (el('high52')) el('high52').innerText = stock.week52High || '-';
                if (el('low52')) el('low52').innerText = stock.week52Low || '-';
                if (el('eps')) el('eps').innerText = '-';
                if (el('beta')) el('beta').innerText = '-';

                fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${stock.ticker}&metric=all&token=${FINNHUB_KEY}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.metric) {
                            const m = data.metric;
                            const t = stock.ticker;
                            const el = (id) => document.getElementById(id + '-' + t);

                            console.log('Finnhub metric object:', m);
                            console.log('52WeekHigh:', m['52WeekHigh'], '| psTTM:', m.psTTM, '| epsTTM:', m.epsTTM, '| currentDividendYieldTTM:', m.currentDividendYieldTTM, '| 5DayPriceReturnDaily:', m['5DayPriceReturnDaily']);
                            console.log('pe el:', el('pe'), '| ps el:', el('ps'), '| eps el:', el('eps'), '| div el:', el('div'), '| beta el:', el('beta'), '| highlow el:', el('highlow'), '| mcap el:', el('mcap'), '| vol el:', el('vol'));

                            // Core metrics
                            if (el('pe')) el('pe').innerText = m['peBasicExclExtraTTM'] != null ? m['peBasicExclExtraTTM'].toFixed(1) : '-';
                            if (el('eps')) el('eps').innerText = m['epsTTM'] != null ? '$' + m['epsTTM'].toFixed(2) : '-';
                            if (el('ps')) el('ps').innerText = m['psTTM'] != null ? m['psTTM'].toFixed(1) : '-';
                            if (el('beta')) el('beta').innerText = m['beta'] != null ? m['beta'].toFixed(2) : '-';

                            // Derive risk level from beta
                            const beta = m['beta'];
                            const riskValEl = document.getElementById('risk-val-' + t);
                            const riskDescEl = document.getElementById('risk-desc-' + t);
                            if (riskValEl) {
                                if (beta == null) {
                                    riskValEl.innerText = 'Unknown Risk';
                                    if (riskDescEl) riskDescEl.innerText = 'Insufficient data to assess volatility';
                                } else if (beta > 2) {
                                    riskValEl.innerText = 'High Risk';
                                    if (riskDescEl) riskDescEl.innerText = 'Highly volatile, expect large price swings';
                                } else if (beta >= 1) {
                                    riskValEl.innerText = 'Medium Risk';
                                    if (riskDescEl) riskDescEl.innerText = 'Moderate volatility, moves with the market';
                                } else {
                                    riskValEl.innerText = 'Low Risk';
                                    if (riskDescEl) riskDescEl.innerText = 'Stable, lower volatility than the market';
                                }
                            }
                            if (el('div')) el('div').innerText = m['currentDividendYieldTTM'] != null ? m['currentDividendYieldTTM'].toFixed(2) + '%' : '-';
                            // 52W High/Low share a single combined element
                            const hlEl = el('highlow');
                            if (hlEl) {
                                const hi = m['52WeekHigh'] != null ? '$' + m['52WeekHigh'].toFixed(2) : '-';
                                const lo = m['52WeekLow'] != null ? '$' + m['52WeekLow'].toFixed(2) : '-';
                                hlEl.innerText = hi + ' / ' + lo;
                            }
                            if (el('mcap')) el('mcap').innerText = m['marketCapitalization'] != null ? '$' + (m['marketCapitalization'] / 1000).toFixed(1) + 'B' : '-';

                            // Volume
                            const vol10d = m['10DayAverageTradingVolume'];
                            if (el('vol')) el('vol').innerText = vol10d != null ? (vol10d >= 1 ? vol10d.toFixed(1) + 'M' : (vol10d * 1000).toFixed(0) + 'K') : '-';

                            // Forward PE
                            if (el('fpe')) el('fpe').innerText = m['forwardPE'] != null ? m['forwardPE'].toFixed(1) : '-';

                            // Performance vs S&P 500 badges (excess return)
                            const relFields = [
                                { id: 'rel-1m', key: 'priceRelativeToS&P5004Week' },
                                { id: 'rel-3m', key: 'priceRelativeToS&P50013Week' },
                                { id: 'rel-6m', key: 'priceRelativeToS&P50026Week' },
                                { id: 'rel-1y', key: 'priceRelativeToS&P50052Week' },
                            ];
                            relFields.forEach(({ id, key }) => {
                                const relEl = document.getElementById(id + '-' + t);
                                if (!relEl) return;
                                const val = m[key];
                                const valStr = val != null ? (val >= 0 ? '+' : '') + val.toFixed(1) + '%' : '-';
                                const label = relEl.querySelector('.pb-label')?.innerText || '';
                                relEl.innerHTML = `<span class="pb-label">${label}</span><span class="pb-val">${valStr}</span>`;
                                relEl.className = 'perf-badge ' + (val == null ? 'neg' : val >= 0 ? 'pos' : 'neg');
                            });
                        }
                    }).catch(e => console.error(e));

                const ticker = stock.ticker;

                // 2. Analyst recommendations + derive sentiment
                fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${ticker}&token=${FINNHUB_KEY}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const a = data[0];
                            const buy = (a.strongBuy || 0) + (a.buy || 0);
                            const hold = a.hold || 0;
                            const sell = (a.sell || 0) + (a.strongSell || 0);
                            const total = buy + hold + sell;
                            if (total > 0) {
                                const buyPct = buy / total;
                                let label, cls;
                                if (a.strongBuy / total >= 0.3) { label = 'Strong Buy'; cls = 'ab-buy'; }
                                else if (buyPct >= 0.55) { label = 'Buy'; cls = 'ab-buy'; }
                                else if (buyPct >= 0.3) { label = 'Hold'; cls = 'ab-hold'; }
                                else { label = 'Sell'; cls = 'ab-sell'; }
                                const badgeEl = document.getElementById('analyst-badge-' + ticker);
                                if (badgeEl) { badgeEl.innerText = label; badgeEl.className = 'analyst-badge ' + cls; }
                                // Wall Street bar + derive sentiment from buy/hold/sell
                                const buyRatio = buy / total;
                                const sentPct = Math.min(95, Math.max(5, Math.round(buyRatio * 100)));
                                const sentLabel = sentPct >= 60 ? 'Bullish' : sentPct >= 40 ? 'Neutral' : 'Bearish';
                                const sentValEl = document.getElementById('sentiment-val-' + ticker);
                                const sentFillEl = document.getElementById('sentiment-fill-' + ticker);
                                if (sentValEl) sentValEl.innerText = sentPct + '% ' + sentLabel;
                                if (sentFillEl) { sentFillEl.style.width = sentPct + '%'; sentFillEl.style.background = sentPct > 50 ? '#00C853' : '#E53935'; }
                                const bd = document.getElementById('tgt-buy-' + ticker);
                                const hd = document.getElementById('tgt-hold-' + ticker);
                                const sd = document.getElementById('tgt-sell-' + ticker);
                                const ld = document.getElementById('tgt-lbls-' + ticker);
                                if (bd) bd.style.width = ((buy / total) * 100) + '%';
                                if (hd) hd.style.width = ((hold / total) * 100) + '%';
                                if (sd) sd.style.width = ((sell / total) * 100) + '%';
                                if (ld) ld.innerText = buy + ' Buy · ' + hold + ' Hold · ' + sell + ' Sell';
                            }
                        }
                    }).catch(e => console.error(e));

                // 3. Revenue & Net Income from financials-reported
                fetch(`https://finnhub.io/api/v1/stock/financials-reported?symbol=${ticker}&freq=annual&token=${FINNHUB_KEY}`)
                    .then(r => r.json())
                    .then(data => {
                        console.log('Finnhub financials-reported response:', data);
                        console.log('FINANCIALS RAW:', JSON.stringify(data).substring(0, 500));
                        console.log('data.data exists:', !!data.data);
                        console.log('data.data length:', data.data?.length);
                        console.log('first report:', JSON.stringify(data.data?.[0]?.report?.ic?.slice(0, 5)));
                        const revEl = document.getElementById('rev-' + ticker);
                        const niEl = document.getElementById('netinc-' + ticker);
                        const fmtBn = (v) => v != null ? (Math.abs(v) >= 1e9 ? (v < 0 ? '-' : '') + '$' + (Math.abs(v) / 1e9).toFixed(1) + 'B' : (v < 0 ? '-' : '') + '$' + (Math.abs(v) / 1e6).toFixed(0) + 'M') : null;
                        let found = false;
                        if (data && data.data && data.data.length > 0) {
                            const ic = data.data[0].report && data.data[0].report.ic;
                            if (ic) {
                                const revConcepts = [
                                    'Revenues', 'us-gaap_Revenues',
                                    'RevenueFromContractWithCustomerExcludingAssessedTax', 'us-gaap_RevenueFromContractWithCustomerExcludingAssessedTax',
                                    'SalesRevenueNet', 'us-gaap_SalesRevenueNet',
                                    'RevenueFromContractWithCustomerIncludingAssessedTax', 'us-gaap_RevenueFromContractWithCustomerIncludingAssessedTax',
                                    'us-gaap_RevenueFromContractWithCustomer', 'RevenueFromContractWithCustomer'
                                ];
                                const niConcepts = [
                                    'NetIncomeLoss', 'us-gaap_NetIncomeLoss',
                                    'NetIncome', 'us-gaap_NetIncome',
                                    'ProfitLoss', 'us-gaap_ProfitLoss',
                                    'us-gaap_NetIncomeLossAvailableToCommonStockholdersBasic', 'NetIncomeLossAvailableToCommonStockholdersBasic'
                                ];
                                let rev = null, ni = null;
                                ic.forEach(item => {
                                    if (!rev && revConcepts.includes(item.concept)) rev = item.value;
                                    if (!ni && niConcepts.includes(item.concept)) ni = item.value;
                                });
                                console.log('Revenue concept value:', rev, '| Net income concept value:', ni);
                                if (rev != null && revEl) { revEl.innerText = fmtBn(rev); found = true; }
                                if (ni != null && niEl) { niEl.innerText = fmtBn(ni); found = true; }
                            }
                        }
                        // Fallback: use revenuePerShareTTM from already-fetched metric data
                        if (!found) {
                            fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${FINNHUB_KEY}`)
                                .then(r => r.json())
                                .then(md => {
                                    console.log('Finnhub metric fallback for rev:', md);
                                    if (md && md.metric) {
                                        const m = md.metric;
                                        const shares = m['sharesOutstanding'] || m['shareOutstanding'];
                                        if (m['revenuePerShareTTM'] && shares && revEl) {
                                            revEl.innerText = fmtBn(m['revenuePerShareTTM'] * shares * 1e6);
                                        }
                                        if (m['netProfitMarginTTM'] && m['revenuePerShareTTM'] && shares && niEl) {
                                            niEl.innerText = fmtBn(m['revenuePerShareTTM'] * shares * 1e6 * m['netProfitMarginTTM'] / 100);
                                        }
                                    }
                                }).catch(e => console.error('metric fallback error:', e));
                        }
                    }).catch(e => console.error('financials-reported error:', e));
            }
        }

        function collapseCard() {
            if (!topCard || !isExpanded) return;
            isExpanded = false;
            if (typeof updateFeedBucketBar === 'function') updateFeedBucketBar();
            topCard.style.transition = 'transform 0.4s cubic-bezier(.34, 1.56, .64, 1), opacity 0.4s ease, box-shadow 0.4s ease, border-radius 0.4s ease, max-height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
            topCard.style.transform = 'translateY(0) scale(1) rotate(0)';
            topCard.style.overflow = 'hidden';
            topCard.style.overflowY = 'hidden';
            const inner = topCard.querySelector('.card-inner');
            if (inner) inner.scrollTop = 0;
            topCard.classList.remove('expanded');

            // Reset both tab rows to 1D and reload the 1D sparkline + change %
            const tickerEl = topCard.querySelector('.c-ticker');
            if (tickerEl) {
                const ticker = tickerEl.innerText.trim();
                const expTabRow = topCard.querySelector('.exp-tab-row');
                if (expTabRow) {
                    expTabRow.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('exp-tab-active'));
                    const first = expTabRow.querySelector('.exp-tab');
                    if (first) first.classList.add('exp-tab-active');
                }
                const spkTabRow = document.getElementById('spk-tabs-' + ticker);
                if (spkTabRow) {
                    const firstSpkTab = spkTabRow.querySelector('.spk-tab');
                    if (firstSpkTab) switchSparkline(ticker, '1D', firstSpkTab);
                }
            }
            if (expandCardSource === 'saved') {
                const tempCard = topCard;
                expandCardSource = 'feed';
                setTimeout(() => {
                    deck.pop();
                    if (tempCard && tempCard.parentNode) tempCard.parentNode.removeChild(tempCard);
                    showWatchlist();
                }, 420);
            }
        }

        function resetCardState() {
            isExpanded = false;
            if (topCard) {
                topCard.style.transition = 'transform 0.4s cubic-bezier(.34, 1.56, .64, 1), opacity 0.4s ease, box-shadow 0.4s ease, border-radius 0.4s ease, max-height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), padding 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                topCard.style.transform = 'translateY(0) scale(1) rotate(0)';
                topCard.style.overflow = 'hidden';
                topCard.style.overflowY = 'hidden';
                const inner = topCard.querySelector('.card-inner');
                if (inner) inner.scrollTop = 0;
                topCard.classList.remove('expanded');
            }
        }

        function actionSwipe(dir) {
            if (!topCard) return;
            if (window._swipeLock) return;
            window._swipeLock = true;
            setTimeout(() => { window._swipeLock = false; }, 600);

            const tx = dir === 'right' ? window.innerWidth : -window.innerWidth;
            const rot = dir === 'right' ? 30 : -30;

            topCard.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
            topCard.style.transform = `translateX(${tx}px) rotate(${rot}deg)`;
            topCard.style.opacity = 0;

            // update stamp logic if action button clicked instead of dragged
            if (dir === 'right') topCard.querySelector('.stamp-save').style.opacity = 1;
            if (dir === 'left') topCard.querySelector('.stamp-pass').style.opacity = 1;

            if (dir === 'right') {
                const savedStock = deck[deck.length - 1];
                if (!savedStock._isExplore) {
                    savedStocks.push(savedStock);
                    sessionSaves.push(savedStock);
                    if (savedStock._isWildcard) sessionWildcardSaves.push(savedStock);
                    document.getElementById('saved-count').innerText = savedStocks.length;
                    showToast(`Saved ${savedStock.ticker}`);
                    if (currentUser && !isGuest) {
                        (async () => {
                            try {
                                await supabaseClient.from('saved_stocks')
                                    .insert({ user_id: currentUser.id, ticker: savedStock.ticker, bucket_id: window.activeBucketId || null });
                            } catch (e) { }
                        })();
                    }
                }
            }

            // Mark this ticker as seen regardless of swipe direction (skip explore cards)
            const swipedStock = deck[deck.length - 1];
            if (swipedStock && !swipedStock._isExplore) {
                seenTickers.add(swipedStock.ticker);
                if (currentUser && !isGuest) {
                    (async () => {
                        try {
                            const { error } = await supabaseClient.from('seen_stocks').upsert({
                                user_id: currentUser.id,
                                ticker: swipedStock.ticker,
                                action: dir === 'right' ? 'saved' : 'passed',
                                seen_at: new Date().toISOString()
                            }, { onConflict: 'user_id,ticker' });
                            if (error) console.error('seen_stocks upsert error:', error);
                            else console.log('seen_stocks saved:', swipedStock.ticker, dir);
                        } catch (e) { console.error('seen_stocks catch:', e); }
                    })();
                }
            }

            setTimeout(() => {
                deck.pop();
                _cardSwipePop = true;
                renderStack();
                // Auto-hide explore banner if all explore cards are gone
                if (!deck.some(s => s._isExplore)) _dismissExploreBanner();
            }, 300);
        }

        // ─── Bucket Explore Mode ───────────────────────────────────────────────────

        function launchBucketExplore(bucketId) {
            if (typeof BUCKET_DATA === 'undefined') return;
            const bucket = BUCKET_DATA[bucketId];
            if (!bucket) return;

            // Build the info sheet
            const existing = document.getElementById('bucket-explore-sheet');
            if (existing) existing.remove();

            const savedSet = new Set((savedStocks || []).map(s => s.ticker));
            const pool = (window._allStocks || []).filter(s =>
                bucket.universe.has(s.ticker) && !savedSet.has(s.ticker)
            );
            const pickCount = Math.min(3, pool.length);

            const sheet = document.createElement('div');
            sheet.id = 'bucket-explore-sheet';
            sheet.style.cssText = 'position:fixed;inset:0;z-index:9000;';
            sheet.innerHTML = `
                <div onclick="document.getElementById('bucket-explore-sheet').remove()" style="position:absolute;inset:0;background:rgba(0,0,0,0.45);"></div>
                <div id="bucket-explore-panel" style="position:absolute;bottom:0;left:0;right:0;background:#fff;border-radius:24px 24px 0 0;padding:28px 24px 40px;transform:translateY(100%);transition:transform 0.36s cubic-bezier(0.32,0.72,0,1);">
                    <div style="width:36px;height:4px;background:#e0e0e0;border-radius:100px;margin:0 auto 24px;"></div>

                    <!-- Header -->
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
                        <div style="width:52px;height:52px;border-radius:16px;background:${bucket.color}14;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            ${typeof getBucketIcon==='function'?getBucketIcon(bucketId,26,bucket.color):''}
                        </div>
                        <div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:20px;font-weight:800;color:#0a0a0a;line-height:1.1;">${bucket.name}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:#888;margin-top:3px;">${bucket.tagline}</div>
                        </div>
                    </div>

                    <!-- Description -->
                    <div style="font-family:'DM Sans',sans-serif;font-size:14px;color:#444;line-height:1.55;margin-bottom:18px;">${bucket.description}</div>

                    <!-- Investor type -->
                    <div style="display:flex;align-items:flex-start;gap:10px;background:${bucket.color}0d;border-radius:12px;padding:12px 14px;margin-bottom:18px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${bucket.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:${bucket.color};font-weight:600;line-height:1.45;">${bucket.investorType || ''}</div>
                    </div>

                    <!-- Stats row -->
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">
                        <div style="text-align:center;background:#f7f7f7;border-radius:12px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:${bucket.color};">+${bucket.return_5y}%</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">5yr Return</div>
                        </div>
                        <div style="text-align:center;background:#f7f7f7;border-radius:12px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:#0a0a0a;">${bucket.sharpe_5y}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Sharpe</div>
                        </div>
                        <div style="text-align:center;background:#f7f7f7;border-radius:12px;padding:10px 4px;">
                            <div style="font-family:'DM Mono',monospace;font-size:14px;font-weight:700;color:#0a0a0a;">${bucket.universe.size}</div>
                            <div style="font-family:'DM Sans',sans-serif;font-size:9px;color:#aaa;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">Stocks</div>
                        </div>
                    </div>

                    <!-- Highlights -->
                    ${bucket.highlights ? `
                    <div style="margin-bottom:22px;">
                        <div style="font-family:'DM Mono',monospace;font-size:9px;font-weight:600;color:#aaa;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px;">Inside this bucket</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            ${bucket.highlights.map(t=>`<div style="background:#f2f2f2;border-radius:8px;padding:5px 10px;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:#444;">${t}</div>`).join('')}
                            <div style="background:#f2f2f2;border-radius:8px;padding:5px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#999;">+${bucket.universe.size-bucket.highlights.length} more</div>
                        </div>
                    </div>` : ''}

                    <!-- CTA -->
                    ${pickCount > 0
                        ? `<button onclick="_launchExploreCards('${bucketId}')" style="width:100%;padding:15px;background:${bucket.color};color:#fff;border:none;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:800;cursor:pointer;">See ${pickCount} pick${pickCount===1?'':'s'} from ${bucket.name} →</button>`
                        : `<div style="text-align:center;padding:14px;font-family:'DM Sans',sans-serif;font-size:13px;color:#aaa;">No unseen stocks available in this bucket right now.</div>`
                    }
                </div>`;
            document.body.appendChild(sheet);
            requestAnimationFrame(() => {
                document.getElementById('bucket-explore-panel').style.transform = 'translateY(0)';
            });
        }

        function _launchExploreCards(bucketId) {
            const sheet = document.getElementById('bucket-explore-sheet');
            if (sheet) sheet.remove();

            const bucket = BUCKET_DATA[bucketId];
            if (!bucket) return;

            const savedSet = new Set((savedStocks || []).map(s => s.ticker));
            const DEAD = new Set(['DIDI','RIDE','XELA','SPCE','BBBY','CLOV','WKHS','NKLA','ATVI','TWTR']);
            const pool = (window._allStocks || []).filter(s =>
                bucket.universe.has(s.ticker) && !savedSet.has(s.ticker) && !DEAD.has(s.ticker)
            ).sort(() => Math.random() - 0.5).slice(0, 3);

            if (pool.length === 0) return;

            // Remove any existing explore cards from deck
            deck = deck.filter(s => !s._isExplore);

            pool.forEach(s => {
                const tags = s.tags ? (Array.isArray(s.tags) ? s.tags : s.tags.split(',').map(t => t.trim())) : [];
                const bullets = s.why ? (Array.isArray(s.why) ? s.why : (() => { try { return JSON.parse(s.why); } catch { return [s.why]; } })()) : [];
                deck.push({
                    ticker: s.ticker, name: s.name || s.ticker,
                    desc: s.description || '', why: s.why || '',
                    tags, similar: s.similar || [],
                    risk: s.risk || 'Moderate',
                    ceo: s.ceo || '-', hq: s.hq || '-', founded: s.founded || '-',
                    employees: s.employees || '-', bizModel: s.biz || '',
                    short_desc: s.short_desc || '',
                    sector: (() => { try { const a = JSON.parse(s.cats || '[]'); return Array.isArray(a) ? a[0] : s.cats; } catch { return s.cats || ''; } })(),
                    price: '...', change: '...', color: 'grey',
                    analystClass: 'ab-hold', analyst: 'Hold', sentiment: 50,
                    riskIcon: s.risk === 'High' ? '▲' : (s.risk === 'Safe' ? '●' : '◆'),
                    riskDesc: s.risk === 'High' ? 'High volatility growth play' : (s.risk === 'Safe' ? 'Stable blue-chip company' : 'Balanced growth potential'),
                    bullets,
                    mcap: '-', pe: '-', ps: '-', div: '-', eps: '-', high52: '-', low52: '-',
                    rev: '-', netInc: '-', vol: '-', beta: '-',
                    ret1w: '0', ret1m: '0', ret6m: '0', ret1y: '0', perfDesc: 'Performance data...',
                    anBuyPct: 33, anHoldPct: 33, anSellPct: 34, anStr: 'Loading...', anTarget: '-', anUpside: '-',
                    chartData: {},
                    _isExplore: true, _exploreBucketId: bucketId
                });
            });

            // Show explore banner
            const banner = document.getElementById('explore-banner');
            if (banner) {
                const iconEl = document.getElementById('explore-banner-icon');
                const labelEl = document.getElementById('explore-banner-label');
                const subEl = document.getElementById('explore-banner-sub');
                if (iconEl) iconEl.innerHTML = typeof getBucketIcon==='function' ? getBucketIcon(bucketId, 18, bucket.color) : '';
                if (labelEl) labelEl.textContent = 'Exploring ' + bucket.name;
                if (subEl) subEl.textContent = pool.length + ' pick' + (pool.length===1?'':'s') + ' · 10s per card';
                banner.style.cssText = `display:flex;position:absolute;bottom:162px;left:16px;right:16px;z-index:20;border-radius:14px;padding:10px 14px;align-items:center;gap:8px;background:#fff;border:1.5px solid ${bucket.color}40;box-shadow:0 2px 12px rgba(0,0,0,0.08);overflow:hidden;`;
            }

            navTo('home');
            renderStack();
            fetchSavedStockPrices();
        }

        function _dismissExploreBanner() {
            const banner = document.getElementById('explore-banner');
            if (banner) banner.style.display = 'none';
            if (window._exploreTimer) { clearTimeout(window._exploreTimer); window._exploreTimer = null; }
            if (window._exploreTimerRAF) { cancelAnimationFrame(window._exploreTimerRAF); window._exploreTimerRAF = null; }
        }

        function dismissBucketExplore() {
            deck = deck.filter(s => !s._isExplore);
            _dismissExploreBanner();
            renderStack();
        }

        function _startExploreCardTimer(bucketId) {
            if (window._exploreTimer) clearTimeout(window._exploreTimer);
            if (window._exploreTimerRAF) cancelAnimationFrame(window._exploreTimerRAF);

            const DURATION = 10000;
            const startMs = Date.now();
            const bar = document.getElementById('explore-timer-bar');
            const bucket = bucketId && typeof BUCKET_DATA !== 'undefined' ? BUCKET_DATA[bucketId] : null;
            const barColor = bucket ? bucket.color : '#00C853';

            if (bar) {
                bar.style.background = barColor;
                bar.style.width = '100%';
                bar.style.transition = 'none';
            }

            function tick() {
                const pct = Math.min(1, (Date.now() - startMs) / DURATION);
                if (bar) bar.style.width = (100 - pct * 100) + '%';
                if (pct < 1) window._exploreTimerRAF = requestAnimationFrame(tick);
            }
            window._exploreTimerRAF = requestAnimationFrame(tick);
            window._exploreTimer = setTimeout(_dismissCurrentExploreCard, DURATION);
        }

        function _dismissCurrentExploreCard() {
            if (window._exploreTimer) { clearTimeout(window._exploreTimer); window._exploreTimer = null; }
            if (window._exploreTimerRAF) { cancelAnimationFrame(window._exploreTimerRAF); window._exploreTimerRAF = null; }
            if (!topCard) return;
            const stock = deck[deck.length - 1];
            if (!stock || !stock._isExplore) return;

            if (isExpanded) collapseCard();
            topCard.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            topCard.style.opacity = '0';
            topCard.style.transform = 'translateY(-20px) scale(0.95)';

            setTimeout(() => {
                deck.pop();
                _cardSwipePop = false;
                renderStack();
                if (!deck.some(s => s._isExplore)) _dismissExploreBanner();
            }, 500);
        }


