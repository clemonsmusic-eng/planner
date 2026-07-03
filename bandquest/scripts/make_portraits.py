#!/usr/bin/env python3
"""Generate retro (FF6-flavored) maestro portraits from the concept lineup.

Usage:
    pip install pillow          # once
    python3 scripts/make_portraits.py \
        [--src docs/assets/maestros_reference.png] \
        [--out public/portraits] \
        [--sheet docs/assets/portrait_sheet.png]

Pipeline per character: crop a square bust from the lineup → downscale to
64×64 (the "pixel grid") → quantize to a 24-color palette (the 16-bit look) →
nearest-neighbor upscale to 192×192 → save as public/portraits/<allyId>.png.

A labeled contact sheet is written for review. If a crop is off, adjust the
fractional CROPS box for that character (fractions of image width/height) and
re-run — the script is idempotent.

The source image is the ten-maestro stage lineup. Character order, left→right:
Fagotto (bassoon), Clarence (clarinet), Cornelius (trumpet), Adolpha (alto sax),
Waldhorn (french horn), Torbult (tuba), Sackbut (trombone), Paige (percussion),
Flaura (flute), Hautbois (oboe).
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

# allyId -> (display label, cx, y_top, y_bottom) as fractions of (W, H).
# The crop is a square of side (y_bottom - y_top) * H centered on cx * W.
CROPS: dict[str, tuple[str, float, float, float]] = {
    'bassanello': ('Fagotto · bassoon',    0.063, 0.325, 0.525),
    'chalumeau':  ('Clarence · clarinet',  0.160, 0.350, 0.545),
    'salpinx':    ('Cornelius · trumpet',  0.254, 0.340, 0.535),
    'vela':       ('Adolpha · alto sax',   0.326, 0.400, 0.590),
    'waldhorn':   ('Waldhorn · fr. horn',  0.407, 0.335, 0.530),
    'cantora':    ('Torbult · tuba',       0.504, 0.262, 0.470),
    'posaune':    ('Sackbut · trombone',   0.616, 0.400, 0.600),
    'percival':   ('Paige · percussion',   0.728, 0.365, 0.560),
    'syrinx':     ('Flaura · flute',       0.828, 0.360, 0.555),
    'hautbois':   ('Hautbois · oboe',      0.915, 0.340, 0.535),
}

PIXEL_GRID = 64    # the effective "sprite" resolution
COLORS = 24        # palette size after quantization
OUT_SIZE = 192     # nearest-neighbor upscaled output


def demake(img: Image.Image) -> Image.Image:
    small = img.resize((PIXEL_GRID, PIXEL_GRID), Image.LANCZOS)
    quant = small.convert('RGB').quantize(colors=COLORS, method=Image.MEDIANCUT)
    return quant.convert('RGB').resize((OUT_SIZE, OUT_SIZE), Image.NEAREST)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='docs/assets/maestros_reference.png')
    ap.add_argument('--out', default='public/portraits')
    ap.add_argument('--sheet', default='docs/assets/portrait_sheet.png')
    args = ap.parse_args()

    src = Path(args.src)
    if not src.exists():
        sys.exit(f"Source image not found: {src}\n"
                 f"Save the ten-maestro lineup image there and re-run.")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert('RGB')
    W, H = img.size
    print(f"source {src} ({W}x{H})")

    sheet = Image.new('RGB', (OUT_SIZE * 5, (OUT_SIZE + 22) * 2), (12, 12, 24))
    draw = ImageDraw.Draw(sheet)

    for i, (ally_id, (label, cx, y0, y1)) in enumerate(CROPS.items()):
        side = (y1 - y0) * H
        x0 = cx * W - side / 2
        box = (int(max(0, x0)), int(y0 * H), int(min(W, x0 + side)), int(y1 * H))
        portrait = demake(img.crop(box))
        out = out_dir / f"{ally_id}.png"
        portrait.save(out)
        print(f"  wrote {out}  (crop {box})")

        col, row = i % 5, i // 5
        px, py = col * OUT_SIZE, row * (OUT_SIZE + 22)
        sheet.paste(portrait, (px, py))
        draw.text((px + 4, py + OUT_SIZE + 4), f"{ally_id} — {label}", fill=(230, 230, 245))

    sheet_path = Path(args.sheet)
    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(sheet_path)
    print(f"contact sheet: {sheet_path}")


if __name__ == '__main__':
    main()
