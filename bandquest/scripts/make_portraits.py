#!/usr/bin/env python3
"""Generate retro (FF6-flavored) full-body maestro sprites from the concept lineup.

Usage:
    pip install pillow          # once
    python3 scripts/make_portraits.py \
        [--src docs/assets/maestros_reference.png] \
        [--out public/portraits] \
        [--sheet docs/assets/portrait_sheet.png]

Pipeline per character: crop a tall full-body slice from the lineup →
brighten / saturate / add contrast (the source is dark sepia stage lighting) →
downscale to a 40×96 pixel grid → quantize to a 28-color palette → nearest-
neighbor upscale ×3 (120×288) → save as public/portraits/<allyId>.png.

The UI shows these two ways: square tiles use object-position: top (face and
shoulders); liberation scenes show the full figure. A labeled contact sheet is
written for review — tweak the fractional CROPS and re-run (idempotent).

Character order in the lineup, left→right: Fagotto (bassoon), Clarence
(clarinet), Cornelius (trumpet), Adolpha (alto sax), Waldhorn (french horn),
Torbult (tuba), Sackbut (trombone), Paige (percussion), Flaura (flute),
Hautbois (oboe).
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageOps
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

# allyId -> (label, cx, y_head, y_feet) as fractions of (W, H).
# Crop width is WIDTH_RATIO * body height, centered on cx.
CROPS: dict[str, tuple[str, float, float, float]] = {
    'bassanello': ('Fagotto · bassoon',    0.063, 0.320, 0.825),
    'chalumeau':  ('Clarence · clarinet',  0.160, 0.345, 0.820),
    'salpinx':    ('Cornelius · trumpet',  0.254, 0.335, 0.820),
    'vela':       ('Adolpha · alto sax',   0.326, 0.395, 0.820),
    'waldhorn':   ('Waldhorn · fr. horn',  0.407, 0.330, 0.820),
    'cantora':    ('Torbult · tuba',       0.504, 0.258, 0.810),
    'posaune':    ('Sackbut · trombone',   0.616, 0.395, 0.810),
    'percival':   ('Paige · percussion',   0.728, 0.360, 0.820),
    'syrinx':     ('Flaura · flute',       0.828, 0.355, 0.820),
    'hautbois':   ('Hautbois · oboe',      0.915, 0.335, 0.820),
}

WIDTH_RATIO = 0.40   # crop width as a fraction of body height (FF6-ish sprite aspect)
GRID_W, GRID_H = 40, 96   # the effective "sprite" resolution
COLORS = 28               # palette size after quantization
SCALE = 3                 # nearest-neighbor upscale factor (output 120x288)

# The lineup is lit like a dark stage; pull it up to bright 16-bit colors.
BRIGHTNESS = 1.55
SATURATION = 2.4
CONTRAST = 1.3


def demake(img: Image.Image) -> Image.Image:
    img = img.convert('RGB')
    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Brightness(img).enhance(BRIGHTNESS)
    img = ImageEnhance.Color(img).enhance(SATURATION)
    img = ImageEnhance.Contrast(img).enhance(CONTRAST)
    small = img.resize((GRID_W, GRID_H), Image.LANCZOS)
    quant = small.quantize(colors=COLORS, method=Image.MEDIANCUT)
    return quant.convert('RGB').resize((GRID_W * SCALE, GRID_H * SCALE), Image.NEAREST)


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

    out_w, out_h = GRID_W * SCALE, GRID_H * SCALE
    sheet = Image.new('RGB', (out_w * 10 + 9 * 6, out_h + 22), (12, 12, 24))
    draw = ImageDraw.Draw(sheet)

    for i, (ally_id, (label, cx, y0, y1)) in enumerate(CROPS.items()):
        body_h = (y1 - y0) * H
        crop_w = body_h * WIDTH_RATIO
        x0 = cx * W - crop_w / 2
        box = (int(max(0, x0)), int(y0 * H), int(min(W, x0 + crop_w)), int(y1 * H))
        sprite = demake(img.crop(box))
        out = out_dir / f"{ally_id}.png"
        sprite.save(out)
        print(f"  wrote {out}  (crop {box})")

        px = i * (out_w + 6)
        sheet.paste(sprite, (px, 0))
        draw.text((px + 2, out_h + 4), ally_id, fill=(230, 230, 245))

    sheet_path = Path(args.sheet)
    sheet_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(sheet_path)
    print(f"contact sheet: {sheet_path}")


if __name__ == '__main__':
    main()
