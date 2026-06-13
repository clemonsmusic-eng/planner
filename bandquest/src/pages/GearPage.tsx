import { useNavigate } from 'react-router-dom';

import { useGameStore } from '../store/gameStore';
import { getEffectiveStats, SLOT_INFO, TIER_COLORS, TIER_LABELS, getSurfaceLabel } from '../lib/gear';
import { getInstrumentColor } from '../lib/instruments';
import type { GearSlot, GearTier } from '../types/game';

const SLOT_ORDER: GearSlot[] = [
  'instrument',
  'mouthpiece',
  'accessory',
  'case',
  'attire',
];

export default function GearPage() {
  const { character } = useGameStore();
  const navigate = useNavigate();

  if (!character) return null;

  const color = getInstrumentColor(character.instrument);
  const base = character.stats;
  const effective = getEffectiveStats(character);
  const bonus = {
    power:     effective.power     - base.power,
    accuracy:  effective.accuracy  - base.accuracy,
    technique: effective.technique - base.technique,
    endurance: effective.endurance - base.endurance,
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <div className="fantasy-title text-lg text-academy-gold">Equipment</div>
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors"
        >
          ← Hub
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Effective stats panel */}
        <div className="card-panel mb-6">
          <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mb-3 font-fantasy">
            Effective Stats (Base + Gear)
          </div>
          <div className="grid grid-cols-4 gap-3">
            {(['power', 'accuracy', 'technique', 'endurance'] as const).map((stat) => (
              <div key={stat} className="text-center">
                <div className="text-academy-cream/40 text-[10px] uppercase mb-1">{stat}</div>
                <div className="font-fantasy text-xl" style={{ color }}>{effective[stat]}</div>
                {bonus[stat] > 0 && (
                  <div className="text-rating-good text-[10px] font-fantasy">+{bonus[stat]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gear slots */}
        <h2 className="fantasy-title text-xs text-academy-gold/60 uppercase tracking-widest mb-3">
          Equipped Gear
        </h2>
        <div className="space-y-2">
          {SLOT_ORDER.map((slot) => {
            const info = SLOT_INFO[slot];
            const item = character.gear[slot];

            return (
              <div key={slot} className="card-panel">
                <div className="flex items-start gap-3">
                  {/* Slot icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                  >
                    {info.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy mb-0.5">
                      {slot === 'mouthpiece' ? getSurfaceLabel(character) : info.label}
                    </div>

                    {item ? (
                      <>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-academy-cream/90 text-sm font-semibold">{item.name}</span>
                          <TierBadge tier={item.tier} label={item.tierLabel} />
                        </div>
                        <div className="text-academy-cream/40 text-xs italic mb-1">{item.fantasyName}</div>
                        <StatBonusLine bonus={item.statBonus} />
                        {item.passive && (
                          <div className="text-academy-gold/50 text-[10px] mt-1 italic">
                            ✦ {item.passive}
                          </div>
                        )}
                        {item.loreEntry && (
                          <div className="text-academy-cream/30 text-[10px] mt-1">
                            {item.loreEntry}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-academy-cream/25 text-sm italic">Empty slot</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total gear bonus summary */}
        {Object.values(bonus).some((v) => v > 0) && (
          <div className="card-panel mt-6 border-academy-gold/20">
            <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest mb-2 font-fantasy">
              Total Gear Bonus
            </div>
            <div className="flex gap-4 flex-wrap">
              {(['power', 'accuracy', 'technique', 'endurance'] as const)
                .filter((s) => bonus[s] > 0)
                .map((s) => (
                  <div key={s} className="text-center">
                    <div className="text-academy-cream/40 text-[10px] capitalize">{s}</div>
                    <div className="text-rating-good font-fantasy text-lg">+{bonus[s]}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 mb-2">
          <button
            onClick={() => navigate('/shop')}
            className="text-sm font-fantasy px-5 py-2 rounded-xl transition-all hover:scale-[1.02]"
            style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
          >
            🪙 Visit Gear Shop →
          </button>
          <p className="text-academy-cream/30 text-xs text-center">
            Tier 4 Legendary gear drops from Zone 11–12 boss battles.
          </p>
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier, label }: { tier: GearTier; label?: string }) {
  return (
    <span className={`text-[9px] font-fantasy uppercase tracking-widest ${TIER_COLORS[tier]}`}>
      {label ?? TIER_LABELS[tier]}
    </span>
  );
}

function StatBonusLine({ bonus }: { bonus: Partial<{ power: number; accuracy: number; technique: number; endurance: number }> }) {
  const parts = (['power', 'accuracy', 'technique', 'endurance'] as const)
    .filter((s) => (bonus[s] ?? 0) > 0)
    .map((s) => `+${bonus[s]} ${s.slice(0, 3).toUpperCase()}`);

  if (parts.length === 0) return (
    <div className="text-academy-cream/25 text-[10px]">No stat bonus — unlocks challenge types</div>
  );

  return (
    <div className="text-rating-good text-[10px] font-fantasy">
      {parts.join('  ·  ')}
    </div>
  );
}
