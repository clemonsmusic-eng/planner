import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useUiStore } from '../store/uiStore';
import { INSTRUMENTS, BASE_SIX, OPTIONAL_INSTRUMENTS, getInstrumentColor } from '../lib/instruments';
import { getStartingGear } from '../lib/gear';
import { randomAppearance } from '../lib/appearance';
import type { InstrumentId } from '../types/game';

export default function InstrumentSelectPage() {
  const { user } = useAuthStore();
  const { setCharacter, createGuestCharacter } = useGameStore();
  const guest = useUiStore((s) => s.guest);
  const navigate = useNavigate();

  const classroomId = sessionStorage.getItem('pending_classroom_id') ?? '';
  const classroomName = sessionStorage.getItem('pending_classroom_name') ?? '';
  const baseOnly = sessionStorage.getItem('base_instruments_only') !== 'false';

  const [selected, setSelected] = useState<InstrumentId | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!classroomId && !guest) {
    navigate('/class-select');
    return null;
  }

  // Guests get the full instrument roster to explore.
  const availableIds = guest || !baseOnly
    ? [...BASE_SIX, ...OPTIONAL_INSTRUMENTS]
    : BASE_SIX;

  async function createCharacter() {
    if (!selected || !displayName.trim()) return;

    // Guest Mode: build a local character, skip Supabase, jump into the world.
    if (guest) {
      createGuestCharacter(selected, displayName);
      navigate('/hub');
      return;
    }

    if (!user) return;

    setSaving(true);
    setError('');

    const instrument = INSTRUMENTS[selected];
    const startingGear = getStartingGear(selected);
    const appearance = randomAppearance(user.id);
    const { data: existing } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      setError('You already have a character. Contact your teacher if you need to change instruments.');
      setSaving(false);
      return;
    }

    const { data: char, error: insertErr } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        classroom_id: classroomId,
        display_name: displayName.trim(),
        instrument: selected,
        level: 1,
        xp: 0,
        current_zone: 1,
        power: instrument.baseStats.power,
        accuracy: instrument.baseStats.accuracy,
        technique: instrument.baseStats.technique,
        endurance: instrument.baseStats.endurance,
        hp: instrument.baseStats.endurance * 5,
        max_hp: instrument.baseStats.endurance * 5,
        resonance_points: 0,
        gear: startingGear,
        appearance,
      })
      .select()
      .single();

    if (insertErr || !char) {
      setError('Failed to create character. Please try again.');
      setSaving(false);
      return;
    }

    // Also upsert profile
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: displayName.trim(),
      role: 'student',
    });

    setCharacter({
      id: char.id,
      userId: user.id,
      classroomId,
      displayName: displayName.trim(),
      instrument: selected,
      level: 1,
      xp: 0,
      xpToNextLevel: 150,
      currentZone: 1,
      stats: instrument.baseStats,
      hp: instrument.baseStats.endurance * 5,
      maxHp: instrument.baseStats.endurance * 5,
      resonancePoints: 0,
      resonanceCoins: 0,
      summonPoints: 0,
      gear: startingGear,
      freedAllies: [],
      completedChallenges: [],
      completedQuests: [],
      bootCampComplete: false,
      totalAttempts: 0,
      weeklyXp: 0,
      suspended: false,
      appearance,
      createdAt: char.created_at,
      updatedAt: char.updated_at,
    });

    sessionStorage.removeItem('pending_classroom_id');
    sessionStorage.removeItem('pending_classroom_name');
    sessionStorage.removeItem('base_instruments_only');

    navigate('/boot-camp');
  }

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-2">
            {guest ? 'Guest Demo' : classroomName}
          </div>
          <h1 className="fantasy-title text-3xl mb-2">Choose Your Instrument</h1>
          <p className="text-academy-cream/60 text-sm">
            This is your character class. Choose wisely — your instrument shapes your abilities.
          </p>
        </div>

        {/* Name input */}
        <div className="card-panel mb-6">
          <label className="block text-academy-gold/80 text-xs uppercase tracking-widest mb-2 font-fantasy">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should your classmates know you?"
            maxLength={24}
            className="w-full bg-black/40 border border-academy-gold/30 rounded-lg px-4 py-3
                       text-academy-cream focus:outline-none focus:border-academy-gold/80 transition-colors"
          />
        </div>

        {/* Instrument grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {availableIds.map((id) => {
            const inst = INSTRUMENTS[id];
            const color = getInstrumentColor(id);
            const isSelected = selected === id;

            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`card-panel text-left transition-all duration-200 cursor-pointer relative overflow-hidden
                  ${isSelected
                    ? 'border-2 scale-105 shadow-2xl'
                    : 'hover:border-academy-gold/40 hover:scale-102'
                  }`}
                style={isSelected ? { borderColor: color, boxShadow: `0 0 20px ${color}40` } : {}}
              >
                {/* Color accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                  style={{ backgroundColor: color }}
                />

                <div className="pt-2">
                  <div className="text-2xl mb-2">{getInstrumentEmoji(id)}</div>
                  <div className="font-fantasy text-sm font-semibold" style={{ color }}>
                    {inst.name}
                  </div>
                  <div className="text-academy-cream/50 text-xs mt-1">
                    {inst.className}
                  </div>
                  <div className="text-academy-cream/30 text-xs mt-1 italic">
                    {inst.archetype.split('—')[0].trim()}
                  </div>

                  {/* Mini stat bars */}
                  <div className="mt-3 space-y-1">
                    {(['power', 'accuracy', 'technique', 'endurance'] as const).map((stat) => (
                      <div key={stat} className="flex items-center gap-2">
                        <span className="text-academy-cream/40 text-[10px] w-16 capitalize">{stat}</span>
                        <div className="stat-bar flex-1">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: `${(inst.baseStats[stat] / 20) * 100}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected detail */}
        {selected && (
          <div className="card-panel mb-6 border-academy-gold/40">
            <div className="text-academy-gold font-fantasy text-lg mb-1">
              {INSTRUMENTS[selected].className}
            </div>
            <p className="text-academy-cream/70 text-sm">
              {INSTRUMENTS[selected].archetype}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-discord-crimson/20 border border-discord-crimson/40 rounded-lg text-rating-poor text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={createCharacter}
          disabled={!selected || !displayName.trim() || saving}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-academy-dark/40 border-t-academy-dark rounded-full animate-spin" />
              Enrolling…
            </span>
          ) : (
            'Enroll at Harmonia Academy'
          )}
        </button>
      </div>
    </div>
  );
}

function getInstrumentEmoji(id: InstrumentId): string {
  const map: Record<InstrumentId, string> = {
    flute: '🪈', clarinet: '🎵', alto_sax: '🎷',
    trumpet: '🎺', trombone: '📯', euphonium: '🎶',
    percussion: '🥁', french_horn: '📯', tuba: '🎺',
    oboe: '🪘', bassoon: '🎵',
  };
  return map[id];
}
