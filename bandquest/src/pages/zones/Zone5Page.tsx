import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import LiberationScene, { type LibBeat } from '../../components/LiberationScene';
import { useClassmateRecruitment } from '../../components/ClassmateRecruitment';
import { useNpcQuestOffers } from '../../components/NpcQuestOffer';
import { MAESTRO_PORTRAITS } from '../../lib/portraits';
import { ENEMIES } from '../../lib/enemies';
import type { Rating } from '../../types/game';

const LIBERATION_BEATS: Record<'flaura' | 'buccina', LibBeat[]> = {
  flaura: [
    {
      emoji: '🪈',
      text: "The Aria Wraith's endless note finally cracks and falls silent. The shard tears loose, and Maestra Flaura — your flute professor — sinks into the dead field, herself again.",
    },
    {
      emoji: '🎶',
      image: MAESTRO_PORTRAITS.syrinx, text: "\"Oh, child… what did he do to us.\" She folds the spent shard into your hand. \"Each of us is carrying one. It rides our music and twists it — but free us, and it comes loose, just like this. Find the others. Please.\" From now on, you can summon Flaura in battle.",
    },
  ],
  buccina: [
    {
      emoji: '🎺',
      text: "The War Horn Berserker's charge collapses mid-blast. Maestro Cornelius staggers, blinking, the shard burning out in your palm.",
    },
    {
      emoji: '🥁',
      image: MAESTRO_PORTRAITS.salpinx, text: "\"You're one of mine — good.\" He shoulders his trumpet and looks west. \"I'm not staying behind. My brother Waldhorn was on that stage too, and I'm going to find him.\" Cornelius joins you on the road — and answers your summons in battle.",
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
      id: 'z5_db_scale',
      title: 'Concert Db Major Scale',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 5 · Scales',
      description: 'Play the Concert Db major scale — five flats. Take it slowly and watch your key signature.',
      required: true,
      completed: completed.includes('z5_db_scale'),
      xpBase: 150,
    },
    {
      id: 'z5_c_scale',
      title: 'Concert C Major Scale',
      type: 'technique_scale',
      uilStandard: 'UIL Zone 5 · Scales',
      description: 'Play the Concert C major scale. No sharps, no flats — but no easier for it.',
      required: true,
      completed: completed.includes('z5_c_scale'),
      xpBase: 150,
    },
    {
      id: 'z5_sixteenths',
      title: 'Rhythm: Sixteenth-Note Patterns',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 5 · Rhythm',
      description: 'Tap a simple sixteenth-note pattern. Keep the subdivisions even.',
      required: true,
      completed: completed.includes('z5_sixteenths'),
      xpBase: 150,
    },
    {
      id: 'z5_cut_time',
      title: 'Rhythm: Cut Time',
      type: 'rhythm_performance',
      uilStandard: 'UIL Zone 5 · Rhythm',
      description: 'Tap a pattern in cut time (2/2). Feel the half-note pulse, not the quarter.',
      required: true,
      completed: completed.includes('z5_cut_time'),
      xpBase: 150,
    },
    {
      id: 'z5_articulations',
      title: 'Articulation: Accent · Staccato · Tenuto',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 5 · Articulation',
      description: 'Perform a phrase that moves through accent (>), staccato (·), and tenuto (—) markings.',
      required: true,
      completed: completed.includes('z5_articulations'),
      xpBase: 150,
    },
    {
      id: 'z5_aural_p5',
      title: 'Aural: Intervals to a Perfect 5th',
      type: 'aural_interval_quest',
      uilStandard: 'UIL Zone 5 · Aural',
      description: 'Identify intervals up to a perfect fifth by ear: 2nds, 3rds, the 4th and the 5th.',
      required: true,
      completed: completed.includes('z5_aural_p5'),
      xpBase: 75,
    },
    {
      id: 'z5_scale_patterns',
      title: 'Aural: Recognizing Scale Patterns',
      type: 'aural_melody_mapper',
      uilStandard: 'UIL Zone 5 · Aural',
      description: 'Listen to a short run and identify which scale pattern it traces.',
      required: false,
      completed: completed.includes('z5_scale_patterns'),
      xpBase: 75,
    },
    {
      id: 'z5_festival_gig',
      title: 'Festival Gig at Legato',
      type: 'prepared_performance',
      uilStandard: 'UIL Zone 5 · Performance',
      description: 'The Village of Legato is throwing a harvest festival. Play a set for the crowd — a little normalcy in a frightened world.',
      required: false,
      completed: completed.includes('z5_festival_gig'),
      xpBase: 300,
    },
  ];
}

