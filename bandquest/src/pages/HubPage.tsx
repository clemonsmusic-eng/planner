import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { INSTRUMENTS, getInstrumentColor, xpToNextLevel } from '../lib/instruments';
import { getEffectiveStats } from '../lib/gear';
import CharacterCard from '../components/CharacterCard';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ZONES = [
  { id: 1, name: 'The Rehearsal Halls', quarter: 'Quarter 1 · Fall', act: 1, available: true },
  { id: 2, name: 'The Theory Wing', quarter: 'Quarter 2 · Winter', act: 1, available: false },
  { id: 3, name: 'The Town of Crotchet', quarter: 'Quarter 3 · Spring', act: 1, available: false },
  { id: 4, name: 'The Grand Auditorium', quarter: 'Quarter 4 · End of Year', act: 1, available: false },
  { id: 5, name: 'The Meadows of Mezzo', quarter: 'Quarter 5', act: 2, available: false },
  { id: 6, name: 'The Tempo Thicket', quarter: 'Quarter 6', act: 2, available: false },
  { id: 7, name: 'The Clef Mountains', quarter: 'Quarter 7', act: 2, available: false },
  { id: 8, name: 'The Percussion Plateau', quarter: 'Quarter 8', act: 2, available: false },
  { id: 9, name: 'The Harmonic Sea', quarter: 'Quarter 9', act: 3, available: false },
  { id: 10, name: 'The Tonal Plains', quarter: 'Quarter 10', act: 3, available: false },
  { id: 11, name: 'The Dissonant Wastes', quarter: 'Quarter 11', act: 3, available: false },
  { id: 12, name: "Discord's Performance Hall", quarter: 'Quarter 12', act: 3, available: false },
];

