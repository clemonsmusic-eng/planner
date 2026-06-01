import type {
  DiagramSpec,
  StaffDiagram,
  KeySigDiagram,
  KeyboardDiagram,
  DurationsDiagram,
  ScalePatternDiagram,
  CircleDiagram,
  StaffNoteSpec,
  Duration,
} from '../types/diagrams';

// ── Color constants ────────────────────────────────────────────────────────────
const BG = '#0d1520';
const CREAM = '#d4c9a8';
const GOLD = '#D4A017';

// ── Staff constants ────────────────────────────────────────────────────────────
const LINE_SP = 10;   // pixels between adjacent staff lines
const PAD_T = 26;     // padding above top staff line
const PAD_B = 18;     // padding below bottom staff line
const SVG_H = PAD_T + 4 * LINE_SP + PAD_B; // = 84

// Diatonic index: C=0, D=1, E=2, F=3, G=4, A=5, B=6
const NOTE_DIATONIC: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

// Treble clef: E4 = step 0 (bottom line)  → diatonic index of E4 = 4*7+2 = 30
const TREBLE_BASE = 4 * 7 + 2;
// Bass clef: G2 = step 0 (bottom line) → diatonic index of G2 = 2*7+4 = 18
const BASS_BASE = 2 * 7 + 4;

/** Convert a pitch string like "C4", "F#5", "Bb3" to { letter, accidental, octave } */
function parsePitch(pitch: string): { letter: string; accidental: '' | '#' | 'b'; octave: number } {
  const m = pitch.match(/^([A-Ga-g])([#b]?)(\d+)$/);
  if (!m) return { letter: 'C', accidental: '', octave: 4 };
  return {
    letter: m[1].toUpperCase(),
    accidental: m[2] as '' | '#' | 'b',
    octave: parseInt(m[3], 10),
  };
}

/** Get the diatonic step on the staff for a given pitch */
function pitchToStep(pitch: string, clef: 'treble' | 'bass'): number {
  const { letter, octave } = parsePitch(pitch);
  const diatonicIndex = octave * 7 + (NOTE_DIATONIC[letter] ?? 0);
  const base = clef === 'treble' ? TREBLE_BASE : BASS_BASE;
  return diatonicIndex - base;
}

/** Convert a step number to an SVG y coordinate */
function stepY(step: number): number {
  return PAD_T + 4 * LINE_SP - step * (LINE_SP / 2);
}

// ── Staff lines renderer ───────────────────────────────────────────────────────
function StaffLines({ x1, x2 }: { x1: number; x2: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={x1}
          y1={PAD_T + i * LINE_SP}
          x2={x2}
          y2={PAD_T + i * LINE_SP}
          stroke={CREAM}
          strokeWidth={0.8}
          opacity={0.7}
        />
      ))}
    </>
  );
}

// ── Ledger lines for notes outside the staff ───────────────────────────────────
function LedgerLines({ step, cx }: { step: number; cx: number }) {
  const lines: number[] = [];
  const ledgerHalfWidth = 5.5 + 7; // NOTE_RX + 7
  if (step <= -2) {
    const lowest = step % 2 === 0 ? step : step + 1;
    for (let s = -2; s >= lowest; s -= 2) lines.push(s);
  }
  if (step >= 10) {
    const highest = step % 2 === 0 ? step : step - 1;
    for (let s = 10; s <= highest; s += 2) lines.push(s);
  }
  return (
    <>
      {lines.map((s) => (
        <line
          key={s}
          x1={cx - ledgerHalfWidth}
          y1={stepY(s)}
          x2={cx + ledgerHalfWidth}
          y2={stepY(s)}
          stroke={CREAM}
          strokeWidth={0.9}
          opacity={0.75}
        />
      ))}
    </>
  );
}

