import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';

interface ZoneData {
  id: number;
  name: string;
  act: 1 | 2 | 3;
  quarter: string;
  emoji: string;
  flavor: string;
  boss: string;
}

const WORLD_ZONES: ZoneData[] = [
  {
    id: 1, name: 'The Rehearsal Halls', act: 1, quarter: 'Q1 · Fall',
    emoji: '🏛️', flavor: "Stone arches and worn practice rooms echo with a hundred instruments. Maestro Barenboimi's baton never stills.",
    boss: 'The Flat Dragon',
  },
  {
    id: 2, name: 'The Theory Wing', act: 1, quarter: 'Q2 · Winter',
    emoji: '📜', flavor: 'Ancient inner wing. Walls lined with faded pre-Shattering scores and censored references to the forbidden interval.',
    boss: 'The Interval Imp',
  },
  {
    id: 3, name: 'The Town of Crotchet', act: 1, quarter: 'Q3 · Spring',
    emoji: '🏘️', flavor: 'A bright market town hosting the regional inter-school contest — banners, crowds, and four schools chasing one trophy.',
    boss: 'The Crotchet Invitational',
  },
  {
    id: 4, name: 'The Grand Auditorium', act: 1, quarter: 'Q4 · End of Year',
    emoji: '🎭', flavor: "The Academy's crown jewel. Here, beneath Maestro Barenboimi's exacting direction, students play their graduation concert.",
    boss: 'The Graduation Trial',
  },
  {
    id: 5, name: 'The Meadows of Mezzo', act: 2, quarter: 'Q5',
    emoji: '🌿', flavor: 'Pastoral countryside, small farming villages. Simple jobs — festival performances, clearing Twisted Melodies from granaries.',
    boss: 'The Tempo Wolf Pack',
  },
  {
    id: 6, name: 'The Tempo Thicket', act: 2, quarter: 'Q6',
    emoji: '🌲', flavor: 'A forest where time moves strangely. Rhythms layer over each other; those who lose the beat become lost forever.',
    boss: 'Synco the Chronoton Commander',
  },
  {
    id: 7, name: 'The Clef Mountains', act: 2, quarter: 'Q7',
    emoji: '⛰️', flavor: "High mountain passes. The Discordian's military patrols the roads — not wandering creatures, but soldiers.",
    boss: 'The Augmented Giant',
  },
  {
    id: 8, name: 'The Percussion Plateau', act: 2, quarter: 'Q8',
    emoji: '🪨', flavor: 'Vast flat rock formations that ring like drums when struck. The ground has been rhythmically beating for years.',
    boss: 'Percival, the Drumming Colossus',
  },
  {
    id: 9, name: 'The Harmonic Sea', act: 3, quarter: 'Q9',
    emoji: '🌊', flavor: 'The sea itself is filled with corrupted sound waves that distort navigation. Students must sail by musical landmark and ear.',
    boss: 'The Sea Dissonance',
  },
  {
    id: 10, name: 'The Tonal Plains', act: 3, quarter: 'Q10',
    emoji: '🌾', flavor: 'Former fertile heartland, now grey. Large-scale confrontations. Symphony members held in fortress-prisons.',
    boss: 'The Cacophony General',
  },
  {
    id: 11, name: 'The Dissonant Wastes', act: 3, quarter: 'Q11',
    emoji: '🏜️', flavor: "Bleak badlands near Discord's Performance Hall. Permanent overcast. Atonal howling in the wind.",
    boss: 'The Void Arbiter',
  },
  {
    id: 12, name: "Discord's Performance Hall", act: 3, quarter: 'Q12',
    emoji: '🎪', flavor: 'The final stage. The Discordian Overlord broadcasts Twisted Melodies from here. The Sacred Scores must be restored.',
    boss: 'Vexus, the Discordian Overlord',
  },
];

const ACT_CONFIG = {
  1: {
    label: 'Act I — The Academy Years',
    sublabel: 'Zones 1–4 · Year One of Band',
    gradient: 'from-amber-950/80 via-amber-900/20 to-transparent',
    border: 'border-amber-700/40',
    glow: '#D4A017',
    glowBg: 'rgba(212,160,23,0.08)',
    path: '#D4A01760',
    tagBg: 'bg-amber-900/40',
    tagText: 'text-amber-400',
    tagBorder: 'border-amber-700/40',
    nodeBorder: '#D4A017',
    nodeActiveBg: 'rgba(212,160,23,0.15)',
  },
  2: {
    label: 'Act II — Into the World',
    sublabel: 'Zones 5–8 · Year Two of Band',
    gradient: 'from-blue-950/80 via-blue-900/20 to-transparent',
    border: 'border-blue-700/40',
    glow: '#60A5FA',
    glowBg: 'rgba(96,165,250,0.08)',
    path: '#60A5FA60',
    tagBg: 'bg-blue-900/40',
    tagText: 'text-blue-400',
    tagBorder: 'border-blue-700/40',
    nodeBorder: '#60A5FA',
    nodeActiveBg: 'rgba(96,165,250,0.15)',
  },
  3: {
    label: 'Act III — The Liberation',
    sublabel: 'Zones 9–12 · Year Three of Band',
    gradient: 'from-red-950/80 via-red-900/20 to-transparent',
    border: 'border-red-800/40',
    glow: '#F87171',
    glowBg: 'rgba(248,113,113,0.08)',
    path: '#F8717160',
    tagBg: 'bg-red-950/40',
    tagText: 'text-red-400',
    tagBorder: 'border-red-800/40',
    nodeBorder: '#F87171',
    nodeActiveBg: 'rgba(248,113,113,0.15)',
  },
};

