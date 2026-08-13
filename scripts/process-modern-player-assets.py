#!/usr/bin/env python3
"""Build transparent eight-frame player animations and QA previews."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


PROJECT = Path(__file__).resolve().parent.parent
ASSET_ROOT = PROJECT / "public" / "assets" / "characters" / "player" / "modern"
CH01_SC01_ASSET_ROOT = PROJECT / "public" / "assets" / "ch01" / "sc01" / "sprites"
FRAME_COUNT = 8
RUNTIME_HEIGHT = 720
PAD = 20
VARIANTS = ("version-mask-guided", "version-rekeyed")
DIRECTIONS = {
    "down": "正面8帧",
    "left": "左面8帧",
    "right": "右面8帧",
    "up": "背面8帧",
}
CH01_SC01_DIRECTIONS = {
    "down": "正面8帧",
    "left": "左侧8帧",
    "right": "右侧8帧",
    "up": "背面8帧",
}


@dataclass(frozen=True)
class DirectionInput:
    key: str
    folder: Path
    sources: list[Path]
    guides: list[Path]


def natural_files(folder: Path, suffix: str) -> list[Path]:
    files = sorted(folder.glob(f"*{suffix}"))
    if len(files) != FRAME_COUNT:
        raise RuntimeError(f"expected {FRAME_COUNT} {suffix} files in {folder}, found {len(files)}")
    return files


def load_rgb(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        return np.array(image.convert("RGB"))


def load_alpha(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        return np.array(image.convert("RGBA").getchannel("A"))


def load_direction(key: str, folder_name: str) -> DirectionInput:
    folder = ASSET_ROOT / folder_name
    return DirectionInput(
        key=key,
        folder=folder,
        sources=natural_files(folder, ".jpg"),
        guides=natural_files(folder / "processed", ".png"),
    )


def raw_soft_alpha(rgb: np.ndarray) -> np.ndarray:
    """Key the green background while retaining a narrow antialiased edge."""
    work = rgb.astype(np.int16)
    green_excess = work[:, :, 1] - np.maximum(work[:, :, 0], work[:, :, 2])
    alpha = np.clip((28.0 - green_excess) * (255.0 / 20.0), 0, 255)
    return alpha.astype(np.uint8)


def largest_component(alpha: np.ndarray, guide: np.ndarray | None = None) -> np.ndarray:
    hard = (alpha >= 128).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    if count <= 1:
        raise RuntimeError("matting produced no foreground component")

    best_label = 1
    best_score = -1.0
    guide_hard = guide >= 128 if guide is not None else None
    for label in range(1, count):
        area = float(stats[label, cv2.CC_STAT_AREA])
        if guide_hard is None:
            score = area
        else:
            overlap = float(np.count_nonzero((labels == label) & guide_hard))
            score = overlap * 1000.0 + area
        if score > best_score:
            best_label = label
            best_score = score

    core = (labels == best_label).astype(np.uint8)
    keep = cv2.dilate(core, np.ones((5, 5), np.uint8), iterations=1) > 0
    return np.where(keep, alpha, 0).astype(np.uint8)


def locate_guide(rgb: np.ndarray, guide_alpha: np.ndarray) -> tuple[int, int, float]:
    direct = (raw_soft_alpha(rgb) >= 128).astype(np.uint8) * 255
    scale = 0.25
    direct_small = cv2.resize(direct, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    guide_small = cv2.resize(guide_alpha, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
    match = cv2.matchTemplate(direct_small, guide_small, cv2.TM_CCOEFF_NORMED)
    _, score, _, location = cv2.minMaxLoc(match)
    x = round(location[0] / scale)
    y = round(location[1] / scale)
    if score < 0.75:
        raise RuntimeError(f"could not align existing cutout (score={score:.3f})")
    return x, y, float(score)


def aligned_guide(rgb: np.ndarray, guide_path: Path) -> tuple[np.ndarray, tuple[int, int, float]]:
    guide_alpha = load_alpha(guide_path)
    x, y, score = locate_guide(rgb, guide_alpha)
    canvas = np.zeros(rgb.shape[:2], dtype=np.uint8)
    height = min(guide_alpha.shape[0], canvas.shape[0] - y)
    width = min(guide_alpha.shape[1], canvas.shape[1] - x)
    canvas[y : y + height, x : x + width] = guide_alpha[:height, :width]
    return canvas, (x, y, score)


def build_alpha(rgb: np.ndarray, guide_path: Path, variant: str) -> tuple[np.ndarray, dict[str, float]]:
    alpha = raw_soft_alpha(rgb)
    if variant == "version-rekeyed":
        return largest_component(alpha), {}

    guide, alignment = aligned_guide(rgb, guide_path)
    # The old mask supplies only a coarse trusted region. A wide dilation restores
    # deleted hair/face pixels; the fresh chroma key still decides real transparency.
    allowed = cv2.dilate((guide > 0).astype(np.uint8), np.ones((129, 129), np.uint8)) > 0
    alpha = np.where(allowed, alpha, 0).astype(np.uint8)
    return largest_component(alpha, guide), {
        "guideOffsetX": alignment[0],
        "guideOffsetY": alignment[1],
        "guideMatchScore": round(alignment[2], 4),
    }


def despill_rgba(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    out = rgb.copy()
    max_rb = np.maximum(out[:, :, 0], out[:, :, 2])
    spill = out[:, :, 1] > max_rb
    edge = alpha < 250
    correction = spill & edge & (alpha > 0)
    out[:, :, 1] = np.where(correction, max_rb, out[:, :, 1])
    out[alpha == 0] = 0
    return np.dstack((out, alpha))


def alpha_bbox(alpha: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(alpha > 2)
    if not len(xs):
        raise RuntimeError("empty alpha mask")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def union_bbox(boxes: list[tuple[int, int, int, int]], size: tuple[int, int]) -> tuple[int, int, int, int]:
    width, height = size
    left = max(0, min(box[0] for box in boxes) - PAD)
    top = max(0, min(box[1] for box in boxes) - PAD)
    right = min(width, max(box[2] for box in boxes) + PAD)
    bottom = min(height, max(box[3] for box in boxes) + PAD)
    return left, top, right, bottom


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (227, 224, 214))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(201, 207, 197))
    return image


def save_preview(runtime: list[Image.Image], out_dir: Path) -> None:
    overlay = Image.new("RGBA", runtime[0].size, (0, 0, 0, 0))
    for frame in runtime:
        layer = frame.copy()
        layer.putalpha(layer.getchannel("A").point(lambda value: round(value * 0.2)))
        overlay = Image.alpha_composite(overlay, layer)
    overlay.save(out_dir / "overlay.png", optimize=True)

    gif_frames: list[Image.Image] = []
    background = checkerboard(runtime[0].size)
    for frame in runtime:
        composed = background.copy()
        composed.paste(frame, (0, 0), frame)
        gif_frames.append(composed)
    gif_frames[0].save(
        out_dir / "preview.gif",
        save_all=True,
        append_images=gif_frames[1:],
        duration=125,
        loop=0,
        optimize=True,
    )


def component_count(alpha: np.ndarray) -> int:
    count, _, stats, _ = cv2.connectedComponentsWithStats((alpha >= 128).astype(np.uint8), 8)
    return sum(1 for label in range(1, count) if stats[label, cv2.CC_STAT_AREA] >= 12)


def evaluate_frames(
    rgba_frames: list[np.ndarray],
    runtime: list[Image.Image],
    crop: tuple[int, int, int, int],
    alignments: list[dict[str, float]],
) -> dict[str, object]:
    runtime_arrays = [np.array(frame) for frame in runtime]
    alphas = [frame[:, :, 3] for frame in runtime_arrays]
    same_dimensions = len({frame.size for frame in runtime}) == 1
    components = [component_count(alpha) for alpha in alphas]
    green_ratios = []
    opaque_areas = []
    bottoms = []
    foot_centers = []
    for frame in runtime_arrays:
        rgb = frame[:, :, :3].astype(np.int16)
        alpha = frame[:, :, 3]
        visible = alpha >= 128
        green = (rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])) >= 18
        green_ratios.append(float(np.count_nonzero(green & visible) / max(1, np.count_nonzero(visible))))
        opaque_areas.append(int(np.count_nonzero(visible)))
        ys, xs = np.nonzero(visible)
        bottoms.append(int(ys.max()))
        foot_band = visible[max(0, int(ys.max()) - 20) : int(ys.max()) + 1]
        foot_x = np.nonzero(foot_band)[1]
        foot_centers.append(float(foot_x.mean()) if len(foot_x) else float(xs.mean()))

    first_centroid = np.mean(np.argwhere(alphas[0] >= 128), axis=0)
    last_centroid = np.mean(np.argwhere(alphas[-1] >= 128), axis=0)
    loop_delta = float(np.linalg.norm(first_centroid - last_centroid))
    padding = []
    for alpha in alphas:
        x0, y0, x1, y1 = alpha_bbox(alpha)
        padding.append((x0, y0, alpha.shape[1] - x1, alpha.shape[0] - y1))

    stable_anchor_limit = alpha.shape[0] * 0.01
    checks = {
        "sameDimensions": same_dimensions,
        "backgroundRemoved": max(green_ratios) < 0.002,
        "noDetachedPixels": max(components) == 1,
        "noClippedSubject": min(min(values) for values in padding) >= 1,
        "stableAnchor": float(np.std(bottoms)) <= stable_anchor_limit,
        "minimalPadding": max(min(values) for values in padding) <= 12,
        "loopPositionStable": loop_delta <= 35.0,
    }
    warnings = [name for name, passed in checks.items() if not passed]
    quality_score = 100.0
    quality_score -= max(green_ratios) * 2000.0
    quality_score -= max(0, max(components) - 1) * 10.0
    quality_score -= min(loop_delta, 50.0) * 0.05
    quality_score -= len(warnings) * 2.0
    quality_score += min(2.0, np.mean(opaque_areas) / 30000.0)

    return {
        "passed": not warnings,
        "iterations": 1,
        "checks": checks,
        "warnings": warnings,
        "metrics": {
            "qualityScore": round(quality_score, 3),
            "maximumGreenForegroundRatio": round(max(green_ratios), 6),
            "componentCounts": components,
            "runtimeOpaqueAreas": opaque_areas,
            "bottomStandardDeviation": round(float(np.std(bottoms)), 3),
            "stableAnchorLimit": round(stable_anchor_limit, 3),
            "footCenterStandardDeviation": round(float(np.std(foot_centers)), 3),
            "loopCentroidDelta": round(loop_delta, 3),
            "crop": list(crop),
            "alignments": alignments,
        },
        "changes": [
            "Rebuilt alpha from the original green-screen RGB instead of reusing the damaged binary alpha.",
            "Used a shared union crop for all eight frames and preserved source-frame positioning.",
            "Removed green spill only on partially transparent edge pixels.",
        ],
    }


def process_variant(direction: DirectionInput, variant: str) -> dict[str, object]:
    out_dir = direction.folder / "processed" / variant
    frames_dir = out_dir / "frames"
    runtime_dir = out_dir / "runtime"
    frames_dir.mkdir(parents=True, exist_ok=True)
    runtime_dir.mkdir(parents=True, exist_ok=True)

    alphas: list[np.ndarray] = []
    alignments: list[dict[str, float]] = []
    boxes: list[tuple[int, int, int, int]] = []
    source_size: tuple[int, int] | None = None
    for source, guide in zip(direction.sources, direction.guides, strict=True):
        rgb = load_rgb(source)
        source_size = (rgb.shape[1], rgb.shape[0])
        alpha, alignment = build_alpha(rgb, guide, variant)
        alphas.append(alpha)
        alignments.append(alignment)
        boxes.append(alpha_bbox(alpha))

    assert source_size is not None
    crop = union_bbox(boxes, source_size)
    crop_width = crop[2] - crop[0]
    crop_height = crop[3] - crop[1]
    runtime_width = round(crop_width * RUNTIME_HEIGHT / crop_height)
    runtime_frames: list[Image.Image] = []
    cropped_rgba: list[np.ndarray] = []
    for index, (source, alpha) in enumerate(zip(direction.sources, alphas, strict=True), start=1):
        rgb = load_rgb(source)
        rgba = despill_rgba(rgb, alpha)[crop[1] : crop[3], crop[0] : crop[2]]
        cropped_rgba.append(rgba)
        frame = Image.fromarray(rgba, "RGBA")
        frame.save(frames_dir / f"frame-{index:02}.png", compress_level=6)
        scaled = frame.resize((runtime_width, RUNTIME_HEIGHT), Image.Resampling.LANCZOS)
        scaled.save(runtime_dir / f"frame-{index:02}.png", optimize=True)
        runtime_frames.append(scaled)

    save_preview(runtime_frames, out_dir)
    report = evaluate_frames(cropped_rgba, runtime_frames, crop, alignments)
    recipe = {
        "version": 1,
        "variant": variant,
        "frameCount": FRAME_COUNT,
        "sortRule": "filename-natural-order",
        "source": {"width": source_size[0], "height": source_size[1]},
        "matting": {
            "method": "old-mask-guided-chroma-recovery" if variant == "version-mask-guided" else "green-excess-chroma-key-plus-connectivity",
            "greenExcessOpaqueThreshold": 8,
            "greenExcessTransparentThreshold": 28,
            "edgeFeather": True,
            "decontaminateColor": True,
        },
        "cleanup": {"keepLargestSubject": True, "minimumComponentArea": 12},
        "alignment": {"anchorType": "feet-center", "allowPerFrameTranslation": False},
        "crop": {
            "x": crop[0],
            "y": crop[1],
            "width": crop_width,
            "height": crop_height,
            "padding": PAD,
            "method": "union-alpha-bounds",
        },
        "runtime": {"width": runtime_width, "height": RUNTIME_HEIGHT, "preserveAspectRatio": True},
        "export": {"format": "png", "transparent": True, "namePattern": "frame-{index:02}.png"},
    }
    (out_dir / "recipe.json").write_text(json.dumps(recipe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"direction": direction.key, "variant": variant, "recipe": recipe, "report": report}


def process_ch01_sc01_direction(direction_key: str, folder_name: str) -> dict[str, object]:
    folder = CH01_SC01_ASSET_ROOT / folder_name
    sources = natural_files(folder, ".jpg")
    mirror_output = direction_key == "down"
    out_dir = folder / "processed" / "version-rekeyed"
    frames_dir = out_dir / "frames"
    runtime_dir = out_dir / "runtime"
    frames_dir.mkdir(parents=True, exist_ok=True)
    runtime_dir.mkdir(parents=True, exist_ok=True)

    alphas: list[np.ndarray] = []
    boxes: list[tuple[int, int, int, int]] = []
    source_size: tuple[int, int] | None = None
    for source in sources:
        rgb = load_rgb(source)
        source_size = (rgb.shape[1], rgb.shape[0])
        alpha = largest_component(raw_soft_alpha(rgb))
        alphas.append(alpha)
        boxes.append(alpha_bbox(alpha))

    assert source_size is not None
    crop = union_bbox(boxes, source_size)
    crop_width = crop[2] - crop[0]
    crop_height = crop[3] - crop[1]
    runtime_width = round(crop_width * RUNTIME_HEIGHT / crop_height)
    runtime_frames: list[Image.Image] = []
    cropped_rgba: list[np.ndarray] = []
    for index, (source, alpha) in enumerate(zip(sources, alphas, strict=True), start=1):
        rgb = load_rgb(source)
        rgba = despill_rgba(rgb, alpha)[crop[1] : crop[3], crop[0] : crop[2]]
        if mirror_output:
            rgba = np.fliplr(rgba).copy()
        cropped_rgba.append(rgba)
        frame = Image.fromarray(rgba, "RGBA")
        frame.save(frames_dir / f"frame-{index:02}.png", compress_level=6)
        scaled = frame.resize((runtime_width, RUNTIME_HEIGHT), Image.Resampling.LANCZOS)
        scaled.save(runtime_dir / f"frame-{index:02}.png", optimize=True)
        runtime_frames.append(scaled)

    save_preview(runtime_frames, out_dir)
    report = evaluate_frames(cropped_rgba, runtime_frames, crop, [{} for _ in sources])
    recipe = {
        "version": 1,
        "variant": "version-rekeyed",
        "frameCount": FRAME_COUNT,
        "sortRule": "filename-natural-order",
        "source": {"width": source_size[0], "height": source_size[1]},
        "matting": {
            "method": "green-excess-chroma-key-plus-connectivity",
            "greenExcessOpaqueThreshold": 8,
            "greenExcessTransparentThreshold": 28,
            "edgeFeather": True,
            "decontaminateColor": True,
        },
        "cleanup": {"keepLargestSubject": True, "minimumComponentArea": 12},
        "alignment": {"anchorType": "source-position", "allowPerFrameTranslation": False},
        "crop": {
            "x": crop[0],
            "y": crop[1],
            "width": crop_width,
            "height": crop_height,
            "padding": PAD,
            "method": "union-alpha-bounds",
        },
        "runtime": {"width": runtime_width, "height": RUNTIME_HEIGHT, "preserveAspectRatio": True},
        "export": {"format": "png", "transparent": True, "namePattern": "frame-{index:02}.png"},
    }
    if mirror_output:
        recipe["transform"] = {"horizontalFlip": True}
    (out_dir / "recipe.json").write_text(json.dumps(recipe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"direction": direction_key, "recipe": recipe, "report": report}


def save_ch01_sc01_summary(results: list[dict[str, object]]) -> None:
    previews: list[tuple[str, Image.Image]] = []
    for direction_key, folder_name in CH01_SC01_DIRECTIONS.items():
        path = CH01_SC01_ASSET_ROOT / folder_name / "processed" / "version-rekeyed" / "runtime" / "frame-01.png"
        with Image.open(path) as source:
            previews.append((direction_key, source.convert("RGBA")))

    cell_width = max(frame.width for _, frame in previews) + 40
    cell_height = RUNTIME_HEIGHT + 60
    sheet = Image.new("RGB", (cell_width * 4, cell_height), (35, 39, 38))
    draw = ImageDraw.Draw(sheet)
    for index, (label, frame) in enumerate(previews):
        x = index * cell_width
        panel = checkerboard((cell_width, RUNTIME_HEIGHT))
        panel.paste(frame, ((cell_width - frame.width) // 2, 0), frame)
        sheet.paste(panel, (x, 0))
        draw.text((x + 12, RUNTIME_HEIGHT + 18), label, fill=(240, 238, 228))
    sheet.save(CH01_SC01_ASSET_ROOT / "qa-comparison.png", optimize=True)

    summary = {
        "variant": "version-rekeyed",
        "allDirectionsPassed": all(bool(item["report"]["passed"]) for item in results),
        "directionScores": {
            str(item["direction"]): item["report"]["metrics"]["qualityScore"] for item in results
        },
        "warnings": {
            str(item["direction"]): item["report"]["warnings"] for item in results
        },
    }
    (CH01_SC01_ASSET_ROOT / "qa-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def save_comparison(results: list[dict[str, object]]) -> None:
    cells: list[tuple[str, Image.Image]] = []
    for direction_key, folder_name in DIRECTIONS.items():
        folder = ASSET_ROOT / folder_name / "processed"
        for variant in VARIANTS:
            with Image.open(folder / variant / "runtime" / "frame-01.png") as source:
                frame = source.convert("RGBA")
            cells.append((f"{direction_key} / {variant.removeprefix('version-')}", frame))

    cell_width = max(frame.width for _, frame in cells) + 40
    cell_height = RUNTIME_HEIGHT + 60
    sheet = Image.new("RGB", (cell_width * 4, cell_height * 2), (35, 39, 38))
    draw = ImageDraw.Draw(sheet)
    for index, (label, frame) in enumerate(cells):
        x = (index % 4) * cell_width
        y = (index // 4) * cell_height
        panel = checkerboard((cell_width, RUNTIME_HEIGHT))
        panel.paste(frame, ((cell_width - frame.width) // 2, 0), frame)
        sheet.paste(panel, (x, y))
        draw.text((x + 12, y + RUNTIME_HEIGHT + 18), label, fill=(240, 238, 228))
    sheet.save(ASSET_ROOT / "qa-comparison.png", optimize=True)

    summary: dict[str, object] = {"variants": {}, "selected": None}
    for variant in VARIANTS:
        variant_results = [item for item in results if item["variant"] == variant]
        scores = [float(item["report"]["metrics"]["qualityScore"]) for item in variant_results]
        passed = all(bool(item["report"]["passed"]) for item in variant_results)
        summary["variants"][variant] = {
            "allDirectionsPassed": passed,
            "meanQualityScore": round(float(np.mean(scores)), 3),
            "directionScores": {
                str(item["direction"]): item["report"]["metrics"]["qualityScore"] for item in variant_results
            },
        }
    ranked = sorted(
        VARIANTS,
        key=lambda name: (
            bool(summary["variants"][name]["allDirectionsPassed"]),
            float(summary["variants"][name]["meanQualityScore"]),
            name == "version-rekeyed",
        ),
        reverse=True,
    )
    summary["selected"] = ranked[0]
    summary["selectionReason"] = (
        "Selected by all-direction QA pass status and mean quality score; a full re-key wins exact ties because it "
        "does not inherit spatial assumptions from the damaged mask."
    )
    (ASSET_ROOT / "qa-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def process_modern_player() -> None:
    results: list[dict[str, object]] = []
    for direction_key, folder_name in DIRECTIONS.items():
        direction = load_direction(direction_key, folder_name)
        for variant in VARIANTS:
            result = process_variant(direction, variant)
            results.append(result)
            score = result["report"]["metrics"]["qualityScore"]
            print(f"{direction_key:>5} {variant:<24} score={score}")
    save_comparison(results)
    summary = json.loads((ASSET_ROOT / "qa-summary.json").read_text(encoding="utf-8"))
    print(f"selected {summary['selected']}")


def process_ch01_sc01_player() -> None:
    results: list[dict[str, object]] = []
    for direction_key, folder_name in CH01_SC01_DIRECTIONS.items():
        result = process_ch01_sc01_direction(direction_key, folder_name)
        results.append(result)
        score = result["report"]["metrics"]["qualityScore"]
        warnings = result["report"]["warnings"]
        print(f"{direction_key:>5} version-rekeyed score={score} warnings={warnings}")
    save_ch01_sc01_summary(results)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--target",
        choices=("modern", "ch01-sc01", "all"),
        default="modern",
        help="asset set to rebuild",
    )
    args = parser.parse_args()
    if args.target in ("modern", "all"):
        process_modern_player()
    if args.target in ("ch01-sc01", "all"):
        process_ch01_sc01_player()


if __name__ == "__main__":
    main()
