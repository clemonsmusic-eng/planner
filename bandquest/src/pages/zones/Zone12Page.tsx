import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import ChallengeModal from '../../components/ChallengeModal';
import BattleScreen from '../../components/BattleScreen';
import LiberationScene, { type LibBeat } from '../../components/LiberationScene';
import { ENEMIES } from '../../lib/enemies';
import type { Rating } from '../../types/game';

interface Room { id: string; title: string; type: string; description: string; xpBase: number; }
const PRACTICE_ROOMS: Room[] = [
  { id: 'z12_room_1', title: 'Practice Room I — Sight-Reading', type: 'prepared_performance', description: 'A Grade 6 excerpt slammed onto the stand. Ten seconds to study, then play it cold.', xpBase: 350 },
  { id: 'z12_room_2', title: 'Practice Room II — Rhythm Gauntlet', type: 'rhythm_performance', description: 'A brutal mixed-meter rhythm, looping faster each pass. Tap it back clean.', xpBase: 300 },
  { id: 'z12_room_3', title: 'Practice Room III — Aural: Everything', type: 'aural_chord_oracle', description: 'Modal, chromatic, extended chords — every ear-training trick at once. Name what you hear.', xpBase: 300 },
  { id: 'z12_room_4', title: 'Practice Room IV — Full Performance', type: 'prepared_performance', description: 'A full UIL concert-level passage. No mistakes hide in a room this quiet.', xpBase: 400 },
];

const SACRED_SCORE: Room = {
  id: 'z12_sacred_score', title: 'The Sacred Score', type: 'prepared_performance',
  description: 'The restored Grand Symphony Score, performed live against Vexus\'s phantom orchestra. This is the weapon. Good or better to end it.',
  xpBase: 2000,
};

const TRAPDOOR_BEATS: LibBeat[] = [
  { emoji: '⚙️', text: 'Ostinato shudders, throws sparks, and topples — and for a moment the path to the stage looks clear. Then its dying gears wrench one last lever, and the floor drops out from under you.' },
  { emoji: '🕳️', text: 'You fall — past the grand stage, down into the guts of the Hall: a labyrinth of basement practice rooms where Vexus drills his made things. The only way back up is through.' },
];

function endingBeats(rating: Rating): LibBeat[] {
  const epilogue: LibBeat =
    rating === 'superior' || rating === 'excellent'
      ? { emoji: '🌅', text: 'Color floods back across Symphonica, east to west, faster than the eye can follow — and the world remembers what it was. Vexus stands disarmed at the center of it, hearing, perhaps for the first time, what living musicians can do. The Composer is blameless; the Maestros are free; and you — a student who began with three notes — have given the world its music back.' }
      : rating === 'good'
      ? { emoji: '🌄', text: 'Color seeps back across Symphonica, slow and certain, like spring arriving late. Vexus stands disarmed, silent, unconvinced — but stopped. The Maestros are free, the Score is restored, and the world breathes again. There is work yet to do. There always is. But the music plays.' }
      : { emoji: '🌫️', text: 'The restoration takes hold unevenly — color returning in patches, a scar of silence here and there where the corruption ran deepest. But it holds. Vexus is stopped, the Score is whole, and Symphonica will heal in time. You did what no one else could.' };
  return [
    { emoji: '🎼', text: "Vexus raises his baton over a hundred soulless instruments — and you raise yours. The restored Grand Symphony Score answers his dissonance with living music: ten freed Maestros and one student, playing as one." },
    { emoji: '💥', text: 'The tritone that has hung over the world since the Renewal finally resolves. Vexus\'s phantom orchestra falls silent, one instrument at a time, until only the true Score remains. The baton stills in his hand.' },
    epilogue,
    { emoji: '🎓', text: 'The faculty will argue for years about what to do with Vexus. The freed Maestros return to Harmonia Academy. And next fall, a new class of frightened, hopeful students will pick up their instruments for the very first time — in a world that still has music in it, because of you.' },
  ];
}

type BattleKind = 'usher' | 'knight' | 'kije' | 'mesto' | 'grave' | 'vexus';
const BATTLE_ENEMIES: Record<BattleKind, string[]> = {
  usher: ['ostinato_usher'], knight: ['vexian_knight', 'vexian_knight'], kije: ['lieutenant_kije'],
  mesto: ['commander_mesto'], grave: ['general_grave'], vexus: ['vexus'],
};
const BATTLE_DONE: Record<BattleKind, string> = {
  usher: 'z12_usher', knight: 'z12_knight', kije: 'z12_kije',
  mesto: 'z12_mesto', grave: 'z12_grave', vexus: 'z12_vexus_phase1',
};