// ── Single note renderer ───────────────────────────────────────────────────────
function StaffNote({
  spec,
  cx,
  clef,
  forceStemUp,
}: {
  spec: StaffNoteSpec;
  cx: number;
  clef: 'treble' | 'bass';
  forceStemUp?: boolean;
}) {
  const step = pitchToStep(spec.pitch, clef);
  const cy = stepY(step);
  const dur = spec.dur;
  const filled = dur === 'q' || dur === 'e';
  const isWhole = dur === 'w';
  const stemUp = forceStemUp !== undefined ? forceStemUp : step < 4;

  // Accidental
  let accDisplay: string | null = null;
  if (spec.forceAcc === 'sharp') accDisplay = '♯';
  else if (spec.forceAcc === 'flat') accDisplay = '♭';
  else if (spec.forceAcc === 'natural') accDisplay = '♮';
  else {
    const { accidental } = parsePitch(spec.pitch);
    if (accidental === '#') accDisplay = '♯';
    else if (accidental === 'b') accDisplay = '♭';
  }

  // Stem coords
  const NOTE_RX = 5.5;
  const NOTE_RY = 3.6;
  const STEM_LEN = 30;
  let stemX1 = cx, stemY1 = cy, stemX2 = cx, stemY2 = cy;
  if (!isWhole) {
    if (stemUp) {
      stemX1 = cx + NOTE_RX - 1;
      stemY1 = cy;
      stemX2 = cx + NOTE_RX - 1;
      stemY2 = cy - STEM_LEN;
    } else {
      stemX1 = cx - NOTE_RX + 1;
      stemY1 = cy;
      stemX2 = cx - NOTE_RX + 1;
      stemY2 = cy + STEM_LEN;
    }
  }

  // Eighth flag path
  const flagPath = stemUp
    ? `M ${stemX2} ${stemY2} C ${stemX2 + 10} ${stemY2 + 5} ${stemX2 + 10} ${stemY2 + 15} ${stemX2 + 2} ${stemY2 + 22}`
    : `M ${stemX2} ${stemY2} C ${stemX2 + 10} ${stemY2 - 5} ${stemX2 + 10} ${stemY2 - 15} ${stemX2 + 2} ${stemY2 - 22}`;

  return (
    <g>
      <LedgerLines step={step} cx={cx} />

      {/* Accidental */}
      {accDisplay && (
        <text
          x={cx - NOTE_RX - 7}
          y={cy + 4}
          fontSize={10}
          fill={CREAM}
          textAnchor="middle"
          fontFamily="serif"
        >
          {accDisplay}
        </text>
      )}

      {/* Stem (not for whole notes) */}
      {!isWhole && (
        <line
          x1={stemX1}
          y1={stemY1}
          x2={stemX2}
          y2={stemY2}
          stroke={CREAM}
          strokeWidth={1.2}
        />
      )}

      {/* Eighth flag */}
      {dur === 'e' && (
        <path
          d={flagPath}
          fill="none"
          stroke={CREAM}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      )}

      {/* Note head */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={NOTE_RX}
        ry={NOTE_RY}
        transform={`rotate(-18, ${cx}, ${cy})`}
        fill={filled ? CREAM : 'none'}
        stroke={CREAM}
        strokeWidth={filled ? 0 : 1.2}
      />

      {/* Whole note void (inner ellipse) */}
      {isWhole && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={NOTE_RX * 0.42}
          ry={NOTE_RY * 0.42}
          transform={`rotate(-18, ${cx}, ${cy})`}
          fill={BG}
        />
      )}

      {/* Label below note */}
      {spec.label && (
        <text
          x={cx}
          y={stepY(-4) + 14}
          fontSize={7}
          fill={GOLD}
          textAnchor="middle"
          fontFamily="serif"
          opacity={0.9}
        >
          {spec.label}
        </text>
      )}
    </g>
  );
}

