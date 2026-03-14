import { supabase } from '../../lib/supabase';

export default function AuthScreen({ onBack }) {
  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) console.error('Google sign-in error:', error.message);
  }

  return (
    <div
      id="auth-screen"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#fff',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '80px',
        paddingLeft: '24px',
        paddingRight: '24px',
        paddingBottom: '32px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              background: 'linear-gradient(130deg, #00C853, #69F0AE 55%, #00BFA5)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              WebkitTextStroke: '0.5px rgba(0,0,0,0.6)',
            }}
          >
            StockSwype
          </span>
        </div>

        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '26px',
            fontWeight: 700,
            color: '#0a0a0a',
            textAlign: 'center',
            marginBottom: '6px',
            lineHeight: 1.25,
          }}
        >
          Invest smarter,<br />starting now.
        </div>

        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '15px',
            color: '#888',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          Discover stocks you'll actually love.
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#fff',
            border: '1.5px solid #ddd',
            borderRadius: '12px',
            padding: '14px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '15px',
            fontWeight: 600,
            color: '#0a0a0a',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          {/* Google SVG */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Back link */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              color: '#aaa',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            ← Back
          </button>
        )}

        {/* Disclaimer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '32px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '11px',
            color: '#bbb',
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '300px',
          }}
        >
          StockSwype is for informational purposes only and does not constitute financial,
          investment, or legal advice. Always do your own research before making any
          investment decisions.
        </div>
      </div>
    </div>
  );
}
