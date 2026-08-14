const FOREGROUND_COLOR = 0x55e7ff;
const SELECTED_COLOR = 0xffffff;
const PREVIEW_COLOR = 0xffdf32;
const MAX_POINTS = 512;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const snap = (value, step) => Math.round(value / step) * step;

function pointSegmentDistanceSquared(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  const ratio = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx ** 2 + dy ** 2), 0, 1);
  const x = start.x + ratio * dx;
  const y = start.y + ratio * dy;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}

function simplifyPath(points, tolerance) {
  if (points.length <= 2) return points;
  let furthestIndex = 0;
  let furthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointSegmentDistanceSquared(points[index], points[0], points.at(-1));
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  if (furthestDistance <= tolerance ** 2) return [points[0], points.at(-1)];
  return [
    ...simplifyPath(points.slice(0, furthestIndex + 1), tolerance).slice(0, -1),
    ...simplifyPath(points.slice(furthestIndex), tolerance)
  ];
}

function polygonArea(points) {
  return Math.abs(points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2);
}

function orientation(a, b, c) {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross) < 1e-8 ? 0 : Math.sign(cross);
}

function onSegment(a, b, point) {
  return point[0] >= Math.min(a[0], b[0]) - 1e-8
    && point[0] <= Math.max(a[0], b[0]) + 1e-8
    && point[1] >= Math.min(a[1], b[1]) - 1e-8
    && point[1] <= Math.max(a[1], b[1]) + 1e-8;
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  if (abC !== abD && cdA !== cdB) return true;
  return (abC === 0 && onSegment(a, b, c))
    || (abD === 0 && onSegment(a, b, d))
    || (cdA === 0 && onSegment(c, d, a))
    || (cdB === 0 && onSegment(c, d, b));
}

function findIntersection(points) {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return [first, second];
    }
  }
  return null;
}

function repairSelfIntersections(points) {
  const repaired = points.map((point) => [...point]);
  const limit = Math.min(repaired.length ** 2, 4096);
  for (let pass = 0; pass < limit; pass += 1) {
    const intersection = findIntersection(repaired);
    if (!intersection) return repaired;
    const [first, second] = intersection;
    const reversed = repaired.slice(first + 1, second + 1).reverse();
    repaired.splice(first + 1, reversed.length, ...reversed);
  }
  return repaired;
}

