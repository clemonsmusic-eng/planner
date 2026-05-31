import { useMemo } from 'react';
import type { Appearance } from '../types/game';
import {
  SKIN_TONES, HAIR_COLORS, OUTFIT_COLORS, ACCENT_COLORS, BACKDROPS,
  normalizeAppearance,
} from '../lib/appearance';

interface Props {
  appearance?: Appearance | null;
  size?: number;          // pixel size of the square avatar
  className?: string;
  rounded?: boolean;      // rounded-square frame (default) vs. circle
}

/**
 * A fully procedural, asset-free fantasy portrait. Everything is drawn from
 * the indexed Appearance so it renders identically anywhere (cards, hub,
 * leaderboard, teacher dashboard) with no image loading.
 */
export default function Avatar({ appearance, size = 64, className = '', rounded = true }: Props) {
  const a = useMemo(() => normalizeAppearance(appearance), [appearance]);

  const skin = SKIN_TONES[a.skinTone];
  const skinShade = shade(skin, -18);
  const hair = HAIR_COLORS[a.hairColor];
  const hairShade = shade(hair, -22);
  const outfit = OUTFIT_COLORS[a.outfitColor];
  const outfitShade = shade(outfit, -22);
  const accent = ACCENT_COLORS[a.accentColor];
  const backdrop = BACKDROPS[a.backdrop];
  const gid = useMemo(() => Math.random().toString(36).slice(2, 8), []);

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
        <linearGradient id={`bg-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={backdrop.from} />
          <stop offset="100%" stopColor={backdrop.to} />
        </linearGradient>
        <clipPath id={`clip-${gid}`}>
          {rounded
            ? <rect x="0" y="0" width="100" height="100" rx="18" />
            : <circle cx="50" cy="50" r="50" />}
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${gid})`}>
        {/* Backdrop */}
        <rect x="0" y="0" width="100" height="100" fill={`url(#bg-${gid})`} />
        <circle cx="50" cy="58" r="34" fill="#ffffff" opacity="0.04" />

        {/* Back hair (for long / ponytail styles) */}
        {renderBackHair(a.hairStyle, hair, hairShade)}

        {/* Shoulders / armor */}
        <path d="M18 100 V86 Q50 66 82 86 V100 Z" fill={outfit} />
        <path d="M18 100 V86 Q50 66 82 86 V100 Z" fill="#000" opacity="0.0" />
        {/* armor shading */}
        <path d="M18 100 V86 Q34 74 50 73 V100 Z" fill={outfitShade} opacity="0.45" />
        {/* collar / accent trim */}
        <path d="M38 78 Q50 70 62 78 L58 88 Q50 83 42 88 Z" fill={accent} />
        <circle cx="50" cy="86" r="2.4" fill={outfitShade} />

        {/* Neck */}
        <rect x="44" y="60" width="12" height="14" rx="5" fill={skin} />
        <rect x="44" y="60" width="12" height="6" rx="3" fill={skinShade} opacity="0.5" />

        {/* Head */}
        <ellipse cx="50" cy="44" rx="20" ry="22" fill={skin} />
        {/* cheek/jaw shading */}
        <path d="M30 44 Q30 64 50 66 Q44 60 42 44 Z" fill={skinShade} opacity="0.30" />
        {/* ears */}
        <ellipse cx="30.5" cy="46" rx="3.2" ry="4.6" fill={skin} />
        <ellipse cx="69.5" cy="46" rx="3.2" ry="4.6" fill={skin} />

        {/* Eyes + brows */}
        {renderEyes(a.eyes)}

        {/* Nose + mouth */}
        <path d="M49 46 Q48 50 50.5 51" fill="none" stroke={skinShade} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
        <path d="M45 55 Q50 58 55 55" fill="none" stroke={shade(skin, -38)} strokeWidth="1.6" strokeLinecap="round" />

        {/* Front hair */}
        {renderFrontHair(a.hairStyle, hair, hairShade)}

        {/* Accessory (drawn last, on top) */}
        {renderAccessory(a.accessory, accent, hair)}
      </g>

      {/* Frame */}
      {rounded
        ? <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="17.5" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1.5" />
        : <circle cx="50" cy="50" r="49" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1.5" />}
    </svg>
  );
}

// ── Hair ─────────────────────────────────────────────────────────────────────

function renderBackHair(style: number, hair: string, hairShade: string) {
  switch (style) {
    case 3: // long — panels falling behind the shoulders
      return (
        <g>
          <path d="M26 40 Q22 78 32 92 L40 90 Q34 64 34 44 Z" fill={hairShade} />
          <path d="M74 40 Q78 78 68 92 L60 90 Q66 64 66 44 Z" fill={hairShade} />
        </g>
      );
    case 4: // ponytail behind head
      return (
        <g>
          <path d="M64 34 Q86 40 80 64 Q78 74 70 76 Q78 60 70 44 Z" fill={hairShade} />
          <ellipse cx="67" cy="34" rx="6" ry="6" fill={hair} />
        </g>
      );
    default:
      return null;
  }
}

