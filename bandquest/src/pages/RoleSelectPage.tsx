import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

export default function RoleSelectPage() {
  const { user, setUser } = useAuthStore();
  const { character } = useGameStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // If already has character, redirect
  if (character) {
    if (character.bootCampComplete) navigate('/hub');
    else navigate('/boot-camp');
    return null;
  }

  if (!user) {
    navigate('/');
    return null;
  }

  async function selectRole(role: 'teacher' | 'student') {
    if (!user) return;
    setSaving(true);

    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      role,
    });

    setUser({ ...user, role });

    if (role === 'teacher') {
      navigate('/dashboard');
    } else {
      navigate('/class-select');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-3">
          Welcome, {user.displayName}
        </div>
        <h1 className="fantasy-title text-3xl mb-2">Who are you?</h1>
        <p className="text-academy-cream/60 text-sm">
          This determines your role in Symphonica.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        <button
          onClick={() => selectRole('student')}
          disabled={saving}
          className="flex-1 card-panel hover:border-academy-gold/60 transition-all duration-200 cursor-pointer text-center group"
        >
          <div className="text-4xl mb-3">🎓</div>
          <div className="fantasy-title text-lg mb-2">Student</div>
          <p className="text-academy-cream/60 text-xs">
            Join your class and begin your musical adventure at Harmonia Academy.
          </p>
          <div className="mt-4 text-academy-gold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Enter as Student →
          </div>
        </button>

        <button
          onClick={() => selectRole('teacher')}
          disabled={saving}
          className="flex-1 card-panel hover:border-academy-gold/60 transition-all duration-200 cursor-pointer text-center group"
        >
          <div className="text-4xl mb-3">🎼</div>
          <div className="fantasy-title text-lg mb-2">Teacher</div>
          <p className="text-academy-cream/60 text-xs">
            Create and manage your classroom, oversee student progress, and guide the Symphony.
          </p>
          <div className="mt-4 text-academy-gold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
            Enter as Teacher →
          </div>
        </button>
      </div>

      {saving && (
        <div className="mt-8 flex items-center gap-2 text-academy-gold/60">
          <div className="w-4 h-4 border-2 border-academy-gold/40 border-t-academy-gold rounded-full animate-spin" />
          <span className="text-sm">Enrolling…</span>
        </div>
      )}
    </div>
  );
}