function pointInPolygon(points, point) {
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [x, y] = points[index];
    const [previousX, previousY] = points[previous];
    const crosses = (y > point.y) !== (previousY > point.y)
      && point.x < ((previousX - x) * (point.y - y)) / (previousY - y) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function normalizeLasso(rawPoints, [worldWidth, worldHeight], tileSize = 32) {
  const stride = Math.max(1, Math.ceil(rawPoints.length / 4096));
  const sampled = rawPoints.filter((point, index) => index % stride === 0 || index === rawPoints.length - 1);
  let tolerance = 1.5 / tileSize;
  let simplified = simplifyPath(sampled, tolerance);
  while (simplified.length > MAX_POINTS && tolerance < 8) {
    tolerance *= 1.6;
    simplified = simplifyPath(sampled, tolerance);
  }
  if (simplified.length > MAX_POINTS) {
    const source = simplified;
    simplified = Array.from({ length: MAX_POINTS }, (_, index) => source[Math.round(index * (source.length - 1) / (MAX_POINTS - 1))]);
  }
  const points = [];
  for (const point of simplified) {
    const next = [
      snap(clamp(point.x, 0, worldWidth), 1 / tileSize),
      snap(clamp(point.y, 0, worldHeight), 1 / tileSize)
    ];
    const previous = points.at(-1);
    if (!previous || previous[0] !== next[0] || previous[1] !== next[1]) points.push(next);
  }
  if (points.length > 2 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points.pop();
  return repairSelfIntersections(points);
}

class MagneticEdgeMap {
  constructor(source, [worldWidth, worldHeight], tileSize = 32) {
    const maxDimension = 1024;
    const worldPixelWidth = worldWidth * tileSize;
    const worldPixelHeight = worldHeight * tileSize;
    this.scale = Math.min(1, maxDimension / Math.max(worldPixelWidth, worldPixelHeight));
    this.width = Math.max(2, Math.round(worldPixelWidth * this.scale));
    this.height = Math.max(2, Math.round(worldPixelHeight * this.scale));
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
	this.tileSize = tileSize;

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0, this.width, this.height);
    const pixels = context.getImageData(0, 0, this.width, this.height).data;
    this.edges = new Float32Array(this.width * this.height);

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const left = (y * this.width + x - 1) * 4;
        const right = (y * this.width + x + 1) * 4;
        const top = ((y - 1) * this.width + x) * 4;
        const bottom = ((y + 1) * this.width + x) * 4;
        let horizontal = 0;
        let vertical = 0;
        for (let channel = 0; channel < 4; channel += 1) {
          horizontal += Math.abs(pixels[right + channel] - pixels[left + channel]);
          vertical += Math.abs(pixels[bottom + channel] - pixels[top + channel]);
        }
        this.edges[y * this.width + x] = Math.min(1, Math.hypot(horizontal, vertical) / 720);
      }
    }
  }

  toGrid(point) {
    return {
      x: clamp(point.x * this.tileSize * this.scale, 0, this.width - 1),
      y: clamp(point.y * this.tileSize * this.scale, 0, this.height - 1)
    };
  }

  toWorld(point) {
    return {
      x: clamp(point.x / this.scale / this.tileSize, 0, this.worldWidth),
      y: clamp(point.y / this.scale / this.tileSize, 0, this.worldHeight)
    };
  }

  edgeAt(x, y) {
    const column = clamp(Math.round(x), 0, this.width - 1);
    const row = clamp(Math.round(y), 0, this.height - 1);
    return this.edges[row * this.width + column];
  }

  snap(point, radiusPixels = 14) {
    const origin = this.toGrid(point);
    const radius = Math.max(2, Math.round(radiusPixels * this.scale));
    let best = { x: origin.x, y: origin.y, score: this.edgeAt(origin.x, origin.y), strength: this.edgeAt(origin.x, origin.y) };
    for (let y = Math.floor(origin.y - radius); y <= Math.ceil(origin.y + radius); y += 1) {
      for (let x = Math.floor(origin.x - radius); x <= Math.ceil(origin.x + radius); x += 1) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
        const distance = Math.hypot(x - origin.x, y - origin.y);
        if (distance > radius) continue;
        const strength = this.edgeAt(x, y);
        const score = strength * 1.6 - distance / radius * 0.55;
        if (score > best.score) best = { x, y, score, strength };
      }
    }
    return best.strength >= 0.08 ? this.toWorld(best) : point;
  }

  trace(startWorld, endWorld) {
    const start = this.toGrid(startWorld);
    const end = this.toGrid(endWorld);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return [startWorld, endWorld];

    const steps = Math.min(2048, Math.max(2, Math.ceil(distance)));
    const normalX = -dy / distance;
    const normalY = dx / distance;
    const radius = clamp(Math.round(distance * 0.08), 5, Math.max(6, Math.round(18 * this.scale)));
    const width = radius * 2 + 1;
    let costs = new Float32Array(width).fill(Infinity);
    costs[radius] = 0;
    const parents = Array.from({ length: steps + 1 }, () => new Int16Array(width));

    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      const baseX = start.x + dx * ratio;
      const baseY = start.y + dy * ratio;
      const nextCosts = new Float32Array(width).fill(Infinity);
      const forceCenter = step === steps;
      const fromOffset = forceCenter ? 0 : -radius;
      const toOffset = forceCenter ? 0 : radius;
      for (let offset = fromOffset; offset <= toOffset; offset += 1) {
        const slot = offset + radius;
        const x = baseX + normalX * offset;
        const y = baseY + normalY * offset;
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
        const edgeCost = (1 - this.edgeAt(x, y)) * 2.8 + Math.abs(offset) * 0.018;
        for (let previousOffset = Math.max(-radius, offset - 3); previousOffset <= Math.min(radius, offset + 3); previousOffset += 1) {
          const previousSlot = previousOffset + radius;
          const cost = costs[previousSlot] + edgeCost + Math.abs(offset - previousOffset) * 0.22;
          if (cost < nextCosts[slot]) {
            nextCosts[slot] = cost;
            parents[step][slot] = previousOffset;
          }
        }
      }
      costs = nextCosts;
    }

    const path = [];
    let offset = 0;
    for (let step = steps; step >= 0; step -= 1) {
      const ratio = step / steps;
      path.push(this.toWorld({
        x: start.x + dx * ratio + normalX * offset,
        y: start.y + dy * ratio + normalY * offset
      }));
      if (step > 0) offset = parents[step][offset + radius];
    }
    return path.reverse();
  }
}