function renderFrontHair(style: number, hair: string, hairShade: string) {
  switch (style) {
    case 0: // buzz — close cropped cap
      return (
        <g>
          <path d="M31 40 Q33 23 50 22 Q67 23 69 40 Q60 31 50 31 Q40 31 31 40 Z" fill={hair} />
        </g>
      );
    case 1: // short — rounded with slight fringe
      return (
        <g>
          <path d="M29 44 Q28 21 50 20 Q72 21 71 44 Q70 34 64 31 Q60 36 52 35 Q44 35 39 31 Q33 35 29 44 Z" fill={hair} />
          <path d="M50 20 Q60 21 64 31 Q58 27 50 28 Z" fill={hairShade} opacity="0.5" />
        </g>
      );
    case 2: // swept — diagonal sweep across the brow
      return (
        <g>
          <path d="M28 44 Q27 22 50 20 Q73 21 72 42 Q66 30 48 30 Q40 30 34 38 Q31 40 28 44 Z" fill={hair} />
          <path d="M50 20 Q70 22 72 42 Q66 30 50 29 Z" fill={hairShade} opacity="0.45" />
        </g>
      );
    case 3: // long — front cap with side bangs
      return (
        <g>
          <path d="M28 46 Q26 20 50 19 Q74 20 72 46 Q70 33 62 31 Q57 35 50 35 Q43 35 38 31 Q30 33 28 46 Z" fill={hair} />
          <path d="M30 44 Q31 60 33 70 L38 68 Q35 54 36 42 Z" fill={hair} />
          <path d="M70 44 Q69 60 67 70 L62 68 Q65 54 64 42 Z" fill={hair} />
        </g>
      );
    case 4: // ponytail — clean swept front
      return (
        <g>
          <path d="M30 43 Q30 22 50 21 Q70 22 70 43 Q66 32 50 32 Q38 32 30 43 Z" fill={hair} />
        </g>
      );
    case 5: // curly — voluminous rounded crown
      return (
        <g>
          <circle cx="36" cy="30" r="9" fill={hair} />
          <circle cx="50" cy="25" r="10" fill={hair} />
          <circle cx="64" cy="30" r="9" fill={hair} />
          <circle cx="30" cy="40" r="7" fill={hair} />
          <circle cx="70" cy="40" r="7" fill={hair} />
          <path d="M30 42 Q33 32 50 31 Q67 32 70 42 Q60 35 50 35 Q40 35 30 42 Z" fill={hairShade} opacity="0.4" />
        </g>
      );
    default:
      return null;
  }
}

// ── Eyes ─────────────────────────────────────────────────────────────────────

function renderEyes(style: number) {
  const browColor = '#3a2c22';
  switch (style) {
    case 0: // round, wide
      return (
        <g>
          <circle cx="42" cy="45" r="3" fill="#2a2018" />
          <circle cx="58" cy="45" r="3" fill="#2a2018" />
          <circle cx="43" cy="44" r="1" fill="#fff" opacity="0.8" />
          <circle cx="59" cy="44" r="1" fill="#fff" opacity="0.8" />
          <path d="M38 39 Q42 37 46 39" stroke={browColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M54 39 Q58 37 62 39" stroke={browColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );
    case 1: // calm almond
      return (
        <g>
          <path d="M38 45 Q42 41 46 45 Q42 47 38 45 Z" fill="#2a2018" />
          <path d="M54 45 Q58 41 62 45 Q58 47 54 45 Z" fill="#2a2018" />
          <path d="M38 39 Q42 38 46 39" stroke={browColor} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <path d="M54 39 Q58 38 62 39" stroke={browColor} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 2: // sharp / determined
      return (
        <g>
          <path d="M38 44 L46 46 L38 47 Z" fill="#2a2018" />
          <path d="M62 44 L54 46 L62 47 Z" fill="#2a2018" />
          <path d="M37 39 L46 41" stroke={browColor} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M63 39 L54 41" stroke={browColor} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 3: // wink (left closed)
      return (
        <g>
          <path d="M38 45 Q42 46 46 45" stroke="#2a2018" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <circle cx="58" cy="45" r="3" fill="#2a2018" />
          <circle cx="59" cy="44" r="1" fill="#fff" opacity="0.8" />
          <path d="M38 39 Q42 37 46 39" stroke={browColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M54 39 Q58 37 62 39" stroke={browColor} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

// ── Accessories ──────────────────────────────────────────────────────────────

function renderAccessory(style: number, accent: string, hair: string) {
  switch (style) {
    case 1: // glasses
      return (
        <g fill="none" stroke="#1a1a1a" strokeWidth="1.6">
          <circle cx="42" cy="45" r="5" />
          <circle cx="58" cy="45" r="5" />
          <path d="M47 45 H53" strokeLinecap="round" />
          <path d="M37 44 L33 43" strokeLinecap="round" />
          <path d="M63 44 L67 43" strokeLinecap="round" />
        </g>
      );
    case 2: // headband
      return (
        <g>
          <path d="M29 35 Q50 28 71 35 L71 40 Q50 33 29 40 Z" fill={accent} />
          <circle cx="50" cy="35" r="2" fill={shade(accent, -40)} />
        </g>
      );
    case 3: // circlet / crown
      return (
        <g>
          <path d="M33 32 L37 25 L43 31 L50 23 L57 31 L63 25 L67 32 Q50 28 33 32 Z" fill="#E8C254" stroke={shade('#E8C254', -30)} strokeWidth="0.8" />
          <circle cx="50" cy="27" r="1.6" fill="#B5544A" />
        </g>
      );
    case 4: // eyepatch (right eye)
      return (
        <g>
          <path d="M34 41 L66 38" stroke="#1a1a1a" strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="58" cy="45" rx="6" ry="5.5" fill="#1a1a1a" />
        </g>
      );
    case 5: // earrings
      return (
        <g>
          <circle cx="30.5" cy="52" r="1.8" fill={accent} stroke={shade(accent, -40)} strokeWidth="0.6" />
          <circle cx="69.5" cy="52" r="1.8" fill={accent} stroke={shade(accent, -40)} strokeWidth="0.6" />
        </g>
      );
    default:
      void hair;
      return null;
  }
}

// ── Color util ───────────────────────────────────────────────────────────────

function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
