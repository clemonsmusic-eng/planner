import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MusicDiagram from '../components/MusicDiagram';
import FingeringDiagram from '../components/FingeringDiagram';
import {
  FINGERINGS,
  INSTRUMENT_NAMES,
  TRANSPOSITION,
  type InstrumentKey,
  type FingeringEntry,
} from '../lib/fingeringData';
import type { StaffNoteSpec } from '../types/diagrams';

// ── Pitch helpers ──────────────────────────────────────────────────────────────

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function pitchToMidi(pitch: string): number {
  const m = pitch.match(/^([A-G])([#b]?)(\d+)$/);
  if (!m) return 60;
  const letter = m[1];
  const acc = m[2];
  const octave = parseInt(m[3], 10);
  const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let semi = base[letter] ?? 0;
  if (acc === '#') semi += 1;
  if (acc === 'b') semi -= 1;
  return (octave + 1) * 12 + semi;
}

function midiToPitch(midi: number, preferFlats: boolean): string {
  const octave = Math.floor(midi / 12) - 1;
  const semi = ((midi % 12) + 12) % 12;
  const name = preferFlats ? NOTE_NAMES_FLAT[semi] : NOTE_NAMES_SHARP[semi];
  return `${name}${octave}`;
}

/** Normalize enharmonics for comparison */
function normalizePitch(pitch: string): number {
  return pitchToMidi(pitch);
}

/** Human-friendly display name for a pitch */
function displayName(pitch: string): string {
  const m = pitch.match(/^([A-G])([#b]?)(\d+)$/);
  if (!m) return pitch;
  const acc = m[2] === '#' ? '♯' : m[2] === 'b' ? '♭' : '';
  return `${m[1]}${acc}${m[3]}`;
}

// ── Scale helpers ──────────────────────────────────────────────────────────────

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]; // semitones from root
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const CONCERT_KEYS = [
  { label: 'Bb', midi: pitchToMidi('Bb4') % 12, preferFlats: true  },
  { label: 'Eb', midi: pitchToMidi('Eb4') % 12, preferFlats: true  },
  { label: 'Ab', midi: pitchToMidi('Ab4') % 12, preferFlats: true  },
  { label: 'Db', midi: pitchToMidi('Db4') % 12, preferFlats: true  },
  { label: 'Gb', midi: pitchToMidi('Gb4') % 12, preferFlats: true  },
  { label: 'F',  midi: pitchToMidi('F4')  % 12, preferFlats: true  },
  { label: 'C',  midi: pitchToMidi('C4')  % 12, preferFlats: false },
  { label: 'G',  midi: pitchToMidi('G4')  % 12, preferFlats: false },
  { label: 'D',  midi: pitchToMidi('D4')  % 12, preferFlats: false },
  { label: 'A',  midi: pitchToMidi('A4')  % 12, preferFlats: false },
  { label: 'E',  midi: pitchToMidi('E4')  % 12, preferFlats: false },
  { label: 'B',  midi: pitchToMidi('B4')  % 12, preferFlats: false },
];

function getScaleMidis(rootSemi: number, intervals: number[]): number[] {
  return intervals.map((i) => ((rootSemi + i) % 12 + 12) % 12);
}

// ── Get clef for instrument ────────────────────────────────────────────────────

function getClef(instrument: InstrumentKey): 'treble' | 'bass' {
  if (instrument === 'trombone') return 'bass';
  return 'treble';
}

// ── Modes ──────────────────────────────────────────────────────────────────────

type ChartMode = 'full' | 'chromatic' | 'major' | 'minor';

const MODE_LABELS: Record<ChartMode, string> = {
  full: 'Full Range',
  chromatic: 'Chromatic',
  major: 'Major Scale',
  minor: 'Minor Scale',
};

// ── Instrument info panel ──────────────────────────────────────────────────────

function getWrittenKeyLabel(instrument: InstrumentKey, concertKey: string): string {
  const trans = TRANSPOSITION[instrument];
  if (trans === 0) return `${concertKey} (concert)`;
  const concertMidi = pitchToMidi(`${concertKey}4`);
  const writtenMidi = concertMidi + trans;
  const preferFlats = concertKey.includes('b') || concertKey === 'F';
  const writtenPitch = midiToPitch(writtenMidi, preferFlats);
  const writtenKey = writtenPitch.replace(/\d+$/, '');
  const acc = writtenKey.includes('b') ? '♭' : writtenKey.includes('#') ? '♯' : '';
  const base = writtenKey.replace(/[#b]/, '');
  return `${base}${acc}`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FingeringChartPage() {
  const navigate = useNavigate();
  const [instrument, setInstrument] = useState<InstrumentKey>('clarinet');
  const [mode, setMode] = useState<ChartMode>('major');
  const [concertKeyIdx, setConcertKeyIdx] = useState(0); // index into CONCERT_KEYS (Bb first)

  const concertKey = CONCERT_KEYS[concertKeyIdx];
  const clef = getClef(instrument);
  const allEntries = FINGERINGS[instrument];

  // Filter entries based on mode
  const filteredEntries = useMemo<FingeringEntry[]>(() => {
    if (mode === 'full' || mode === 'chromatic') {
      return allEntries;
    }
    // Major or minor scale: filter entries whose concert pitch matches scale notes
    const intervals = mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
    const scaleSemis = new Set(getScaleMidis(concertKey.midi, intervals));
    return allEntries.filter((e) => {
      const midi = normalizePitch(e.concertPitch);
      return scaleSemis.has(((midi % 12) + 12) % 12);
    });
  }, [allEntries, mode, concertKey]);

  // Build the written key label for the header
  const writtenKeyLabel = useMemo(() => {
    if (mode === 'major' || mode === 'minor') {
      const written = getWrittenKeyLabel(instrument, concertKey.label);
      const type = mode === 'major' ? 'Major' : 'Minor';
      return `${INSTRUMENT_NAMES[instrument]} — ${written} ${type}`;
    }
    return INSTRUMENT_NAMES[instrument];
  }, [instrument, mode, concertKey, INSTRUMENT_NAMES]);

  const concertLabel = useMemo(() => {
    if (mode === 'major' || mode === 'minor') {
      const type = mode === 'major' ? 'Major' : 'Minor';
      return `Concert ${concertKey.label} ${type}`;
    }
    return '';
  }, [mode, concertKey]);

  // Build staff notes for full-scale display at top
  const fullScaleStaffNotes = useMemo<StaffNoteSpec[]>(() => {
    return filteredEntries.slice(0, 24).map((e) => ({
      pitch: e.writtenPitch,
      dur: 'q' as const,
    }));
  }, [filteredEntries]);

  const instruments: InstrumentKey[] = ['flute', 'clarinet', 'alto_sax', 'trumpet', 'horn', 'trombone', 'euphonium', 'tuba'];

  return (
    <div className="min-h-screen pb-16">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-academy-dark/95 backdrop-blur-sm border-b border-academy-gold/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/library')}
          className="text-academy-cream/40 hover:text-academy-cream/80 text-sm transition-colors"
        >
          ← Library
        </button>
        <div className="fantasy-title text-lg text-academy-gold flex-1 text-center">
          Fingering Charts
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto px-2 pt-4">
        {/* Instrument selector */}
        <div className="overflow-x-auto scrollbar-hide mb-4">
          <div className="flex gap-1 min-w-max pb-1">
            {instruments.map((inst) => (
              <button
                key={inst}
                onClick={() => setInstrument(inst)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-fantasy transition-all
                  ${instrument === inst
                    ? 'bg-academy-gold/20 text-academy-gold border border-academy-gold/40'
                    : 'text-academy-cream/50 hover:text-academy-cream/80 border border-academy-gold/10'}`}
              >
                {INSTRUMENT_NAMES[inst].replace(' Saxophone', ' Sax').replace('F French ', 'F ')}
              </button>
            ))}
          </div>
        </div>

        {/* Mode + Key selectors */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-1 bg-black/30 rounded-lg p-1">
            {(Object.keys(MODE_LABELS) as ChartMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-fantasy transition-all
                  ${mode === m
                    ? 'bg-academy-gold/20 text-academy-gold'
                    : 'text-academy-cream/50 hover:text-academy-cream/80'}`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {(mode === 'major' || mode === 'minor') && (
            <select
              value={concertKeyIdx}
              onChange={(e) => setConcertKeyIdx(Number(e.target.value))}
              className="bg-academy-dark border border-academy-gold/20 text-academy-cream text-xs rounded-lg px-3 py-2 font-fantasy outline-none focus:border-academy-gold/50"
            >
              {CONCERT_KEYS.map((k, i) => (
                <option key={k.label} value={i}>
                  Concert {k.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Chart header */}
        <div className="border border-academy-gold/15 rounded-xl mb-4 overflow-hidden">
          <div className="bg-black/30 px-4 py-2 border-b border-academy-gold/10">
            <div className="text-academy-cream/50 text-xs font-fantasy text-center">
              {concertLabel && <span className="text-academy-gold/60">{concertLabel} · </span>}
              <span className="text-academy-cream/80">{writtenKeyLabel}</span>
            </div>
          </div>

          {/* Full scale staff */}
          {fullScaleStaffNotes.length > 0 && (
            <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
              <MusicDiagram
                spec={{
                  type: 'staff',
                  clef,
                  notes: fullScaleStaffNotes,
                }}
              />
            </div>
          )}
        </div>

        {/* Note columns — scrollable */}
        <div className="overflow-x-auto scrollbar-hide pb-4">
          <div className="flex gap-1 min-w-max">
            {filteredEntries.map((entry, i) => (
              <NoteColumn
                key={i}
                entry={entry}
                instrument={instrument}
                clef={clef}
              />
            ))}
            {filteredEntries.length === 0 && (
              <div className="text-academy-cream/30 text-sm font-fantasy px-8 py-12 text-center w-full">
                No fingerings available for this selection.
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 text-academy-cream/30 text-xs px-2">
          {instrument === 'clarinet' && (
            <p>R = register (speaker) key · Filled hole = closed · Open circle = open hole</p>
          )}
          {instrument === 'flute' && (
            <p>2 = second octave · Filled hole = closed · Open circle = open hole</p>
          )}
          {instrument === 'alto_sax' && (
            <p>Oct = octave key · Filled hole = closed · Open circle = open hole</p>
          )}
          {(instrument === 'trumpet' || instrument === 'horn' || instrument === 'euphonium' || instrument === 'tuba') && (
            <p>Filled valve = pressed · Open = not pressed{instrument === 'horn' ? ' · T = thumb valve (Bb side)' : ''}</p>
          )}
          {instrument === 'trombone' && (
            <p>Gold marker shows slide position (1–7) · T = trigger/F-attachment</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── NoteColumn ─────────────────────────────────────────────────────────────────

function NoteColumn({
  entry,
  instrument,
  clef,
}: {
  entry: FingeringEntry;
  instrument: InstrumentKey;
  clef: 'treble' | 'bass';
}) {
  const writtenDisplay = displayName(entry.writtenPitch);
  const concertDisplay = displayName(entry.concertPitch);

  return (
    <div
      className="flex flex-col items-center gap-1 px-2 py-2 min-w-[72px]"
      style={{
        borderRight: '1px solid rgba(212,160,23,0.08)',
        background: 'rgba(13,21,32,0.4)',
        borderRadius: 8,
      }}
    >
      {/* Fingering diagram */}
      <div className="flex items-center justify-center" style={{ minHeight: 52 }}>
        <FingeringDiagram instrument={instrument} fingering={entry.fingering} size="sm" />
      </div>

      {/* Mini staff */}
      <div
        className="border border-academy-gold/10 rounded overflow-hidden"
        style={{ background: '#0d1520' }}
      >
        <MiniStaff pitch={entry.writtenPitch} clef={clef} />
      </div>

      {/* Note name */}
      <div className="text-academy-cream/90 text-xs font-fantasy text-center leading-tight">
        {writtenDisplay}
      </div>

      {/* Concert pitch label */}
      {TRANSPOSITION[instrument] !== 0 && (
        <div className="text-academy-cream/35 text-[9px] text-center leading-tight">
          ({concertDisplay})
        </div>
      )}

      {/* Alt fingering indicator */}
      {entry.altFingering && (
        <div className="text-academy-gold/30 text-[8px] text-center">alt</div>
      )}
    </div>
  );
}

// ── MiniStaff ──────────────────────────────────────────────────────────────────

const LINE_SP = 8;
const PAD_T = 20;
const PAD_B = 14;
const MINI_H = PAD_T + 4 * LINE_SP + PAD_B;
const MINI_W = 38;
const BG_COLOR = '#0d1520';
const CREAM_COLOR = '#d4c9a8';

const NOTE_DIATONIC: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const TREBLE_BASE = 4 * 7 + 2; // E4 step 0
const BASS_BASE = 2 * 7 + 4;   // G2 step 0

function miniParsePitch(pitch: string) {
  const m = pitch.match(/^([A-G])([#b]?)(\d+)$/);
  if (!m) return { letter: 'C', accidental: '' as '' | '#' | 'b', octave: 4 };
  return {
    letter: m[1],
    accidental: m[2] as '' | '#' | 'b',
    octave: parseInt(m[3], 10),
  };
}

function miniStepY(step: number): number {
  return PAD_T + 4 * LINE_SP - step * (LINE_SP / 2);
}

function miniPitchToStep(pitch: string, clef: 'treble' | 'bass'): number {
  const { letter, octave } = miniParsePitch(pitch);
  const diatonicIndex = octave * 7 + (NOTE_DIATONIC[letter] ?? 0);
  const base = clef === 'treble' ? TREBLE_BASE : BASS_BASE;
  return diatonicIndex - base;
}

function MiniStaff({ pitch, clef }: { pitch: string; clef: 'treble' | 'bass' }) {
  const step = miniPitchToStep(pitch, clef);
  const cy = miniStepY(step);
  const { accidental } = miniParsePitch(pitch);
  const cx = MINI_W / 2 + 2;
  const NOTE_RX = 4.5;
  const NOTE_RY = 3.0;
  const filled = true; // quarter note

  // Stem
  const stemUp = step < 4;
  const stemLen = 22;
  const stemX = stemUp ? cx + NOTE_RX - 1 : cx - NOTE_RX + 1;
  const stemY2 = stemUp ? cy - stemLen : cy + stemLen;

  // Ledger lines
  const ledgerLines: number[] = [];
  const ledgerHW = NOTE_RX + 5;
  if (step <= -2) {
    const lowest = step % 2 === 0 ? step : step + 1;
    for (let s = -2; s >= lowest; s -= 2) ledgerLines.push(s);
  }
  if (step >= 10) {
    const highest = step % 2 === 0 ? step : step - 1;
    for (let s = 10; s <= highest; s += 2) ledgerLines.push(s);
  }

  const accDisplay = accidental === '#' ? '♯' : accidental === 'b' ? '♭' : null;

  return (
    <svg width={MINI_W} height={MINI_H} style={{ display: 'block', background: BG_COLOR }}>
      {/* Staff lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={3}
          y1={PAD_T + i * LINE_SP}
          x2={MINI_W - 3}
          y2={PAD_T + i * LINE_SP}
          stroke={CREAM_COLOR}
          strokeWidth={0.6}
          opacity={0.55}
        />
      ))}
      {/* Ledger lines */}
      {ledgerLines.map((s) => (
        <line
          key={s}
          x1={cx - ledgerHW}
          y1={miniStepY(s)}
          x2={cx + ledgerHW}
          y2={miniStepY(s)}
          stroke={CREAM_COLOR}
          strokeWidth={0.8}
          opacity={0.65}
        />
      ))}
      {/* Accidental */}
      {accDisplay && (
        <text
          x={cx - NOTE_RX - 6}
          y={cy + 3}
          fontSize={8}
          fill={CREAM_COLOR}
          textAnchor="middle"
          fontFamily="serif"
        >
          {accDisplay}
        </text>
      )}
      {/* Stem */}
      <line
        x1={stemX}
        y1={cy}
        x2={stemX}
        y2={stemY2}
        stroke={CREAM_COLOR}
        strokeWidth={0.9}
      />
      {/* Note head */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={NOTE_RX}
        ry={NOTE_RY}
        transform={`rotate(-18, ${cx}, ${cy})`}
        fill={filled ? CREAM_COLOR : 'none'}
        stroke={CREAM_COLOR}
        strokeWidth={filled ? 0 : 1}
      />
    </svg>
  );
}
