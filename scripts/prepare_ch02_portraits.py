"""Build reusable dialogue portraits for Chapter 2.

The in-world NPCs are already normalized as transparent full-body PNGs. This
script keeps the source art intact and derives square, transparent upper-body
portraits for the dialogue frame. The player's supplied reference portrait is
green-screened with a conservative chroma key before the same normalization.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


NPC_SOURCES = {
    "ch02_npc_group_leader.png": "ch02-group-leader",
    "ch02_npc_dai_annan.png": "ch02-dai-annan",
    "ch02_npc_young_member.png": "ch02-young-member",
    "ch02_npc_worker_white_headcloth.png": "ch02-worker",
    "ch02_npc_worker_blue_headcloth.png": "ch02-captain",
    "liaison.png": "ch02-liaison",
}


def make_transparent_player(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            is_green_screen = (
                alpha > 0
                and green >= 70
                and green > red * 1.12
                and green > blue * 1.08
            )
            if is_green_screen:
                pixels[x, y] = (red, green, blue, 0)
    return rgba


def subject_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("portrait source contains no visible pixels")
    return bbox


def square_portrait(image: Image.Image, upper_body: bool) -> Image.Image:
    rgba = image.convert("RGBA")
    left, top, right, bottom = subject_bbox(rgba)
    if upper_body:
        subject_height = bottom - top
        bottom = min(bottom, top + max(1, round(subject_height * 0.52)))
    width = right - left
    height = bottom - top
    padding_x = max(8, round(width * 0.08))
    padding_y = max(8, round(height * 0.06))
    crop = rgba.crop(
        (
            max(0, left - padding_x),
            max(0, top - padding_y),
            min(rgba.width, right + padding_x),
            min(rgba.height, bottom + padding_y),
        )
    )
    fitted = ImageOps.contain(crop, (232, 232), method=Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(
        fitted,
        ((canvas.width - fitted.width) // 2, (canvas.height - fitted.height) // 2),
    )
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--actor-dir", type=Path, required=True)
    parser.add_argument("--liaison-source", type=Path, required=True)
    parser.add_argument("--player-source", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    for source_name, portrait_id in NPC_SOURCES.items():
        source = args.liaison_source if source_name == "liaison.png" else args.actor_dir / source_name
        target = args.out_dir / portrait_id / "avatar.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        portrait = square_portrait(Image.open(source), upper_body=True)
        portrait.save(target, "PNG", optimize=True)
        print(f"{target}: {portrait.width}x{portrait.height}")

    player = make_transparent_player(Image.open(args.player_source))
    target = args.out_dir / "ch02-chen" / "avatar.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    portrait = square_portrait(player, upper_body=False)
    portrait.save(target, "PNG", optimize=True)
    print(f"{target}: {portrait.width}x{portrait.height}")


if __name__ == "__main__":
    main()