export default function Zone12Page() {
  const { character, awardChallenge, addSummonPoints } = useGameStore();
  const navigate = useNavigate();

  const [activeBattle, setActiveBattle] = useState<BattleKind | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [cutscene, setCutscene] = useState<'trapdoor' | null>(null);
  const [finalOpen, setFinalOpen] = useState(false);
  const [finalFailed, setFinalFailed] = useState(false);
  const [ending, setEnding] = useState<Rating | null>(null);

  if (!character) return null;
  const done = character.completedChallenges;
  const has = (k: string) => done.includes(k);

  const usherDone = has('z12_usher');
  const roomsDone = PRACTICE_ROOMS.every((r) => has(r.id));
  const knightDone = has('z12_knight');
  const basementClear = roomsDone && knightDone;
  const kijeDone = has('z12_kije'), mestoDone = has('z12_mesto'), graveDone = has('z12_grave');
  const trioDone = kijeDone && mestoDone && graveDone;
  const vexusP1Done = has('z12_vexus_phase1');
  const complete = has('z12_complete');

  async function handleVictory(_rp: number, spDelta: number) {
    if (spDelta !== 0) await addSummonPoints(spDelta);
    const b = activeBattle;
    setActiveBattle(null);
    if (!b) return;
    await awardChallenge(BATTLE_DONE[b], 'zone_boss', 100, 'superior');
    if (b === 'usher') setCutscene('trapdoor');
    if (b === 'vexus') { setFinalFailed(false); setFinalOpen(true); }
  }

  async function handleRoomComplete(rating: Rating, score: number) {
    if (!activeRoom) return;
    await awardChallenge(activeRoom.id, 'side_quest', score, rating);
    setActiveRoom(null);
  }

  async function handleFinalComplete(rating: Rating, score: number) {
    const passed = rating === 'good' || rating === 'excellent' || rating === 'superior';
    if (passed) {
      await awardChallenge('z12_complete', 'zone_boss', score, rating);
      setFinalOpen(false);
      setEnding(rating);
    } else {
      await awardChallenge('z12_sacred_score', 'zone_boss', score, rating, { trackCompletion: false });
      setFinalOpen(false);
      setFinalFailed(true);
    }
  }

  // ── Full-screen takeovers ──
  if (activeBattle) {
    return (
      <BattleScreen
        character={character}
        enemies={BATTLE_ENEMIES[activeBattle].map((k) => ENEMIES[k])}
        onVictory={handleVictory}
        onDefeat={() => setActiveBattle(null)}
      />
    );
  }
  if (cutscene === 'trapdoor') {
    return <LiberationScene beats={TRAPDOOR_BEATS} title="The Failsafe" doneLabel="Descend →" onDone={() => setCutscene(null)} />;
  }
  if (ending) {
    return <LiberationScene beats={endingBeats(ending)} title="Symphonica Restored" doneLabel="Return home →" onDone={() => navigate('/hub')} />;
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative bg-gradient-to-b from-discord-crimson/30 to-transparent px-4 pt-8 pb-6">
        <button onClick={() => navigate('/hub')} className="text-academy-cream/40 hover:text-academy-cream/80 text-sm mb-4 flex items-center gap-1 transition-colors">← Hub</button>
        <div className="text-academy-gold/60 text-xs tracking-[0.4em] uppercase font-fantasy mb-1">Zone 12 · Act III · Quarter 12 · The End</div>
        <h1 className="fantasy-title text-2xl text-academy-cream mb-2">The Hall of Discord</h1>
        <p className="text-academy-cream/60 text-sm leading-relaxed">
          Black stone and deep crimson, harsh spotlights and gold gone to rot. Somewhere above, on
          the grand stage, Vexus conducts an orchestra with no players. Everything you have ever
          learned has led to this room.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Stage 1 — The Usher */}
        <Stage label="The Foyer" active={!usherDone} done={usherDone}>
          <Foe icon="⚙️" name="Ostinato, the Usher"
            desc="A towering brass-and-gear automaton built to throw unwelcome guests out of the Hall. It never tires and never varies."
            cleared={usherDone} onFight={() => setActiveBattle('usher')} fightLabel="Battle" />
        </Stage>

        {/* Stage 2 — The basement practice rooms */}
        {usherDone && (
          <Stage label="The Basement · Practice Rooms" active={!basementClear} done={basementClear}>
            <p className="text-academy-cream/45 text-xs mb-3">Each room tests a different skill. Clear them all, then break the knight guarding the studio door.</p>
            {PRACTICE_ROOMS.map((r) => (
              <div key={r.id} className="card-panel mb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-academy-cream/80 text-sm font-semibold mb-1">🚪 {r.title}</div>
                    <div className="text-academy-cream/50 text-xs">{r.description}</div>
                  </div>
                  {has(r.id) ? <span className="text-rating-superior text-lg flex-shrink-0">✓</span>
                    : <button onClick={() => setActiveRoom(r)} className="btn-secondary text-xs py-2 px-3 flex-shrink-0">Enter</button>}
                </div>
              </div>
            ))}
            <div className={`card-panel mb-2 ${roomsDone ? 'border-discord-crimson/40' : 'border-discord-crimson/15 opacity-60'}`}>
              <div className="text-xs text-discord-crimson uppercase tracking-widest font-fantasy mb-2">Studio Door</div>
              <Foe icon="⚔️" name="Vexian Knight"
                desc="One of Vexus's elite, guarding the large rehearsal studio."
                locked={!roomsDone} lockedNote="(Clear all four rooms first)"
                cleared={knightDone} onFight={() => setActiveBattle('knight')} fightLabel="Battle" />
            </div>
          </Stage>
        )}

        {/* Stage 3 — The Tritone Trio */}
        {basementClear && (
          <Stage label="The Rehearsal Studio · The Tritone Trio" active={!trioDone} done={trioDone}>
            <p className="text-academy-cream/45 text-xs mb-3">Three player-less automatons forming a tritone — Vexus's elite. Break them apart, lowest voice last.</p>
            <Foe icon="🎵" name="Lieutenant Kije (piccolo)" desc="The shrill high voice of the Trio."
              cleared={kijeDone} onFight={() => setActiveBattle('kije')} fightLabel="Battle" />
            <Foe icon="🎵" name="Commander Mesto (English horn)" desc="The mournful inner voice."
              locked={!kijeDone} lockedNote="(Silence Kije first)"
              cleared={mestoDone} onFight={() => setActiveBattle('mesto')} fightLabel="Battle" />
            <Foe icon="🎵" name="General Grave (contrabassoon)" desc="The crushing low voice — Vexus's second, and the Trio's leader."
              locked={!mestoDone} lockedNote="(Silence Mesto first)"
              cleared={graveDone} onFight={() => setActiveBattle('grave')} fightLabel="Battle" />
          </Stage>
        )}

        {/* Stage 4 — Vexus */}
        {trioDone && (
          <Stage label="The Stage · Vexus" active={!complete} done={complete}>
            {!vexusP1Done ? (
              <Foe icon="🎻" name="Vexus, the Conductor"
                desc="Phase 1 — the Atonal Assault. Beat back his phantom orchestra of player-less instruments."
                cleared={false} onFight={() => setActiveBattle('vexus')} fightLabel="Battle" />
            ) : !complete ? (
              <div className="card-panel border-academy-gold/50">
                <div className="text-xs text-academy-gold uppercase tracking-widest font-fantasy mb-2">Phase 2 — The Reclamation</div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-academy-cream/80 text-sm font-semibold mb-1">🎼 Perform the Sacred Score</div>
                    <div className="text-academy-cream/50 text-xs">
                      His orchestra is broken. Now answer it with living music — perform the restored Grand
                      Symphony Score. Good or better ends it.
                    </div>
                    {finalFailed && <div className="text-rating-poor text-xs mt-1">The dissonance drowns you out — steady yourself and play again.</div>}
                  </div>
                  <button onClick={() => { setFinalFailed(false); setFinalOpen(true); }} className="btn-primary text-xs py-2 px-3 flex-shrink-0">Perform</button>
                </div>
              </div>
            ) : (
              <div className="card-panel border-rating-superior/40 text-center py-6">
                <div className="text-4xl mb-2">🎼</div>
                <div className="fantasy-title text-lg text-academy-gold mb-1">Symphonica Restored</div>
                <div className="text-academy-cream/60 text-xs">You did it. The world has its music back.</div>
              </div>
            )}
          </Stage>
        )}
      </div>

      {activeRoom && (
        <ChallengeModal challenge={activeRoom} character={character} onComplete={handleRoomComplete} onClose={() => setActiveRoom(null)} />
      )}
      {finalOpen && (
        <ChallengeModal challenge={SACRED_SCORE} character={character} onComplete={handleFinalComplete} onClose={() => setFinalOpen(false)} />
      )}
    </div>
  );
}

