import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import LiberationScene, { type LibBeat } from '../../components/LiberationScene';
import { MAESTRO_PORTRAITS } from '../../lib/portraits';
import { ENEMIES } from '../../lib/enemies';
import type { Rating } from '../../types/game';

const LIBERATION_BEATS: Record<'bassetta' | 'caucophonus', LibBeat[]> = {
  bassetta: [
    {
      emoji: '🎵',
      text: "Bassetto's three registers collapse into one and fall still. The shard drops from the air, and Maestro Clarence — your clarinet professor — lands lightly on the cave floor, scowling… then softening as he recognizes you.",
    },
    {
      emoji: '🎶',
      image: MAESTRO_PORTRAITS.chalumeau, text: "\"Took you long enough.\" The scowl breaks into a crooked grin. \"…thank you. I could hear myself the whole time and couldn't stop.\" He falls into step beside you. From now on, you can summon Clarence in battle.",
    },
  ],
  caucophonus: [
    {
      emoji: '🥁',
      text: "Caucophonus's hammering stutters, skips a beat — and stops. The shard sputters out, and Maestra Paige blinks at the workshop of cursed goods around her with dawning horror.",
    },
    {
      emoji: '🛠️',
      image: MAESTRO_PORTRAITS.percival, text: "\"…I made all this?\" She sweeps the bench clean. \"Right. I'm headed back to Concerta to set up properly — a real forge, the Grand Artificer's workshop. Bring me what you scavenge and I'll make it worth your while.\" You can summon Paige in battle.",
    },
  ],
};

interface Challenge {
  id: string;
  title: string;
  type: string;
  uilStandard: string;
  description: string;
  required: boolean;
  completed: boolean;
  xpBase: number;
}

function buildChallenges(completed: string[]): Challenge[] {
  return [
    {
      id: 'z6_all_scales',
      title: 'All Concert Scales',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 6 · Scales',
      description: 'Play the full set of concert scales back-to-back: Bb, Eb, Ab, Db, F, C, and G major.',
      required: true,
      completed: completed.includes('z6_all_scales'),
      xpBase: 200,
    },
    {
      id: 'z6_sixteenth_combos',
      title: 'Rhythm: Sixteenth-Note Combinations',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 6 · Rhythm',
      description: 'Tap mixed sixteenth-and-eighth combinations. Keep the inner subdivision steady.',
      required: true,
      completed: completed.includes('z6_sixteenth_combos'),
      xpBase: 150,
    },
    {
      id: 'z6_compound_68',
      title: 'Rhythm: Compound Meter (6/8)',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 6 · Rhythm',
      description: 'Tap a pattern in 6/8 — two big beats, each split into three.',
      required: true,
      completed: completed.includes('z6_compound_68'),
      xpBase: 150,
    },
    {
      id: 'z6_sightreading_23',
      title: 'Sight-Reading: Grade 2–3 Excerpt',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 6 · Sight-Reading',
      description: 'A Grade 2–3 excerpt. Study time: 30 seconds. Then perform it cold.',
      required: true,
      completed: completed.includes('z6_sightreading_23'),
      xpBase: 225,
    },
    {
      id: 'z6_aural_intervals',
      title: 'Aural: m2, M2, M3',
      type: 'aural_interval_quest',
      uilStandard: 'UIL Zone 6 · Aural',
      description: 'Identify minor 2nds, major 2nds, and major 3rds by ear.',
      required: true,
      completed: completed.includes('z6_aural_intervals'),
      xpBase: 75,
    },
    {
      id: 'z6_aural_chords',
      title: 'Aural: Major vs. Minor Chords',
      type: 'aural_chord_oracle',
      uilStandard: 'UIL Zone 6 · Aural',
      description: 'Hear a chord and name its quality — major or minor.',
      required: true,
      completed: completed.includes('z6_aural_chords'),
      xpBase: 75,
    },
    {
      id: 'z6_octoasis',
      title: 'The Octoasis',
      type: 'aural_melody_mapper',
      uilStandard: 'UIL Zone 6 · Theory',
      description: 'Eight little pools, one octave of water. Step them in the right scale-degree order to drink — a desert puzzle.',
      required: false,
      completed: completed.includes('z6_octoasis'),
      xpBase: 150,
    },
    {
      id: 'z6_nomad_set',
      title: 'A Set for the Nomads',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 6 · Performance',
      description: 'A caravan of desert nomads shares their fire. Play them a set in thanks.',
      required: false,
      completed: completed.includes('z6_nomad_set'),
      xpBase: 300,
    },
  ];
}

type BattleKind = 'phantom_low' | 'phantom_high' | 'bassetta' | 'caucophonus';

