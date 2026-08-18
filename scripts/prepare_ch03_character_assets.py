"""Extract the Chapter 3 reusable elder-member runtime assets.

The supplied Chapter 3 sheet is a green-screen design board, not a runtime
sprite sheet. Keep the source board outside the repository and derive only the
cropped transparent assets needed by the current vertical slice.
"""

from __future__ import annotations

from pathlib import Path
from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\美术资产\第3章 美术资产\Chapter3_character\董锦堂、年长队员、受伤队员素材.png")
OUT = PROJECT / "public" / "assets" / "characters" / "ch03-elder-member"

# The middle row is the “年长队员” board. The first pixel pose is a front,
# standing view; the first portrait is the neutral dialogue expression.
CROPS = {
    "idle.png": (455, 360, 565, 520),
    "avatar.png": (1010, 360, 1195, 485),
}


def keyed(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            green_strength = g - max(r, b)
            if g >= 90 and green_strength >= 45:
                alpha = 0
            elif g >= 80 and green_strength >= 12:
                alpha = max(0, min(255, int((45 - green_strength) * 255 / 33)))
            else:
                alpha = 255
            pixels[x, y] = (r, g, b, alpha)
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


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source board: {SOURCE}")
    source = Image.open(SOURCE)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, box in CROPS.items():
        output = trim(keyed(source.crop(box)))
        output.save(OUT / name, "PNG", optimize=True)
        print(f"{OUT / name}: {output.width}x{output.height}")


if __name__ == "__main__":
    main()
