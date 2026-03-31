'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const inputStyle = {
  width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '12px 14px', color: '#f1f5f9', fontSize: 15,
  fontFamily: "'Barlow', sans-serif", outline: 'none',
};

const labelStyle = {
  fontSize: 10, letterSpacing: 3, color: '#64748b',
  fontFamily: "'Barlow', sans-serif", display: 'block', marginBottom: 8,
};

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUp, setSignedUp] = useState(false);
  const [message, setMessage] = useState('');

  // If user chose not to be remembered, sign out when tab closes
  useEffect(() => {
    if (!rememberMe) {
      const handler = () => supabase.auth.signOut();
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [rememberMe]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const isRecoveryLink = params.get('mode') === 'reset' || hashParams.has('access_token');

    if (isRecoveryLink) {
      setMode('reset');
      setError('');
      setMessage('Choose a new password for your account.');
      setSignedUp(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setError('');
        setMessage('Choose a new password for your account.');
        setSignedUp(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && user && mode !== 'reset') {
      router.replace('/');
    }
  }, [authLoading, mode, router, user]);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
    setSignedUp(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if ((mode === 'signup' || mode === 'reset') && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if ((mode === 'signup' || mode === 'reset' || mode === 'signin') && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    if (mode === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.session || data.user) {
        router.replace('/');
        router.refresh();
      } else {
        setError('Sign-in did not create a session. Check your Supabase email confirmation settings.');
      }
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace('/');
      } else {
        setSignedUp(true);
        setMessage('Check your email to confirm your account, then come back and sign in.');
      }
    } else if (mode === 'forgot') {
      const redirectTo = `${window.location.origin}/login?mode=reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) setError(error.message);
      else {
        setMessage('If that email exists, a password reset link has been sent.');
        setPassword('');
        setConfirmPassword('');
      }
    } else {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setMessage('Password updated. Redirecting to your dashboard...');
        setTimeout(() => router.replace('/'), 600);
      }
    }

    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,900;1,700&family=Barlow:wght@400;500&display=swap');
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px #0d0d0d inset !important; -webkit-text-fill-color: #f1f5f9 !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#475569', fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>
            WELCOME TO
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 900, fontStyle: 'italic', color: '#fff', letterSpacing: -1, lineHeight: 0.9 }}>
            TRAINING<br />HUB
          </h1>
          <p style={{ fontSize: 13, color: '#475569', fontFamily: "'Barlow', sans-serif", marginTop: 12, letterSpacing: 2 }}>
            TRACK · TRAIN · PROGRESS
          </p>
        </div>

        {/* Tab switcher */}
        {(mode === 'signin' || mode === 'signup') && (
          <div style={{ display: 'flex', marginBottom: 0, background: '#111', borderRadius: '10px 10px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '14px', background: 'none', border: 'none',
                  borderBottom: mode === m ? '2px solid #3b82f6' : '2px solid transparent',
                  color: mode === m ? '#f1f5f9' : '#475569',
                  fontSize: 12, fontWeight: 900, letterSpacing: 2, cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", transition: 'color 0.15s',
                }}
              >
                {m === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            ))}
          </div>
        )}

        <div style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: mode === 'signin' || mode === 'signup' ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: mode === 'signin' || mode === 'signup' ? '0 0 12px 12px' : '12px',
          padding: '28px 28px 24px',
        }}>
          {signedUp ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981', letterSpacing: 2, marginBottom: 10 }}>ACCOUNT CREATED</div>
              <div style={{ fontSize: 13, color: '#64748b', fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
                {message}
              </div>
              <button
                onClick={() => switchMode('signin')}
                style={{ marginTop: 20, background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", letterSpacing: 2, fontWeight: 700 }}
              >
                BACK TO SIGN IN
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {(mode === 'forgot' || mode === 'reset') && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 8 }}>
                    {mode === 'forgot' ? 'PASSWORD RESET' : 'SET NEW PASSWORD'}
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: "'Barlow', sans-serif", lineHeight: 1.6 }}>
                    {mode === 'forgot'
                      ? 'Enter the email address for your account and we will send you a reset link.'
                      : 'Your reset link has been accepted. Enter a new password below.'}
                  </div>
                </div>
              )}

              {/* Email */}
              {mode !== 'reset' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>EMAIL ADDRESS</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required autoComplete="email"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              )}

              {/* Password */}
              {mode !== 'forgot' && (
                <div style={{ marginBottom: mode === 'signup' || mode === 'reset' ? 16 : 12 }}>
                  <label style={labelStyle}>{mode === 'reset' ? 'NEW PASSWORD' : 'PASSWORD'}</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              )}

              {/* Confirm password (sign up only) */}
              {(mode === 'signup' || mode === 'reset') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>CONFIRM PASSWORD</label>
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="new-password"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>
              )}

              {/* Remember me (sign in only) */}
              {mode === 'signin' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div
                      onClick={() => setRememberMe(r => !r)}
                      style={{
                        width: 18, height: 18, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                        background: rememberMe ? '#3b82f6' : 'transparent',
                        border: `2px solid ${rememberMe ? '#3b82f6' : '#334155'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {rememberMe && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span
                      onClick={() => setRememberMe(r => !r)}
                      style={{ fontSize: 12, color: '#64748b', fontFamily: "'Barlow', sans-serif", cursor: 'pointer', userSelect: 'none' }}
                    >
                      Remember me
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={{
                      marginBottom: 20, padding: 0, background: 'none', border: 'none',
                      color: '#3b82f6', fontSize: 12, cursor: 'pointer',
                      fontFamily: "'Barlow', sans-serif", letterSpacing: 1,
                    }}
                  >
                    Forgot password?
                  </button>
                </>
              )}

              {message && !signedUp && (
                <div style={{ fontSize: 12, color: '#93c5fd', fontFamily: "'Barlow', sans-serif", marginBottom: 14, lineHeight: 1.4 }}>
                  {message}
                </div>
              )}

              {error && (
                <div style={{ fontSize: 12, color: '#f87171', fontFamily: "'Barlow', sans-serif", marginBottom: 14, lineHeight: 1.4 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  background: loading ? '#1e293b' : '#3b82f6',
                  border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 900,
                  color: loading ? '#475569' : '#fff', letterSpacing: 2,
                  cursor: loading ? 'default' : 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif", transition: 'background 0.2s',
                }}
              >
                {loading
                  ? 'PLEASE WAIT...'
                  : mode === 'signin'
                    ? 'SIGN IN →'
                    : mode === 'signup'
                      ? 'CREATE ACCOUNT →'
                      : mode === 'forgot'
                        ? 'SEND RESET LINK →'
                        : 'UPDATE PASSWORD →'}
              </button>

              {(mode === 'forgot' || mode === 'reset') && (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  style={{
                    marginTop: 16, width: '100%', padding: '12px',
                    background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: 2,
                    color: '#94a3b8', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif",
                  }}
                >
                  BACK TO SIGN IN
                </button>
              )}
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#1e293b', fontFamily: "'Barlow', sans-serif", letterSpacing: 1 }}>
          YOUR DATA SYNCS ACROSS ALL YOUR DEVICES
        </div>
      </div>
    </div>
  );
}
