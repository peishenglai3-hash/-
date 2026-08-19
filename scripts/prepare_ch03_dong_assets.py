"""Extract the Chapter 3 Dong Yunting runtime assets from the supplied board.

The delivered board uses a green background and keeps the historical character
name at the source boundary.  The game-facing asset key is intentionally named
``ch03-dong-yunting`` so player-facing dialogue remains aligned with the
current Chapter 3 script.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\美术资产\第3章 美术资产\Chapter3_character\董锦堂、年长队员、受伤队员素材.png")
OUT = PROJECT / "public" / "assets" / "characters" / "ch03-dong-yunting"

# Top band: the first character block is the Dong Yunting reference.  Keep a
# front idle pose for the arena and the large neutral portrait for dialogue.
CROPS = {
    "idle.png": (470, 145, 555, 315),
    "avatar.png": (175, 20, 470, 320),
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
