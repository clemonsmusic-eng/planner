#!/usr/bin/env python3
"""Generate retro (FF6-flavored) sprites from individual character renders.

Usage:
    pip install pillow          # once
    python3 scripts/make_character_portraits.py \
        [--src docs/assets/characters] \
        [--out public/portraits] \
        [--sheet docs/assets/character_sheet.png]

Companion to make_portraits.py (which crops the original dark maestro lineup).
This one takes the newer per-character art drops — one full-body figure on a
plain white background per file — so there is no cropping table to maintain
and no stage-lighting color lift. Pipeline per file: flood-fill the white
backdrop from the corners to build an alpha mask → crop to the figure →
downscale to a 96px-tall grid at the figure's natural aspect → quantize to a
28-color palette → nearest-neighbor ×3 (288 tall) → save a transparent RGBA
PNG. No aspect padding: the head must touch the top edge, because square-tile
displays crop `object-position: top` and would otherwise show empty air over
wide poses (an outstretched arm makes the figure short in a fixed 5:12 frame).

To onboard new art: drop <name>.jpg into docs/assets/characters/, add a row to
CHARACTERS below (output id + label), re-run. Outputs are the same shape and
scale as make_portraits.py's, so they can replace maestro portraits or add
student portraits (see src/lib/portraits.ts) with no UI changes.
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

# source filename stem -> (output id, contact-sheet label)
CHARACTERS: dict[str, tuple[str, str]] = {
    'clarence': ('chalumeau', 'Clarence · clarinet maestro'),
    'hautbois': ('hautbois',  'Hautbois · oboe maestro'),
    'waldhorn': ('waldhorn',  'Waldhorn · fr. horn maestro'),
    'adolpha':  ('vela',      'Adolpha · alto sax maestro'),
    'benny':    ('benny',     'Benny · clarinet student'),
}

GRID_H = 96               # sprite height in grid pixels; width follows the pose
COLORS = 28               # palette size after quantization
SCALE = 3                 # nearest-neighbor upscale factor (output 288 tall)
BG_TOLERANCE = 48         # flood-fill threshold for the near-white backdrop
MARGIN = 0.02             # breathing room around the figure, fraction of height


def background_mask(img: Image.Image) -> Image.Image:
    """White (255) where the backdrop is, flood-filled in from the corners."""
    probe = img.convert('RGB').copy()
    key = (255, 0, 255)
    w, h = probe.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if probe.getpixel(corner) != key:
            ImageDraw.floodfill(probe, corner, key, thresh=BG_TOLERANCE)
    mask = Image.new('L', probe.size, 0)
    mask.putdata([255 if px == key else 0 for px in probe.getdata()])
    return mask


def demake(img: Image.Image) -> Image.Image:
    img = img.convert('RGB')
    bg = background_mask(img)
    fg = bg.point(lambda v: 0 if v else 255)

    box = fg.getbbox()
    if box is None:
        sys.exit('no figure found (image is all background?)')
    m = int(img.height * MARGIN)
    box = (max(0, box[0] - m), max(0, box[1] - m),
           min(img.width, box[2] + m), min(img.height, box[3] + m))
    img, fg = img.crop(box), fg.crop(box)

    grid_w = max(16, round(GRID_H * img.width / img.height))
    small = img.resize((grid_w, GRID_H), Image.LANCZOS)
    alpha = fg.resize((grid_w, GRID_H), Image.BILINEAR).point(lambda v: 255 if v >= 128 else 0)
    quant = small.quantize(colors=COLORS, method=Image.MEDIANCUT).convert('RGB')

    out = quant.resize((grid_w * SCALE, GRID_H * SCALE), Image.NEAREST).convert('RGBA')
    out.putalpha(alpha.resize((grid_w * SCALE, GRID_H * SCALE), Image.NEAREST))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='docs/assets/characters')
    ap.add_argument('--out', default='public/portraits')
    ap.add_argument('--sheet', default='docs/assets/character_sheet.png')
    args = ap.parse_args()

    src_dir, out_dir = Path(args.src), Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    sprites: list[tuple[str, Image.Image]] = []
    for stem, (out_id, label) in CHARACTERS.items():
        matches = sorted(src_dir.glob(f'{stem}.*'))
        if not matches:
            print(f'  skip {stem}: no source in {src_dir}')
            continue
        sprite = demake(Image.open(matches[0]))
        dest = out_dir / f'{out_id}.png'
        sprite.save(dest)
        print(f'  {matches[0].name} -> {dest}')
        sprites.append((label, sprite))

    if not sprites:
        sys.exit('nothing generated')

    # Labeled contact sheet for review (sprite widths vary with the pose).
    pad, caption = 12, 16
    sh = GRID_H * SCALE
    total_w = pad + sum(max(sprite.width, 150) + pad for _, sprite in sprites)
    sheet = Image.new('RGB', (total_w, sh + caption + 2 * pad), (24, 22, 34))
    draw = ImageDraw.Draw(sheet)
    x = pad
    for label, sprite in sprites:
        cell = max(sprite.width, 150)
        sheet.paste(sprite, (x + (cell - sprite.width) // 2, pad), sprite)
        draw.text((x, pad + sh + 4), label, fill=(230, 220, 200))
        x += cell + pad
    sheet.save(args.sheet)
    print(f'  contact sheet -> {args.sheet}')


if __name__ == '__main__':
    main()
