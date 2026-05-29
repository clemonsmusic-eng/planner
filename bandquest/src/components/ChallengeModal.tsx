import { useState, useEffect, useRef } from 'react';
import type { Character, Rating } from '../types/game';
import { pitchToleranceCents, rhythmToleranceMs } from '../lib/instruments';
import MicrophoneListener from './MicrophoneListener';

interface Challenge {
  id: string;
  title: string;
  type: string;
  description: string;
  xpBase: number;
}

interface Props {
  challenge: Challenge;
  character: Character;
  onComplete: (rating: Rating, score: number) => void;
  onClose: () => void;
}

export default function ChallengeModal({ challenge, character, onComplete, onClose }: Props) {
  const [phase, setPhase] = useState<'intro' | 'challenge' | 'result'>('intro');
  const [rating, setRating] = useState<Rating | null>(null);
  const [score, setScore] = useState(0);

  function handleRating(r: Rating, s: number) {
    setRating(r);
    setScore(s);
    setPhase('result');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={phase === 'intro' ? onClose : undefined} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-academy-dark border border-academy-gold/30 rounded-t-2xl sm:rounded-2xl p-6 mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
        {phase === 'intro' && (
          <IntroPhase challenge={challenge} onStart={() => setPhase('challenge')} onClose={onClose} />
        )}
        {phase === 'challenge' && (
          <ActiveChallenge
            challenge={challenge}
            character={character}
            onRating={handleRating}
            onClose={onClose}
          />
        )}
        {phase === 'result' && rating && (
          <ResultPhase
            challenge={challenge}
            rating={rating}
            score={score}
            character={character}
            onContinue={() => onComplete(rating, score)}
          />
        )}
      </div>
    </div>
  );
}

function IntroPhase({ challenge, onStart, onClose }: {
  challenge: Challenge;
  onStart: () => void;
  onClose: () => void;
}) {
  const typeLabel: Record<string, string> = {
    technique_scale: 'Scale / Technique Challenge',
    prepared_performance: 'Prepared Performance',
    rhythm_performance: 'Rhythm Challenge',
    aural_pitch_spy: 'Aural: Pitch Spy',
    aural_rhythm_echo: 'Aural: Rhythm Echo',
    aural_melody_mapper: 'Aural: Melody Mapper',
    aural_interval_quest: 'Aural: Interval Quest',
    aural_chord_oracle: 'Aural: Chord Oracle',
  };

  return (
    <>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-academy-gold/60 text-xs uppercase tracking-widest font-fantasy mb-1">
            {typeLabel[challenge.type] ?? 'Challenge'}
          </div>
          <h2 className="fantasy-title text-xl">{challenge.title}</h2>
        </div>
        <button onClick={onClose} className="text-academy-cream/40 hover:text-academy-cream/80 text-xl ml-4 flex-shrink-0">
          ✕
        </button>
      </div>

      <p className="text-academy-cream/70 text-sm leading-relaxed mb-6">
        {challenge.description}
      </p>

      <div className="bg-black/30 border border-academy-gold/20 rounded-lg p-4 mb-6">
        <div className="text-academy-gold/60 text-xs uppercase tracking-widest font-fantasy mb-2">Rating Scale</div>
        <div className="space-y-1 text-xs text-academy-cream/60">
          <div><span className="text-rating-superior font-fantasy">SUPERIOR</span> — 100% XP</div>
          <div><span className="text-rating-excellent font-fantasy">EXCELLENT</span> — 80% XP</div>
          <div><span className="text-rating-good font-fantasy">GOOD</span> — 60% XP</div>
          <div><span className="text-rating-fair font-fantasy">FAIR</span> — 30% XP</div>
          <div><span className="text-rating-poor font-fantasy">POOR</span> — 10% XP</div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
        <button onClick={onStart} className="btn-primary flex-1">
          Begin
        </button>
      </div>
    </>
  );
}