export default function WorldMapPage() {
  const { character, classroom } = useGameStore();
  const { signOut } = useAuthStore();
  const navigate = useNavigate();

  if (!character) return null;

  const maxZone = Math.max(classroom?.currentZone ?? 1, character.currentZone);

  const actGroups: Record<number, ZoneData[]> = { 1: [], 2: [], 3: [] };
  for (const z of WORLD_ZONES) actGroups[z.act].push(z);

  return (
    <div className="min-h-screen bg-academy-dark" style={{ backgroundImage: 'radial-gradient(ellipse at top, #1a0e0230 0%, transparent 60%)' }}>
      {/* Top nav */}
      <div className="sticky top-0 z-30 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/50 hover:text-academy-cream/90 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Hub
        </button>
        <div className="fantasy-title text-base text-academy-gold">Symphonica</div>
        <button
          onClick={signOut}
          className="text-academy-cream/30 hover:text-academy-cream/70 text-xs transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Hero banner */}
      <div className="relative px-4 pt-8 pb-6 text-center overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(212,160,23,0.05) 40px, rgba(212,160,23,0.05) 41px)' }}
        />
        <div className="text-academy-gold/40 text-xs tracking-[0.5em] uppercase font-fantasy mb-2">World Map</div>
        <h1 className="fantasy-title text-3xl text-academy-cream mb-2">Symphonica</h1>
        <p className="text-academy-cream/50 text-xs max-w-xs mx-auto">
          The world The Composer made — now shattered. Your journey begins in the Academy and ends at Discord's Hall.
        </p>
        {/* Current zone indicator */}
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-academy-gold/10 border border-academy-gold/30">
          <div className="w-2 h-2 rounded-full bg-academy-gold animate-pulse" />
          <span className="text-academy-gold text-xs font-fantasy">
            Zone {maxZone} — {WORLD_ZONES[maxZone - 1]?.name}
          </span>
        </div>
      </div>

      {/* The Map */}
      <div className="max-w-lg mx-auto px-4 pb-24">
        {([1, 2, 3] as const).map((act) => {
          const cfg = ACT_CONFIG[act];
          const zones = actGroups[act];

          return (
            <div key={act} className="mb-2">
              {/* Act divider */}
              <div className={`relative rounded-xl border px-4 py-3 mb-6 bg-gradient-to-r ${cfg.gradient} ${cfg.border}`}>
                <div className={`text-[10px] uppercase tracking-[0.4em] font-fantasy mb-0.5 ${cfg.tagText}`}>
                  {cfg.label}
                </div>
                <div className="text-academy-cream/40 text-xs">{cfg.sublabel}</div>
              </div>

              {/* Zone nodes for this act */}
              <div className="relative">
                {/* Vertical path line */}
                <div
                  className="absolute left-6 top-8 bottom-8 w-0.5 rounded-full"
                  style={{ backgroundColor: cfg.path }}
                />

                <div className="space-y-3 relative">
                  {zones.map((zone, idx) => {
                    const isActive = zone.id === maxZone;
                    const isCompleted = zone.id < maxZone;
                    const isLocked = zone.id > maxZone;
                    const isLast = idx === zones.length - 1;

                    return (
                      <ZoneNode
                        key={zone.id}
                        zone={zone}
                        isActive={isActive}
                        isCompleted={isCompleted}
                        isLocked={isLocked}
                        isLast={isLast}
                        cfg={cfg}
                        onEnter={() => navigate(`/zone/${zone.id}`)}
                        onReview={() => navigate(`/zone/${zone.id}`)}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Act connector (between acts) */}
              {act < 3 && (
                <div className="flex flex-col items-center py-4">
                  <div className="w-0.5 h-8 bg-gradient-to-b from-transparent via-academy-gold/20 to-transparent" />
                  <div className="text-academy-cream/20 text-[10px] uppercase tracking-widest font-fantasy">continues</div>
                  <div className="w-0.5 h-8 bg-gradient-to-b from-transparent via-academy-gold/20 to-transparent" />
                </div>
              )}
            </div>
          );
        })}

        {/* World's End marker */}
        <div className="mt-8 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="w-0.5 h-8 bg-gradient-to-b from-red-700/40 to-transparent" />
            <div className="text-red-900/60 text-[10px] uppercase tracking-[0.5em] font-fantasy">
              The Void Awaits Beyond
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoneNode({
  zone, isActive, isCompleted, isLocked, isLast: _isLast,
  cfg, onEnter, onReview,
}: {
  zone: ZoneData;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  isLast: boolean;
  cfg: typeof ACT_CONFIG[1];
  onEnter: () => void;
  onReview: () => void;
}) {
  const statusIcon = isCompleted ? '✓' : isLocked ? '🔒' : zone.id.toString();
  const nodeColor = isCompleted ? '#4ADE80' : isLocked ? '#374151' : cfg.nodeBorder;

  return (
    <div
      className={`flex items-start gap-4 transition-all duration-300
        ${isLocked ? 'opacity-40' : 'opacity-100'}`}
    >
      {/* Node circle */}
      <div className="relative flex-shrink-0 z-10">
        {isActive && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: cfg.nodeBorder, transform: 'scale(1.5)' }}
          />
        )}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-fantasy font-bold flex-shrink-0"
          style={{
            backgroundColor: isActive ? cfg.nodeActiveBg : isCompleted ? 'rgba(74,222,128,0.10)' : 'rgba(0,0,0,0.40)',
            border: `2px solid ${nodeColor}`,
            color: nodeColor,
            boxShadow: isActive ? `0 0 16px ${cfg.nodeBorder}60` : 'none',
          }}
        >
          {statusIcon}
        </div>
      </div>

      {/* Zone card */}
      <div
        className={`flex-1 rounded-xl border transition-all duration-200 overflow-hidden
          ${isActive ? 'cursor-pointer hover:scale-[1.01]' : isCompleted ? 'cursor-pointer' : 'cursor-not-allowed'}
        `}
        style={{
          borderColor: isActive ? `${cfg.nodeBorder}60` : isCompleted ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)',
          backgroundColor: isActive ? cfg.nodeActiveBg : isCompleted ? 'rgba(74,222,128,0.04)' : 'rgba(0,0,0,0.20)',
          boxShadow: isActive ? `0 0 24px ${cfg.nodeBorder}20` : 'none',
        }}
        onClick={isActive ? onEnter : isCompleted ? onReview : undefined}
      >
        {/* Zone color top accent */}
        {!isLocked && (
          <div
            className="h-0.5 w-full"
            style={{ backgroundColor: isCompleted ? '#4ADE8060' : `${cfg.nodeBorder}60` }}
          />
        )}

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-academy-cream/90 text-sm font-semibold font-fantasy leading-tight">
                  {zone.name}
                </span>
                {isActive && (
                  <span
                    className="text-[9px] uppercase tracking-widest font-fantasy px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${cfg.nodeBorder}20`, color: cfg.nodeBorder, border: `1px solid ${cfg.nodeBorder}40` }}
                  >
                    Active
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[9px] uppercase tracking-widest font-fantasy px-1.5 py-0.5 rounded bg-rating-good/10 text-rating-good border border-rating-good/30">
                    Complete
                  </span>
                )}
              </div>
              <div className="text-academy-cream/35 text-[10px] font-fantasy uppercase tracking-widest">
                Zone {zone.id} · Act {zone.act} · {zone.quarter}
              </div>
            </div>
            <div className="text-2xl flex-shrink-0">{zone.emoji}</div>
          </div>

          {/* Flavor text */}
          {!isLocked && (
            <p className="text-academy-cream/50 text-xs leading-relaxed mb-3 italic">
              {zone.flavor}
            </p>
          )}
          {isLocked && (
            <p className="text-academy-cream/25 text-xs leading-relaxed mb-3 italic">
              This region is beyond your current clearance. Advance your class zone to unlock it.
            </p>
          )}

          {/* Boss row */}
          {!isLocked && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-academy-cream/30 uppercase tracking-wider font-fantasy">Boss:</span>
                <span className="text-[10px] text-academy-cream/60 italic">{zone.boss}</span>
              </div>

              {isActive && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEnter(); }}
                  className="text-xs font-fantasy px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                  style={{
                    backgroundColor: `${cfg.nodeBorder}20`,
                    color: cfg.nodeBorder,
                    border: `1px solid ${cfg.nodeBorder}50`,
                  }}
                >
                  Enter →
                </button>
              )}
              {isCompleted && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReview(); }}
                  className="text-xs font-fantasy px-3 py-1.5 rounded-lg transition-all text-rating-good/70 border border-rating-good/20 hover:border-rating-good/40"
                >
                  Review ✓
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
