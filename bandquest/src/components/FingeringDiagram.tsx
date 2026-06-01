import type {
  InstrumentKey,
  AnyFingering,
  TrumpetFingering,
  HornFingering,
  ValveFingering,
  TromboneFingering,
  WoodwindFingering,
} from '../lib/fingeringData';

// ── Color constants ────────────────────────────────────────────────────────────
const BG = '#0d1520';
const CREAM = '#d4c9a8';
const GOLD = '#D4A017';
const PRESSED = '#2a1f08';
const PRESSED_BORDER = GOLD;
const OPEN_FILL = BG;
const OPEN_BORDER = `${CREAM}60`;

// ── Type guards ────────────────────────────────────────────────────────────────

function isTrumpet(f: AnyFingering): f is TrumpetFingering {
  return 'v1' in f && !('thumb' in f) && !('position' in f) && !('octave' in f);
}
function isHorn(f: AnyFingering): f is HornFingering {
  return 'thumb' in f;
}
function isValve(f: AnyFingering): f is ValveFingering {
  return 'v1' in f && !('thumb' in f) && !('position' in f) && !('octave' in f);
}
function isTrombone(f: AnyFingering): f is TromboneFingering {
  return 'position' in f;
}
function isWoodwind(f: AnyFingering): f is WoodwindFingering {
  return 'octave' in f;
}

// ── Shared valve circle ────────────────────────────────────────────────────────

function ValveCircle({
  cx, cy, r, pressed, label,
}: { cx: number; cy: number; r: number; pressed: boolean; label: string }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={pressed ? PRESSED : OPEN_FILL}
        stroke={pressed ? PRESSED_BORDER : OPEN_BORDER}
        strokeWidth={1.2}
      />
      <text
        x={cx}
        y={cy + 4}
        fontSize={9}
        fill={pressed ? GOLD : `${CREAM}70`}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        {label}
      </text>
    </g>
  );
}

// ── Trumpet diagram ────────────────────────────────────────────────────────────

function TrumpetDiagram({ fingering, scale }: { fingering: TrumpetFingering; scale: number }) {
  const r = 10 * scale;
  const gap = 24 * scale;
  const cy = 14 * scale;
  const w = 80 * scale;
  const h = 28 * scale;
  const startX = (w - gap * 2) / 2 + r;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <ValveCircle cx={startX}          cy={cy} r={r} pressed={fingering.v1} label="1" />
      <ValveCircle cx={startX + gap}    cy={cy} r={r} pressed={fingering.v2} label="2" />
      <ValveCircle cx={startX + gap*2}  cy={cy} r={r} pressed={fingering.v3} label="3" />
    </svg>
  );
}

// ── French Horn diagram ────────────────────────────────────────────────────────

function HornDiagram({ fingering, scale }: { fingering: HornFingering; scale: number }) {
  const r = 9 * scale;
  const gap = 22 * scale;
  const cy = 14 * scale;
  const w = 96 * scale;
  const h = 28 * scale;
  const thumbW = 18 * scale;
  const thumbH = 16 * scale;
  const thumbX = 4 * scale;
  const thumbY = cy - thumbH / 2;
  const circleStart = thumbX + thumbW + 8 * scale;

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {/* Thumb box */}
      <rect
        x={thumbX}
        y={thumbY}
        width={thumbW}
        height={thumbH}
        rx={3}
        fill={fingering.thumb ? PRESSED : OPEN_FILL}
        stroke={fingering.thumb ? PRESSED_BORDER : OPEN_BORDER}
        strokeWidth={1.2}
      />
      <text
        x={thumbX + thumbW / 2}
        y={cy + 4}
        fontSize={8}
        fill={fingering.thumb ? GOLD : `${CREAM}70`}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        T
      </text>
      <ValveCircle cx={circleStart}        cy={cy} r={r} pressed={fingering.v1} label="1" />
      <ValveCircle cx={circleStart + gap}  cy={cy} r={r} pressed={fingering.v2} label="2" />
      <ValveCircle cx={circleStart + gap*2} cy={cy} r={r} pressed={fingering.v3} label="3" />
    </svg>
  );
}

// ── Valve (Euph/Tuba) diagram ──────────────────────────────────────────────────

function ValveDiagram({ fingering, scale }: { fingering: ValveFingering; scale: number }) {
  const r = 10 * scale;
  const gap = 24 * scale;
  const cy = 14 * scale;
  const valves = fingering.v4 !== undefined
    ? [fingering.v1, fingering.v2, fingering.v3, fingering.v4]
    : [fingering.v1, fingering.v2, fingering.v3];
  const w = (valves.length * gap + 4) * scale;
  const h = 28 * scale;
  const startX = r + 4 * scale;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {valves.map((pressed, i) => (
        <ValveCircle
          key={i}
          cx={startX + i * gap}
          cy={cy}
          r={r}
          pressed={pressed}
          label={String(i + 1)}
        />
      ))}
    </svg>
  );
}

