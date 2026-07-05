import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getShopGroups, TIER_COLORS, TIER_LABELS, SLOT_INFO } from '../lib/gear';
import { getInstrumentColor } from '../lib/instruments';
import type { ShopOption, ShopSlotGroup } from '../lib/gear';

export default function ShopPage() {
  const { character, equipGear, spendCoins } = useGameStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  if (!character) return null;

  const color = getInstrumentColor(character.instrument);
  const locked = character.currentZone < 3;
  const groups = locked ? [] : getShopGroups(character);

  async function handleBuy(option: ShopOption) {
    if (!character) return;
    const ok = await spendCoins(option.price);
    if (!ok) return;
    await equipGear(option.item);
    setConfirming(null);
    setJustBought(option.item.id);
    setTimeout(() => setJustBought(null), 2000);
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center justify-between">
        <div className="fantasy-title text-lg text-academy-gold">Gear Shop</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-academy-gold text-base">🪙</span>
            <span className="font-fantasy text-academy-gold text-lg">{character.resonanceCoins}</span>
            <span className="text-academy-cream/40 text-xs">coins</span>
          </div>
          <button
            onClick={() => navigate('/gear')}
            className="text-academy-cream/40 hover:text-academy-cream/80 text-xs transition-colors"
          >
            ← Equipment
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {locked ? (
          <div className="card-panel text-center py-12">
            <div className="text-4xl mb-4">🔒</div>
            <div className="fantasy-title text-base text-academy-gold mb-2">Shop Locked</div>
            <div className="text-academy-cream/50 text-sm">
              Concerta opens in Quarter 3 (Zone 3).
            </div>
            <div className="text-academy-cream/30 text-xs mt-2">
              Complete Zone 2 to unlock the shop.
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="card-panel text-center py-12">
            <div className="text-4xl mb-4">✦</div>
            <div className="fantasy-title text-base text-academy-gold mb-2">Fully Equipped</div>
            <div className="text-academy-cream/50 text-sm">
              All gear slots are at maximum purchasable tier.
            </div>
          </div>
        ) : (
          <>
            <p className="text-academy-cream/40 text-xs mb-4">
              Upgrade your gear to improve your stats. Your instrument-specific gear comes
              in different materials — each branch its own tradeoff. Earn coins by completing challenges.
            </p>

            <div className="space-y-5">
              {groups.map((group) => (
                <ShopGroup
                  key={group.slot}
                  group={group}
                  color={color}
                  confirming={confirming}
                  justBought={justBought}
                  onWantBuy={(id) => setConfirming(id)}
                  onCancel={() => setConfirming(null)}
                  onConfirm={handleBuy}
                  coins={character.resonanceCoins}
                />
              ))}
            </div>

            <div className="card-panel mt-6 border-academy-gold/10">
              <div className="text-academy-cream/30 text-xs text-center">
                ✦ Legendary instruments (Tier 4) drop from Zone 11–12 boss battles. Legendary
                <span className="text-academy-cream/45"> materials</span> can be splurged on here — at a price.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShopGroup({
  group, color, confirming, justBought, onWantBuy, onCancel, onConfirm, coins,
}: {
  group: ShopSlotGroup;
  color: string;
  confirming: string | null;
  justBought: string | null;
  onWantBuy: (id: string) => void;
  onCancel: () => void;
  onConfirm: (o: ShopOption) => void;
  coins: number;
}) {
  const icon = SLOT_INFO[group.slot].icon;
  const isBranching = group.options.length > 1 || group.slot === 'mouthpiece';

  return (
    <div>
      {/* Group heading */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-base">{icon}</span>
        <span className="fantasy-title text-xs text-academy-gold/70 uppercase tracking-widest">{group.label}</span>
        {isBranching && (
          <span className="text-academy-cream/30 text-[10px] italic">— choose your material</span>
        )}
        {group.current && (
          <span className="text-academy-cream/30 text-[10px] ml-auto">
            Equipped: {group.current.name}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {group.options.map((option) => {
          const isConfirming = confirming === option.item.id;
          const wasBought = justBought === option.item.id;
          return (
            <div
              key={option.item.id}
              className="card-panel"
              style={wasBought ? { borderColor: `${color}60` } : undefined}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}12`, border: `1px solid ${color}20` }}
                >
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-academy-cream/90 text-sm font-semibold">{option.item.name}</span>
                    <span className={`text-[9px] font-fantasy uppercase tracking-widest ${TIER_COLORS[option.item.tier]}`}>
                      {option.item.tierLabel ?? TIER_LABELS[option.item.tier]}
                    </span>
                    {option.isSidegrade && (
                      <span className="text-academy-cream/30 text-[9px] uppercase tracking-wide">sidegrade</span>
                    )}
                  </div>
                  <div className="text-academy-cream/40 text-xs italic mb-1.5">{option.item.fantasyName}</div>

                  {Object.keys(option.item.statBonus).length > 0 && (
                    <div className="text-rating-good text-[10px] font-fantasy mb-1">
                      {(['power', 'accuracy', 'technique', 'endurance'] as const)
                        .filter((s) => (option.item.statBonus[s] ?? 0) > 0)
                        .map((s) => `+${option.item.statBonus[s]} ${s.slice(0, 3).toUpperCase()}`)
                        .join('  ·  ')}
                    </div>
                  )}
                  {option.item.passive && (
                    <div className="text-academy-gold/50 text-[10px] italic mb-1.5">✦ {option.item.passive}</div>
                  )}

                  {/* Buy / Confirm */}
                  {wasBought ? (
                    <div className="text-rating-superior text-xs font-fantasy mt-1">✓ Equipped!</div>
                  ) : isConfirming ? (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-academy-cream/60 text-xs">Spend {option.price} 🪙?</span>
                      <button
                        onClick={() => onConfirm(option)}
                        className="text-xs font-fantasy px-3 py-1 rounded-lg transition-colors"
                        style={{ background: `${color}25`, color, border: `1px solid ${color}50` }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={onCancel}
                        className="text-academy-cream/40 hover:text-academy-cream/70 text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => option.canAfford && onWantBuy(option.item.id)}
                      disabled={!option.canAfford}
                      className="mt-2 text-xs font-fantasy px-4 py-1.5 rounded-lg transition-all"
                      style={option.canAfford ? {
                        background: `${color}20`, color, border: `1px solid ${color}40`,
                      } : {
                        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)',
                        border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed',
                      }}
                    >
                      {option.canAfford
                        ? `Buy — 🪙 ${option.price}`
                        : `🪙 ${option.price} (need ${option.price - coins} more)`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