function ActiveChallenge({ challenge, character, onRating, onClose }: {
  challenge: Challenge;
  character: Character;
  onRating: (rating: Rating, score: number) => void;
  onClose: () => void;
}) {
  const pitchTolerance = pitchToleranceCents(character.stats.accuracy);
  const rhythmTolerance = rhythmToleranceMs(character.stats.technique);

  // Route to appropriate challenge UI
  if (challenge.type === 'aural_pitch_spy') {
    return <PitchSpyChallenge onRating={onRating} />;
  }
  if (challenge.type === 'aural_rhythm_echo') {
    return <RhythmEchoChallenge onRating={onRating} />;
  }
  if (challenge.type === 'rhythm_performance') {
    return <RhythmTapChallenge onRating={onRating} tolerance={rhythmTolerance} />;
  }
  // Default: microphone-based performance challenge
  return (
    <PerformanceChallenge
      challenge={challenge}
      onRating={onRating}
      onClose={onClose}
      pitchTolerance={pitchTolerance}
    />
  );
}

// ── Performance Challenge (microphone) ──────────────────────────────────────

function PerformanceChallenge({ challenge, onRating, onClose, pitchTolerance }: {
  challenge: Challenge;
  onRating: (r: Rating, s: number) => void;
  onClose: () => void;
  pitchTolerance: number;
}) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [pitchScores, setPitchScores] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!listening) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finalize();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [listening]);

  function handlePitch(_freq: number, cents: number, _note: string) {
    const accuracy = Math.max(0, 100 - (Math.abs(cents) / pitchTolerance) * 100);
    setPitchScores((prev) => [...prev, accuracy]);
  }

  function finalize() {
    if (pitchScores.length === 0) {
      onRating('poor', 0);
      return;
    }
    const avg = pitchScores.reduce((a, b) => a + b, 0) / pitchScores.length;
    const rating = scoreToRating(avg);
    onRating(rating, Math.round(avg));
  }

  const avgScore = pitchScores.length > 0
    ? pitchScores.reduce((a, b) => a + b, 0) / pitchScores.length
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="fantasy-title text-lg">{challenge.title}</h3>
        <button onClick={onClose} className="text-academy-cream/40 hover:text-academy-cream/80">✕</button>
      </div>

      {/* Notation placeholder */}
      <div className="notation-display min-h-24 flex items-center justify-center mb-4">
        <div className="text-center text-academy-cream/40">
          <div className="text-4xl mb-2">𝄞</div>
          <p className="text-sm">Score notation loads here</p>
          <p className="text-xs mt-1">(Connected to ABC notation renderer in Phase 2)</p>
        </div>
      </div>

      {!listening ? (
        <button
          onClick={() => setListening(true)}
          className="btn-primary w-full"
        >
          Start Recording
        </button>
      ) : (
        <div>
          {/* Timer */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-academy-cream/60 text-sm">
              Time: <span className="text-academy-gold font-fantasy">{timeLeft}s</span>
            </div>
            <div className="text-academy-cream/60 text-sm">
              Score: <span className="text-academy-gold font-fantasy">{Math.round(avgScore)}%</span>
            </div>
          </div>

          {/* Pitch meter */}
          <div className="mb-4">
            <MicrophoneListener
              mode="pitch"
              onPitchDetected={handlePitch}
              active={listening}
            />
          </div>

          <button onClick={finalize} className="btn-secondary w-full">
            Submit Early
          </button>
        </div>
      )}
    </div>
  );
}

// ── Pitch Spy Challenge ───────────────────────────────────────────────────────

const PITCH_SPY_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'B4', 'C5'];

function PitchSpyChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const targetIndex = useRef(Math.floor(Math.random() * PITCH_SPY_NOTES.length));
  const target = PITCH_SPY_NOTES[targetIndex.current];
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  // Build 4 options including the target
  const options = buildOptions(target, PITCH_SPY_NOTES, 4);

  function pick(note: string) {
    if (answered) return;
    setSelected(note);
    setAnswered(true);
    const correct = note === target;
    setTimeout(() => onRating(correct ? 'superior' : 'poor', correct ? 100 : 0), 1200);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Pitch Spy</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to the note, then identify it.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6 flex items-center justify-center gap-3">
        <button
          className="text-4xl hover:scale-110 transition-transform"
          onClick={() => playTone(noteToFreq(target))}
        >
          🔊
        </button>
        <span className="text-academy-cream/40 text-sm">Click to play</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((note) => (
          <button
            key={note}
            onClick={() => pick(note)}
            disabled={answered}
            className={`py-3 px-4 rounded-lg border font-fantasy transition-all
              ${!answered ? 'border-academy-gold/30 hover:border-academy-gold text-academy-cream/80 hover:text-academy-gold' :
                note === target ? 'border-rating-superior bg-rating-superior/20 text-rating-superior' :
                note === selected ? 'border-rating-poor bg-rating-poor/20 text-rating-poor' :
                'border-academy-gold/20 text-academy-cream/30 opacity-50'
              }`}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Rhythm Echo Challenge ──────────────────────────────────────────────────────

const RHYTHM_PATTERNS = [
  { label: '♩ ♩ ♩ ♩', beats: [0, 1, 2, 3] },
  { label: '♩ ♩ ♩♩ ♩', beats: [0, 1, 2, 2.5, 3] },
  { label: '𝅗𝅥 ♩ ♩', beats: [0, 2, 3] },
];

function RhythmEchoChallenge({ onRating }: { onRating: (r: Rating, s: number) => void }) {
  const patternIndex = useRef(Math.floor(Math.random() * RHYTHM_PATTERNS.length));
  const pattern = RHYTHM_PATTERNS[patternIndex.current];
  const [phase, setPhase] = useState<'listen' | 'tap' | 'done'>('listen');
  const [taps, setTaps] = useState<number[]>([]);
  const startTime = useRef<number>(0);
  const BPM = 80;
  const beatMs = (60 / BPM) * 1000;

  function startTapping() {
    setPhase('tap');
    startTime.current = Date.now();
    setTimeout(() => {
      setPhase('done');
      scoreTaps(taps, pattern.beats, beatMs, onRating);
    }, beatMs * 5);
  }

  function tap() {
    if (phase !== 'tap') return;
    setTaps((prev) => [...prev, (Date.now() - startTime.current) / beatMs]);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Rhythm Echo</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Listen to the rhythm, then tap it back.
      </p>
      <div className="bg-black/30 rounded-lg p-6 mb-6">
        <div className="text-2xl mb-3 tracking-widest">{pattern.label}</div>
        <button
          className="text-3xl hover:scale-110 transition-transform"
          onClick={() => playRhythm(pattern.beats, beatMs)}
        >
          🔊
        </button>
      </div>
      {phase === 'listen' && (
        <button onClick={startTapping} className="btn-primary w-full">
          Tap It Back
        </button>
      )}
      {phase === 'tap' && (
        <button
          onPointerDown={tap}
          className="btn-primary w-full h-20 text-xl active:scale-95 transition-transform"
        >
          TAP
        </button>
      )}
      {phase === 'done' && (
        <div className="text-rating-good font-fantasy animate-pulse">Analyzing…</div>
      )}
    </div>
  );
}

// ── Rhythm Tap Challenge ───────────────────────────────────────────────────────

function RhythmTapChallenge({ onRating, tolerance: _tolerance }: {
  onRating: (r: Rating, s: number) => void;
  tolerance: number;
}) {
  const [phase, setPhase] = useState<'intro' | 'tapping' | 'done'>('intro');
  const [taps, setTaps] = useState<number[]>([]);
  const startTime = useRef<number>(0);
  const BPM = 80;
  const beatMs = (60 / BPM) * 1000;
  const targetBeats = [0, 1, 2, 3, 4, 5, 6, 7]; // 2 bars of quarter notes

  useEffect(() => {
    if (phase === 'tapping') {
      const timeout = setTimeout(() => {
        setPhase('done');
        scoreTaps(taps, targetBeats, beatMs, onRating);
      }, beatMs * (targetBeats[targetBeats.length - 1] + 1.5));
      return () => clearTimeout(timeout);
    }
  }, [phase]);

  function tap() {
    if (phase !== 'tapping') return;
    setTaps((prev) => [...prev, (Date.now() - startTime.current) / beatMs]);
  }

  return (
    <div className="text-center">
      <h3 className="fantasy-title text-lg mb-2">Rhythm Performance</h3>
      <p className="text-academy-cream/60 text-sm mb-4">
        Tap 8 steady quarter notes in 4/4 time. BPM: {BPM}
      </p>
      {phase === 'intro' && (
        <button
          onClick={() => { setPhase('tapping'); startTime.current = Date.now(); }}
          className="btn-primary w-full"
        >
          Start
        </button>
      )}
      {phase === 'tapping' && (
        <button
          onPointerDown={tap}
          className="btn-primary w-full h-24 text-2xl active:scale-95 transition-transform"
        >
          TAP
          <div className="text-sm mt-1 opacity-60">{taps.length} / {targetBeats.length}</div>
        </button>
      )}
      {phase === 'done' && (
        <div className="text-rating-good font-fantasy animate-pulse">Scoring…</div>
      )}
    </div>
  );
}

// ── Result Phase ─────────────────────────────────────────────────────────────

function ResultPhase({ challenge, rating, score, character, onContinue }: {
  challenge: Challenge;
  rating: Rating;
  score: number;
  character: Character;
  onContinue: () => void;
}) {
  const config: Record<Rating, { label: string; color: string; message: string }> = {
    superior: { label: 'SUPERIOR', color: '#FFD700', message: 'Flawless. The Composer himself would approve.' },
    excellent: { label: 'EXCELLENT', color: '#4ADE80', message: 'Outstanding performance. Keep pushing.' },
    good: { label: 'GOOD', color: '#60A5FA', message: 'Solid work. The Academy is proud.' },
    fair: { label: 'FAIR', color: '#FB923C', message: 'Acceptable. More practice will sharpen this.' },
    poor: { label: 'POOR', color: '#F87171', message: 'Keep trying. Every attempt builds strength.' },
  };

  const { label, color, message } = config[rating];
  const xpMultipliers = { superior: 1.0, excellent: 0.8, good: 0.6, fair: 0.3, poor: 0.1 };
  const xpAwarded = Math.round(challenge.xpBase * xpMultipliers[rating]);

  return (
    <div className="text-center">
      <div
        className="font-fantasy text-5xl font-black tracking-widest mb-2 py-4"
        style={{ color, textShadow: `0 0 30px ${color}60` }}
      >
        {label}
      </div>
      <p className="text-academy-cream/60 text-sm italic mb-6">{message}</p>
      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">Score</div>
          <div className="font-fantasy text-xl" style={{ color }}>{score}%</div>
        </div>
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">XP</div>
          <div className="font-fantasy text-xl text-academy-gold">+{xpAwarded}</div>
        </div>
        <div className="text-center">
          <div className="text-academy-cream/40 text-xs mb-1">Level</div>
          <div className="font-fantasy text-xl text-academy-gold">{character.level}</div>
        </div>
      </div>
      <button onClick={onContinue} className="btn-primary w-full">
        Continue
      </button>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreToRating(score: number): Rating {
  if (score >= 90) return 'superior';
  if (score >= 75) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

function buildOptions(target: string, pool: string[], count: number): string[] {
  const opts = [target];
  const others = pool.filter((n) => n !== target);
  while (opts.length < count && others.length > 0) {
    const i = Math.floor(Math.random() * others.length);
    opts.push(others.splice(i, 1)[0]);
  }
  return opts.sort(() => Math.random() - 0.5);
}

const NOTE_FREQ: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25,
};

function noteToFreq(note: string): number {
  return NOTE_FREQ[note] ?? 440;
}

function playTone(freq: number) {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
  osc.start();
  osc.stop(ctx.currentTime + 1);
}

function playRhythm(beats: number[], beatMs: number) {
  const ctx = new AudioContext();
  beats.forEach((beat) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'square';
    const t = ctx.currentTime + (beat * beatMs) / 1000;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

function scoreTaps(
  taps: number[],
  targets: number[],
  _beatMs: number,
  onRating: (r: Rating, s: number) => void,
) {
  if (taps.length === 0) { onRating('poor', 0); return; }

  let totalScore = 0;
  const matched = new Set<number>();

  for (const target of targets) {
    let best = Infinity;
    let bestTap = -1;
    for (let i = 0; i < taps.length; i++) {
      if (matched.has(i)) continue;
      const diff = Math.abs(taps[i] - target);
      if (diff < best) { best = diff; bestTap = i; }
    }
    if (bestTap >= 0) {
      matched.add(bestTap);
      // best is in beat units; convert to score (0.5 beat tolerance = 0% score)
      totalScore += Math.max(0, 100 - best * 200);
    }
  }

  const avg = totalScore / targets.length;
  onRating(scoreToRating(avg), Math.round(avg));
}