// ── Trombone diagram ───────────────────────────────────────────────────────────

function TromboneDiagram({ fingering, scale }: { fingering: TromboneFingering; scale: number }) {
  const w = 120 * scale;
  const h = 48 * scale;
  const bodyY = 8 * scale;
  const bodyH = 14 * scale;
  const tubeW = 80 * scale;
  const bellR = 12 * scale;
  const bellX = 4 * scale;
  // Slide extends from bellX + bellR*2 to tubeW
  const slideStart = bellX + bellR * 2 + 4 * scale;
  const slideEnd = tubeW + 10 * scale;
  const slideRange = slideEnd - slideStart;
  // 7 positions spread over range (1 = shortest/innermost, 7 = fully extended)
  const MAX_EXT = 7;
  const ext = (fingering.position - 1) / (MAX_EXT - 1);
  const handleX = slideStart + ext * slideRange;
  const tubeMidY = bodyY + bodyH / 2;

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {/* Bell */}
      <ellipse
        cx={bellX + bellR}
        cy={tubeMidY}
        rx={bellR}
        ry={bodyH / 2 + 4 * scale}
        fill={`${CREAM}15`}
        stroke={`${CREAM}40`}
        strokeWidth={1}
      />
      {/* Tube body */}
      <rect
        x={bellX + bellR}
        y={bodyY}
        width={tubeW - bellR}
        height={bodyH}
        fill={`${CREAM}10`}
        stroke={`${CREAM}30`}
        strokeWidth={1}
      />
      {/* Slide position marker */}
      <rect
        x={handleX - 3 * scale}
        y={bodyY - 4 * scale}
        width={6 * scale}
        height={bodyH + 8 * scale}
        rx={2}
        fill={GOLD}
        opacity={0.85}
      />
      {/* Position labels 1-7 along bottom */}
      {Array.from({ length: 7 }, (_, i) => {
        const px = slideStart + (i / 6) * slideRange;
        const isActive = i + 1 === fingering.position;
        return (
          <text
            key={i}
            x={px}
            y={bodyY + bodyH + 14 * scale}
            fontSize={7 * scale}
            fill={isActive ? GOLD : `${CREAM}35`}
            textAnchor="middle"
            fontFamily="sans-serif"
            fontWeight={isActive ? 'bold' : 'normal'}
          >
            {i + 1}
          </text>
        );
      })}
      {/* Position number */}
      <text
        x={w - 12 * scale}
        y={tubeMidY + 4 * scale}
        fontSize={11 * scale}
        fill={GOLD}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="bold"
      >
        {fingering.position}
      </text>
      {fingering.trigger && (
        <text
          x={w - 12 * scale}
          y={tubeMidY + 15 * scale}
          fontSize={7 * scale}
          fill={`${GOLD}80`}
          textAnchor="middle"
          fontFamily="sans-serif"
        >
          T
        </text>
      )}
    </svg>
  );
}

// ── Woodwind diagram ───────────────────────────────────────────────────────────
// Vertical instrument body with holes

