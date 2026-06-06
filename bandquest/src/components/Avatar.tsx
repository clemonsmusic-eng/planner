import { useMemo, useState } from 'react';
import type { Appearance, InstrumentId } from '../types/game';
import {
  SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, ACCENT_COLORS, BACKDROPS,
  normalizeAppearance,
} from '../lib/appearance';

interface Props {
  appearance?: Appearance | null;
  /** When set, the avatar renders the hand-drawn class portrait at
   *  `public/portraits/<instrument>.png` if one exists, falling back to the
   *  procedural SVG when the file is missing or fails to load. */
  instrument?: InstrumentId | null;
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Avatar entry point. Prefers a hand-drawn/AI-generated class portrait when one
 * is available for the character's instrument; otherwise renders the procedural
 * SVG portrait below. The portrait file simply needs to be dropped into
 * `public/portraits/<instrument>.png` — no code change required.
 */
export default function Avatar({ appearance, instrument, size = 64, className = '', rounded = true }: Props) {
  const [portraitFailed, setPortraitFailed] = useState(false);

  if (instrument && !portraitFailed) {
    return (
      <img
        src={`/portraits/${instrument}.png`}
        width={size}
        height={size}
        alt="Character portrait"
        className={className}
        onError={() => setPortraitFailed(true)}
        style={{
          display: 'block',
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: rounded ? size * 0.18 : '50%',
        }}
      />
    );
  }

  return <ProceduralAvatar appearance={appearance} size={size} className={className} rounded={rounded} />;
}

/**
 * Procedural JRPG-style portrait inspired by FFVI and Chrono Trigger character art.
 * Anime proportions: detailed eyes with iris/highlight/lash, expressive hair with volume
 * and highlights, shoulder armor with pauldrons, face with radial skin gradient.
 * Used as the fallback when no class portrait image is available.
 */
function ProceduralAvatar({ appearance, size = 64, className = '', rounded = true }: Omit<Props, 'instrument'>) {
  const a = useMemo(() => normalizeAppearance(appearance), [appearance]);
  const gid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  const skin  = SKIN_TONES[a.skinTone];
  const sd    = shade(skin, -24);    // skin shadow
  const sl    = shade(skin, 16);     // skin light
  const hair  = HAIR_COLORS[a.hairColor];
  const hd    = shade(hair, -32);    // hair shadow
  const hl    = shade(hair, 30);     // hair highlight (use at low opacity)
  const outfit  = OUTFIT_COLORS[a.outfitColor];
  const od      = shade(outfit, -30);
  const ol      = shade(outfit, 22);
  const accent  = ACCENT_COLORS[a.accentColor];
  const bd      = BACKDROPS[a.backdrop];
  const brow    = shade(hair, -40);

  // Iris colour derived from accent index — gives each character unique eyes
  const IRIS_SET = [
    '#5580c8','#3d9e82','#c09842','#8244c0','#c04448',
    '#3874c8','#52b84a','#b04488','#3ab8ba','#a08248',
  ];
  const iris  = IRIS_SET[a.accentColor % IRIS_SET.length];
  const irisD = shade(iris, -42);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ display: 'block' }}
      role="img"
      aria-label="Character avatar"
    >
      <defs>
        {/* Sky-to-ground backdrop */}
        <linearGradient id={`bg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={bd.from} />
          <stop offset="100%" stopColor={bd.to}   />
        </linearGradient>
        {/* Radial skin gradient — light upper-left, shadow lower-right */}
        <radialGradient id={`face-${gid}`} cx="38%" cy="34%" r="65%">
          <stop offset="0%"   stopColor={sl}   />
          <stop offset="65%"  stopColor={skin} />
          <stop offset="100%" stopColor={sd}   />
        </radialGradient>
        {/* Clip to rounded square or circle */}
        <clipPath id={`clip-${gid}`}>
          {rounded
            ? <rect x="0" y="0" width="100" height="100" rx="18" />
            : <circle cx="50" cy="50" r="50" />}
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${gid})`}>

        {/* ── 1. Backdrop ─────────────────────────────────────────── */}
        <rect x="0" y="0" width="100" height="100" fill={`url(#bg-${gid})`} />
        {/* Soft ambient glow behind figure */}
        <ellipse cx="50" cy="60" rx="38" ry="28" fill="white" opacity="0.05" />

        {/* ── 2. Back hair (behind head) ───────────────────────────── */}
        {backHair(a.hairStyle, hair, hd, hl)}

        {/* ── 3. Shoulder armor ────────────────────────────────────── */}
        {armor(outfit, od, ol, accent)}

        {/* ── 4. Neck ─────────────────────────────────────────────── */}
        <rect x="44" y="63" width="12" height="14" rx="4" fill={`url(#face-${gid})`} />
        <rect x="44" y="63" width="12" height="6"  rx="3" fill={sd} opacity="0.35" />

        {/* ── 5. Head — anime proportions: wide brow, pointed chin ─── */}
        <path
          d="M32 42 Q31 18 50 17 Q69 18 68 42 Q70 52 64 62 Q57 67 50 67 Q43 67 36 62 Q30 52 32 42 Z"
          fill={`url(#face-${gid})`}
        />
        {/* Cheek blush */}
        <ellipse cx="36" cy="53" rx="6" ry="3.5" fill={shade(skin,-2)}  opacity="0.18" />
        <ellipse cx="64" cy="53" rx="6" ry="3.5" fill={shade(skin,-2)}  opacity="0.18" />

        {/* ── 6. Ears ──────────────────────────────────────────────── */}
        <path d="M32 42 Q27 45 28 52 Q30 56 33 53 Q33 47 32 42 Z" fill={skin} />
        <path d="M29 50 Q30 52 32 51" fill="none" stroke={sd} strokeWidth="0.7" opacity="0.45" />
        <path d="M68 42 Q73 45 72 52 Q70 56 67 53 Q67 47 68 42 Z" fill={skin} />
        <path d="M71 50 Q70 52 68 51" fill="none" stroke={sd} strokeWidth="0.7" opacity="0.45" />

        {/* ── 7. Eyes + brows ──────────────────────────────────────── */}
        {eyes(a.eyes, iris, irisD, brow)}

        {/* ── 8. Nose ─────────────────────────────────────────────── */}
        <path
          d="M47 51 Q48 55 50 56 Q52 55 53 51"
          fill="none" stroke={sd} strokeWidth="1.1" strokeLinecap="round" opacity="0.5"
        />
        <circle cx="48.2" cy="55.5" r="0.9" fill={sd} opacity="0.28" />
        <circle cx="51.8" cy="55.5" r="0.9" fill={sd} opacity="0.28" />

        {/* ── 9. Mouth ─────────────────────────────────────────────── */}
        <path
          d="M43 60 Q50 64 57 60"
          fill="none" stroke={shade(skin, -50)} strokeWidth="1.8" strokeLinecap="round"
        />
        <path d="M44 62 Q50 65 56 62" fill={shade(skin, -16)} opacity="0.32" />

        {/* ── 10. Front hair (in front of head) ───────────────────── */}
        {frontHair(a.hairStyle, hair, hd, hl)}

        {/* ── 11. Accessory ────────────────────────────────────────── */}
        {accessory(a.accessory, accent, iris)}

      </g>

      {/* Frame border */}
      {rounded
        ? <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="17.5"
            fill="none" stroke={accent} strokeOpacity="0.38" strokeWidth="1.5" />
        : <circle cx="50" cy="50" r="49"
            fill="none" stroke={accent} strokeOpacity="0.38" strokeWidth="1.5" />}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shoulder armor
