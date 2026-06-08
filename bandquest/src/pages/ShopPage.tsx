import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { getShopListings, SLOT_INFO, TIER_COLORS, TIER_LABELS } from '../lib/gear';
import { getInstrumentColor } from '../lib/instruments';
import type { ShopListing } from '../lib/gear';

export default function ShopPage() {
  const { character, equipGear, spendCoins } = useGameStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  if (!character) return null;

  const color = getInstrumentColor(character.instrument);
  const locked = character.currentZone < 3;
  const listings = locked ? [] : getShopListings(character);

  async function handleBuy(listing: ShopListing) {
    if (!character) return;
    const ok = await spendCoins(listing.price);
    if (!ok) return;
    await equipGear(listing.item);
    setConfirming(null);
    setJustBought(listing.item.id);
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
              The Town of Crotchet opens in Quarter 3 (Zone 3).
            </div>
            <div className="text-academy-cream/30 text-xs mt-2">
              Complete Zone 2 to unlock the shop.
            </div>
          </div>
        ) : listings.length === 0 ? (
          <div className="card-panel text-center py-12">
            <div className="text-4xl mb-4">✦</div>
            <div className="fantasy-title text-base text-academy-gold mb-2">Fully Equipped</div>
            <div className="text-academy-cream/50 text-sm">
              All gear slots are at maximum purchasable tier.
            </div>
            <div className="text-academy-cream/30 text-xs mt-2">
              Legendary gear drops from Zone 11–12 bosses.
            </div>
          </div>
        ) : (
          <>
            <p className="text-academy-cream/40 text-xs mb-4">
              Upgrade each gear slot to improve your stats. Earn coins by completing challenges.
            </p>
            <div className="space-y-3">
              {listings.map((listing) => {
                const slotInfo = SLOT_INFO[listing.item.slot];
                const isConfirming = confirming === listing.item.id;
                const wasBought = justBought === listing.item.id;

                return (
                  <div
                    key={listing.item.id}
                    className="card-panel"
                    style={wasBought ? { borderColor: `${color}60` } : undefined}
                  >
                    <div className="flex items-start gap-3">
                      {/* Slot icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                      >
                        {slotInfo.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-academy-cream/40 text-[10px] uppercase tracking-widest font-fantasy mb-0.5">
                          {slotInfo.label}
                        </div>

                        {/* Current → Next */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {listing.currentItem ? (
                            <span className="text-academy-cream/40 text-xs line-through">
                              {listing.currentItem.name}
                            </span>
                          ) : (
                            <span className="text-academy-cream/25 text-xs italic">Empty</span>
                          )}
                          <span className="text-academy-cream/30 text-xs">→</span>
                          <span className="text-academy-cream/90 text-sm font-semibold">
                            {listing.item.name}
                          </span>
                          <span className={`text-[9px] font-fantasy uppercase tracking-widest ${TIER_COLORS[listing.item.tier]}`}>
                            {TIER_LABELS[listing.item.tier]}
                          </span>
                        </div>

                        <div className="text-academy-cream/40 text-xs italic mb-1.5">
                          {listing.item.fantasyName}
                        </div>

                        {/* Stat bonuses */}
                        {Object.keys(listing.item.statBonus).length > 0 && (
                          <div className="text-rating-good text-[10px] font-fantasy mb-1">
                            {(['power', 'accuracy', 'technique', 'endurance'] as const)
                              .filter((s) => (listing.item.statBonus[s] ?? 0) > 0)
                              .map((s) => `+${listing.item.statBonus[s]} ${s.slice(0, 3).toUpperCase()}`)
                              .join('  ·  ')}
                          </div>
                        )}
                        {listing.item.passive && (
                          <div className="text-academy-gold/50 text-[10px] italic mb-1.5">
                            ✦ {listing.item.passive}
                          </div>
                        )}
                        {listing.item.unlocks && listing.item.unlocks.length > 0 && (
                          <div className="text-academy-cream/30 text-[10px] mb-1.5">
                            Unlocks: {listing.item.unlocks.join(', ')}
                          </div>
                        )}

                        {/* Buy / Confirm row */}
                        {wasBought ? (
                          <div className="text-rating-superior text-xs font-fantasy mt-1">
                            ✓ Equipped!
                          </div>
                        ) : isConfirming ? (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-academy-cream/60 text-xs">
                              Spend {listing.price} 🪙?
                            </span>
                            <button
                              onClick={() => handleBuy(listing)}
                              className="text-xs font-fantasy px-3 py-1 rounded-lg transition-colors"
                              style={{ background: `${color}25`, color, border: `1px solid ${color}50` }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirming(null)}
                              className="text-academy-cream/40 hover:text-academy-cream/70 text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => listing.canAfford && setConfirming(listing.item.id)}
                            disabled={!listing.canAfford}
                            className="mt-2 text-xs font-fantasy px-4 py-1.5 rounded-lg transition-all"
                            style={listing.canAfford ? {
                              background: `${color}20`,
                              color,
                              border: `1px solid ${color}40`,
                            } : {
                              background: 'rgba(255,255,255,0.04)',
                              color: 'rgba(255,255,255,0.25)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              cursor: 'not-allowed',
                            }}
                          >
                            {listing.canAfford
                              ? `Buy — 🪙 ${listing.price}`
                              : `🪙 ${listing.price} (need ${listing.price - character.resonanceCoins} more)`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legendary gear note */}
            <div className="card-panel mt-6 border-academy-gold/10">
              <div className="text-academy-cream/30 text-xs text-center">
                ✦ Legendary gear (Tier 4) drops from Zone 11–12 boss battles only.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
