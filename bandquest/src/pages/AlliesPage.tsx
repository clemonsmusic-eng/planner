import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { ALLIES } from '../lib/allies';
import { MAESTRO_PORTRAITS } from '../lib/portraits';
import MaestroPortrait from '../components/MaestroPortrait';
import type { AllyId } from '../types/game';

// The 10 standard ally IDs (excludes grand_symphony)
const STANDARD_ALLY_IDS: AllyId[] = [
  'percival',
  'syrinx',
  'salpinx',
  'chalumeau',
  'hautbois',
  'waldhorn',
  'posaune',
  'cantora',
  'bassanello',
  'vela',
];

export default function AlliesPage() {
  const navigate = useNavigate();
  const { character } = useGameStore();

  if (!character) return null;

  const freedCount = STANDARD_ALLY_IDS.filter((id) =>
    character.freedAllies.includes(id),
  ).length;
  const allFreed = freedCount === 10;
  const grandSymphony = ALLIES['grand_symphony'];

  return (
    <div className="min-h-screen pb-16">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm transition-colors"
        >
          ← Hub
        </button>
        <div className="fantasy-title text-lg text-academy-gold flex-1 text-center">
          Symphony Allies
        </div>
        <div className="w-12" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Counter */}
        <div className="card-panel flex items-center gap-3 mb-6 py-3">
          <div className="text-2xl">🎶</div>
          <div>
            <div className="fantasy-title text-academy-gold text-sm">
              Symphony Members
            </div>
            <div className="text-academy-cream/60 text-xs mt-0.5">
              {freedCount} / 10 freed
            </div>
          </div>
          <div className="ml-auto">
            <div className="flex gap-1">
              {STANDARD_ALLY_IDS.map((id) => (
                <div
                  key={id}
                  className={`w-2.5 h-2.5 rounded-full ${
                    character.freedAllies.includes(id)
                      ? 'bg-rating-excellent'
                      : 'bg-academy-cream/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Ally grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
          {STANDARD_ALLY_IDS.map((id) => {
            const ally = ALLIES[id];
            const isFreed = character.freedAllies.includes(id);
            return (
              <AllyCard key={id} ally={ally} freed={isFreed} />
            );
          })}
        </div>

        {/* Grand Symphony */}
        <GrandSymphonyCard
          ally={grandSymphony}
          allFreed={allFreed}
          freedCount={freedCount}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type StandardAllyData = (typeof ALLIES)[AllyId];

function AllyCard({
  ally,
  freed,
}: {
  ally: StandardAllyData;
  freed: boolean;
}) {
  if (!freed) {
    return (
      <div className="card-panel opacity-30">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-academy-cream/60 text-sm font-fantasy line-through">
              {ally.trueName}
            </div>
            <div className="text-academy-cream/80 text-base font-fantasy mt-0.5">
              {ally.corruptedName}
            </div>
          </div>
          <div className="bg-black/40 border border-academy-cream/10 rounded-lg px-2 py-0.5 text-xs text-academy-cream/30 flex-shrink-0 ml-2">
            Zone {ally.zone}
          </div>
        </div>
        <div className="text-academy-cream/30 text-xs italic mt-2">
          Found in Zone {ally.zone}
        </div>
        <div className="mt-3 text-academy-cream/20 text-xs">
          {ally.instrument} — ???
        </div>
      </div>
    );
  }

  return (
    <div className="card-panel border-rating-excellent/30 bg-rating-excellent/5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg overflow-hidden border border-academy-gold/30 flex-shrink-0">
            <MaestroPortrait src={MAESTRO_PORTRAITS[ally.id]} emoji="🎼" size={48} />
          </div>
          <div className="min-w-0">
            <div className="fantasy-title text-base text-academy-gold">
              {ally.trueName}
            </div>
            <div className="text-academy-cream/50 text-xs mt-0.5">
              {ally.instrument}
            </div>
          </div>
        </div>
        <span className="flex-shrink-0 ml-2 bg-rating-excellent/20 text-rating-excellent text-[10px] font-fantasy px-2 py-0.5 rounded border border-rating-excellent/30 uppercase tracking-widest">
          Freed
        </span>
      </div>

      <div className="mt-3 bg-black/20 rounded-lg p-3">
        <div className="text-academy-gold text-xs font-fantasy mb-1">
          {ally.summonAbility}
        </div>
        <div className="text-academy-cream/70 text-xs leading-relaxed">
          {ally.summonEffect}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-academy-cream/30 text-xs">Zone {ally.zone}</div>
        <div className="bg-academy-gold/10 border border-academy-gold/30 rounded-lg px-2.5 py-1 text-xs font-fantasy text-academy-gold">
          {ally.rpCost} RP
        </div>
      </div>
    </div>
  );
}

function GrandSymphonyCard({
  ally,
  allFreed,
  freedCount,
}: {
  ally: StandardAllyData;
  allFreed: boolean;
  freedCount: number;
}) {
  if (!allFreed) {
    return (
      <div className="card-panel opacity-50">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🔒</div>
          <div>
            <div className="fantasy-title text-academy-gold text-base">
              The Grand Symphony
            </div>
            <div className="text-academy-cream/40 text-xs mt-1">
              Free all 10 Symphony members to unlock
            </div>
            <div className="text-academy-cream/30 text-xs mt-0.5">
              {freedCount} / 10 freed
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-panel border-academy-gold/60 bg-academy-gold/5 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-academy-gold/5 to-transparent pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="fantasy-title text-xl text-academy-gold text-shadow-glow">
              {ally.trueName}
            </div>
            <div className="text-academy-gold/60 text-xs mt-0.5 italic">
              {ally.instrument}
            </div>
          </div>
          <div className="bg-academy-gold/20 border border-academy-gold/50 rounded-lg px-3 py-1 text-sm font-fantasy text-academy-gold flex-shrink-0 ml-2">
            {ally.rpCost} RP
          </div>
        </div>

        <div className="bg-academy-gold/10 border border-academy-gold/30 rounded-lg p-4 mt-2">
          <div className="fantasy-title text-academy-gold text-sm mb-2">
            ✦ {ally.summonAbility}
          </div>
          <div className="text-academy-cream/80 text-sm leading-relaxed">
            {ally.summonEffect}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="bg-rating-superior/20 text-rating-superior text-[10px] font-fantasy px-2 py-0.5 rounded border border-rating-superior/30 uppercase tracking-widest">
            Ultimate
          </span>
          <span className="text-academy-cream/30 text-xs">Zone {ally.zone}</span>
        </div>
      </div>
    </div>
  );
}
