import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

export default function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuthStore();
  const { character } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (character) {
        if (character.bootCampComplete) {
          navigate('/hub');
        } else {
          navigate('/boot-camp');
        }
      } else {
        navigate('/role-select');
      }
    }
  }, [user, loading, character, navigate]);

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
        ) : (
          <button
            onClick={signInWithGoogle}
            className="btn-primary flex items-center gap-3 mx-auto"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        )}

        <p className="mt-6 text-academy-cream/40 text-xs">
          Use your school Google account to sign in.
        </p>
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