export class ForegroundLassoTool {
  constructor(editor) {
    this.editor = editor;
    this.armed = false;
    this.drawing = false;
    this.anchors = [];
    this.segments = [];
    this.previewPoints = [];
    this.previewAnchor = null;
    this.edgeMap = null;
    this.edgeMapFailed = false;
    this.drag = null;
    this.lastClick = null;
    this.lastPreviewAt = 0;
    this.lastRebuild = 0;
    this.handleEscape = () => {
      if (this.editor.enabled && (this.armed || this.drawing)) this.cancel(true, '已取消套索绘制');
    };
    this.handleContextMenu = (event) => {
      if (!this.editor.enabled || this.editor.kind !== 'foreground') return;
      event.preventDefault();
    };
    editor.scene.input.keyboard?.on('keydown-ESC', this.handleEscape);
    editor.scene.game.canvas.addEventListener('contextmenu', this.handleContextMenu);
    editor.scene.events.once('shutdown', () => {
      editor.scene.input.keyboard?.off('keydown-ESC', this.handleEscape);
      editor.scene.game.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    });
  }

  get rawPoints() {
    if (!this.anchors.length) return [];
    return [this.anchors[0], ...this.segments.flatMap((segment) => segment.slice(1))];
  }

  worldPoint(pointer) {
    const point = this.editor.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const [worldWidth, worldHeight] = this.editor.config.getWorldSize();
    return { x: clamp(point.x / this.editor.tileSize, 0, worldWidth), y: clamp(point.y / this.editor.tileSize, 0, worldHeight) };
  }

  ensureEdgeMap() {
    if (this.edgeMap || this.edgeMapFailed) return;
    try {
      const source = this.editor.config.getMagneticSource?.();
      if (!source) throw new Error('missing magnetic source');
      this.edgeMap = new MagneticEdgeMap(source, this.editor.config.getWorldSize(), this.editor.tileSize);
    } catch {
      this.edgeMapFailed = true;
    }
  }

  magneticPoint(point) {
    return this.edgeMap?.snap(point) ?? point;
  }

  magneticPath(start, end) {
    return this.edgeMap?.trace(start, end) ?? [start, end];
  }

  arm() {
    this.cancel(false);
    this.ensureEdgeMap();
    this.armed = true;
    this.editor.selected = null;
    this.editor.refreshList();
    this.editor.refreshInputs();
    this.editor.status.textContent = this.edgeMap
      ? '左键放置第一个磁吸锚点；Esc 取消'
      : '边缘分析不可用，将使用直线锚点；Esc 取消';
    this.editor.setCursor('crosshair');
    this.editor.updatePanelMode();
  }

  isRightButton(pointer) {
    return pointer.button === 2 || pointer.event?.button === 2 || pointer.rightButtonDown?.();
  }

