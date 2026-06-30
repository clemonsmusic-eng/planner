import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import DemoModeToggle from '../components/DemoModeToggle';

export default function LandingPage() {
  const { user, loading, signInWithGoogle, signInWithMagicLink, signInWithPassword, signUpWithPassword } = useAuthStore();
  const { character, loadGuestCharacter } = useGameStore();
  const { guest, setGuest } = useUiStore();
  const navigate = useNavigate();

  function playAsGuest() {
    setGuest(true);
    const had = loadGuestCharacter();
    navigate(had ? '/hub' : '/instrument-select');
  }
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [sendingLink, setSendingLink] = useState(false);

  // Email + password
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState<string | null>(null);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setPwBusy(true); setPwError(null); setPwNotice(null);
    const { error } = await signInWithPassword(email.trim(), password);
    setPwBusy(false);
    if (error) setPwError(error);
    // success → onAuthStateChange handles redirect
  }

  async function handlePasswordSignUp() {
    if (!email.trim() || !password) { setPwError('Enter an email and password first.'); return; }
    if (password.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    setPwBusy(true); setPwError(null); setPwNotice(null);
    const { error, needsConfirm } = await signUpWithPassword(email.trim(), password);
    setPwBusy(false);
    if (error) { setPwError(error); return; }
    if (needsConfirm) {
      setPwNotice('Account created — check your email to confirm, then sign in. (Or disable "Confirm email" in Supabase to skip this.)');
    } else {
      setPwNotice('Account created! Signing you in…');
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSendingLink(true);
    setMagicLinkError(null);
    const { error } = await signInWithMagicLink(email.trim());
    setSendingLink(false);
    if (error) {
      setMagicLinkError(error);
    } else {
      setMagicLinkSent(true);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (character) {
        navigate(character.bootCampComplete ? '/hub' : '/boot-camp');
      } else {
        navigate('/role-select');
      }
    } else if (guest && character) {
      // Returning guest with a saved character
      navigate(character.bootCampComplete ? '/hub' : '/instrument-select');
    }
  }, [user, loading, character, navigate, guest]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background musical notes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['♩', '♪', '♫', '♬', '𝄞', '𝄢'].map((note, i) => (
          <span
            key={i}
            className="absolute text-academy-gold/10 text-6xl animate-float select-none"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.4}s`,
            }}
          >
            {note}
          </span>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Crest / Title */}
        <div className="mb-2 text-academy-gold/60 text-sm tracking-[0.4em] uppercase font-fantasy">
          Welcome to
        </div>

        <h1 className="font-fantasy text-5xl sm:text-6xl font-black text-academy-gold mb-1 text-shadow-glow leading-tight">
          Band Quest
        </h1>
        <h2 className="font-fantasy text-2xl sm:text-3xl text-amber-300/80 mb-8 tracking-widest">
          Symphonica
        </h2>

        {/* Decorative line */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-academy-gold/40" />
          <span className="text-academy-gold text-xl">𝄞</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-academy-gold/40" />
        </div>

        <p className="text-academy-cream/70 text-base mb-10 leading-relaxed">
          Master your instrument. Defeat Twisted Melodies.
          <br />
          Restore the Grand Symphony.
        </p>

        {loading ? (
          <div className="flex items-center justify-center gap-3 text-academy-gold/60">
            <div className="w-5 h-5 border-2 border-academy-gold/40 border-t-academy-gold rounded-full animate-spin" />
            <span className="font-body text-sm">Loading…</span>
          </div>
        ) : magicLinkSent ? (
          <div className="card-panel py-6 px-6 text-center">
            <div className="text-3xl mb-3">📬</div>
            <p className="text-academy-gold font-fantasy text-lg mb-2">Check your email!</p>
            <p className="text-academy-cream/60 text-sm">
              We sent a sign-in link to <span className="text-academy-cream/90">{email}</span>.
              Click the link in that email to enter the Academy.
            </p>
            <button
              onClick={() => { setMagicLinkSent(false); setEmail(''); }}
              className="mt-4 text-academy-cream/40 hover:text-academy-cream/70 text-xs underline transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Play as Guest — no account, no login */}
            <button
              onClick={playAsGuest}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3.5"
            >
              ▶ {guest ? 'Continue as Guest' : 'Play as Guest'}
            </button>
            <p className="text-academy-cream/40 text-xs text-center -mt-1">
              No account needed — your progress saves on this device.
              Pair with <span className="text-academy-gold/70">🎮 Demo Mode</span> below to play with no microphone.
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-academy-gold/20" />
              <span className="text-academy-cream/30 text-xs">or sign in to save to your account</span>
              <div className="flex-1 h-px bg-academy-gold/20" />
            </div>

            {/* Google sign-in */}
            <button
              onClick={signInWithGoogle}
              className="btn-secondary flex items-center gap-3 mx-auto"
            >
              <GoogleIcon />
              Sign in with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-academy-gold/20" />
              <span className="text-academy-cream/30 text-xs">or</span>
              <div className="flex-1 h-px bg-academy-gold/20" />
            </div>

            {mode === 'password' ? (
              /* Email + password */
              <form onSubmit={handlePasswordSignIn} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full bg-academy-dark/60 border border-academy-gold/20 rounded-lg px-4 py-3 text-academy-cream placeholder-academy-cream/30 text-sm focus:outline-none focus:border-academy-gold/50 transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-academy-dark/60 border border-academy-gold/20 rounded-lg px-4 py-3 text-academy-cream placeholder-academy-cream/30 text-sm focus:outline-none focus:border-academy-gold/50 transition-colors"
                />
                {pwError && <p className="text-red-400 text-xs text-center">{pwError}</p>}
                {pwNotice && <p className="text-academy-gold text-xs text-center">{pwNotice}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pwBusy || !email.trim() || !password}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pwBusy ? '…' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordSignUp}
                    disabled={pwBusy || !email.trim() || !password}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Account
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('magic'); setPwError(null); setPwNotice(null); }}
                  className="text-academy-cream/40 hover:text-academy-cream/70 text-xs underline transition-colors"
                >
                  Email me a magic link instead
                </button>
              </form>
            ) : (
              /* Magic link */
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full bg-academy-dark/60 border border-academy-gold/20 rounded-lg px-4 py-3 text-academy-cream placeholder-academy-cream/30 text-sm focus:outline-none focus:border-academy-gold/50 transition-colors"
                />
                {magicLinkError && (
                  <p className="text-red-400 text-xs text-center">{magicLinkError}</p>
                )}
                <button
                  type="submit"
                  disabled={sendingLink || !email.trim()}
                  className="w-full btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingLink ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>✉️ Send Magic Link</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('password'); setMagicLinkError(null); }}
                  className="text-academy-cream/40 hover:text-academy-cream/70 text-xs underline transition-colors"
                >
                  Use email + password instead
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-6 text-academy-cream/40 text-xs">
          Use your school Google account or email to sign in.
        </p>

        <div className="mt-5 flex justify-center">
          <DemoModeToggle />
        </div>
      </div>

      {/* Bottom lore text */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-academy-cream/20 text-xs font-fantasy tracking-widest">
          The Sacred Scores await restoration
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