// ── Treble / Bass clef symbol ─────────────────────────────────────────────────
function ClefSymbol({ clef, x }: { clef: 'treble' | 'bass'; x: number }) {
  if (clef === 'treble') {
    return (
      <text
        x={x + 2}
        y={PAD_T + 4 * LINE_SP + 6}
        fontSize={52}
        fill={CREAM}
        fontFamily="serif"
        opacity={0.9}
      >
        𝄞
      </text>
    );
  }
  return (
    <text
      x={x}
      y={PAD_T + LINE_SP + 4}
      fontSize={28}
      fill={CREAM}
      fontFamily="serif"
      opacity={0.9}
    >
      𝄢
    </text>
  );
}

// ── Staff diagram ─────────────────────────────────────────────────────────────
function StaffDiagramSVG({ spec }: { spec: StaffDiagram }) {
  const clef = spec.clef ?? 'treble';
  const CLEF_W = 28;
  const LEFT_PAD = 8;
  const RIGHT_PAD = 8;
  const NOTE_SPACING = 26;
  const NOTE_START_X = LEFT_PAD + CLEF_W + 8;

  // Calculate x positions accounting for chord grouping
  const noteXPositions: number[] = [];
  let currentX = NOTE_START_X;
  for (let i = 0; i < spec.notes.length; i++) {
    if (spec.notes[i].chord && i > 0) {
      noteXPositions.push(noteXPositions[i - 1]);
    } else {
      noteXPositions.push(currentX);
      if (!spec.notes[i].chord) {
        // Next non-chord note will advance by NOTE_SPACING
        // We'll compute this in next iteration
      }
    }
  }

  // Recompute properly
  const xPositions: number[] = [];
  let xCursor = NOTE_START_X;
  for (let i = 0; i < spec.notes.length; i++) {
    if (spec.notes[i].chord && i > 0) {
      xPositions.push(xPositions[i - 1]);
    } else {
      xPositions.push(xCursor);
      // Check if next note is a chord (to not advance)
      let nextIsChord = false;
      for (let j = i + 1; j < spec.notes.length; j++) {
        if (spec.notes[j].chord) { nextIsChord = true; break; }
        break; // only look at immediate next
      }
      if (!nextIsChord || i === spec.notes.length - 1) {
        xCursor += NOTE_SPACING;
      } else {
        xCursor += NOTE_SPACING;
      }
    }
  }

  // Time signature
  const timeSigW = spec.timeSig ? 20 : 0;
  const adjustedNoteStart = NOTE_START_X + timeSigW;
  const finalXPositions: number[] = [];
  let fxCursor = adjustedNoteStart;
  for (let i = 0; i < spec.notes.length; i++) {
    if (spec.notes[i].chord && i > 0) {
      finalXPositions.push(finalXPositions[i - 1]);
    } else {
      finalXPositions.push(fxCursor);
      fxCursor += NOTE_SPACING;
    }
  }
  const distinctFXs = [...new Set(finalXPositions)];
  const finalW = LEFT_PAD + CLEF_W + 8 + timeSigW + distinctFXs.length * NOTE_SPACING + RIGHT_PAD;

  return (
    <svg
      width={finalW}
      height={SVG_H}
      style={{ display: 'block', background: BG, borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)' }}
    >
      <StaffLines x1={LEFT_PAD} x2={finalW - RIGHT_PAD} />
      <ClefSymbol clef={clef} x={LEFT_PAD} />

      {spec.timeSig && (
        <>
          <text
            x={NOTE_START_X + 4}
            y={PAD_T + 1 * LINE_SP + 3}
            fontSize={12}
            fill={CREAM}
            textAnchor="middle"
            fontFamily="serif"
          >
            {spec.timeSig[0]}
          </text>
          <text
            x={NOTE_START_X + 4}
            y={PAD_T + 3 * LINE_SP + 3}
            fontSize={12}
            fill={CREAM}
            textAnchor="middle"
            fontFamily="serif"
          >
            {spec.timeSig[1]}
          </text>
        </>
      )}

      {spec.notes.map((note, i) => (
        <StaffNote
          key={i}
          spec={note}
          cx={finalXPositions[i]}
          clef={clef}
        />
      ))}
    </svg>
  );
}

// ── Key Signature diagram ─────────────────────────────────────────────────────
// Sharp step positions (treble): F C G D A E B
const TREBLE_SHARP_STEPS = [8, 5, 9, 6, 3, 7, 4];
// Flat step positions (treble): B E A D G C F
const TREBLE_FLAT_STEPS = [4, 7, 3, 6, 2, 5, 1];
// Bass sharp: G D A E B F# C#
const BASS_SHARP_STEPS = [6, 3, 7, 4, 1, 5, 2];
// Bass flat: Bb Eb Ab Db Gb Cb Fb
const BASS_FLAT_STEPS = [2, 5, 1, 4, 0, 3, -1];

function KeySigDiagramSVG({ spec }: { spec: KeySigDiagram }) {
  const clef = spec.clef ?? 'treble';
  const count = Math.abs(spec.count);
  const isSharp = spec.count > 0;
  const CLEF_W = 28;
  const LEFT_PAD = 8;
  const ACC_SPACING = 10;
  const accWidth = count * ACC_SPACING + 6;
  const totalW = LEFT_PAD + CLEF_W + 8 + accWidth + 20;

  const stepPositions = isSharp
    ? clef === 'treble' ? TREBLE_SHARP_STEPS : BASS_SHARP_STEPS
    : clef === 'treble' ? TREBLE_FLAT_STEPS : BASS_FLAT_STEPS;

  const accChar = isSharp ? '♯' : '♭';
  const accStartX = LEFT_PAD + CLEF_W + 10;

  return (
    <div>
      <svg
        width={totalW}
        height={SVG_H + 20}
        style={{ display: 'block', background: BG, borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)' }}
      >
        <StaffLines x1={LEFT_PAD} x2={totalW - 10} />
        <ClefSymbol clef={clef} x={LEFT_PAD} />
        {Array.from({ length: count }, (_, i) => {
          const step = stepPositions[i] ?? 4;
          const y = stepY(step);
          return (
            <text
              key={i}
              x={accStartX + i * ACC_SPACING}
              y={y + 5}
              fontSize={13}
              fill={CREAM}
              fontFamily="serif"
              opacity={0.9}
            >
              {accChar}
            </text>
          );
        })}
        {spec.keyName && (
          <text
            x={totalW / 2}
            y={SVG_H + 14}
            fontSize={9}
            fill={GOLD}
            textAnchor="middle"
            fontFamily="serif"
            opacity={0.8}
          >
            {spec.keyName}
          </text>
        )}
      </svg>
    </div>
  );
}

// ── Keyboard diagram ──────────────────────────────────────────────────────────
// White key layout: C4 D4 E4 F4 G4 A4 B4 C5 D5 E5 F5 G5 A5 B5
const WHITE_KEY_PITCHES = [
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
];
// Black key pitches and their position (between which white key indices)
const BLACK_KEYS: { pitch: string; afterWhite: number }[] = [
  { pitch: 'Db4', afterWhite: 0 },
  { pitch: 'Eb4', afterWhite: 1 },
  { pitch: 'Gb4', afterWhite: 3 },
  { pitch: 'Ab4', afterWhite: 4 },
  { pitch: 'Bb4', afterWhite: 5 },
  { pitch: 'Db5', afterWhite: 7 },
  { pitch: 'Eb5', afterWhite: 8 },
  { pitch: 'Gb5', afterWhite: 10 },
  { pitch: 'Ab5', afterWhite: 11 },
  { pitch: 'Bb5', afterWhite: 12 },
];

// Also handle enharmonic equivalents for highlights
const ENHARMONIC_MAP: Record<string, string> = {
  'C#4': 'Db4', 'D#4': 'Eb4', 'F#4': 'Gb4', 'G#4': 'Ab4', 'A#4': 'Bb4',
  'C#5': 'Db5', 'D#5': 'Eb5', 'F#5': 'Gb5', 'G#5': 'Ab5', 'A#5': 'Bb5',
};

const WHITE_KEY_W = 13;
const WHITE_KEY_H = 60;
const WHITE_KEY_GAP = 1;
const BLACK_KEY_W = 8;
const BLACK_KEY_H = 38;
const KB_PAD_T = 12;
const KB_LABEL_H = 13;
const KB_SVG_H = KB_PAD_T + WHITE_KEY_H + KB_LABEL_H;

function KeyboardDiagramSVG({ spec }: { spec: KeyboardDiagram }) {
  const totalW = WHITE_KEY_PITCHES.length * (WHITE_KEY_W + WHITE_KEY_GAP);

  // Build highlight map
  const highlightMap: Record<string, { color: string; label?: string }> = {};
  for (const h of spec.highlights) {
    const canonical = ENHARMONIC_MAP[h.pitch] ?? h.pitch;
    highlightMap[canonical] = { color: h.color ?? GOLD, label: h.label };
    // Also map direct pitch
    highlightMap[h.pitch] = { color: h.color ?? GOLD, label: h.label };
  }

  return (
    <svg
      width={totalW}
      height={KB_SVG_H}
      style={{ display: 'block', background: BG, borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)' }}
    >
      {/* White keys */}
      {WHITE_KEY_PITCHES.map((pitch, i) => {
        const x = i * (WHITE_KEY_W + WHITE_KEY_GAP);
        const hl = highlightMap[pitch];
        return (
          <g key={pitch}>
            <rect
              x={x}
              y={KB_PAD_T}
              width={WHITE_KEY_W}
              height={WHITE_KEY_H}
              fill={hl ? hl.color : '#e8e0c8'}
              stroke="#555"
              strokeWidth={0.5}
              rx={1}
            />
            {hl?.label && (
              <text
                x={x + WHITE_KEY_W / 2}
                y={KB_PAD_T + WHITE_KEY_H - 5}
                fontSize={6}
                fill={BG}
                textAnchor="middle"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {hl.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Black keys */}
      {BLACK_KEYS.map(({ pitch, afterWhite }) => {
        const x = (afterWhite + 1) * (WHITE_KEY_W + WHITE_KEY_GAP) - BLACK_KEY_W / 2 - 1;
        const canonical = ENHARMONIC_MAP[pitch] ?? pitch;
        const hl = highlightMap[canonical] ?? highlightMap[pitch];
        return (
          <g key={pitch}>
            <rect
              x={x}
              y={KB_PAD_T}
              width={BLACK_KEY_W}
              height={BLACK_KEY_H}
              fill={hl ? hl.color : '#1a1a2e'}
              stroke="#333"
              strokeWidth={0.5}
              rx={1}
            />
            {hl?.label && (
              <text
                x={x + BLACK_KEY_W / 2}
                y={KB_PAD_T + BLACK_KEY_H - 4}
                fontSize={5}
                fill={hl ? BG : CREAM}
                textAnchor="middle"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                {hl.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Octave label */}
      <text x={3.5 * (WHITE_KEY_W + WHITE_KEY_GAP)} y={KB_SVG_H - 2} fontSize={7} fill={CREAM} textAnchor="middle" opacity={0.4}>C4</text>
      <text x={10.5 * (WHITE_KEY_W + WHITE_KEY_GAP)} y={KB_SVG_H - 2} fontSize={7} fill={CREAM} textAnchor="middle" opacity={0.4}>C5</text>
    </svg>
  );
}

// ── Durations diagram ─────────────────────────────────────────────────────────
const DURATION_LABELS: Record<Duration, string[]> = {
  w: ['Whole', '4 beats'],
  h: ['Half', '2 beats'],
  q: ['Quarter', '1 beat'],
  e: ['Eighth', '½ beat'],
};

function DurationsDiagramSVG({ spec: _spec }: { spec: DurationsDiagram }) {
  const durations: Duration[] = ['w', 'h', 'q', 'e'];
  const COL_W = 54;
  const totalW = durations.length * COL_W + 16;
  const totalH = SVG_H + 44; // extra room for labels

  return (
    <svg
      width={totalW}
      height={totalH}
      style={{ display: 'block', background: BG, borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)' }}
    >
      <StaffLines x1={8} x2={totalW - 8} />

      {durations.map((dur, col) => {
        const cx = 8 + 8 + col * COL_W + COL_W / 2 - 8;
        const step = 4; // B4 on treble
        const cy = stepY(step);
        const filled = dur === 'q' || dur === 'e';
        const isWhole = dur === 'w';
        const NOTE_RX = 5.5;
        const NOTE_RY = 3.6;
        const STEM_LEN = 30;

        // Force stem up
        const stemX1 = cx + NOTE_RX - 1;
        const stemY1 = cy;
        const stemX2 = cx + NOTE_RX - 1;
        const stemY2 = cy - STEM_LEN;

        const flagPath = `M ${stemX2} ${stemY2} C ${stemX2 + 10} ${stemY2 + 5} ${stemX2 + 10} ${stemY2 + 15} ${stemX2 + 2} ${stemY2 + 22}`;

        const labels = DURATION_LABELS[dur];
        const labelY1 = SVG_H + 12;
        const labelY2 = SVG_H + 22;

        // Rest symbols
        const restX = cx + 20;
        const restCy = stepY(5); // line 4 area

        return (
          <g key={dur}>
            {/* Note */}
            {!isWhole && (
              <line x1={stemX1} y1={stemY1} x2={stemX2} y2={stemY2} stroke={CREAM} strokeWidth={1.2} />
            )}
            {dur === 'e' && (
              <path d={flagPath} fill="none" stroke={CREAM} strokeWidth={1.5} strokeLinecap="round" />
            )}
            <ellipse
              cx={cx}
              cy={cy}
              rx={NOTE_RX}
              ry={NOTE_RY}
              transform={`rotate(-18, ${cx}, ${cy})`}
              fill={filled ? CREAM : 'none'}
              stroke={CREAM}
              strokeWidth={filled ? 0 : 1.2}
            />
            {isWhole && (
              <ellipse
                cx={cx}
                cy={cy}
                rx={NOTE_RX * 0.42}
                ry={NOTE_RY * 0.42}
                transform={`rotate(-18, ${cx}, ${cy})`}
                fill={BG}
              />
            )}

            {/* Rest symbol */}
            {dur === 'w' && (
              /* Whole rest: filled rect hanging from 2nd line from top */
              <rect x={restX - 5} y={PAD_T + LINE_SP - 1} width={10} height={4} fill={CREAM} opacity={0.8} />
            )}
            {dur === 'h' && (
              /* Half rest: filled rect sitting on middle line */
              <rect x={restX - 5} y={PAD_T + 2 * LINE_SP} width={10} height={4} fill={CREAM} opacity={0.8} />
            )}
            {dur === 'q' && (
              /* Quarter rest: simple squiggle */
              <path
                d={`M ${restX} ${restCy - 10} C ${restX + 6} ${restCy - 6} ${restX - 4} ${restCy} ${restX + 2} ${restCy + 4} C ${restX + 8} ${restCy + 8} ${restX - 2} ${restCy + 14} ${restX} ${restCy + 18}`}
                fill="none"
                stroke={CREAM}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.8}
              />
            )}
            {dur === 'e' && (
              /* Eighth rest */
              <g opacity={0.8}>
                <circle cx={restX + 1} cy={restCy + 4} r={2.5} fill={CREAM} />
                <line x1={restX + 1} y1={restCy + 4} x2={restX - 4} y2={restCy - 8} stroke={CREAM} strokeWidth={1.5} strokeLinecap="round" />
              </g>
            )}

            {/* Labels */}
            <text x={cx} y={labelY1} fontSize={7} fill={GOLD} textAnchor="middle" fontFamily="sans-serif" opacity={0.85}>
              {labels[0]}
            </text>
            <text x={cx} y={labelY2} fontSize={7} fill={CREAM} textAnchor="middle" fontFamily="sans-serif" opacity={0.6}>
              {labels[1]}
            </text>

            {/* Rest label */}
            <text x={restX} y={labelY1} fontSize={7} fill={CREAM} textAnchor="middle" fontFamily="sans-serif" opacity={0.5}>
              rest
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Scale Pattern diagram ─────────────────────────────────────────────────────
const STEP_COLORS: Record<'W' | 'H' | 'A2', string> = {
  W: 'rgba(212,160,23,0.3)',
  H: 'rgba(96,165,250,0.3)',
  A2: 'rgba(248,113,113,0.3)',
};
const STEP_BORDER: Record<'W' | 'H' | 'A2', string> = {
  W: 'rgba(212,160,23,0.6)',
  H: 'rgba(96,165,250,0.6)',
  A2: 'rgba(248,113,113,0.6)',
};

function ScalePatternDiagramSVG({ spec }: { spec: ScalePatternDiagram }) {
  const BOX_W = 32;
  const BOX_H = 32;
  const GAP = 4;
  const PAD = 8;
  const NOTE_ROW_H = spec.noteNames ? 16 : 0;
  const totalW = spec.steps.length * (BOX_W + GAP) - GAP + PAD * 2;
  const totalH = NOTE_ROW_H + BOX_H + PAD * 2;

  return (
    <svg
      width={totalW}
      height={totalH}
      style={{ display: 'block', background: BG, borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)' }}
    >
      {/* Note names above boxes */}
      {spec.noteNames && spec.noteNames.map((name, i) => {
        const x = PAD + i * (BOX_W + GAP) + BOX_W / 2;
        // For noteNames, there's one more name than steps (e.g., C D E F G A B C has 8 names for 7 steps)
        // Position the extra name after the last box
        if (i < spec.steps.length) {
          return (
            <text key={i} x={x} y={PAD + NOTE_ROW_H - 4} fontSize={8} fill={CREAM} textAnchor="middle" fontFamily="serif" opacity={0.8}>
              {name}
            </text>
          );
        }
        // Extra final name
        return (
          <text key={i} x={PAD + i * (BOX_W + GAP) + BOX_W / 2} y={PAD + NOTE_ROW_H - 4} fontSize={8} fill={CREAM} textAnchor="middle" fontFamily="serif" opacity={0.8}>
            {name}
          </text>
        );
      })}

      {spec.steps.map((step, i) => {
        const x = PAD + i * (BOX_W + GAP);
        const y = PAD + NOTE_ROW_H;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={BOX_W}
              height={BOX_H}
              fill={STEP_COLORS[step]}
              stroke={STEP_BORDER[step]}
              strokeWidth={1}
              rx={4}
            />
            <text
              x={x + BOX_W / 2}
              y={y + BOX_H / 2 + 4}
              fontSize={11}
              fill={CREAM}
              textAnchor="middle"
              fontFamily="sans-serif"
              fontWeight="bold"
              opacity={0.9}
            >
              {step}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Circle of Fifths diagram ──────────────────────────────────────────────────
const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#/Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const MINOR_KEYS = ['a', 'e', 'b', 'f#', 'c#', 'g#', 'eb', 'bb', 'f', 'c', 'g', 'd'];

function CircleDiagramSVG({ spec }: { spec: CircleDiagram }) {
  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const OUTER_R = 96;
  const INNER_R = 64;
  const MID_R = (OUTER_R + INNER_R) / 2;
  const MINOR_MID_R = INNER_R - 16;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      style={{ display: 'block', background: BG, borderRadius: 8, border: '1px solid rgba(212,160,23,0.15)' }}
    >
      {/* Outer ring (major keys) */}
      {MAJOR_KEYS.map((key, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const nextAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
        const isHighlighted = spec.highlight && key.startsWith(spec.highlight);

        // Wedge path
        const ox1 = cx + OUTER_R * Math.cos(angle);
        const oy1 = cy + OUTER_R * Math.sin(angle);
        const ox2 = cx + OUTER_R * Math.cos(nextAngle);
        const oy2 = cy + OUTER_R * Math.sin(nextAngle);
        const ix1 = cx + INNER_R * Math.cos(angle);
        const iy1 = cy + INNER_R * Math.sin(angle);
        const ix2 = cx + INNER_R * Math.cos(nextAngle);
        const iy2 = cy + INNER_R * Math.sin(nextAngle);

        const midAngle = (i * 30 + 15 - 90) * (Math.PI / 180);
        const textX = cx + MID_R * Math.cos(midAngle);
        const textY = cy + MID_R * Math.sin(midAngle);

        return (
          <g key={key}>
            <path
              d={`M ${ox1} ${oy1} A ${OUTER_R} ${OUTER_R} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${INNER_R} ${INNER_R} 0 0 0 ${ix1} ${iy1} Z`}
              fill={isHighlighted ? 'rgba(212,160,23,0.25)' : 'rgba(212,201,168,0.05)'}
              stroke="rgba(212,160,23,0.2)"
              strokeWidth={0.8}
            />
            <text
              x={textX}
              y={textY + 4}
              fontSize={key.length > 2 ? 7 : 9}
              fill={isHighlighted ? GOLD : CREAM}
              textAnchor="middle"
              fontFamily="serif"
              fontWeight={isHighlighted ? 'bold' : 'normal'}
              opacity={0.9}
            >
              {key}
            </text>
          </g>
        );
      })}

      {/* Inner ring (minor keys) */}
      {MINOR_KEYS.map((key, i) => {
        const midAngle = (i * 30 + 15 - 90) * (Math.PI / 180);
        const textX = cx + MINOR_MID_R * Math.cos(midAngle);
        const textY = cy + MINOR_MID_R * Math.sin(midAngle);

        return (
          <text
            key={key}
            x={textX}
            y={textY + 3}
            fontSize={7}
            fill={CREAM}
            textAnchor="middle"
            fontFamily="serif"
            opacity={0.5}
          >
            {key}m
          </text>
        );
      })}

      {/* Center label */}
      <circle cx={cx} cy={cy} r={INNER_R - 26} fill="none" stroke="rgba(212,160,23,0.1)" strokeWidth={1} />
      <text x={cx} y={cy + 4} fontSize={8} fill={GOLD} textAnchor="middle" fontFamily="serif" opacity={0.6}>
        Circle of 5ths
      </text>
    </svg>
  );
}

// ── Main MusicDiagram component ───────────────────────────────────────────────
export default function MusicDiagram({ spec }: { spec: DiagramSpec }) {
  let svg: React.ReactNode;

  switch (spec.type) {
    case 'staff':
      svg = <StaffDiagramSVG spec={spec} />;
      break;
    case 'keysig':
      svg = <KeySigDiagramSVG spec={spec} />;
      break;
    case 'keyboard':
      svg = <KeyboardDiagramSVG spec={spec} />;
      break;
    case 'durations':
      svg = <DurationsDiagramSVG spec={spec} />;
      break;
    case 'scale_pattern':
      svg = <ScalePatternDiagramSVG spec={spec} />;
      break;
    case 'circle':
      svg = <CircleDiagramSVG spec={spec} />;
      break;
    default: {
      const _exhaustive: never = spec;
      void _exhaustive;
      return null;
    }
  }

  const label = 'label' in spec ? spec.label : undefined;

  return (
    <div className="overflow-x-auto">
      {svg}
      {label && (
        <div className="text-center text-academy-gold/60 text-xs mt-1.5 font-fantasy">
          {label}
        </div>
      )}
    </div>
  );
}
