"""Build the Chapter 3 Dong Yunting runtime assets from the supplied character art.

The current delivery is a three-view front/side/back pixel character set.  The
runtime only needs a front-facing body and a dialogue portrait, so this script
removes the checkerboard matte, keeps the proportions intact, and fits the
results into the existing runtime contracts (85x125 and 295x300).

The source filename may still contain the old provenance name.  It is not a
player-facing identity; the runtime key remains ``ch03-dong-yunting``.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\35636\Downloads\export (2)\彭国材_二次元像素_三视图_正面.png")
LEGACY_SOURCE = Path(r"D:\美术资产\第3章 美术资产\Chapter3_character\董锦堂、年长队员、受伤队员素材.png")
OUT = PROJECT / "public" / "assets" / "characters" / "ch03-dong-yunting"

# The supplied front-view sheet is 672x992. The same framing is retained in
# the source so the body crop can be regenerated without introducing a
# stretch. The existing dialogue avatar is intentionally not regenerated:
# that portrait has already been approved for the dialogue box.
OUTPUT_SIZES = {"idle.png": (85, 125)}


def is_checkerboard(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    return max(r, g, b) - min(r, g, b) <= 8 and min(r, g, b) >= 220


def remove_external_checkerboard(image: Image.Image) -> Image.Image:
    """Make only the outside checkerboard transparent, preserving light clothes."""

    rgba = image.convert("RGBA")
    pixels = rgba.load()
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(rgba.width):
        queue.extend(((x, 0), (x, rgba.height - 1)))
    for y in range(1, rgba.height - 1):
        queue.extend(((0, y), (rgba.width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not (0 <= x < rgba.width and 0 <= y < rgba.height):
            continue
        visited.add((x, y))
        if not is_checkerboard(pixels[x, y]):
            continue
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return rgba


def trim(image: Image.Image, padding: int = 5) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("crop produced no foreground pixels")
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def fit_on_canvas(image: Image.Image, size: tuple[int, int], *, bottom: bool) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    scale = min(size[0] / image.width, size[1] / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.NEAREST,
    )
    x = (size[0] - resized.width) // 2
    y = size[1] - resized.height if bottom else (size[1] - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def main() -> None:
    source_path = SOURCE if SOURCE.exists() else LEGACY_SOURCE
    if not source_path.exists():
        raise SystemExit(f"missing source art: {SOURCE} (fallback: {LEGACY_SOURCE})")
    source = remove_external_checkerboard(Image.open(source_path))
    body = trim(source, padding=4)
    OUT.mkdir(parents=True, exist_ok=True)
    outputs = {"idle.png": fit_on_canvas(body, OUTPUT_SIZES["idle.png"], bottom=True)}
    for name, output in outputs.items():
        output.save(OUT / name, "PNG", optimize=True)
        print(f"{OUT / name}: {output.width}x{output.height}")


if __name__ == "__main__":
    main()