  baselineAt(item, point) {
    if (!item?.points?.length) return false;
    const xs = item.points.map(([x]) => Number(x)).filter(Number.isFinite);
    if (!xs.length) return false;
    const sortY = this.editor.foregroundSortY(item);
    const tolerance = Math.max(0.25, 9 / this.editor.tileSize);
    return point.x >= Math.min(...xs) - tolerance
      && point.x <= Math.max(...xs) + tolerance
      && Math.abs(point.y - sortY) <= tolerance;
  }

  pointerDown(pointer) {
    if (this.isRightButton(pointer)) {
      if (this.drawing) this.undo();
      return;
    }
    const point = this.worldPoint(pointer);
    if (this.armed || this.drawing) {
      const now = performance.now();
      const isDoubleClick = this.drawing
        && this.lastClick
        && now - this.lastClick.time <= 360
        && Math.hypot(pointer.x - this.lastClick.x, pointer.y - this.lastClick.y) <= 14;
      if (isDoubleClick) {
        this.lastClick = null;
        this.finish();
        return;
      }
      this.commitAnchor(point);
      this.lastClick = { time: now, x: pointer.x, y: pointer.y };
      return;
    }

    if (this.baselineAt(this.editor.selected, point)) {
      this.drag = {
        mode: 'baseline',
        start: point,
        sortY: this.editor.foregroundSortY(this.editor.selected)
      };
      this.editor.setCursor('ns-resize');
      return;
    }

    const hit = [...this.editor.items].reverse().find((item) => pointInPolygon(item.points, point));
    if (!hit) {
      this.editor.select(null);
      this.editor.setCursor('default');
      return;
    }
    this.editor.select(hit);
    const explicitSortY = hit.sort_y;
    this.drag = {
      mode: 'polygon',
      start: point,
      points: structuredClone(hit.points),
      sortY: explicitSortY !== undefined && explicitSortY !== null && explicitSortY !== '' && Number.isFinite(Number(explicitSortY))
        ? Number(explicitSortY)
        : null
    };
    this.editor.setCursor('move');
  }

  commitAnchor(point) {
    const anchor = this.magneticPoint(point);
    if (!this.drawing) {
      this.armed = false;
      this.drawing = true;
      this.anchors = [anchor];
      this.segments = [];
    } else if (this.anchors.length) {
      const previous = this.anchors.at(-1);
      if (Math.hypot(anchor.x - previous.x, anchor.y - previous.y) < 2 / this.editor.tileSize) return;
      this.segments.push(this.magneticPath(previous, anchor));
      this.anchors.push(anchor);
    } else {
      this.anchors.push(anchor);
    }
    this.previewAnchor = anchor;
    this.previewPoints = [];
    this.editor.status.textContent = `已放置 ${this.anchors.length} 个锚点；右键撤销，双击完成`;
    this.editor.setCursor('crosshair');
    this.editor.updatePanelMode();
    this.editor.render();
  }

  pointerMove(pointer) {
    const point = this.worldPoint(pointer);
    if (this.drawing) {
      const now = performance.now();
      if (now - this.lastPreviewAt >= 55) {
        this.previewAnchor = this.magneticPoint(point);
        this.previewPoints = this.anchors.length ? this.magneticPath(this.anchors.at(-1), this.previewAnchor) : [];
        this.lastPreviewAt = now;
        this.editor.render();
      }
      return;
    }
    if (this.armed) {
      this.previewAnchor = this.magneticPoint(point);
      this.editor.render();
      return;
    }
    if (this.drag && pointer.isDown && this.editor.selected) {
      if (this.drag.mode === 'baseline') this.moveBaseline(point);
      else this.moveSelected(point);
      return;
    }
    if (this.baselineAt(this.editor.selected, point)) {
      this.editor.setCursor('ns-resize');
      return;
    }
    const hit = [...this.editor.items].reverse().find((item) => pointInPolygon(item.points, point));
    this.editor.setCursor(hit ? 'move' : 'default');
  }