type BattleKind = 'skirmish' | 'flaura' | 'buccina';

export default function Zone5Page() {
  const { character, awardChallenge, advanceZone, freeAlly, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [lastRating, setLastRating] = useState<{ id: string; rating: Rating } | null>(null);
  const [activeBattle, setActiveBattle] = useState<BattleKind | null>(null);
  const [liberation, setLiberation] = useState<'flaura' | 'buccina' | null>(null);
  const recruitment = useClassmateRecruitment(5);
  const npcOffers = useNpcQuestOffers(5);

  if (!character) return null;
  if (recruitment) return recruitment;
  if (npcOffers) return npcOffers;

  const challenges = buildChallenges(character.completedChallenges);
  const required = challenges.filter((c) => c.required);
  const optional = challenges.filter((c) => !c.required);
  const completedRequired = required.filter((c) => c.completed).length;
  const allRequiredDone = completedRequired === required.length;

  const skirmishDone = character.completedChallenges.includes('z5_skirmish');
  const flauraFreed = character.freedAllies.includes('syrinx');
  const corneliusFreed = character.freedAllies.includes('salpinx');
  const flauraUnlocked = completedRequired >= 3;
  const canAdvance = flauraFreed && corneliusFreed && allRequiredDone;

  async function handleChallengeComplete(rating: Rating, score: number) {
    if (!activeChallenge) return;
    await awardChallenge(activeChallenge.id, activeChallenge.type, score, rating);
    setLastRating({ id: activeChallenge.id, rating });
    setActiveChallenge(null);
  }

  async function handleVictory(kind: BattleKind, _rp: number, spDelta: number) {
    if (spDelta !== 0) await addSummonPoints(spDelta);
    setActiveBattle(null);
    if (kind === 'skirmish') {
      await awardChallenge('z5_skirmish', 'mini_boss', 100, 'superior');
    } else {
      setLiberation(kind);
    }
  }

  async function finishLiberation() {
    if (liberation === 'flaura') {
      await freeAlly('syrinx');
      await awardChallenge('z5_flaura_freed', 'zone_boss', 100, 'superior');
    } else if (liberation === 'buccina') {
      await freeAlly('salpinx');
      await awardChallenge('z5_buccina_freed', 'zone_boss', 100, 'superior');
    }
    setLiberation(null);
  }

  if (activeBattle) {
    const battleEnemies =
      activeBattle === 'skirmish' ? [ENEMIES.stray_melody, ENEMIES.stray_melody] :
      activeBattle === 'flaura'   ? [ENEMIES.aria_wraith] :
                                    [ENEMIES.war_horn_berserker];
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
      <div className="relative bg-gradient-to-b from-amber-800/30 to-transparent px-4 pt-8 pb-6">
        <button
          onClick={() => navigate('/hub')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Hub
        </button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">
          Zone 5 · Act II · Quarter 5
        </div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">Melodious Meadows</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          Warm, golden farmland where music still rides the wind — but the closer you come to a
          corrupted master, the more the breeze sours and bends. Two of your own professors are out
          here somewhere, lost to the Shattering. Listen for them.
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

        <div className="card-panel mb-6 border-amber-700/30 bg-amber-900/10">
          <div className="text-xs text-academy-gold/60 uppercase tracking-widest font-fantasy mb-2">Story</div>
          <p className="text-academy-cream/70 text-sm leading-relaxed italic">
            The caravan rolls into the Village of Legato at dusk. The townsfolk are grey and slow,
            moving through chores they've forgotten the point of. But when you lift your instrument,
            a few of them look up — really look up — for the first time in days. Valeria sets a hand
            on your shoulder. "That. That's why we still have a chance. Now — your teachers are out
            there, and they won't know you. Be ready."
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

        {/* Combat — Act 2 introduces real stakes */}
        <h2 className="fantasy-title text-sm text-discord-crimson/70 uppercase tracking-widest mb-1">Twisted Melodies</h2>
        <p className="text-academy-cream/40 text-xs mb-3">
          Combat is real now — your HP is on the line. Fall in battle and you'll retreat to safety
          and can try again.
        </p>

        {/* Skirmish */}
        <div className="card-panel mb-2 border-discord-crimson/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎵 Stray Melody</div>
              <div className="text-academy-cream/50 text-xs">
                A player-less scrap of music drifting the fields. A good chance to find your footing
                in a real fight.
              </div>
            </div>
            {!skirmishDone ? (
              <button onClick={() => setActiveBattle('skirmish')} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Fight</button>
            ) : (
              <span className="text-rating-superior text-lg flex-shrink-0">✓</span>
            )}
          </div>
        </div>

        {/* Flaura — The Aria Wraith */}
        <div className={`card-panel mb-2 ${flauraUnlocked ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🪈 The Aria Wraith</div>
              <div className="text-academy-cream/50 text-xs">
                Your flute professor, Maestra Flaura — now a single endless note over a field of dead
                crops she won't let fall.
                {!flauraUnlocked && <span className="text-academy-gold/50"> (Complete 3 required challenges to track her)</span>}
              </div>
              {flauraFreed && (
                <div className="text-rating-good text-xs mt-1.5 italic">
                  Freed. Flaura travels with the caravan — and answers your summons in battle.
                </div>
              )}
            </div>
            {flauraUnlocked && !flauraFreed && (
              <button onClick={() => setActiveBattle('flaura')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>
            )}
            {flauraFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Cornelius — The War Horn Berserker */}
        <div className={`card-panel mb-2 ${flauraFreed ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
          <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Corrupted Maestro</div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎺 The War Horn Berserker</div>
              <div className="text-academy-cream/50 text-xs">
                At the Monument of the Fallen March — your trumpet professor, Maestro Cornelius, sounding
                an endless charge.
                {!flauraFreed && <span className="text-academy-gold/50"> (Free Flaura first — follow the sound)</span>}
              </div>
              {corneliusFreed && (
                <div className="text-rating-good text-xs mt-1.5 italic">
                  Freed. Cornelius joins you on the road, searching for his brother — and answers your summons.
                </div>
              )}
            </div>
            {flauraFreed && !corneliusFreed && (
              <button onClick={() => setActiveBattle('buccina')} className="btn-danger text-xs py-2 px-3 flex-shrink-0">Battle</button>
            )}
            {corneliusFreed && <span className="text-rating-superior text-lg flex-shrink-0">✓</span>}
          </div>
        </div>

        {/* Advance */}
        {(flauraFreed && corneliusFreed) && (
          <div className={`card-panel mt-4 ${canAdvance ? 'border-academy-gold/50' : 'border-academy-gold/20'}`}>
            <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">Quarter's End</div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-academy-cream/80 text-sm font-semibold mb-1">The road south opens</div>
                <div className="text-academy-cream/50 text-xs">
                  Two professors freed, two Noteshards reclaimed. The reclaimed shards tug westward,
                  toward the Sands of Time.
                  {!allRequiredDone && <span className="text-academy-gold/50"> (Finish your required challenges first)</span>}
                </div>
              </div>
              {canAdvance && (
                <button
                  onClick={async () => { await advanceZone(6); navigate('/hub'); }}
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
    aural_rhythm_echo: '🔊', aural_interval_quest: '🎶', aural_melody_mapper: '🎶',
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
