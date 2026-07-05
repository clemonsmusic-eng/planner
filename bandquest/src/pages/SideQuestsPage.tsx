import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { RATING_XP_MULTIPLIERS, type Rating } from '../types/game';
import {
  SIDE_QUESTS, isQuestDone, activeQuests, questIsLead,
  SOURCE_LABEL, type SideQuest,
} from '../lib/sidequests';
import { ZONES } from '../lib/zones';
import ChallengeModal from '../components/ChallengeModal';

// The Quest Board: NPC-given side quests across the zones. Optional, playable
// errands that reuse the normal challenge flow (so Demo Mode works) and reward
// side-quest XP + coins on completion.
const REWARD_XP: Record<string, number> = { side_quest_short: 500, side_quest_long: 1000 };

export default function SideQuestsPage() {
  const { character, completeSideQuest } = useGameStore();
  const navigate = useNavigate();
  const [active, setActive] = useState<SideQuest | null>(null);
  const [turnIn, setTurnIn] = useState<{ quest: SideQuest; rating: Rating } | null>(null);

  if (!character) return null;

  const open = activeQuests(character);
  const done = SIDE_QUESTS.filter((q) => isQuestDone(q, character));
  const leads = SIDE_QUESTS.filter((q) => questIsLead(q, character));

  async function handleComplete(rating: Rating, score: number) {
    if (!active) return;
    await completeSideQuest(active.id, active.reward, score, rating);
    setTurnIn({ quest: active, rating });
    setActive(null);
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-emerald-900/20 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The Quest Board</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          Errands you've picked up along the way — favors from NPCs you've met, job postings on
          town boards, and openings unlocked by your deeds. Optional, but they pay in XP and coins.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Open quests */}
        <SectionHeader label={`Active · ${open.length}`} />
        {open.length === 0 ? (
          <div className="card-panel text-center py-8 text-academy-cream/40 text-sm italic mb-8">
            Nothing active. Meet townsfolk, check job boards after graduation, and keep freeing
            maestros — new quests will find their way here.
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {open.map((q) => (
              <QuestCard key={q.id} quest={q} onTake={() => setActive(q)} />
            ))}
          </div>
        )}

        {/* Completed */}
        {done.length > 0 && (
          <>
            <SectionHeader label={`Completed · ${done.length}`} />
            <div className="space-y-2 mb-8">
              {done.map((q) => (
                <div key={q.id} className="card-panel py-3 px-4 flex items-center gap-3 opacity-60">
                  <div className="text-xl flex-shrink-0">{q.giverEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-fantasy text-academy-cream/80 line-through decoration-academy-gold/40">{q.title}</div>
                    <div className="text-academy-cream/40 text-xs">{q.giver} · {zoneName(q.zone)}</div>
                  </div>
                  <div className="text-rating-superior text-xs font-fantasy flex-shrink-0">✓ Done</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Leads & rumors (known but not yet triggered) */}
        {leads.length > 0 && (
          <>
            <SectionHeader label={`Leads & Rumors · ${leads.length}`} />
            <div className="space-y-2">
              {leads.map((q) => (
                <div key={q.id} className="card-panel py-3 px-4 flex items-center gap-3 opacity-45">
                  <div className="text-xl flex-shrink-0 grayscale">{q.giverEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-fantasy text-academy-cream/70">{leadTitle(q)}</div>
                    <div className="text-academy-cream/40 text-xs">{leadHint(q)}</div>
                  </div>
                  <div className="text-academy-cream/30 text-[10px] flex-shrink-0">{SOURCE_LABEL[q.source]}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Objective challenge */}
      {active && (
        <ChallengeModal
          challenge={{
            id: active.id,
            title: active.objective.title,
            type: active.objective.type,
            description: active.objective.description,
            xpBase: REWARD_XP[active.reward] ?? 500,
          }}
          character={character}
          onComplete={handleComplete}
          onClose={() => setActive(null)}
        />
      )}

      {/* Turn-in payoff */}
      {turnIn && (
        <TurnInDialog quest={turnIn.quest} rating={turnIn.rating} onClose={() => setTurnIn(null)} />
      )}
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">{label}</h2>
  );
}

function QuestCard({ quest, onTake }: { quest: SideQuest; onTake: () => void }) {
  const isLong = quest.reward === 'side_quest_long';
  return (
    <div className="card-panel py-4 px-4" style={isLong ? { borderColor: '#D4A01740' } : undefined}>
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center text-2xl rounded-lg flex-shrink-0"
          style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,160,23,0.25)' }}
        >
          {quest.giverEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-fantasy text-academy-cream/90">{quest.title}</span>
            <span className="text-[9px] uppercase tracking-widest text-academy-cream/50 border border-white/15 rounded px-1.5 py-0.5">{SOURCE_LABEL[quest.source]}</span>
            {isLong && (
              <span className="text-[9px] uppercase tracking-widest text-academy-gold/80 border border-academy-gold/40 rounded px-1.5 py-0.5">Major</span>
            )}
          </div>
          <div className="text-academy-cream/45 text-xs mt-0.5">{quest.giver} · {quest.giverRole} · {zoneName(quest.zone)}</div>
        </div>
      </div>

      <p className="text-academy-cream/70 text-sm leading-relaxed italic mt-3">{quest.hook}</p>

      <div className="mt-3 rounded-lg bg-black/20 border border-white/5 px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-widest text-academy-gold/50 font-fantasy mb-1">Objective</div>
        <div className="text-academy-cream/80 text-sm font-fantasy">{quest.objective.title}</div>
        <div className="text-academy-cream/50 text-xs mt-0.5">{quest.objective.description}</div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-academy-gold/70 text-xs font-fantasy">
          🪙 Reward · up to {REWARD_XP[quest.reward]} XP
        </div>
        <button onClick={onTake} className="btn-primary text-xs py-1.5 px-4 flex-shrink-0">
          Take it on
        </button>
      </div>
    </div>
  );
}

function TurnInDialog({ quest, rating, onClose }: { quest: SideQuest; rating: Rating; onClose: () => void }) {
  const xp = Math.round((REWARD_XP[quest.reward] ?? 500) * RATING_XP_MULTIPLIERS[rating]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm">
      <div className="card-panel max-w-md w-full text-center border-rating-superior/40 py-6">
        <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 20px #FFD70066)' }}>{quest.giverEmoji}</div>
        <div className="text-academy-gold/60 text-[10px] uppercase tracking-[0.4em] font-fantasy mb-3">Quest Complete</div>
        <p className="text-academy-cream/85 text-sm leading-relaxed mb-5">{quest.turnIn}</p>
        <div className="text-rating-superior font-fantasy text-sm mb-5">
          +{xp} XP · {rating.charAt(0).toUpperCase() + rating.slice(1)}
        </div>
        <button onClick={onClose} className="btn-primary">Onward →</button>
      </div>
    </div>
  );
}

function zoneName(zoneId: number): string {
  return ZONES.find((z) => z.id === zoneId)?.name ?? `Zone ${zoneId}`;
}

// Leads are known-but-not-triggered quests — shown vaguely so they read as
// rumors, not a checklist. Unlock quests can surface their own hint.
function leadTitle(q: SideQuest): string {
  if (q.source === 'unlock') return q.title;
  return '???';
}

function leadHint(q: SideQuest): string {
  switch (q.source) {
    case 'npc': return `Someone in ${zoneName(q.zone)} may need a hand — pay them a visit.`;
    case 'job': return `A job board in ${zoneName(q.zone)} opens after graduation.`;
    case 'unlock': return q.unlockHint ?? 'Locked by a deed not yet done.';
  }
}