export default function Zone6Page() {
  const { character, awardChallenge, advanceZone, freeAlly, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<BattleKind | null>(null);
  const [liberation, setLiberation] = useState<'bassetta' | 'caucophonus' | null>(null);

  if (!character) return null;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;

  const lowDone = character.completedChallenges.includes('z6_caves_low');
  const highDone = character.completedChallenges.includes('z6_caves_high');
  const clarenceFreed = character.freedAllies.includes('chalumeau');
  const paigeFreed = character.freedAllies.includes('percival');
  const bassettaUnlocked = completedRequired >= 3;
  const canAdvance = clarenceFreed && paigeFreed && allRequiredDone;

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleVictory(kind: BattleKind, _rp: number, spDelta: number) {
    if (spDelta !== 0) await addSummonPoints(spDelta);
    setActiveBattle(null);
    if (kind === 'phantom_low') await awardChallenge('z6_caves_low', 'mini_boss', 100, 'superior');
    else if (kind === 'phantom_high') await awardChallenge('z6_caves_high', 'mini_boss', 100, 'superior');
    else setLiberation(kind);
  }

  async function finishLiberation() {
    if (liberation === 'bassetta') {
      await freeAlly('chalumeau');
      await awardChallenge('z6_claribel_freed', 'zone_boss', 100, 'superior');
    } else if (liberation === 'caucophonus') {
      await freeAlly('percival');
      await awardChallenge('z6_percival_freed', 'zone_boss', 100, 'superior');
    }
    setLiberation(null);
  }

  if (activeBattle) {
    const battleEnemies =
      activeBattle === 'phantom_low'  ? [ENEMIES.chalumeau_phantom, ENEMIES.chalumeau_phantom] :
      activeBattle === 'phantom_high' ? [ENEMIES.clarion_phantom, ENEMIES.clarion_phantom] :
      activeBattle === 'bassetta'     ? [ENEMIES.bassetta] :
                                        [ENEMIES.caucophonus];
    return (
      <BattleScreen
        character={character}
        enemies={battleEnemies}
        onVictory={(rp, sp) => handleVictory(activeBattle, rp, sp)}
        onDefeat={() => setActiveBattle(null)}
      />
    );
  }

  if (liberation) {
    return <LiberationScene beats={LIBERATION_BEATS[liberation]} onDone={finishLiberation} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-orange-900/30 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">
          Zone 6 · Act II · Quarter 6
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">Sands of Time</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          A desert of shifting dunes where the hours run slow and strange. Rest at the Octoasis,
          descend the echoing Chaconne Caves, and cross the sands to the trading post at the far
          edge — where something is stamping out cursed goods by the cartload.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="card-panel mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-academy-cream/70 text-sm font-fantasy">Required Challenges</span>
            <span className="text-academy-gold font-fantasy">{completedRequired} / {required.length}</span>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill bg-academy-gold" style={{ width: `${(completedRequired / required.length) * 100}%` }} />
          </div>
        </div>

        <div className="card-panel mb-6 border-orange-700/30 bg-orange-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            Two reclaimed shards hum in your pack, and they will not sit still — they strain westward,
            toward the desert, toward their own. Somewhere out in the Sands of Time, two more of your
            professors are lost: one wandering the Chaconne Caves with a wail that splits the air, and
            one chained to a workbench, building ruin without end.
          </p>
        </div>

        {lastRating && (
          <div className="card-panel mb-4 text-center"><RatingBadge rating={lastRating.rating} /></div>
        )}

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Required Challenges</h2>
        <div className="space-y-2 mb-8">
          {required.map((c) => (
            <ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />
          ))}
        </div>

        <h2 className="fantasy-title text-sm text-academy-gold/70 uppercase tracking-widest mb-3">Optional Challenges</h2>
        <div className="space-y-2 mb-8">
          {optional.map((c) => (
            <ChallengeRow key={c.id} challenge={c} onStart={() => setActiveChallenge(c)} />
          ))}
        </div>

        {/* The Chaconne Caves */}
        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1">The Chaconne Caves</h2>
        <p className="text-academy-cream/40 text-xs mb-3">
          A repeating bass drone echoes through the dark. Register Phantoms — chalumeau, throat-tone,
          clarion, altissimo — drift the caverns. Clear a path to reach what wails in the depths.
        </p>

        <div className="card-panel mb-2 border-discord-crimson/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎵 Lower Caves — Chalumeau Phantoms</div>
              <div className="text-academy-cream/50 text-xs">Low, droning shapes in the deep dark. Heavy, but slow.</div>
            </div>
            {!lowDone ? (
              <button onClick={() => setActiveBattle('phantom_low')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>
            ) : (<span className="text-rating-superior text-lg flex-shrink-0">✓</span>)}
          </div>
        </div>

        <div className="card-panel mb-2 border-discord-crimson/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🔺 Upper Caves — Clarion Phantoms</div>
              <div className="text-academy-cream/50 text-xs">Bright, piercing, quick. Mind your accuracy.</div>
            </div>
            {!highDone ? (
              <button onClick={() => setActiveBattle('phantom_high')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>
            ) : (<span className="text-rating-superior text-lg flex-shrink-0">✓</span>)}
          </div>
        </div>

        {/* Bassetto — Clarence */}
        <div className={`card-panel mb-2 mt-3 ${bassettaUnlocked ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎶 Bassetto</div>
              <div className="text-academy-cream/50 text-xs">
                Deep in the caves — your clarinet professor, Maestro Clarence, scattered across every
                register, lashing out at anyone who nears.
                {!bassettaUnlocked && <span className="text-academy-gold/50"> (Complete 3 required challenges to track her)</span>}
              </div>
              {clarenceFreed && (
                <div className="text-rating-good text-xs mt-1.5 italic">Freed. Clarence travels with you — and answers your summons.</div>
              )}
            </div>
            {bassettaUnlocked && !clarenceFreed && (
              <button onClick={() => setActiveBattle('bassetta')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>
            )}
            {clarenceFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Caucophonus — Paige */}
        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1 mt-6">The Caesura Crossing</h2>
        <p className="text-academy-cream/40 text-xs mb-3">The desert's far edge — a trading post that should not still be running.</p>
        <div className={`card-panel mb-2 ${clarenceFreed ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🥁 Caucophonus</div>
              <div className="text-academy-cream/50 text-xs">
                Your percussion professor, Maestra Paige, chained to a workbench by her own rhythm,
                stamping out discord-laced goods without end.
                {!clarenceFreed && <span className="text-academy-gold/50"> (Free Clarence first — follow the shards)</span>}
              </div>
              {paigeFreed && (
                <div className="text-rating-good text-xs mt-1.5 italic">Freed. Paige heads to Concerta to become the Grand Artificer — and answers your summons.</div>
              )}
            </div>
            {clarenceFreed && !paigeFreed && (
              <button onClick={() => setActiveBattle('caucophonus')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>
            )}
            {paigeFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Advance */}
        {(clarenceFreed && paigeFreed) && (
          <div className={`card-panel mt-4 ${canAdvance ? 'border-academy-gold/50' : 'border-academy-gold/20'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">Quarter's End</div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">The sands give way to stone</div>
                <div className="text-academy-cream/50 text-xs">
                  Four shards reclaimed. The pull leads up, into the cold passes of the Clef Cliffs —
                  and the first real foothold of Vexus's forces.
                  {!allRequiredDone && <span className="text-academy-gold/50"> (Finish your required challenges first)</span>}
                </div>
              </div>
              {canAdvance && (
                <button
                  onClick={async () => { await advanceZone(7); navigate('/hub'); }}
                  className="btn-primary text-xs py-2 px-3 flex-shrink-0"
                >
                  Set out →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {activeChallenge && (
        <ChallengeModal
          challenge={activeChallenge}
          character={character}
          onComplete={handleChallengeComplete}
          onClose={() => setActiveChallenge(null)}
        />
      )}
    </div>
  );
}

function ChallengeRow({ challenge, onStart }: { challenge: Challenge; onStart: () => void }) {
  const typeIcon: Record<string, string> = {
    technique_scale: '🎼', prepared_performance: '🎵',
    rhythm_performance: '🥁', aural_pitch_spy: '👂',
    aural_rhythm_echo: '🔊', aural_interval_quest: '🎶',
    aural_melody_mapper: '🎶', aural_chord_oracle: '🎵',
  };
  return (
    <button
      onClick={onStart}
      className={`w-full card-panel py-3 px-4 flex items-center gap-4 text-left transition-all hover:border-academy-gold/40
        ${challenge.completed ? 'opacity-60' : 'cursor-pointer'}`}
    >
      <div className="text-xl flex-shrink-0">{typeIcon[challenge.type] ?? '🎵'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-academy-cream/90 text-sm font-semibold">{challenge.title}</span>
          {!challenge.required && (
            <span className="text-[10px] px-1.5 py-0.5 bg-academy-gold/10 text-academy-gold/60 rounded font-fantasy">Optional</span>
          )}
        </div>
        <div className="text-academy-cream/40 text-xs mt-0.5">{challenge.uilStandard}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-academy-cream/40 text-xs">{challenge.xpBase} XP</span>
        {challenge.completed ? <span className="text-rating-superior text-lg">✓</span> : <span className="text-academy-gold/60 text-sm">→</span>}
      </div>
    </button>
  );
}

function RatingBadge({ rating }: { rating: Rating }) {
  const config: Record<Rating, { label: string; color: string }> = {
    superior: { label: 'SUPERIOR', color: '#FFD700' },
    excellent: { label: 'EXCELLENT', color: '#4ADE80' },
    good: { label: 'GOOD', color: '#60A5FA' },
    fair: { label: 'FAIR', color: '#FB923C' },
    poor: { label: 'POOR', color: '#F87171' },
  };
  const { label, color } = config[rating];
  return (
    <div className="inline-block font-fantasy text-3xl font-black tracking-widest py-2 px-6" style={{ color, textShadow: `0 0 20px ${color}60` }}>
      {label}
    </div>
  );
}
