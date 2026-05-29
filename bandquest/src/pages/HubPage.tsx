import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { INSTRUMENTS, getInstrumentColor, xpToNextLevel } from '../lib/instruments';
import CharacterCard from '../components/CharacterCard';

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
  const { character } = useGameStore();
  const { signOut } = useAuthStore();
  const navigate = useNavigate();

  if (!character) return null;

  const instrument = INSTRUMENTS[character.instrument];
  const color = getInstrumentColor(character.instrument);
  const xpNeeded = xpToNextLevel(character.level);
  const xpPercent = (character.xp / xpNeeded) * 100;

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
        {/* Character summary */}
        <CharacterCard character={character} instrument={instrument} color={color} />

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

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {(['power', 'accuracy', 'technique', 'endurance'] as const).map((stat) => (
            <div key={stat} className="card-panel py-3 text-center">
              <div className="text-academy-cream/40 text-[10px] uppercase tracking-wider mb-1">{stat}</div>
              <div className="font-fantasy text-lg" style={{ color }}>{character.stats[stat]}</div>
            </div>
          ))}
        </div>

        {/* Navigation sections */}
        <div className="mt-8">
          <h2 className="fantasy-title text-base text-academy-gold/70 uppercase tracking-widest mb-4">
            The Academy
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <NavCard icon="⚔️" label="Battle Simulator" sublabel="Practice with feedback" onClick={() => {}} />
            <NavCard icon="📚" label="The Library" sublabel="Music history & theory" onClick={() => {}} />
            <NavCard icon="🗺️" label="World Map" sublabel="Symphonica awaits" onClick={() => {}} />
            <NavCard icon="🎶" label="Symphony Allies" sublabel={`${character.freedAllies.length}/10 freed`} onClick={() => {}} />
          </div>
        </div>

        {/* Zone progression */}
        <div>
          <h2 className="fantasy-title text-base text-academy-gold/70 uppercase tracking-widest mb-4">
            Zone Progression
          </h2>
          <div className="space-y-2">
            {ZONES.map((zone) => {
              const isCurrentZone = zone.id === character.currentZone;
              const isCompleted = zone.id < character.currentZone;
              const isLocked = zone.id > character.currentZone;
              const actColors = { 1: '#D4A017', 2: '#60A5FA', 3: '#F87171' };

              return (
                <button
                  key={zone.id}
                  onClick={() => isCurrentZone && navigate(`/zone/${zone.id}`)}
                  disabled={isLocked}
                  className={`w-full card-panel py-3 px-4 flex items-center gap-4 text-left transition-all
                    ${isCurrentZone ? 'border-academy-gold/60 hover:border-academy-gold cursor-pointer' : ''}
                    ${isCompleted ? 'opacity-60' : ''}
                    ${isLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-fantasy flex-shrink-0"
                    style={{
                      backgroundColor: isCompleted ? '#4ADE8030' : isCurrentZone ? `${actColors[zone.act as 1|2|3]}20` : '#00000040',
                      border: `1px solid ${isCurrentZone ? actColors[zone.act as 1|2|3] : '#C9A22720'}`,
                      color: isCompleted ? '#4ADE80' : actColors[zone.act as 1|2|3],
                    }}
                  >
                    {isCompleted ? '✓' : zone.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-academy-cream/80 text-sm font-semibold truncate">{zone.name}</div>
                    <div className="text-academy-cream/40 text-xs">{zone.quarter} · Act {zone.act}</div>
                  </div>
                  {isCurrentZone && (
                    <div className="text-academy-gold text-xs font-fantasy">ACTIVE →</div>
                  )}
                  {isLocked && <div className="text-academy-cream/20 text-lg">🔒</div>}
                </button>
              );
            })}
          </div>
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