  pointerUp(pointer) {
    if (this.drawing || this.armed) return;
    if (this.drag) {
      this.editor.config.onChange('foreground');
      this.editor.status.textContent = this.drag.mode === 'baseline'
        ? '遮挡判定线已修改，点击保存 JSON 写入'
        : '套索位置已修改，点击保存 JSON 写入';
    }
    this.drag = null;
    this.pointerMove(pointer);
  }

  pointerOut() {
    if (!this.armed && !this.drawing) this.editor.setCursor('default');
  }

  undo() {
    if (!this.drawing) return;
    if (this.anchors.length > 1) {
      this.anchors.pop();
      this.segments.pop();
    } else {
      this.anchors.length = 0;
      this.segments.length = 0;
    }
    this.previewPoints = [];
    this.previewAnchor = this.anchors.at(-1) ?? null;
    this.lastClick = null;
    this.editor.status.textContent = this.anchors.length
      ? `已撤销，剩余 ${this.anchors.length} 个锚点；双击完成`
      : '已撤销起点，请左键重新放置';
    this.editor.render();
  }

  moveSelected(point) {
    const xs = this.drag.points.map(([x]) => x);
    const ys = this.drag.points.map(([, y]) => y);
    const [worldWidth, worldHeight] = this.editor.config.getWorldSize();
    const dx = clamp(snap(point.x - this.drag.start.x, this.editor.snapStep), -Math.min(...xs), worldWidth - Math.max(...xs));
    const dy = clamp(snap(point.y - this.drag.start.y, this.editor.snapStep), -Math.min(...ys), worldHeight - Math.max(...ys));
    this.editor.selected.points = this.drag.points.map(([x, y]) => [x + dx, y + dy]);
    if (this.drag.sortY !== null) this.editor.selected.sort_y = clamp(this.drag.sortY + dy, 0, worldHeight);

    const now = performance.now();
    if (now - this.lastRebuild >= 50) {
      this.editor.config.onChange('foreground');
      this.lastRebuild = now;
    }
    this.editor.refreshInputs();
    this.editor.render();
    this.editor.status.textContent = '有未保存修改';
  }

  moveBaseline(point) {
    const [, worldHeight] = this.editor.config.getWorldSize();
    const dy = point.y - this.drag.start.y;
    this.editor.selected.sort_y = clamp(snap(this.drag.sortY + dy, this.editor.snapStep), 0, worldHeight);

    const now = performance.now();
    if (now - this.lastRebuild >= 50) {
      this.editor.config.onChange('foreground');
      this.lastRebuild = now;
    }
    this.editor.refreshInputs();
    this.editor.render();
    this.editor.status.textContent = '有未保存修改';
  }

  finish() {
    if (!this.drawing) return;
    if (this.anchors.length < 3) {
      this.editor.status.textContent = '至少需要 3 个锚点；继续左键添加，或 Esc 取消';
      return;
    }
    const closingSegment = this.magneticPath(this.anchors.at(-1), this.anchors[0]);
    const rawPoints = [...this.rawPoints, ...closingSegment.slice(1, -1)];
    const points = normalizeLasso(rawPoints, this.editor.config.getWorldSize(), this.editor.tileSize);

    this.drawing = false;
    this.armed = false;
    this.anchors = [];
    this.segments = [];
    this.previewPoints = [];
    this.previewAnchor = null;
    this.lastClick = null;
    this.editor.updatePanelMode();

    if (points.length < 3 || polygonArea(points) < 0.125) {
      this.editor.status.textContent = '套索区域过小，请重新绘制';
      this.editor.setCursor('default');
      return;
    }
    if (findIntersection(points)) {
      this.editor.status.textContent = '套索路径无法自动修复，请增加锚点后重试';
      this.editor.setCursor('default');
      return;
    }

    const item = {
      id: this.editor.createId('foreground'),
      shape: 'polygon',
      points,
      sort_y: Math.max(...points.map(([, y]) => y)),
      units: 'tiles',
      layer: 'foreground',
      enabled: true,
      depth: this.editor.config.getDefaultForegroundDepth?.() ?? 100
    };
    this.editor.sourceItems.push(item);
    this.editor.select(item);
    this.editor.changed('已完成磁性套索并自动闭合，点击保存 JSON 写入');
  }