// ─────────────────────────────────────────────────────────────────────────────

function armor(outfit: string, od: string, ol: string, accent: string) {
  return (
    <g>
      {/* Torso base */}
      <path d="M8 100 L8 83 Q22 72 38 70 L50 68 L62 70 Q78 72 92 83 L92 100 Z" fill={outfit} />
      {/* Left pauldron */}
      <ellipse cx="20" cy="78" rx="16" ry="10" fill={outfit} />
      <ellipse cx="20" cy="76" rx="13" ry="8"  fill={ol} />
      <ellipse cx="20" cy="76" rx="13" ry="8"  fill="none" stroke={accent} strokeWidth="1.2" opacity="0.65" />
      <path    d="M10 78 Q20 70 30 78"          fill="none" stroke={accent} strokeWidth="0.8"  opacity="0.45" />
      {/* Right pauldron */}
      <ellipse cx="80" cy="78" rx="16" ry="10" fill={outfit} />
      <ellipse cx="80" cy="76" rx="13" ry="8"  fill={ol} />
      <ellipse cx="80" cy="76" rx="13" ry="8"  fill="none" stroke={accent} strokeWidth="1.2" opacity="0.65" />
      <path    d="M70 78 Q80 70 90 78"          fill="none" stroke={accent} strokeWidth="0.8"  opacity="0.45" />
      {/* Chest plate */}
      <path d="M36 76 Q50 70 64 76 L62 92 Q50 88 38 92 Z" fill={ol} />
      <path d="M36 76 Q50 70 64 76"             fill="none" stroke={accent} strokeWidth="1.5" opacity="0.75" />
      {/* Chest gem / medallion */}
      <circle cx="50" cy="84" r="4.5" fill={accent} opacity="0.72" />
      <circle cx="50" cy="84" r="2.8" fill={ol}     opacity="0.6"  />
      <circle cx="49" cy="83" r="1"   fill="white"  opacity="0.4"  />
      {/* Body shadow — left half */}
      <path d="M8 100 L8 83 Q22 72 38 70 L50 68 V100 Z" fill={od} opacity="0.28" />
      {/* Collar */}
      <path d="M40 72 Q50 67 60 72 Q56 77 50 77 Q44 77 40 72 Z" fill={od} opacity="0.45" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Eyes — anime style with iris, pupil, catch-light, lashes
// ─────────────────────────────────────────────────────────────────────────────

function eyes(style: number, iris: string, irisD: string, brow: string) {
  // Eye socket whites
  const leftWhite  = 'M35 43 Q41 38 47 43 L46 49 Q41 51 36 49 Z';
  const rightWhite = 'M53 43 Q59 38 65 43 L64 49 Q59 51 54 49 Z';
  // Upper lash line
  const leftLash   = 'M35 43 Q41 38 47 43';
  const rightLash  = 'M53 43 Q59 38 65 43';

  // Shared eye builder
  function eyePair(
    lcx: number, lcy: number, rcx: number, rcy: number,
    rx: number, ry: number, lashW: number,
  ) {
    return (
      <>
        {/* Whites */}
        <path d={leftWhite}  fill="white" />
        <path d={rightWhite} fill="white" />
        {/* Iris */}
        <ellipse cx={lcx} cy={lcy} rx={rx} ry={ry} fill={iris} />
        <ellipse cx={rcx} cy={rcy} rx={rx} ry={ry} fill={iris} />
        {/* Iris ring */}
        <ellipse cx={lcx} cy={lcy} rx={rx} ry={ry} fill="none" stroke={irisD} strokeWidth="0.8" />
        <ellipse cx={rcx} cy={rcy} rx={rx} ry={ry} fill="none" stroke={irisD} strokeWidth="0.8" />
        {/* Pupil */}
        <ellipse cx={lcx}     cy={lcy + 0.5} rx={rx * 0.52} ry={ry * 0.56} fill="#090808" />
        <ellipse cx={rcx}     cy={rcy + 0.5} rx={rx * 0.52} ry={ry * 0.56} fill="#090808" />
        {/* Main catch-light */}
        <ellipse cx={lcx + 1.5} cy={lcy - 1.8} rx={rx * 0.38} ry={ry * 0.42} fill="white" opacity="0.92" />
        <ellipse cx={rcx + 1.5} cy={rcy - 1.8} rx={rx * 0.38} ry={ry * 0.42} fill="white" opacity="0.92" />
        {/* Secondary small highlight */}
        <circle  cx={lcx - 1.4} cy={lcy + 1.6} r={rx * 0.17} fill="white" opacity="0.52" />
        <circle  cx={rcx - 1.4} cy={rcy + 1.6} r={rx * 0.17} fill="white" opacity="0.52" />
        {/* Upper lash line */}
        <path d={leftLash}  stroke="#130e0d" strokeWidth={lashW} fill="none" strokeLinecap="round" />
        <path d={rightLash} stroke="#130e0d" strokeWidth={lashW} fill="none" strokeLinecap="round" />
        {/* Lower lash hint */}
        <path d="M36 49 Q41 51 46 49" stroke="#130e0d" strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M54 49 Q59 51 64 49" stroke="#130e0d" strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* Outer lash strokes */}
        <path d="M35 43 L32 41"  stroke="#130e0d" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M65 43 L68 41"  stroke="#130e0d" strokeWidth="1.1" strokeLinecap="round" />
      </>
    );
  }

  switch (style) {
    case 0: // Wide / innocent — large round iris
      return (
        <g>
          {eyePair(41, 45, 59, 45, 4.0, 4.6, 2.2)}
          {/* Brows — gently arched */}
          <path d="M33 37 Q41 34 47 36" stroke={brow} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M53 36 Q59 34 67 37" stroke={brow} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      );

    case 1: // Calm / confident — almond shape, slightly narrower
      return (
        <g>
          {eyePair(41, 45.5, 59, 45.5, 3.7, 4.0, 2.0)}
          {/* Brows — level, mature */}
          <path d="M33 38 Q41 35 47 37" stroke={brow} strokeWidth="2.0" fill="none" strokeLinecap="round" />
          <path d="M53 37 Q59 35 67 38" stroke={brow} strokeWidth="2.0" fill="none" strokeLinecap="round" />
        </g>
      );

    case 2: // Sharp / determined — angled lash line
      return (
        <g>
          <path d={leftWhite}  fill="white" />
          <path d={rightWhite} fill="white" />
          {/* Iris */}
          <ellipse cx="41" cy="45" rx="3.6" ry="3.8" fill={iris} />
          <ellipse cx="59" cy="45" rx="3.6" ry="3.8" fill={iris} />
          <ellipse cx="41" cy="45" rx="3.6" ry="3.8" fill="none" stroke={irisD} strokeWidth="0.8" />
          <ellipse cx="59" cy="45" rx="3.6" ry="3.8" fill="none" stroke={irisD} strokeWidth="0.8" />
          <ellipse cx="41"   cy="45.5" rx="1.9" ry="2.1" fill="#090808" />
          <ellipse cx="59"   cy="45.5" rx="1.9" ry="2.1" fill="#090808" />
          <ellipse cx="42.5" cy="43.2" rx="1.4" ry="1.6" fill="white" opacity="0.9" />
          <ellipse cx="60.5" cy="43.2" rx="1.4" ry="1.6" fill="white" opacity="0.9" />
          {/* Angular upper lash — droops at outer corners */}
          <path d="M35 43 Q41 38 47 44" stroke="#130e0d" strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M53 44 Q59 38 65 43" stroke="#130e0d" strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M35 43 L32 42" stroke="#130e0d" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M65 43 L68 42" stroke="#130e0d" strokeWidth="1.3" strokeLinecap="round" />
          {/* Angled brows — fierce */}
          <path d="M33 36 L47 39"  stroke={brow} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M53 39 L67 36"  stroke={brow} strokeWidth="2.3" fill="none" strokeLinecap="round" />
        </g>
      );

    case 3: // Wink — left eye closed
      return (
        <g>
          {/* Left — closed with crinkle */}
          <path d="M35 45 Q41 49 47 45" stroke="#130e0d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M36 43 Q41 46 46 43" stroke="#130e0d" strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.5" />
          <path d="M35 44 L33 42"  stroke="#130e0d" strokeWidth="1"   strokeLinecap="round" opacity="0.7" />
          <path d="M47 44 L49 43"  stroke="#130e0d" strokeWidth="1"   strokeLinecap="round" opacity="0.7" />
          {/* Right — open */}
          <path d={rightWhite} fill="white" />
          <ellipse cx="59" cy="45" rx="4.0" ry="4.6" fill={iris} />
          <ellipse cx="59" cy="45" rx="4.0" ry="4.6" fill="none" stroke={irisD} strokeWidth="0.8" />
          <ellipse cx="59"   cy="45.5" rx="2.1" ry="2.4" fill="#090808" />
          <ellipse cx="60.5" cy="42.5" rx="1.5" ry="1.8" fill="white" opacity="0.92" />
          <path d={rightLash} stroke="#130e0d" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M54 49 Q59 51 64 49" stroke="#130e0d" strokeWidth="0.85" fill="none" strokeLinecap="round" opacity="0.6" />
          <path d="M65 43 L68 41" stroke="#130e0d" strokeWidth="1.1" strokeLinecap="round" />
          {/* Brows */}
          <path d="M33 37 Q41 36 47 38" stroke={brow} strokeWidth="2.0" fill="none" strokeLinecap="round" />
          <path d="M53 36 Q59 34 67 37" stroke={brow} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      );

    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Back hair  (drawn before head so it appears behind it)
// ─────────────────────────────────────────────────────────────────────────────

function backHair(style: number, hair: string, hd: string, _hl: string) {
  switch (style) {
    case 0: // Spiky — small back crown base
      return (
        <g>
          <path d="M34 36 Q33 20 50 18 Q67 20 66 36 L60 26 L56 33 L50 22 L44 33 L40 26 Z" fill={hd} />
        </g>
      );
    case 1: // Long flowing — wide back panels
      return (
        <g>
          <path d="M26 44 Q20 70 28 92 L36 90 Q30 66 32 44 Z" fill={hd}   />
          <path d="M28 44 Q22 72 30 92 L36 90 Q28 68 30 44 Z" fill={hair} opacity="0.5" />
          <path d="M74 44 Q80 70 72 92 L64 90 Q70 66 68 44 Z" fill={hd}   />
          <path d="M72 44 Q78 72 70 92 L64 90 Q72 68 70 44 Z" fill={hair} opacity="0.5" />
        </g>
      );
    case 4: // Ponytail — thick tail sweeping right
      return (
        <g>
          <path d="M66 32 Q92 40 86 70 Q84 80 76 82 Q84 64 76 44 Z"    fill={hd}   />
          <path d="M66 32 Q90 42 84 70 Q82 78 74 80 Q82 62 74 44 Z"    fill={hair} opacity="0.7" />
          <path d="M66 32 Q86 44 80 68 Q80 68 76 70 Q78 60 72 44 Z"    fill="white" opacity="0.15" />
        </g>
      );
    case 5: // Dramatic — wide side volumes
      return (
        <g>
          <circle cx="24" cy="52" r="17" fill={hd}   />
          <circle cx="76" cy="52" r="17" fill={hd}   />
          <circle cx="24" cy="52" r="13" fill={hair} opacity="0.5" />
          <circle cx="76" cy="52" r="13" fill={hair} opacity="0.5" />
        </g>
      );
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Front hair  (drawn after head so it overlaps the forehead)
// ─────────────────────────────────────────────────────────────────────────────

function frontHair(style: number, hair: string, hd: string, _hl: string) {
  switch (style) {
    case 0: { // Wild spiky — Crono (CT) inspired
      return (
        <g>
          {/* Cap base */}
          <path d="M32 42 Q32 18 50 17 Q68 18 68 42 L62 28 L56 34 L50 22 L44 34 L38 28 Z" fill={hair} />
          {/* Upward spike cluster */}
          <path d="M36 30 L32 12 L38 24 Z"  fill={hair} />
          <path d="M42 24 L38  6 L46 22 Z"  fill={hair} />
          <path d="M50 22 L48  4 L54 20 Z"  fill={hair} />
          <path d="M58 24 L62  6 L54 22 Z"  fill={hair} />
          <path d="M64 30 L68 12 L62 24 Z"  fill={hair} />
          {/* Spike highlights */}
          <path d="M42 24 L40 10 L44 22 Z" fill="white" opacity="0.2" />
          <path d="M50 22 L49  6 L52 20 Z" fill="white" opacity="0.2" />
          <path d="M58 24 L60 10 L56 22 Z" fill="white" opacity="0.18" />
          {/* Side pieces */}
          <path d="M32 42 Q28 50 30 58 L33 56 Q31 48 33 42 Z" fill={hair} />
          <path d="M68 42 Q72 50 70 58 L67 56 Q69 48 67 42 Z" fill={hair} />
          {/* Shadow in spike roots */}
          <path d="M38 28 Q42 24 50 22 Q58 24 62 28 Q56 32 50 33 Q44 32 38 28 Z" fill={hd} opacity="0.4" />
        </g>
      );
    }
    case 1: { // Long flowing — Terra (FFVI) inspired
      return (
        <g>
          <path d="M30 44 Q29 18 50 17 Q71 18 70 44 Q66 30 58 28 Q52 32 50 32 Q48 32 42 28 Q34 30 30 44 Z" fill={hair} />
          {/* Side locks falling forward */}
          <path d="M30 44 Q28 58 30 74 L35 72 Q33 56 34 44 Z" fill={hair} />
          <path d="M70 44 Q72 58 70 74 L65 72 Q67 56 66 44 Z" fill={hair} />
          {/* Crown highlight */}
          <path d="M50 17 Q62 18 66 28 Q58 22 50 23 Z"        fill="white" opacity="0.22" />
          <path d="M50 17 Q38 18 34 28 Q42 22 50 23 Z"        fill="white" opacity="0.15" />
          {/* Bang wisps */}
          <path d="M38 28 Q36 22 38 18 Q42 26 44 30 Z" fill={hd} opacity="0.55" />
        </g>
      );
    }
    case 2: { // Swept layered — Locke (FFVI) inspired
      return (
        <g>
          <path d="M30 44 Q29 20 50 18 Q71 19 70 44 Q68 30 56 28 Q48 26 40 32 Q34 36 30 44 Z" fill={hair} />
          {/* Forelock piece falling left */}
          <path d="M40 30 Q34 24 34 18 Q38 24 42 28 Q44 30 42 34 Z" fill={hair} />
          <path d="M37 26 Q33 18 35 13 Q37 20 40 26 Z"              fill={hd}   />
          {/* Right side */}
          <path d="M68 42 Q70 52 68 62 L65 60 Q67 50 66 42 Z" fill={hair} />
          {/* Crown highlight */}
          <path d="M50 18 Q65 20 68 32 Q60 24 50 24 Z" fill="white" opacity="0.22" />
        </g>
      );
    }
    case 3: { // Short structured
      return (
        <g>
          <path d="M31 42 Q30 18 50 17 Q70 18 69 42 Q66 26 58 24 Q54 28 50 29 Q46 28 42 24 Q34 26 31 42 Z" fill={hair} />
          <path d="M31 42 Q32 36 34 32 L36 34 Q33 38 33 42 Z" fill={hd} opacity="0.45" />
          <path d="M69 42 Q68 36 66 32 L64 34 Q67 38 67 42 Z" fill={hd} opacity="0.45" />
          {/* Crown highlight */}
          <path d="M50 17 Q63 18 67 28 Q60 22 50 22 Z" fill="white" opacity="0.24" />
          <path d="M50 17 Q37 18 33 28 Q40 22 50 22 Z" fill="white" opacity="0.16" />
        </g>
      );
    }
    case 4: { // Ponytail — Celes (FFVI) inspired
      return (
        <g>
          {/* Swept back crown */}
          <path d="M31 42 Q30 18 50 17 Q70 18 69 42 Q66 28 54 26 Q44 26 36 30 Q32 36 31 42 Z" fill={hair} />
          {/* Hair tie/band at right side */}
          <ellipse cx="68" cy="32" rx="5"   ry="5.5" fill={hair} />
          <ellipse cx="68" cy="32" rx="3.5" ry="4"   fill={hd}   />
          {/* Side wisps */}
          <path d="M31 42 Q30 54 32 62 L35 60 Q32 50 32 42 Z" fill={hair} opacity="0.75" />
          {/* Crown highlight */}
          <path d="M50 17 Q63 18 67 28 Q58 22 50 22 Z" fill="white" opacity="0.24" />
        </g>
      );
    }
    case 5: { // Dramatic voluminous — big fantasy hair
      return (
        <g>
          {/* Large puffball clusters */}
          <circle cx="32" cy="28" r="13" fill={hair} />
          <circle cx="50" cy="22" r="14" fill={hair} />
          <circle cx="68" cy="28" r="13" fill={hair} />
          <circle cx="26" cy="40" r="11" fill={hair} />
          <circle cx="74" cy="40" r="11" fill={hair} />
          {/* Base */}
          <path d="M29 44 Q30 28 50 24 Q70 28 71 44 Q60 34 50 36 Q40 34 29 44 Z" fill={hd} opacity="0.48" />
          {/* Highlights on clusters */}
          <circle cx="50" cy="22" r="5"   fill="white" opacity="0.18" />
          <circle cx="32" cy="26" r="4.5" fill="white" opacity="0.15" />
          <circle cx="68" cy="26" r="4.5" fill="white" opacity="0.15" />
        </g>
      );
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Accessories
// ─────────────────────────────────────────────────────────────────────────────

function accessory(style: number, accent: string, iris: string) {
  const ad = shade(accent, -42);
  const al = shade(accent, 32);

  switch (style) {
    case 1: { // Stylish glasses (tinted lenses)
      return (
        <g>
          <path d="M35 43 Q41 40 47 43 L47 49 Q41 51 35 49 Z" fill={iris}    opacity="0.18" />
          <path d="M53 43 Q59 40 65 43 L65 49 Q59 51 53 49 Z" fill={iris}    opacity="0.18" />
          <path d="M35 43 Q41 40 47 43 L47 49 Q41 51 35 49 Z" fill="none" stroke="#1a1a1a" strokeWidth="1.4" />
          <path d="M53 43 Q59 40 65 43 L65 49 Q59 51 53 49 Z" fill="none" stroke="#1a1a1a" strokeWidth="1.4" />
          <path d="M47 45.5 H53" stroke="#1a1a1a" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M35 45 L31 44" stroke="#1a1a1a" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M65 45 L69 44" stroke="#1a1a1a" strokeWidth="1.1" strokeLinecap="round" />
        </g>
      );
    }
    case 2: { // Headband / bandana — Chrono Trigger style
      return (
        <g>
          <path d="M30 36 Q50 29 70 36 L70 41 Q50 34 30 41 Z"    fill={accent} />
          <path d="M30 36 Q50 30 70 36 L70 37 Q50 31 30 37 Z"    fill={al}     opacity="0.45" />
          <path d="M30 38 Q50 32 70 38"  fill="none" stroke={ad} strokeWidth="0.8" opacity="0.5" />
          {/* Knot/tail on right */}
          <path d="M70 36 Q79 38 80 46 L76 48 Q74 42 70 41 Z"   fill={accent} />
          <path d="M70 41 Q76 43 76 48 L74 47 Q73 43 70 41 Z"   fill={ad}     opacity="0.6"  />
        </g>
      );
    }
    case 3: { // Crown — FFVI / fantasy style
      return (
        <g>
          {/* Band base */}
          <path d="M33 31 Q50 27 67 31 L67 36 Q50 32 33 36 Z"
            fill="#d8aa22" stroke={shade('#d8aa22',-26)} strokeWidth="0.8" />
          {/* Points */}
          <path d="M33 31 L36 22 L41 30 L45 21 L50 30 L55 21 L59 30 L64 22 L67 31 Q50 27 33 31 Z"
            fill="#ecc84e" stroke={shade('#ecc84e',-26)} strokeWidth="0.6" />
          {/* Gems */}
          <ellipse cx="50" cy="26" rx="2.6" ry="2.6" fill="#c83050" />
          <ellipse cx="41" cy="28" rx="1.8" ry="1.8" fill="#4068cc" />
          <ellipse cx="59" cy="28" rx="1.8" ry="1.8" fill="#4068cc" />
          {/* Sheen */}
          <path d="M33 31 Q50 28 67 31" fill="none" stroke="white" strokeWidth="0.5" opacity="0.4" />
        </g>
      );
    }
    case 4: { // Feather plume
      return (
        <g>
          <path d="M36 28 Q30 18 33  9 Q37 18 38 24 Z" fill={accent}  />
          <path d="M36 28 Q27 20 29 11"  fill="none" stroke={al}  strokeWidth="1.3" opacity="0.8" />
          <path d="M36 24 Q26 17 28 11"  fill="none" stroke={al}  strokeWidth="1.1" opacity="0.6" />
          <path d="M37 20 Q28 15 29  9"  fill="none" stroke={al}  strokeWidth="0.9" opacity="0.45" />
          <path d="M36 28 Q34 22 34 16 Q35 20 37 25 Z" fill={ad} opacity="0.5" />
          <rect x="33" y="28" width="6" height="4" rx="2" fill={ad} opacity="0.65" />
        </g>
      );
    }
    case 5: { // Dangling gem earrings
      return (
        <g>
          {/* Left */}
          <circle cx="29"   cy="50"   r="2.8"  fill={accent} stroke={ad} strokeWidth="0.8" />
          <line   x1="29"   y1="53"   x2="29"   y2="60"      stroke={accent} strokeWidth="1.3" />
          <ellipse cx="29"  cy="62"   rx="2.6"  ry="3.2"     fill={accent} />
          <ellipse cx="29"  cy="62"   rx="2.6"  ry="3.2"     fill="none" stroke={ad} strokeWidth="0.7" />
          <ellipse cx="29.9" cy="60.8" rx="1"   ry="1.2"     fill="white" opacity="0.48" />
          {/* Right */}
          <circle cx="71"   cy="50"   r="2.8"  fill={accent} stroke={ad} strokeWidth="0.8" />
          <line   x1="71"   y1="53"   x2="71"   y2="60"      stroke={accent} strokeWidth="1.3" />
          <ellipse cx="71"  cy="62"   rx="2.6"  ry="3.2"     fill={accent} />
          <ellipse cx="71"  cy="62"   rx="2.6"  ry="3.2"     fill="none" stroke={ad} strokeWidth="0.7" />
          <ellipse cx="71.9" cy="60.8" rx="1"   ry="1.2"     fill="white" opacity="0.48" />
        </g>
      );
    }
    default:
      void iris;
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Colour util
// ─────────────────────────────────────────────────────────────────────────────

function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8)  & 0xff) + amount));
  const b = Math.max(0, Math.min(255, ( num        & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