function WoodwindDiagram({
  fingering,
  scale,
  showOctaveLabel,
}: {
  fingering: WoodwindFingering;
  scale: number;
  showOctaveLabel?: string; // "R" for register key, "Oct" for octave key
}) {
  const bodyW = 14 * scale;
  const bodyX = 18 * scale; // center x for holes
  const totalW = 52 * scale;

  // Hole positions (y from top)
  const topPad = 14 * scale;
  const holeR = 5 * scale;
  const lhGap = 10 * scale;
  const rhGap = 10 * scale;
  const breakGap = 8 * scale;

  const lhStartY = topPad + 8 * scale;
  const lh1Y = lhStartY;
  const lh2Y = lhStartY + lhGap;
  const lh3Y = lhStartY + lhGap * 2;
  const rhStartY = lh3Y + breakGap;
  const rh1Y = rhStartY;
  const rh2Y = rhStartY + rhGap;
  const rh3Y = rhStartY + rhGap * 2;
  const rh4Y = rhStartY + rhGap * 3;

  const bodyH = rh4Y + holeR * 2 + topPad;

  // Register/octave key marker
  const regKeyX = bodyX - bodyW / 2 - 8 * scale;
  const regKeyY = topPad;

  function Hole({ cx, cy, pressed, label }: { cx: number; cy: number; pressed: boolean; label?: string }) {
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={holeR}
          fill={pressed ? CREAM : BG}
          stroke={pressed ? `${CREAM}90` : `${CREAM}40`}
          strokeWidth={1.2}
        />
        {label && (
          <text
            x={cx + holeR + 4 * scale}
            y={cy + 3 * scale}
            fontSize={6 * scale}
            fill={`${CREAM}50`}
            fontFamily="sans-serif"
          >
            {label}
          </text>
        )}
      </g>
    );
  }

  return (
    <svg width={totalW} height={bodyH} style={{ display: 'block' }}>
      {/* Instrument body */}
      <rect
        x={bodyX - bodyW / 2}
        y={topPad / 2}
        width={bodyW}
        height={bodyH - topPad / 2}
        rx={bodyW / 2}
        fill={`${CREAM}08`}
        stroke={`${CREAM}25`}
        strokeWidth={1}
      />

      {/* Register / octave key */}
      {showOctaveLabel && (
        <g>
          <circle
            cx={regKeyX}
            cy={regKeyY}
            r={5 * scale}
            fill={fingering.octave ? GOLD : OPEN_FILL}
            stroke={fingering.octave ? GOLD : `${CREAM}40`}
            strokeWidth={1.2}
          />
          <text
            x={regKeyX}
            y={regKeyY + 3 * scale}
            fontSize={5 * scale}
            fill={fingering.octave ? BG : `${CREAM}60`}
            textAnchor="middle"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            {showOctaveLabel}
          </text>
          {/* connector line */}
          <line
            x1={regKeyX + 5 * scale}
            y1={regKeyY}
            x2={bodyX - bodyW / 2}
            y2={lh1Y - 2 * scale}
            stroke={`${CREAM}20`}
            strokeWidth={0.8}
          />
        </g>
      )}

      {/* sideEb marker if present */}
      {fingering.sideEb && (
        <g>
          <rect
            x={bodyX + bodyW / 2 + 2 * scale}
            y={lh1Y - 4 * scale}
            width={10 * scale}
            height={7 * scale}
            rx={2}
            fill={`${GOLD}30`}
            stroke={`${GOLD}60`}
            strokeWidth={0.8}
          />
          <text
            x={bodyX + bodyW / 2 + 7 * scale}
            y={lh1Y + 1 * scale}
            fontSize={5 * scale}
            fill={GOLD}
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            Eb
          </text>
        </g>
      )}

      {/* Left hand holes */}
      <Hole cx={bodyX} cy={lh1Y} pressed={fingering.lh1} />
      <Hole cx={bodyX} cy={lh2Y} pressed={fingering.lh2} />
      <Hole cx={bodyX} cy={lh3Y} pressed={fingering.lh3} />

      {/* Break divider */}
      <line
        x1={bodyX - bodyW / 2 - 4 * scale}
        y1={lh3Y + lhGap * 0.5}
        x2={bodyX + bodyW / 2 + 4 * scale}
        y2={lh3Y + lhGap * 0.5}
        stroke={`${CREAM}15`}
        strokeWidth={0.6}
        strokeDasharray={`${2 * scale},${2 * scale}`}
      />

      {/* Right hand holes */}
      <Hole cx={bodyX} cy={rh1Y} pressed={fingering.rh1} />
      <Hole cx={bodyX} cy={rh2Y} pressed={fingering.rh2} />
      <Hole cx={bodyX} cy={rh3Y} pressed={fingering.rh3} />
      {fingering.rh4 !== undefined && (
        <Hole cx={bodyX} cy={rh4Y} pressed={fingering.rh4} />
      )}
    </svg>
  );
}

// ── Main FingeringDiagram ──────────────────────────────────────────────────────

interface FingeringDiagramProps {
  instrument: InstrumentKey;
  fingering: AnyFingering;
  size?: 'sm' | 'md';
}

export default function FingeringDiagram({ instrument, fingering, size = 'sm' }: FingeringDiagramProps) {
  const scale = size === 'md' ? 1.25 : 1;

  const containerStyle: React.CSSProperties = {
    background: BG,
    borderRadius: 6,
    border: `1px solid rgba(212,160,23,0.12)`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${4 * scale}px`,
    minHeight: `${32 * scale}px`,
  };

  if (instrument === 'trumpet') {
    if (!isTrumpet(fingering)) return null;
    return (
      <div style={containerStyle}>
        <TrumpetDiagram fingering={fingering} scale={scale} />
      </div>
    );
  }

  if (instrument === 'horn') {
    if (!isHorn(fingering)) return null;
    return (
      <div style={containerStyle}>
        <HornDiagram fingering={fingering} scale={scale} />
      </div>
    );
  }

  if (instrument === 'euphonium' || instrument === 'tuba') {
    if (!isValve(fingering)) return null;
    return (
      <div style={containerStyle}>
        <ValveDiagram fingering={fingering} scale={scale} />
      </div>
    );
  }

  if (instrument === 'trombone') {
    if (!isTrombone(fingering)) return null;
    return (
      <div style={containerStyle}>
        <TromboneDiagram fingering={fingering} scale={scale} />
      </div>
    );
  }

  // Woodwind instruments
  if (!isWoodwind(fingering)) return null;

  let octaveLabel: string | undefined;
  if (instrument === 'clarinet') octaveLabel = 'R';
  else if (instrument === 'alto_sax') octaveLabel = 'Oct';
  else if (instrument === 'flute') octaveLabel = '2';

  return (
    <div style={containerStyle}>
      <WoodwindDiagram fingering={fingering} scale={scale} showOctaveLabel={octaveLabel} />
    </div>
  );
}