  cancel(refresh = true, message = '') {
    this.armed = false;
    this.drawing = false;
    this.anchors = [];
    this.segments = [];
    this.previewPoints = [];
    this.previewAnchor = null;
    this.lastClick = null;
    this.drag = null;
    this.editor.setCursor('default');
    if (!refresh) return;
    this.editor.updatePanelMode();
    this.editor.render();
    if (message) this.editor.status.textContent = message;
  }

  applyDepth() {
    if (!this.editor.selected || this.editor.kind !== 'foreground') return;
    const rawValue = this.editor.depthInput.value.trim();
    if (!rawValue) return;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      this.editor.refreshInputs();
      return;
    }
    const [, worldHeight] = this.editor.config.getWorldSize();
    this.editor.selected.sort_y = clamp(value, 0, worldHeight);
    this.editor.changed('遮挡基线已修改，点击保存 JSON 写入');
  }

  render(graphics) {
    for (const item of this.editor.config.getForegrounds?.() ?? []) {
      if (!item.points?.length) continue;
      const points = item.points.map(([x, y]) => ({ x: x * this.editor.tileSize, y: y * this.editor.tileSize }));
      graphics.lineStyle(3, FOREGROUND_COLOR, item.enabled === false ? 0.45 : 1);
      graphics.fillStyle(FOREGROUND_COLOR, item.enabled === false ? 0.04 : 0.1);
      graphics.fillPoints(points, true).strokePoints(points, true);
    }

    if (this.editor.selected?.points) {
      const points = this.editor.selected.points.map(([x, y]) => ({ x: x * this.editor.tileSize, y: y * this.editor.tileSize }));
      graphics.lineStyle(4, SELECTED_COLOR, 1).strokePoints(points, true);
      graphics.fillStyle(SELECTED_COLOR, 1);
      for (const point of points) graphics.fillCircle(point.x, point.y, 4);
      const sortY = this.editor.foregroundSortY(this.editor.selected) * this.editor.tileSize;
      const minX = Math.min(...points.map((point) => point.x));
      const maxX = Math.max(...points.map((point) => point.x));
      graphics.lineStyle(3, PREVIEW_COLOR, 1).lineBetween(minX, sortY, maxX, sortY);
      graphics.fillStyle(PREVIEW_COLOR, 1)
        .fillCircle(minX, sortY, 5)
        .fillCircle((minX + maxX) / 2, sortY, 6)
        .fillCircle(maxX, sortY, 5);
    }

    const committed = this.rawPoints.map(({ x, y }) => ({ x: x * this.editor.tileSize, y: y * this.editor.tileSize }));
    if (committed.length > 1) graphics.lineStyle(3, FOREGROUND_COLOR, 1).strokePoints(committed, false);
    if (this.previewPoints.length > 1) {
      const preview = this.previewPoints.map(({ x, y }) => ({ x: x * this.editor.tileSize, y: y * this.editor.tileSize }));
      graphics.lineStyle(2, PREVIEW_COLOR, 0.95).strokePoints(preview, false);
    }
    if (this.anchors.length) {
      graphics.fillStyle(SELECTED_COLOR, 1);
      for (const anchor of this.anchors) graphics.fillCircle(anchor.x * this.editor.tileSize, anchor.y * this.editor.tileSize, 5);
    }
    if (this.previewAnchor && (this.armed || this.drawing)) {
      graphics.lineStyle(2, PREVIEW_COLOR, 1).strokeCircle(this.previewAnchor.x * this.editor.tileSize, this.previewAnchor.y * this.editor.tileSize, 7);
    }
  }
}
