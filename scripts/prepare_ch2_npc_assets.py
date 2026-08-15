"""Normalize the Chapter 2 NPC illustrations into reusable transparent sprites.

The supplied files are 816x816 RGB images with either a white or black
background despite the 64x64 filename suffix. We remove only background pixels
connected to the canvas edge, so enclosed clothing remains part of the
character, then crop to the character bounds with a small transparent margin.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


ASSETS = {
    "小组负责人_64x64.png": "ch02_npc_group_leader.png",
    "年轻队员_64x64.png": "ch02_npc_young_member.png",
    "小组组长_64x64.png": "ch02_npc_dai_annan.png",
    "普通劳动队员_白头巾_64x64.png": "ch02_npc_worker_white_headcloth.png",
    "普通劳动队员_草帽_64x64.png": "ch02_npc_worker_straw_hat.png",
    "普通劳动队员_斗笠_64x64.png": "ch02_npc_worker_conical_hat.png",
    "普通劳动队员_蓝头巾_64x64.png": "ch02_npc_worker_blue_headcloth.png",
}


def is_edge_background(pixel: tuple[int, int, int], background: str) -> bool:
    low, high = min(pixel), max(pixel)
    if background == "white":
        return low >= 235 and high - low <= 22
    return high <= 32 and high - low <= 20


def normalize(source: Path, target: Path, padding: int = 12) -> tuple[int, int]:
    image = Image.open(source).convert("RGB")
    width, height = image.size
    pixels = image.load()
    background_mode = "white" if sum(pixels[0, 0]) >= 600 else "black"
    background_mask = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        if x < 0 or x >= width or y < 0 or y >= height:
            return
        index = y * width + x
        if background_mask[index] or not is_edge_background(pixels[x, y], background_mode):
            return
        background_mask[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        enqueue(x - 1, y)
        enqueue(x + 1, y)
        enqueue(x, y - 1)
        enqueue(x, y + 1)

    subject = [
        (x, y)
        for y in range(height)
        for x in range(width)
        if not background_mask[y * width + x]
    ]
    if not subject:
        raise ValueError(f"No subject pixels found in {source}")

    min_x = max(0, min(x for x, _ in subject) - padding)
    min_y = max(0, min(y for _, y in subject) - padding)
    max_x = min(width - 1, max(x for x, _ in subject) + padding)
    max_y = min(height - 1, max(y for _, y in subject) + padding)

    rgba = Image.new("RGBA", (width, height))
    rgba_pixels = rgba.load()
    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            alpha = 0 if background_mask[y * width + x] else 255
            rgba_pixels[x, y] = (red, green, blue, alpha)

    cropped = rgba.crop((min_x, min_y, max_x + 1, max_y + 1))
    target.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(target, "PNG", optimize=True)
    return cropped.size


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    for source_name, target_name in ASSETS.items():
        source = args.source_dir / source_name
        target = args.out_dir / target_name
        size = normalize(source, target)
        print(f"{target}: {size[0]}x{size[1]}")


if __name__ == "__main__":
    main()
