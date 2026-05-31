import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function ClassSelectPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function joinClass() {
    if (!user) return;
    const code = joinCode.trim().toUpperCase();
    if (code.length < 7) {
      setError('Enter a valid 7-character join code (e.g. HRM-47X)');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: fetchErr } = await supabase
      .rpc('lookup_classroom_by_code', { p_code: code });

    const classroom = Array.isArray(data) ? data[0] : null;

    if (fetchErr || !classroom) {
      setError('Classroom not found. Check the code with your teacher.');
      setLoading(false);
      return;
    }

    if (classroom.archived) {
      setError('This class has been archived by the teacher.');
      setLoading(false);
      return;
    }

    // Store classroom id in session storage for instrument select
    sessionStorage.setItem('pending_classroom_id', classroom.id);
    sessionStorage.setItem('pending_classroom_name', `${classroom.name}${classroom.period ? ` — ${classroom.period}` : ''}`);
    sessionStorage.setItem('base_instruments_only', String(classroom.base_instruments_only));

    navigate('/instrument-select');
    setLoading(false);
  }

  function formatCode(value: string) {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    if (cleaned.length > 3) {
      return cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }
    return cleaned;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <div className="text-4xl mb-4">🏫</div>
        <h1 className="fantasy-title text-3xl mb-2">Join Your Class</h1>
        <p className="text-academy-cream/60 text-sm">
          Enter the join code your teacher provided.
        </p>
      </div>

      <div className="card-panel w-full max-w-sm">
        <label className="block text-academy-gold/80 text-xs uppercase tracking-widest mb-3 font-fantasy">
          Class Join Code
        </label>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => {
            setJoinCode(formatCode(e.target.value));
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && joinClass()}
          placeholder="HRM-47X"
          maxLength={7}
          className="w-full bg-black/40 border border-academy-gold/30 rounded-lg px-4 py-3 text-center
                     text-academy-cream text-2xl font-fantasy tracking-[0.3em] uppercase
                     focus:outline-none focus:border-academy-gold/80 transition-colors"
        />

        {error && (
          <p className="mt-3 text-rating-poor text-sm text-center">{error}</p>
        )}

        <button
          onClick={joinClass}
          disabled={loading || joinCode.length < 7}
          className="btn-primary w-full mt-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-academy-dark/40 border-t-academy-dark rounded-full animate-spin" />
              Joining…
            </span>
          ) : (
            'Join Class'
          )}
        </button>
      </div>

      <p className="mt-8 text-academy-cream/30 text-xs text-center">
        Don't have a code? Ask your band director.
      </p>
    </div>
  );
}
