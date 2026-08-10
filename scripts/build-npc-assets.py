# -*- coding: utf-8 -*-
"""Offline NPC asset pipeline for the prologue loop.
1) girl reading video frames -> chroma-key -> aligned spritesheet
2) (optional) male standing still -> chroma-key -> transparent png
Usage:
  python scripts/build-npc-assets.py                 # girl sheet only
  python scripts/build-npc-assets.py <male_src.png>  # + male still
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

WORK = Path(r'C:\Users\35636\AppData\Local\Temp\opencode\npc_work')
FRAMES = WORK / 'frames'
PROJ = Path(__file__).resolve().parent.parent
SHEET_OUT = PROJ / 'public' / 'assets' / 'characters' / 'student-a' / 'actions' / 'reading-sheet.png'
MALE_OUT = PROJ / 'public' / 'assets' / 'characters' / 'student-b' / 'front-task3.png'

COLS = 8
PAD = 6


def green_mask(img):
    r, g, b = img.split()
    d = ImageChops.darker(ImageChops.subtract(g, r), ImageChops.subtract(g, b))
    gmask = g.point(lambda v: 255 if v >= 140 else 0)
    dmask = d.point(lambda v: 255 if v >= 50 else 0)
    return ImageChops.multiply(gmask, dmask)


def border_background(mask):
    flood = mask.copy()
    w, h = flood.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    seeds += [(x, 0) for x in range(0, w, 16)] + [(x, h - 1) for x in range(0, w, 16)]
    seeds += [(0, y) for y in range(0, h, 16)] + [(w - 1, y) for y in range(0, h, 16)]
    for seed in seeds:
        if flood.getpixel(seed) == 255:
            ImageDraw.floodfill(flood, seed, 128)
    return flood.point(lambda v: 0 if v == 128 else 255)


def despill(img):
    r, g, b, a = img.split()
    spill = ImageChops.subtract(g, ImageChops.lighter(r, b))
    g2 = ImageChops.subtract(g, spill.point(lambda v: int(v * 0.65)))
    return Image.merge('RGBA', (r, g2, b, a))


def key_image(img):
    img = img.convert('RGB')
    fg = border_background(green_mask(img))
    out = img.convert('RGBA')
    out.putalpha(fg)
    return despill(out)


def build_girl_sheet():
    files = sorted(FRAMES.glob('*.png'))
    if not files:
        raise SystemExit('no frames found')
    keyed = []
    box = None
    for f in files:
        img = key_image(Image.open(f))
        bbox = img.getbbox()
        if bbox is None:
            raise SystemExit(f'empty foreground: {f}')
        box = bbox if box is None else (min(box[0], bbox[0]), min(box[1], bbox[1]), max(box[2], bbox[2]), max(box[3], bbox[3]))
        keyed.append(img)
    l, t, r, b = box
    l = max(0, l - PAD); t = max(0, t - PAD)
    cw = min(keyed[0].width - l, r - l + PAD * 2)
    ch = min(keyed[0].height - t, b - t + PAD * 2)
    rows = (len(keyed) + COLS - 1) // COLS
    sheet = Image.new('RGBA', (cw * COLS, ch * rows), (0, 0, 0, 0))
    for i, img in enumerate(keyed):
        cell = img.crop((l, t, l + cw, t + ch))
        sheet.paste(cell, ((i % COLS) * cw, (i // COLS) * ch), cell)
    SHEET_OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(SHEET_OUT)
    print(f'SHEET {SHEET_OUT} frames={len(keyed)} cell={cw}x{ch} grid={COLS}x{rows}')


GIF_SRC = Path(r'C:\Users\35636\Downloads\NPC 乙 拍照 动图.gif')
GIF_OUT = PROJ / 'public' / 'assets' / 'characters' / 'student-b' / 'actions' / 'camera-keyed.gif'


def scene_background_mask(rgb, thresh=25, step=4):
    w, h = rgb.size
    fill = (1, 255, 1)
    work = rgb.copy()
    seeds = [(x, 0) for x in range(0, w, step)] + [(x, h - 1) for x in range(0, w, step)]
    seeds += [(0, y) for y in range(0, h, step)] + [(w - 1, y) for y in range(0, h, step)]
    for s in seeds:
        ImageDraw.floodfill(work, s, fill, thresh=thresh)
    r, g, b = work.split()
    painted = ImageChops.multiply(
        g.point(lambda v: 255 if v >= 200 else 0),
        ImageChops.multiply(r.point(lambda v: 255 if v <= 60 else 0),
                            b.point(lambda v: 255 if v <= 60 else 0)))
    return painted


def largest_component(mask):
    from collections import deque
    px = mask.load()
    w, h = mask.size
    seen = bytearray(w * h)
    best = None
    for sy in range(h):
        for sx in range(w):
            i = sy * w + sx
            if seen[i] or px[sx, sy] == 0:
                continue
            comp = []
            q = deque([(sx, sy)])
            seen[i] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and px[nx, ny] == 255:
                            seen[j] = 1
                            q.append((nx, ny))
            if best is None or len(comp) > len(best):
                best = comp
    out = Image.new('L', (w, h), 0)
    op = out.load()
    for x, y in best:
        op[x, y] = 255
    return out


def build_camera_gif():
    im = Image.open(GIF_SRC)
    im.seek(0)
    rgb0 = im.convert('RGB')
    bg = scene_background_mask(rgb0)
    fg = bg.point(lambda v: 0 if v == 255 else 255)
    r, g, b = rgb0.split()
    skyish = ImageChops.multiply(
        ImageChops.subtract(b, r).point(lambda v: 255 if v >= 20 else 0),
        b.point(lambda v: 255 if v >= 140 else 0))
    fg = ImageChops.subtract(fg, skyish)
    fg = largest_component(fg)
    keyed = []
    durations = []
    for i in range(im.n_frames):
        im.seek(i)
        durations.append(im.info.get('duration', 40))
        rgba = im.convert('RGBA')
        rgba.putalpha(fg)
        p = rgba.convert('RGB').convert('P', palette=Image.ADAPTIVE, colors=255)
        p.paste(255, rgba.split()[3].point(lambda v: 255 if v <= 128 else 0))
        keyed.append(p)
    GIF_OUT.parent.mkdir(parents=True, exist_ok=True)
    keyed[0].save(GIF_OUT, save_all=True, append_images=keyed[1:],
                  disposal=2, transparency=255, duration=durations, loop=0)
    print(f'GIF {GIF_OUT} frames={len(keyed)}')


PLAYER_SIDE_SRC = Path(r'D:\红色源代码：洪湖篇\序章 场景1\正式 角色\主角 资产包\主角 侧面试图.png')
PLAYER_SIDE_OUT = PROJ / 'public' / 'assets' / 'characters' / 'player' / 'modern' / 'side-right.png'


def near_white_mask(img):
    r, g, b = img.split()[:3]
    mn = ImageChops.darker(ImageChops.darker(r, g), b)
    mx = ImageChops.lighter(ImageChops.lighter(r, g), b)
    bright = mn.point(lambda v: 255 if v >= 232 else 0)
    flat = ImageChops.subtract(mx, mn).point(lambda v: 255 if v <= 14 else 0)
    return ImageChops.multiply(bright, flat)


def build_player_side():
    img = Image.open(PLAYER_SIDE_SRC).convert('RGB')
    rgba = img.convert('RGBA')
    rgba.putalpha(border_background(near_white_mask(img)))
    l, t, r, b = rgba.getbbox()
    l = max(0, l - PAD); t = max(0, t - PAD)
    r = min(rgba.width, r + PAD); b = min(rgba.height, b + PAD)
    mirrored = rgba.crop((l, t, r, b)).transpose(Image.FLIP_LEFT_RIGHT)
    PLAYER_SIDE_OUT.parent.mkdir(parents=True, exist_ok=True)
    mirrored.save(PLAYER_SIDE_OUT)
    print(f'SIDE {PLAYER_SIDE_OUT} size={mirrored.width}x{mirrored.height}')


def build_male_still(src):
    img = key_image(Image.open(src))
    bbox = img.getbbox()
    if bbox is None:
        raise SystemExit('empty foreground in male still')
    l, t, r, b = bbox
    l = max(0, l - PAD); t = max(0, t - PAD)
    r = min(img.width, r + PAD); b = min(img.height, b + PAD)
    MALE_OUT.parent.mkdir(parents=True, exist_ok=True)
    img.crop((l, t, r, b)).save(MALE_OUT)
    print(f'STILL {MALE_OUT} size={r - l}x{b - t}')


if __name__ == '__main__':
    build_girl_sheet()
    build_camera_gif()
    build_player_side()
    if len(sys.argv) > 1:
        build_male_still(sys.argv[1])