export default function HubPage() {
  const { character, classroom } = useGameStore();
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  // Update last_active_date and practice streak on hub visit
  useEffect(() => {
    if (!character || !user) return;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('characters')
      .update({ last_active_date: today })
      .eq('id', character.id)
      .then(() => {});
  }, [character?.id]);

  if (!character) return null;

  const instrument = INSTRUMENTS[character.instrument];
  const color = getInstrumentColor(character.instrument);
  const xpNeeded = xpToNextLevel(character.level);
  const xpPercent = (character.xp / xpNeeded) * 100;
  const effectiveStats = getEffectiveStats(character);

  return (
    <div className="min-h-screen pb-24">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <div className="fantasy-title text-lg text-academy-gold">Symphonica</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hub')}
            className="text-academy-cream/60 hover:text-academy-cream text-sm transition-colors"
          >
            Hub
          </button>
          <button
            onClick={signOut}
            className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Character summary — tap avatar to customize */}
        <CharacterCard
          character={character}
          instrument={instrument}
          color={color}
          onAvatarClick={() => navigate('/customize')}
        />

        {/* XP bar */}
        <div className="card-panel mt-4 py-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-academy-cream/60 font-fantasy">Level {character.level}</span>
            <span className="text-academy-cream/40">{character.xp} / {xpNeeded} XP</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill"
              style={{ width: `${xpPercent}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Quick stats — shows effective (base + gear) */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {(['power', 'accuracy', 'technique', 'endurance'] as const).map((stat) => {
            const gearBonus = effectiveStats[stat] - character.stats[stat];
            return (
              <div key={stat} className="card-panel py-3 text-center">
                <div className="text-academy-cream/40 text-[10px] uppercase tracking-wider mb-1">{stat.slice(0, 3)}</div>
                <div className="font-fantasy text-lg" style={{ color }}>{effectiveStats[stat]}</div>
                {gearBonus > 0 && (
                  <div className="text-rating-good text-[9px] font-fantasy">+{gearBonus}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* World Map — primary CTA */}
        <button
          onClick={() => navigate('/world')}
          className="w-full mt-6 relative overflow-hidden rounded-xl border border-academy-gold/40 hover:border-academy-gold/80 transition-all duration-300 hover:scale-[1.01] cursor-pointer text-left"
          style={{ background: 'linear-gradient(135deg, rgba(212,160,23,0.12) 0%, rgba(212,160,23,0.04) 100%)' }}
        >
          {/* Decorative shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-academy-gold/60 to-transparent" />
          <div className="px-5 py-5 flex items-center gap-4">
            <div className="text-4xl">🗺️</div>
            <div className="flex-1">
              <div className="fantasy-title text-lg text-academy-gold mb-0.5">Explore Symphonica</div>
              <div className="text-academy-cream/50 text-xs">
                Zone {Math.max(classroom?.currentZone ?? 1, character.currentZone)} of 12 · {
                  ZONES.find(z => z.id === Math.max(classroom?.currentZone ?? 1, character.currentZone))?.name
                }
              </div>
            </div>
            <div
              className="text-xs font-fantasy px-3 py-2 rounded-lg border"
              style={{ color: '#D4A017', borderColor: 'rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.1)' }}
            >
              Open Map →
            </div>
          </div>
        </button>

        {/* Navigation sections */}
        <div className="mt-8">
          <h2 className="fantasy-title text-base text-academy-gold/70 uppercase tracking-widest mb-4">
            The Academy
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <NavCard icon="⚔️" label="Battle Simulator" sublabel="Practice with feedback" onClick={() => navigate('/simulator')} />
            <NavCard icon="📚" label="The Library" sublabel="Music history & theory" onClick={() => navigate('/library')} />
            <NavCard icon="🎵" label="Fingering Charts" sublabel="All instruments" onClick={() => navigate('/fingering')} />
            <NavCard icon="🏆" label="Leaderboard" sublabel="Class standings" onClick={() => navigate('/leaderboard')} />
            <NavCard icon="🎶" label="Symphony Allies" sublabel={`${character.freedAllies.length}/10 freed`} onClick={() => navigate('/allies')} />
            <NavCard icon="⚙️" label="Equipment" sublabel="Gear & effective stats" onClick={() => navigate('/gear')} />
            <NavCard icon="🪙" label="Gear Shop" sublabel={`${character.resonanceCoins} coins`} onClick={() => navigate('/shop')} />
            <NavCard icon="🎨" label="Customize Avatar" sublabel="Your look & colors" onClick={() => navigate('/customize')} />
          </div>
        </div>

        {/* Quick zone access */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="fantasy-title text-base text-academy-gold/70 uppercase tracking-widest">
              Current Zone
            </h2>
            <button
              onClick={() => navigate('/world')}
              className="text-academy-gold/50 hover:text-academy-gold text-xs font-fantasy transition-colors"
            >
              Full Map →
            </button>
          </div>
          {(() => {
            const maxZone = Math.max(classroom?.currentZone ?? 1, character.currentZone);
            const zone = ZONES.find(z => z.id === maxZone);
            if (!zone) return null;
            const actColors: Record<number, string> = { 1: '#D4A017', 2: '#60A5FA', 3: '#F87171' };
            const col = actColors[zone.act];
            return (
              <button
                onClick={() => navigate(`/zone/${zone.id}`)}
                className="w-full card-panel py-4 px-4 flex items-center gap-4 text-left transition-all hover:border-academy-gold/60 cursor-pointer"
                style={{ borderColor: `${col}40`, backgroundColor: `${col}08` }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base font-fantasy font-bold flex-shrink-0"
                  style={{ backgroundColor: `${col}20`, border: `2px solid ${col}`, color: col, boxShadow: `0 0 12px ${col}40` }}
                >
                  {zone.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-academy-cream/90 text-sm font-semibold">{zone.name}</div>
                  <div className="text-academy-cream/40 text-xs">{zone.quarter} · Act {zone.act}</div>
                </div>
                <div className="text-xs font-fantasy" style={{ color: col }}>ENTER →</div>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function NavCard({ icon, label, sublabel, onClick }: {
  icon: string;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-panel text-left hover:border-academy-gold/40 transition-all cursor-pointer"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-academy-cream/90 text-sm font-fantasy">{label}</div>
      <div className="text-academy-cream/40 text-xs mt-1">{sublabel}</div>
    </button>
  );
}