function Stage({ label, active, done, children }: { label: string; active: boolean; done: boolean; children: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h2 className={`fantasy-title text-sm uppercase tracking-widest ${done ? 'text-rating-superior/70' : active ? 'text-discord-crimson/80' : 'text-academy-cream/40'}`}>{label}</h2>
        {done && <span className="text-rating-superior text-sm">✓</span>}
      </div>
      {children}
    </div>
  );
}

function Foe({ icon, name, desc, cleared, onFight, fightLabel, locked, lockedNote }: {
  icon: string; name: string; desc: string; cleared: boolean; onFight: () => void; fightLabel: string;
  locked?: boolean; lockedNote?: string;
}) {
  return (
    <div className={`card-panel mb-2 ${locked ? 'opacity-60 border-discord-crimson/15' : cleared ? 'border-rating-superior/30' : 'border-discord-crimson/40'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-academy-cream/80 text-sm font-semibold mb-1">{icon} {name}</div>
          <div className="text-academy-cream/50 text-xs">{desc}{locked && lockedNote && <span className="text-academy-gold/50"> {lockedNote}</span>}</div>
        </div>
        {cleared ? <span className="text-rating-superior text-lg flex-shrink-0">✓</span>
          : !locked ? <button onClick={onFight} className="btn-danger text-xs py-2 px-3 flex-shrink-0">{fightLabel}</button> : null}
      </div>
    </div>
  );
}
