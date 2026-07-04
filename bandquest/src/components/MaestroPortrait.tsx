import { useState } from 'react';

// Renders a retro full-body maestro sprite when the asset exists, falling back
// to an emoji tile when there is no src or the file 404s (assets are generated
// by scripts/make_portraits.py and may not be present in every checkout).
//
// Assets are tall (40x96 grid). Two display modes:
// - default (tiles): a size×size square, cropped to the top of the sprite so
//   the face and shoulders show (battle party column, Allies cards).
// - full: the whole figure at `size` height, natural aspect (liberation scenes).
export default function MaestroPortrait({ src, emoji, size, color, full = false }: {
  src?: string;
  emoji: string;
  size: number;
  color?: string;
  full?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    if (full) {
      return (
        <img
          src={src}
          onError={() => setFailed(true)}
          alt=""
          style={{ imageRendering: 'pixelated', display: 'block', height: size, width: 'auto' }}
        />
      );
    }
    return (
      <img
        src={src}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        alt=""
        style={{
          imageRendering: 'pixelated',
          objectFit: 'cover',
          objectPosition: 'top',
          display: 'block',
          width: size,
          height: size,
        }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: full ? Math.round(size * 0.42) : size,
        height: size,
        background: color ? `${color}18` : 'rgba(255,255,255,0.06)',
        fontSize: Math.round(size * (full ? 0.3 : 0.55)),
        lineHeight: 1,
      }}
    >
      {emoji}
    </div>
  );
}
