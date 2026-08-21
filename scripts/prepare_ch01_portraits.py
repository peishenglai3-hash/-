"""Prepare dialogue portraits used by the prologue and Chapter 1.

The sources are kept outside the repository as art-team deliveries. This
script only derives runtime copies: green-screen removal for the fisherman,
transparent-bounds normalization for the modern player, and a contained copy
of the supplied family portrait so its decorative pixel-art background stays
intact.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps


def green_screen_mask(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    r, g, b = rgb.split()
    green = ImageChops.subtract(g, ImageChops.lighter(r, b))
    likely_green = g.point(lambda value: 255 if value >= 70 else 0)
    strong_green = green.point(lambda value: 255 if value >= 28 else 0)
    mask = ImageChops.multiply(likely_green, strong_green)

    # Only remove green connected to the image border. Green/blue clothing is
    # therefore preserved instead of being treated as background.
    flood = mask.copy()
    width, height = flood.size
    seeds = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    seeds += [(x, 0) for x in range(0, width, 16)]
    seeds += [(x, height - 1) for x in range(0, width, 16)]
    seeds += [(0, y) for y in range(0, height, 16)]
    seeds += [(width - 1, y) for y in range(0, height, 16)]
    for seed in seeds:
        if flood.getpixel(seed) == 255:
            ImageDraw.floodfill(flood, seed, 128)
    return flood.point(lambda value: 0 if value == 128 else 255)


def crop_to_subject(image: Image.Image, *, keep_background: bool = False) -> Image.Image:
    rgba = image.convert("RGBA")
    if not keep_background:
        rgba.putalpha(green_screen_mask(rgba))
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("portrait contains no visible subject")
    left, top, right, bottom = bbox
    pad_x = max(8, round((right - left) * 0.08))
    pad_y = max(8, round((bottom - top) * 0.06))
    crop = rgba.crop(
        (max(0, left - pad_x), max(0, top - pad_y),
         min(rgba.width, right + pad_x), min(rgba.height, bottom + pad_y))
    )
    fitted = ImageOps.contain(crop, (232, 232), method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((256 - fitted.width) // 2, (256 - fitted.height) // 2))
    return canvas


def write_portrait(source: Path, target: Path, *, keep_background: bool = False) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    portrait = crop_to_subject(Image.open(source), keep_background=keep_background)
    portrait.save(target, "PNG", optimize=True)
    print(f"{target}: {portrait.width}x{portrait.height}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fisherman", type=Path, required=True)
    parser.add_argument("--family", type=Path, required=True)
    parser.add_argument("--modern-player", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    write_portrait(args.fisherman, args.out_dir / "ch01-fisherman" / "avatar.png")
    # The family delivery deliberately includes a warm pixel-art background;
    # keep it instead of applying a chroma key that would damage the clothing.
    write_portrait(args.family, args.out_dir / "ch01-family" / "avatar.png", keep_background=True)
    write_portrait(args.modern_player, args.out_dir / "prologue-player" / "avatar.png")


if __name__ == "__main__":
    main()
