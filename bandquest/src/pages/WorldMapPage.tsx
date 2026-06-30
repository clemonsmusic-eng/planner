import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { ZONES as WORLD_ZONES, quarterLabelShort, type ZoneMeta } from '../lib/zones';


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

  const actGroups: Record<number, ZoneMeta[]> = { 1: [], 2: [], 3: [] };
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
  zone: ZoneMeta;
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
                Zone {zone.id} · Act {zone.act} · {quarterLabelShort(zone)}
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
