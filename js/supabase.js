        async function fetchWithFallback(yahooUrl) {
            const r = await fetch('https://corsproxy.io/?' + encodeURIComponent(yahooUrl));
            if (!r.ok) throw new Error('proxy failed');
            return await r.json();
        }

        const SUPABASE_URL = ' https://rzvrdvvzxgwccldqnxbm.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_3XO8Z8czm3uvL86vOe8VAQ_7L5V-vAN';
        const SUPABASE_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6dnJkdnZ6eGd3Y2NsZHFueGJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjA1MzUsImV4cCI6MjA4ODM5NjUzNX0.0Cr7xpEoI-vdHC2KtbU-G5OwgomVYqzaREDGLgTRKYQ';
        const POLYGON_KEY = 'sCT1CY6jexDOq2E76cmLP8hyLlGrDPZN';
        const FMP_KEY = 'YlDT85SvxL4hNZsBSc3jZejoyJ0nsae3';
        const FINNHUB_KEY = 'd6nk26hr01qodk605hhgd6nk26hr01qodk605hi0';
        const EDGE_FN_URL = 'https://rzvrdvvzxgwccldqnxbm.supabase.co/functions/v1/market-data';

        let userInterests = [];
        let userProfile = null;   // populated after quiz; drives feed ranking
        let currentStep = 1;
        const totalSteps = 5;

        // Auth state
        let currentUser = null;
        let isGuest = false;
        let splashShown = false;

        // Tracks every ticker shown this session — never repeat
        const seenTickers = new Set();
        const { createClient } = supabase;
        const supabaseClient = createClient(SUPABASE_URL.trim(), SUPABASE_KEY);
        let deck = [];
        let _initialDeckRender = true;
        let savedStocks = [];

        // ── Company logo cache & fetch ──────────────────────────────────────────────
        const logoCache = {}; // keyed by ticker: URL string (or '' if none), undefined if not yet fetched

        // Legacy domain map — no longer used (Clearbit shut down; Finnhub API is the only logo source)
        const tickerDomains = {
            // Big Tech
            AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', GOOG: 'google.com',
            META: 'meta.com', AMZN: 'amazon.com', NVDA: 'nvidia.com', TSLA: 'tesla.com',
            NFLX: 'netflix.com', INTC: 'intel.com', AMD: 'amd.com', QCOM: 'qualcomm.com',
            AVGO: 'broadcom.com', TXN: 'ti.com', MU: 'micron.com', AMAT: 'appliedmaterials.com',
            LRCX: 'lamresearch.com', KLAC: 'kla.com', MRVL: 'marvell.com', SWKS: 'skyworksinc.com',
            MPWR: 'monolithicpower.com', ON: 'onsemi.com', WOLF: 'wolfspeed.com',
            // Software & SaaS
            CRM: 'salesforce.com', ORCL: 'oracle.com', SAP: 'sap.com', NOW: 'servicenow.com',
            SNOW: 'snowflake.com', DDOG: 'datadoghq.com', MDB: 'mongodb.com', ESTC: 'elastic.co',
            NET: 'cloudflare.com', FSLY: 'fastly.com', ZS: 'zscaler.com', CRWD: 'crowdstrike.com',
            OKTA: 'okta.com', CYBR: 'cyberark.com', S: 'sentinelone.com', PANW: 'paloaltonetworks.com',
            FTNT: 'fortinet.com', TENB: 'tenable.com', RPD: 'rapid7.com', VRNS: 'varonis.com',
            SAIL: 'sailpoint.com', QLYS: 'qualys.com',
            ADBE: 'adobe.com', INTU: 'intuit.com', ANSS: 'ansys.com', CDNS: 'cadence.com',
            SNPS: 'synopsys.com', PTC: 'ptc.com', AZPN: 'aspentech.com',
            WDAY: 'workday.com', HUBS: 'hubspot.com', VEEV: 'veeva.com', PCTY: 'paylocity.com',
            PAYC: 'paycom.com', ADP: 'adp.com', PAYX: 'paychex.com',
            TTWO: 'take2games.com', EA: 'ea.com', ATVI: 'activision.com', RBLX: 'roblox.com',
            U: 'unity.com', ZNGA: 'zynga.com',
            SHOP: 'shopify.com', BIGC: 'bigcommerce.com', PRFT: 'perficient.com',
            BOX: 'box.com', DOCN: 'digitalocean.com', GTLB: 'gitlab.com', CFLT: 'confluent.io',
            DSGX: 'descartes.com', NCNO: 'ncino.com', ALRM: 'alarm.com', PCOR: 'procore.com',
            PLAN: 'anaplan.com', WIXCOM: 'wix.com', WIX: 'wix.com', SQSP: 'squarespace.com',
            SPRK: 'switchback.com', FROG: 'jfrog.com', DT: 'dynatrace.com', NEWR: 'newrelic.com',
            APPN: 'appian.com', ALTR: 'altera.com', AI: 'c3.ai', BBAI: 'bigbear.ai',
            PATH: 'uipath.com', PEGA: 'pega.com', PRGS: 'progress.com',
            ASAN: 'asana.com', MNDY: 'monday.com', BASE: 'airtable.com', SMAR: 'smartsheet.com',
            ZM: 'zoom.us', WEBX: 'cisco.com', RNG: 'ringcentral.com', BAND: 'bandwidth.com',
            TWLO: 'twilio.com', SEND: 'sendgrid.com', SINCH: 'sinch.com',
            TOST: 'toasttab.com', NUAN: 'nuance.com', AVYA: 'avaya.com',
            // Fintech & Payments
            V: 'visa.com', MA: 'mastercard.com', PYPL: 'paypal.com', SQ: 'squareup.com',
            AFRM: 'affirm.com', UPST: 'upstart.com', LC: 'lendingclub.com', SOFI: 'sofi.com',
            COIN: 'coinbase.com', MSTR: 'microstrategy.com', RIOT: 'riotplatforms.com',
            MARA: 'marathondh.com', HUT: 'hutmining.com', BITF: 'bitfarms.com', CIFR: 'cipher.com',
            GPN: 'globalpayments.com', FIS: 'fisglobal.com', FISV: 'fiserv.com',
            WEX: 'wexinc.com', PRAA: 'pra.com', NRDS: 'nerdwallet.com', DAVE: 'dave.com',
            HOOD: 'robinhood.com', IBKR: 'interactivebrokers.com', SCHW: 'schwab.com',
            MS: 'morganstanley.com', GS: 'goldmansachs.com', JPM: 'jpmorganchase.com',
            BAC: 'bankofamerica.com', WFC: 'wellsfargo.com', C: 'citigroup.com',
            USB: 'usbank.com', PNC: 'pnc.com', TFC: 'truist.com', RF: 'regions.com',
            COF: 'capitalone.com', DFS: 'discover.com', AXP: 'americanexpress.com',
            SYF: 'synchrony.com', ALLY: 'ally.com', OMF: 'onemainfinancial.com',
            // Healthcare & Pharma & Biotech
            JNJ: 'jnj.com', PFE: 'pfizer.com', MRK: 'merck.com', ABBV: 'abbvie.com',
            BMY: 'bms.com', LLY: 'lilly.com', AMGN: 'amgen.com', GILD: 'gilead.com',
            BIIB: 'biogen.com', REGN: 'regeneron.com', VRTX: 'vrtx.com', ALNY: 'alnylam.com',
            MRNA: 'modernatx.com', BNTX: 'biontech.de', NVAX: 'novavax.com',
            ABT: 'abbott.com', MDT: 'medtronic.com', BSX: 'bostonscientific.com',
            EW: 'edwards.com', SYK: 'stryker.com', ZBH: 'zimmerbiomet.com',
            HOLX: 'hologic.com', ISRG: 'intuitivesurgical.com', NVCR: 'novocure.com',
            DXCM: 'dexcom.com', PODD: 'omnipod.com', ALGN: 'aligntech.com',
            CVS: 'cvshealth.com', CI: 'cigna.com', UNH: 'unitedhealthgroup.com',
            HUM: 'humana.com', CNC: 'centene.com', MOH: 'molina.com', ELV: 'elevancehealth.com',
            MCK: 'mckesson.com', CAH: 'cardinalhealth.com', ABC: 'amerisourcebergen.com',
            HCA: 'hcahealthcare.com', THC: 'tenethealth.com', AAON: 'aaon.com',
            ACCD: 'accolade.com', ONEM: 'onemedical.com', DOCS: 'doximity.com',
            HIMS: 'hims.com', TXG: '10xgenomics.com', PACB: 'pacificbiosciences.com',
            ILMN: 'illumina.com', NVST: 'envistaco.com', BIO: 'bio-rad.com',
            TMO: 'thermofisher.com', DHR: 'danaher.com', A: 'agilent.com',
            IDXX: 'idexx.com', NEOG: 'neogen.com', WAT: 'waters.com',
            RGEN: 'repligen.com', AZTA: 'azenta.com', ENTG: 'entegris.com',
            // Consumer & Retail
            AMZN: 'amazon.com', WMT: 'walmart.com', TGT: 'target.com', COST: 'costco.com',
            HD: 'homedepot.com', LOW: 'lowes.com', BBY: 'bestbuy.com',
            KR: 'kroger.com', ACI: 'albertsons.com', SFM: 'sprouts.com',
            DLTR: 'dollartree.com', DG: 'dollargeneral.com', FIVE: 'fivebelow.com',
            ETSY: 'etsy.com', EBAY: 'ebay.com', WISH: 'wish.com', POSH: 'poshmark.com',
            W: 'wayfair.com', RH: 'rh.com', WSM: 'williams-sonoma.com',
            NKE: 'nike.com', LULU: 'lululemon.com', UAA: 'underarmour.com', VF: 'vfc.com',
            HBI: 'hanesbrands.com', PVH: 'pvh.com', RL: 'ralphlauren.com', TPR: 'tapestry.com',
            CPRI: 'capriholdings.com', LVMUY: 'lvmh.com', KER: 'kering.com',
            SBUX: 'starbucks.com', MCD: 'mcdonalds.com', YUM: 'yum.com', QSR: 'rbi.com',
            CMG: 'chipotle.com', WING: 'wingstop.com', SHAK: 'shakeshack.com', BROS: 'dutchbros.com',
            DPZ: 'dominos.com', PZZA: 'papajohns.com', JACK: 'jackinthebox.com',
            DRI: 'darden.com', EAT: 'brinker.com', TXRH: 'texasroadhouse.com',
            NFLX: 'netflix.com', DIS: 'disney.com', PARA: 'paramount.com', WBD: 'wbd.com',
            FOXA: 'foxcorporation.com', CMCSA: 'comcast.com', CHTR: 'charter.com',
            ATUS: 'alticeusa.com', LBRDA: 'libertybroadband.com',
            SPOT: 'spotify.com', SIRI: 'siriusxm.com', IACI: 'iac.com',
            TRIP: 'tripadvisor.com', BKNG: 'booking.com', EXPE: 'expedia.com',
            ABNB: 'airbnb.com', LYFT: 'lyft.com', UBER: 'uber.com', GRAB: 'grab.com',
            DASH: 'doordash.com', CART: 'instacart.com',
            MAR: 'marriott.com', HLT: 'hilton.com', H: 'hyatt.com', IHG: 'ihg.com',
            MGM: 'mgmresorts.com', WYNN: 'wynnresorts.com', LVS: 'sands.com', CZR: 'caesars.com',
            // Industrials & Energy
            BA: 'boeing.com', RTX: 'rtx.com', LMT: 'lockheedmartin.com', NOC: 'northropgrumman.com',
            GD: 'gd.com', HII: 'huntingtoningalls.com', HEI: 'heico.com',
            CAT: 'cat.com', DE: 'deere.com', CMI: 'cummins.com', PCAR: 'paccar.com',
            GE: 'ge.com', HON: 'honeywell.com', MMM: '3m.com', EMR: 'emerson.com',
            ROK: 'rockwellautomation.com', ABB: 'abb.com', SIEGY: 'siemens.com',
            XOM: 'exxonmobil.com', CVX: 'chevron.com', COP: 'conocophillips.com',
            EOG: 'eogresources.com', PXD: 'pioneernaturalresources.com', DVN: 'devonenergy.com',
            FANG: 'diamondbackenergy.com', MRO: 'marathonoil.com', APA: 'apacorp.com',
            SLB: 'slb.com', HAL: 'halliburton.com', BKR: 'bakerhughes.com',
            OKE: 'oneok.com', WMB: 'williams.com', KMI: 'kindermorgan.com', EPD: 'epd.com',
            NEE: 'nexteraenergy.com', DUK: 'duke-energy.com', SO: 'southerncompany.com',
            D: 'dominionenergy.com', AEP: 'aep.com', EXC: 'exeloncorp.com',
            ENPH: 'enphase.com', SEDG: 'solaredge.com', FSLR: 'firstsolar.com',
            RUN: 'sunrun.com', SPWR: 'sunpower.com', NOVA: 'sunnova.com',
            PLUG: 'plugpower.com', BE: 'bloomenergy.com', BLDP: 'ballard.com',
            // Communication & Telecom
            T: 'att.com', VZ: 'verizon.com', TMUS: 't-mobile.com',
            LUMN: 'lumen.com', FYBR: 'frontier.com', CABO: 'cableone.com',
            RDDT: 'reddit.com', SNAP: 'snap.com', PINS: 'pinterest.com',
            TWTR: 'twitter.com', BMBL: 'bumble.com', MTCH: 'match.com',
            // REITs & Real Estate
            AMT: 'americantower.com', CCI: 'crowncastle.com', SBAC: 'sbasite.com',
            PLD: 'prologis.com', DLR: 'digitalrealty.com', EQIX: 'equinix.com',
            O: 'realtyincome.com', SPG: 'simon.com', MAC: 'macerich.com',
            PSA: 'publicstorage.com', EXR: 'extraspace.com', NSA: 'nationalstorageaffiliates.com',
            WELL: 'welltower.com', VTR: 'ventas.com', PEAK: 'healthpeak.com',
            // Small/Mid-cap and others in the app
            ASML: 'asml.com', NU: 'nu.com.br', RIVN: 'rivian.com', LCID: 'lucidmotors.com',
            FSR: 'fiskerinc.com', GOEV: 'canooev.com',
            PLTR: 'palantir.com', AI: 'c3.ai', BBAI: 'bigbear.ai',
            RKLB: 'rocketlabusa.com', ASTR: 'astra.com', SPCE: 'virgingalactic.com',
            IONQ: 'ionq.com', RGTI: 'rigetticomputing.com', QUBT: 'quantumcomputing.com',
            SMCI: 'supermicro.com', NTAP: 'netapp.com', PSTG: 'purestorage.com',
            WDC: 'westerndigital.com', STX: 'seagate.com', NTNX: 'nutanix.com',
            RGEN: 'repligen.com', AZTA: 'azenta.com',
        };

        async function fetchLogo(ticker) {
            if (logoCache[ticker] !== undefined) return logoCache[ticker];
            try {
                const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`);
                const data = await res.json();
                logoCache[ticker] = data?.logo || '';
            } catch (_) {
                logoCache[ticker] = '';
            }
            return logoCache[ticker];
        }

        // Fetch logos one at a time with a 250ms gap to stay under Finnhub rate limits.
        async function fetchLogosSequentially(tickers) {
            for (const ticker of tickers) {
                if (logoCache[ticker] !== undefined) continue;
                await fetchLogo(ticker);
                await new Promise(r => setTimeout(r, 250));
            }
        }

        /**
         * Inject a company logo into a card element using the Finnhub logo URL
         * stored in logoCache. Falls back to the colored ticker pill if no URL
         * is available or the image fails to load — no broken image icons ever.
         */
        function injectLogo(imgEl, fallbackEl, ticker) {
            const logoUrl = logoCache[ticker];
            if (!logoUrl) { imgEl.style.display = 'none'; fallbackEl.style.display = ''; return; }
            imgEl.src = logoUrl;
            imgEl.onerror = () => { imgEl.style.display = 'none'; fallbackEl.style.display = ''; };
            imgEl.style.display = 'block';
            fallbackEl.style.display = 'none';
        }

        async function loadSeenTickers() {
            if (!currentUser || isGuest) return;
            try {
                // Check batch timestamp from user_profiles
                const { data: prof } = await supabaseClient
                    .from('user_profiles')
                    .select('batch_created_at')
                    .eq('user_id', currentUser.id)
                    .maybeSingle();

                const now = Date.now();
                const batchCreatedAt = prof?.batch_created_at ? new Date(prof.batch_created_at).getTime() : null;
                const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

                if (!batchCreatedAt) {
                    // No batch yet — stamp it now, start fresh
                    await supabaseClient.from('user_profiles')
                        .update({ batch_created_at: new Date().toISOString() })
                        .eq('user_id', currentUser.id);
                    // seenTickers stays empty — fresh 7
                } else if (now - batchCreatedAt > TWENTY_FOUR_HOURS) {
                    // Batch expired — delete passed seen_stocks and reset timer
                    await supabaseClient.from('seen_stocks')
                        .delete()
                        .eq('user_id', currentUser.id)
                        .eq('action', 'passed');
                    await supabaseClient.from('user_profiles')
                        .update({ batch_created_at: new Date().toISOString() })
                        .eq('user_id', currentUser.id);
                    // seenTickers stays empty — fresh 7
                } else {
                    // Batch still active — load only PASSED stocks (saved stocks
                    // are excluded from the feed via savedSet but don't consume daily slots)
                    const { data: seen } = await supabaseClient
                        .from('seen_stocks')
                        .select('ticker')
                        .eq('user_id', currentUser.id)
                        .eq('action', 'passed');
                    console.log('SEEN_STOCKS on refresh:', (seen || []).length, (seen || []).map(r => r.ticker));
                    (seen || []).forEach(r => seenTickers.add(r.ticker));
                }

                // Always load saved tickers separately — never affected by 24hr reset
                const { data: saved } = await supabaseClient
                    .from('saved_stocks')
                    .select('ticker')
                    .eq('user_id', currentUser.id);
                window._savedTickerSet = new Set((saved || []).map(r => r.ticker));

            } catch (e) {
                console.error('loadSeenTickers error:', e);
            }
        }


        // ─── Auth Functions ────────────────────────────────────────────────────────
        // IMPORTANT: Run in Supabase SQL editor:
        //   CREATE TABLE user_profiles (user_id text PRIMARY KEY, categories jsonb, experience text, horizon text, risk text, username text UNIQUE);
        //   CREATE TABLE saved_stocks (id serial PRIMARY KEY, user_id text, ticker text, saved_at timestamptz DEFAULT now(), UNIQUE(user_id, ticker));
        //   ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
        //
        // IMPORTANT: Supabase Dashboard → Authentication → Email → disable "Enable email confirmations"
        //
        // IMPORTANT: Supabase Dashboard → Authentication → URL Configuration:
        //   Site URL: http://localhost:8080
        //   Redirect URLs: http://localhost:8080 (add your production URL too)

        function showAuthScreen() {
            document.getElementById('splash-screen').style.opacity = '0';
            document.getElementById('splash-screen').style.pointerEvents = 'none';
            const auth = document.getElementById('auth-screen');
            auth.style.display = 'flex';
            auth.style.opacity = '1';
            auth.style.pointerEvents = 'auto';
        }

        function hideAuthScreen() {
            const auth = document.getElementById('auth-screen');
            auth.style.opacity = '0';
            auth.style.pointerEvents = 'none';
        }

        function cleanupAuthScreens() {
            ['auth-screen', 'username-screen'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.display = 'none';
                    el.style.pointerEvents = 'none';
                    el.style.opacity = '0';
                }
            });
            const loader = document.getElementById('app-loader');
            if (loader) loader.style.display = 'none';
        }

        function showQuiz() {
            hideAuthScreen();
            hideUsernameScreen();
            document.getElementById('feed').classList.remove('active');
            document.getElementById('app-nav').classList.remove('active');
            cleanupAuthScreens();
            setTimeout(() => {
                document.getElementById('quiz').classList.add('active');
                document.getElementById('quiz-footer').classList.add('active');
                const btnNext = document.getElementById('btn-next');
                if (btnNext) { btnNext.style.pointerEvents = ''; btnNext.style.display = ''; }
                updateBtnState();
            }, 300);
        }

        function validateUsername(u) {
            return u.length >= 3 && /^[a-zA-Z0-9_]+$/.test(u);
        }

        // IMPORTANT: redirectTo must match a URL in Supabase → Auth → Redirect URLs
        async function signInWithGoogle() {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + window.location.pathname }
            });
            if (error) console.error('Google sign-in error:', error.message);
        }

        let _emailAuthMode = 'signin'; // 'signin' | 'signup'

        function toggleAuthMode() {
            _emailAuthMode = _emailAuthMode === 'signin' ? 'signup' : 'signin';
            const isSignUp = _emailAuthMode === 'signup';
            document.getElementById('auth-confirm-password').style.display = isSignUp ? '' : 'none';
            document.getElementById('auth-email-btn').textContent = isSignUp ? 'Create Account' : 'Sign In';
            document.getElementById('auth-mode-label').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
            document.getElementById('auth-mode-toggle').textContent = isSignUp ? 'Sign In' : 'Sign Up';
        }

        async function handleEmailAuth() {
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;
            const confirmPassword = document.getElementById('auth-confirm-password').value;

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showToast('Please enter a valid email address.'); return;
            }
            if (password.length < 6) {
                showToast('Password must be at least 6 characters.'); return;
            }
            if (_emailAuthMode === 'signup' && password !== confirmPassword) {
                showToast('Passwords do not match.'); return;
            }

            const btn = document.getElementById('auth-email-btn');
            btn.textContent = 'Please wait…';
            btn.disabled = true;

            if (_emailAuthMode === 'signup') {
                const { error } = await supabaseClient.auth.signUp({ email, password });
                if (error) {
                    showToast(error.message);
                } else {
                    document.getElementById('email-auth-form').style.display = 'none';
                    document.getElementById('email-confirm-text').textContent =
                        `We sent a confirmation link to ${email}. Click it to activate your account, then come back and sign in.`;
                    document.getElementById('email-confirm-sent').style.display = '';
                }
            } else {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    showToast(error.message === 'Email not confirmed'
                        ? 'Please confirm your email first — check your inbox.'
                        : error.message);
                }
                // On success, onAuthStateChange handles everything
            }

            btn.textContent = _emailAuthMode === 'signup' ? 'Create Account' : 'Sign In';
            btn.disabled = false;
        }

        function continueAsGuest() {
            isGuest = true;
            hideAuthScreen();
            showQuiz();
        }

        // Central profile loader — called after any successful sign-in or session restore
        async function loadUserProfile(userId, isReturning = false) {
            const { data: saved } = await supabaseClient
                .from('saved_stocks').select('ticker')
                .eq('user_id', userId).order('saved_at', { ascending: true });
            window._savedTickers = saved || [];

            const { data: profile } = await supabaseClient
                .from('user_profiles').select('*')
                .eq('user_id', userId).maybeSingle();

            if (profile) {
                userProfile = {
                    categories: profile.categories || [],
                    experience: profile.experience || 'learning',
                    horizon: profile.horizon || 'medium',
                    risk: profile.risk || 'balanced',
                    knownStocks: profile.known_stocks || [],
                };
                userInterests = userProfile.categories;
                window._username = profile.username || null;

                cleanupAuthScreens();
                if (isReturning) {
                    showLogoSplit(() => initFeed());
                } else {
                    initFeed();
                }
                return;
            }

            // No quiz profile yet — OAuth users pick a username first
            const isOAuth = currentUser?.app_metadata?.provider !== 'email';
            if (isOAuth) {
                showUsernameScreen();
            } else {
                showQuiz();
            }
        }

        // Keep for backward compat (called from sign-up path above)
        async function handleAuthSuccess(isReturning) {
            if (currentUser) await loadUserProfile(currentUser.id, isReturning);
        }

        function showUsernameScreen() {
            cleanupAuthScreens();
            const s = document.getElementById('username-screen');
            s.style.display = 'flex';
            s.style.opacity = '1';
            s.style.pointerEvents = 'auto';
        }

        function hideUsernameScreen() {
            const s = document.getElementById('username-screen');
            s.style.opacity = '0';
            s.style.pointerEvents = 'none';
        }

        async function submitUsername() {
            const val = document.getElementById('pick-username').value.trim();
            const errEl = document.getElementById('pick-username-error');
            errEl.textContent = '';

            if (!_termsAccepted) {
                errEl.textContent = 'Please agree to the Terms & Conditions to continue.';
                return;
            }

            if (!validateUsername(val)) {
                errEl.textContent = 'At least 3 characters — letters, numbers, and underscores only.';
                return;
            }

            const { error } = await supabaseClient.from('user_profiles')
                .upsert({ user_id: currentUser.id, username: val });
            if (error) { errEl.textContent = error.message; return; }

            window._username = val;
            hideUsernameScreen();
            showQuiz();
        }

        function showLogoSplit(callback) {
            const screen = document.getElementById('logo-split-screen');
            const left = document.getElementById('logo-split-left');
            const right = document.getElementById('logo-split-right');

            // Reset panels to closed position
            left.style.transform = '';
            right.style.transform = '';
            left.style.transition = 'none';
            right.style.transition = 'none';

            // Add a bubbly STOCKSWYPE wordmark in the center of the green screen
            let wordmark = document.getElementById('logo-split-word');
            if (!wordmark) {
                wordmark = document.createElement('div');
                wordmark.id = 'logo-split-word';
                wordmark.textContent = 'StockSwype';
                wordmark.style.cssText = `
                    position: absolute;
                    z-index: 10;
                    font-family: 'DM Mono', monospace;
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 3.5px;
                    text-transform: uppercase;
                    background: linear-gradient(130deg, #00C853, #69F0AE 55%, #00BFA5);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    transform: scale(0.7);
                    opacity: 0;
                    transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
                `;
                screen.appendChild(wordmark);
            }

            // Fade in the green screen
            screen.style.opacity = '0';
            screen.style.transition = 'opacity 0.35s ease';
            screen.style.display = 'flex';

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    screen.style.opacity = '1';

                    const arrow = document.getElementById('logo-split-arrow');
                    if (arrow) {
                        arrow.style.opacity = '1';
                        arrow.style.transform = 'translateY(0)';
                    }

                    // Pop the wordmark in with a bubbly spring
                    setTimeout(() => {
                        wordmark.style.transform = 'scale(1)';
                        wordmark.style.opacity = '1';
                    }, 150);

                    // After wordmark settles, split the panels apart
                    setTimeout(() => {
                        wordmark.style.transform = 'scale(1.08)';
                        wordmark.style.opacity = '0';
                        const arrowEl = document.getElementById('logo-split-arrow');
                        if (arrowEl) { arrowEl.style.stroke = '#000'; arrowEl.style.opacity = '0'; }
                        left.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)';
                        right.style.transition = 'transform 0.55s cubic-bezier(0.76,0,0.24,1)';
                        left.style.transform = 'translateX(-100%)';
                        right.style.transform = 'translateX(100%)';

                        setTimeout(() => {
                            screen.style.display = 'none';
                            screen.style.opacity = '';
                            screen.style.transition = '';
                            left.style.transform = '';
                            right.style.transform = '';
                            wordmark.style.transform = 'scale(0.7)';
                            wordmark.style.opacity = '0';
                            if (arrow) {
                                arrow.style.opacity = '0';
                                arrow.style.transform = 'translateY(18px)';
                            }
                            if (arrowEl) { arrowEl.style.stroke = '#fff'; arrowEl.style.opacity = '1'; }
                            if (callback) callback();
                        }, 600);
                    }, 700);
                });
            });
        }

        async function signOut() {
            await supabaseClient.auth.signOut();
            currentUser = null;
            isGuest = false;
            userProfile = null;
            savedStocks = [];
            userInterests = [];
            splashShown = false;
            window._username = null;
            window._feedInitialized = false;
            window._friendshipSubscribed = false;
            deck = [];

            document.getElementById('saved-count').innerText = '0';

            // Clear all inline styles set by initFeed so CSS takes over cleanly
            ['feed', 'watchlist', 'news-scene', 'friends-scene', 'profile-scene'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('active');
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                    el.style.zIndex = '';
                }
            });
            const nav = document.getElementById('app-nav');
            nav.classList.remove('active');
            nav.style.pointerEvents = '';

            // Index cards row cleanup
            if (window._indexRefreshInterval) { clearInterval(window._indexRefreshInterval); window._indexRefreshInterval = null; }
            const indexRow = document.getElementById('index-cards-row');
            if (indexRow) indexRow.style.display = 'none';

            // Card stack cleanup
            const cardStack = document.getElementById('card-stack');
            if (cardStack) cardStack.innerHTML = '';

            // Show splash screen (Get Started with scrolling cards)
            const auth = document.getElementById('auth-screen');
            auth.style.opacity = '0';
            auth.style.pointerEvents = 'none';
            auth.style.display = 'none';
            const splash = document.getElementById('splash-screen');
            splash.style.opacity = '1';
            splash.style.pointerEvents = 'auto';

            _termsAccepted = false;
            const box = document.getElementById('terms-checkbox');
            const btn = document.getElementById('username-continue-btn');
            const row = document.getElementById('terms-checkbox-row');
            if (box) { box.style.background = ''; box.style.borderColor = '#ccc'; box.innerHTML = ''; }
            if (btn) { btn.style.background = '#ccc'; btn.style.cursor = 'not-allowed'; }
            if (row) { row.style.borderColor = '#eee'; row.style.background = '#f8f8f8'; }
        }

        function retakeQuiz() {
            // Reset state
            userProfile = null;
            userInterests = [];
            currentStep = 1;
            window._feedInitialized = false;
            deck = [];

            // Hide loading screen
            const loading = document.getElementById('loading');
            if (loading) { loading.classList.remove('active'); loading.style.display = 'none'; setTimeout(() => { loading.style.display = ''; }, 50); }

            // Hide all scenes — clear BOTH classes AND inline styles set by initFeed
            ['feed', 'watchlist', 'news-scene', 'friends-scene', 'profile-scene'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('active');
                    el.style.opacity = '';
                    el.style.pointerEvents = '';
                    el.style.zIndex = '';
                }
            });
            const nav = document.getElementById('app-nav');
            nav.classList.remove('active');
            nav.style.pointerEvents = '';
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

            // Index cards row cleanup
            if (window._indexRefreshInterval) { clearInterval(window._indexRefreshInterval); window._indexRefreshInterval = null; }
            const indexRowQ = document.getElementById('index-cards-row');
            if (indexRowQ) indexRowQ.style.display = 'none';

            // Clear card stack
            const cardStack = document.getElementById('card-stack');
            if (cardStack) cardStack.innerHTML = '';

            // Reset quiz to step 1
            document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
            document.getElementById('step-1').classList.add('active');
            document.querySelectorAll('.opt-card').forEach(el => el.classList.remove('selected'));
            updateProgress();
            updateBtnState();

            // Show quiz above everything
            document.getElementById('quiz').classList.add('active');
            document.getElementById('quiz-footer').classList.add('active');
        }

        // ─── App Init ─────────────────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', async () => {
            const appLoader = document.getElementById('app-loader');
            let sessionHandledByInit = false;

            try {
                // 1. Check session FIRST — source of truth on refresh/reopen
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                if (error) throw error;

                if (session) {
                    // Returning logged-in user — green animation → feed
                    sessionHandledByInit = true;
                    currentUser = session.user;
                    window._feedInitialized = false;
                    await loadUserProfile(session.user.id, true);
                } else {
                    // No session — show splash screen
                    appLoader.style.display = 'none';
                    const splash = document.getElementById('splash-screen');
                    splash.style.opacity = '1';
                    splash.style.pointerEvents = 'auto';
                }

                // 2. Listener set up AFTER getSession — only handles new sign-ins/outs
                supabaseClient.auth.onAuthStateChange(async (event, sess) => {
                    if (event === 'SIGNED_IN' && sess) {
                        if (sessionHandledByInit) { sessionHandledByInit = false; return; }
                        if (currentUser && currentUser.id === sess.user.id) return;
                        currentUser = sess.user;
                        window._feedInitialized = false;
                        cleanupAuthScreens();
                        await loadUserProfile(sess.user.id, false);
                    }
                    if (event === 'SIGNED_OUT') {
                        // SIGNED_OUT is handled by signOut() directly — ignore here
                    }
                });

            } catch (err) {
                console.error('Init error:', err);
                appLoader.style.display = 'none';
                const splash = document.getElementById('splash-screen');
                splash.style.opacity = '1';
                splash.style.pointerEvents = 'auto';
            }
        });

        function openDeleteModal() {
            const modal = document.getElementById('delete-modal');
            document.getElementById('delete-step-1').style.display = 'block';
            document.getElementById('delete-step-2').style.display = 'none';
            modal.style.display = 'flex';
        }

        function closeDeleteModal() {
            document.getElementById('delete-modal').style.display = 'none';
        }

        function deleteStep2() {
            document.getElementById('delete-step-1').style.display = 'none';
            document.getElementById('delete-step-2').style.display = 'block';
        }

        async function confirmDeleteAccount() {
            const btn = document.getElementById('delete-confirm-btn');
            btn.textContent = 'Deleting...';
            btn.disabled = true;
            btn.style.opacity = '0.7';
            try {
                const { data: { user } } = await supabaseClient.auth.getUser();
                if (!user) throw new Error('No user found');
                const uid = user.id;
                await supabaseClient.from('user_profiles').delete().eq('user_id', uid);
                await supabaseClient.from('saved_stocks').delete().eq('user_id', uid);
                await supabaseClient.from('seen_stocks').delete().eq('user_id', uid);
                await supabaseClient.from('messages').delete().or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
                await supabaseClient.from('friendships').delete().or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
                closeDeleteModal();
                await signOut();
                showToast('Account deleted.');
            } catch (e) {
                console.error('Delete error:', e);
                btn.textContent = 'Yes, delete my account';
                btn.disabled = false;
                btn.style.opacity = '1';
                showToast('Something went wrong. Try again.');
            }
        }
