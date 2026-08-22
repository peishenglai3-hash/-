"""Extract the wounded-member idle used by the post-battle courtyard.

The delivered character board stays outside the repository.  This script only
creates the transparent runtime crop needed by the Chapter 3 slice.
"""

from pathlib import Path
from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"D:\美术资产\第3章 美术资产\Chapter3_character\董锦堂、年长队员、受伤队员素材.png")
OUT = PROJECT / "public" / "assets" / "characters" / "ch03-wounded-member" / "idle.png"


def keyed(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, _ = pixels[x, y]
            strength = g - max(r, b)
            if g >= 90 and strength >= 45:
                alpha = 0
            elif g >= 80 and strength >= 12:
                alpha = max(0, min(255, int((45 - strength) * 255 / 33)))
            else:
                alpha = 255
            pixels[x, y] = (r, g, b, alpha)
    return rgba


def trim(image: Image.Image, padding: int = 5) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("crop produced no foreground")
    left, top, right, bottom = bbox
    return image.crop((max(0, left - padding), max(0, top - padding),
                      min(image.width, right + padding), min(image.height, bottom + padding)))


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source board: {SOURCE}")
    # Wounded-member row, first front-facing idle pose.
    crop = SOURCE.open("rb")
    with Image.open(crop) as source:
        output = trim(keyed(source.crop((455, 690, 565, 845))))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUT, "PNG", optimize=True)
    print(f"{OUT}: {output.width}x{output.height}")


if __name__ == "__main__":
    main()
