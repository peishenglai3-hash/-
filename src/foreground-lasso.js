const TILE_SIZE = 32;
const FOREGROUND_COLOR = 0x55e7ff;
const SELECTED_COLOR = 0xffffff;

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

function polygonSelfIntersects(points) {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return true;
    }
  }
  return false;
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

function normalizeLasso(rawPoints, [worldWidth, worldHeight]) {
  const simplified = simplifyPath(rawPoints, 3 / TILE_SIZE).slice(0, 512);
  const points = [];
  for (const point of simplified) {
    const next = [
      snap(clamp(point.x, 0, worldWidth), 0.125),
      snap(clamp(point.y, 0, worldHeight), 0.125)
    ];
    const previous = points.at(-1);
    if (!previous || previous[0] !== next[0] || previous[1] !== next[1]) points.push(next);
  }
  if (points.length > 2 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points.pop();
  return points;
}

export class ForegroundLassoTool {
  constructor(editor) {
    this.editor = editor;
    this.armed = false;
    this.drawing = false;
    this.rawPoints = [];
    this.drag = null;
    this.lastRebuild = 0;
    this.handleEscape = () => {
      if (this.editor.enabled && (this.armed || this.drawing)) this.cancel(true, '已取消套索绘制');
    };
    editor.scene.input.keyboard?.on('keydown-ESC', this.handleEscape);
    editor.scene.events.once('shutdown', () => {
      editor.scene.input.keyboard?.off('keydown-ESC', this.handleEscape);
    });
  }

  worldPoint(pointer) {
    const point = this.editor.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: point.x / TILE_SIZE, y: point.y / TILE_SIZE };
  }

  arm() {
    this.cancel(false);
    this.armed = true;
    this.editor.selected = null;
    this.editor.refreshList();
    this.editor.refreshInputs();
    this.editor.status.textContent = '请在游戏画布中按住鼠标绘制，Esc 取消';
    this.editor.setCursor('crosshair');
    this.editor.updatePanelMode();
  }

  pointerDown(pointer) {
    const point = this.worldPoint(pointer);
    if (this.armed) {
      this.armed = false;
      this.drawing = true;
      this.rawPoints = [point];
      this.drag = null;
      this.editor.status.textContent = '正在绘制，松开鼠标完成；Esc 取消';
      this.editor.setCursor('crosshair');
      this.editor.updatePanelMode();
      return;
    }

    const hit = [...this.editor.items].reverse().find((item) => pointInPolygon(item.points, point));
    if (!hit) {
      this.editor.select(null);
      this.editor.setCursor('default');
      return;
    }
    this.editor.select(hit);
    this.drag = { start: point, points: structuredClone(hit.points) };
    this.editor.setCursor('move');
  }

  pointerMove(pointer) {
    const point = this.worldPoint(pointer);
    if (this.drawing) {
      if (pointer.isDown) {
        const previous = this.rawPoints.at(-1);
        if ((!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 4 / TILE_SIZE) && this.rawPoints.length < 2048) {
          this.rawPoints.push(point);
          this.editor.render();
        }
      }
      return;
    }
    if (this.drag && pointer.isDown && this.editor.selected) {
      this.moveSelected(point);
      return;
    }
    const hit = [...this.editor.items].reverse().find((item) => pointInPolygon(item.points, point));
    this.editor.setCursor(hit ? 'move' : 'default');
  }

  pointerUp(pointer) {
    if (this.drawing) this.finish();
    if (this.drag) {
      this.editor.config.onChange('foreground');
      this.editor.status.textContent = '套索位置已修改，点击保存 JSON 写入';
    }
    this.drag = null;
    this.pointerMove(pointer);
  }

  pointerOut() {
    if (!this.armed && !this.drawing) this.editor.setCursor('default');
  }

  moveSelected(point) {
    const xs = this.drag.points.map(([x]) => x);
    const ys = this.drag.points.map(([, y]) => y);
    const [worldWidth, worldHeight] = this.editor.config.getWorldSize();
    const dx = clamp(snap(point.x - this.drag.start.x, this.editor.snapStep), -Math.min(...xs), worldWidth - Math.max(...xs));
    const dy = clamp(snap(point.y - this.drag.start.y, this.editor.snapStep), -Math.min(...ys), worldHeight - Math.max(...ys));
    this.editor.selected.points = this.drag.points.map(([x, y]) => [x + dx, y + dy]);

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
    this.drawing = false;
    const points = normalizeLasso(this.rawPoints, this.editor.config.getWorldSize());
    this.rawPoints = [];
    this.editor.updatePanelMode();

    if (points.length < 3 || polygonArea(points) < 0.125) {
      this.editor.status.textContent = '套索区域过小，请重新绘制';
      this.editor.setCursor('default');
      return;
    }
    if (polygonSelfIntersects(points)) {
      this.editor.status.textContent = '套索路径存在交叉，请重新绘制';
      this.editor.setCursor('default');
      return;
    }

    const item = {
      id: this.editor.createId('foreground'),
      shape: 'polygon',
      points,
      units: 'tiles',
      layer: 'foreground',
      enabled: true,
      depth: this.editor.config.getDefaultForegroundDepth?.() ?? 100
    };
    this.editor.sourceItems.push(item);
    this.editor.select(item);
    this.editor.changed('已新增前景套索，修改层级后点击保存 JSON');
  }

  cancel(refresh = true, message = '') {
    this.armed = false;
    this.drawing = false;
    this.rawPoints = [];
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
    this.editor.selected.depth = value;
    this.editor.changed('层级已修改，点击保存 JSON 写入');
  }

  render(graphics) {
    for (const item of this.editor.config.getForegrounds?.() ?? []) {
      if (!item.points?.length) continue;
      const points = item.points.map(([x, y]) => ({ x: x * TILE_SIZE, y: y * TILE_SIZE }));
      graphics.lineStyle(3, FOREGROUND_COLOR, item.enabled === false ? 0.45 : 1);
      graphics.fillStyle(FOREGROUND_COLOR, item.enabled === false ? 0.04 : 0.1);
      graphics.fillPoints(points, true).strokePoints(points, true);
    }

    if (this.editor.selected?.points) {
      const points = this.editor.selected.points.map(([x, y]) => ({ x: x * TILE_SIZE, y: y * TILE_SIZE }));
      graphics.lineStyle(4, SELECTED_COLOR, 1).strokePoints(points, true);
      graphics.fillStyle(SELECTED_COLOR, 1);
      for (const point of points) graphics.fillCircle(point.x, point.y, 4);
    }

    if (this.rawPoints.length) {
      const points = this.rawPoints.map(({ x, y }) => ({ x: x * TILE_SIZE, y: y * TILE_SIZE }));
      graphics.lineStyle(3, SELECTED_COLOR, 1).strokePoints(points, false);
    }
  }
}