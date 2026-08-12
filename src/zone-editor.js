import { normalizeDegrees, pointInRotatedRect, rotatedRectPoints } from './collision-geometry.js';
import { ForegroundLassoTool } from './magnetic-lasso.js';

const COLORS = { collision: 0xff4fbf, interaction: 0xffdf32, selected: 0xffffff, rotation: 0x55e7ff };
const HANDLE_RADIUS = 0.38;
const ROTATION_HANDLE_OFFSET = 0.85;

const clone = (value) => JSON.parse(JSON.stringify(value));
const snap = (value, step) => Math.round(value / step) * step;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function transformLocal(center, local, rotation) {
  const radians = rotation * Math.PI / 180;
  return {
    x: center.x + local.x * Math.cos(radians) - local.y * Math.sin(radians),
    y: center.y + local.x * Math.sin(radians) + local.y * Math.cos(radians)
  };
}

function transformWorld(center, point, rotation) {
  const radians = -rotation * Math.PI / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians)
  };
}

function rectCenter([x, y, width, height]) {
  return { x: x + width / 2, y: y + height / 2 };
}

function fitRectInWorld([x, y, width, height], _rotation, [worldWidth, worldHeight]) {
  return [
    clamp(x, 0, Math.max(0, worldWidth - width)),
    clamp(y, 0, Math.max(0, worldHeight - height)),
    width,
    height
  ];
}

export class CollisionEditor {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.enabled = false;
    this.kind = 'collision';
	this.tileSize = config.tileSize ?? 32;
    this.selected = null;
    this.drag = null;
    this.snapStep = config.snapStep ?? 0.25;
    this.original = clone(config.documents);
    this.graphics = scene.add.graphics().setDepth(5000).setVisible(false);
    this.createPanel();
    this.lasso = new ForegroundLassoTool(this);
    this.updatePanelMode();
    this.bindInput();
    scene.events.on('postupdate', this.render, this);
    scene.events.once('shutdown', () => {
      scene.events.off('postupdate', this.render, this);
      this.lasso.cancel(false);
      this.setCursor('default');
      this.panel.remove();
    });
  }

  get sourceItems() {
    if (this.kind === 'visual') return this.config.getActorVisuals?.() ?? [];
    if (this.kind === 'collision') return this.config.getCollisions();
    if (this.kind === 'interaction') return this.config.getInteractions();
    return this.config.getForegrounds?.() ?? [];
  }

  get actorItems() {
    if (this.kind !== 'collision') return [];
    return (this.config.getActorColliders?.() ?? []).filter((item) => item?.rect);
  }

  get items() {
    if (this.kind === 'visual') return this.sourceItems;
    if (this.kind === 'foreground') return this.sourceItems.filter((item) => item.points?.length >= 3);
    const source = this.sourceItems.filter((item) => item.rect);
    return this.kind === 'collision' ? [...source, ...this.actorItems] : source;
  }

  rotationOf(item, kind = this.kind) {
    return kind === 'collision' && !item?.actorCollider ? normalizeDegrees(item?.rotation) : 0;
  }

  actorVisualHeight(item) {
    return Number(item?.displayHeight) || 0;
  }

  foregroundSortY(item) {
    const ys = item?.points?.map(([, y]) => Number(y)).filter(Number.isFinite) ?? [];
    if (ys.length) return Math.max(...ys);
    return Number.isFinite(Number(item?.sort_y)) ? Number(item.sort_y) : 0;
  }

  createPanel() {
    const root = document.createElement('aside');
    root.className = 'dev-zone-editor hidden';
    root.innerHTML = `
      <header><strong>ZONE FORGE</strong><button data-action="close" title="关闭">×</button></header>
      <div class="dev-zone-tabs">
        <button data-kind="collision" class="active">碰撞箱</button>
        <button data-kind="interaction">交互区</button>
        <button data-kind="foreground">前景套索</button>
        <button data-kind="visual">角色贴图</button>
      </div>
      <label>区域<select data-field="item"></select></label>
      <label>名称 / ID<input data-field="id" type="text" spellcheck="false"></label>
      <div class="dev-zone-grid" data-section="rect">
        ${['x', 'y', 'w', 'h'].map((key) => `<label>${key.toUpperCase()}<input data-field="${key}" type="number" step="0.25"></label>`).join('')}
      </div>
      <label data-section="rotation">旋转角度（°）<input data-field="rotation" type="number" step="1"></label>
      <label data-section="depth">最低点 Y（格，自动）<input data-field="depth" type="number" step="0.125" disabled></label>
      <label data-section="visual-size">贴图高度（像素）<input data-field="visual-height" type="number" min="1" step="1"></label>
      <label data-section="snap">吸附<select data-field="snap"><option value="1">1 格</option><option value="0.5">0.5 格</option><option value="0.25" selected>0.25 格</option><option value="0.125">0.125 格</option></select></label>
      <p data-field="help">拖动矩形移动；拖动四边或四角缩放；拖动顶部圆点旋转。</p>
      <div class="dev-zone-actions">
        <button data-action="add">新增</button><button data-action="duplicate">复制</button><button data-action="mirror">水平镜像</button><button data-action="delete">删除</button>
        <button data-action="reset">重载</button><button data-action="save" class="primary">保存 JSON</button>
        <button data-action="next-chapter" class="dev-next-chapter">随机属性并跳到下一章</button>
      </div>
      <output data-field="status">未保存的修改会在刷新后丢失</output>`;
    document.body.appendChild(root);
    this.panel = root;
    this.itemSelect = root.querySelector('[data-field="item"]');
    this.status = root.querySelector('[data-field="status"]');
    this.idInput = root.querySelector('[data-field="id"]');
    this.depthInput = root.querySelector('[data-field="depth"]');
    this.visualHeightInput = root.querySelector('[data-field="visual-height"]');
    this.rotationInput = root.querySelector('[data-field="rotation"]');
    this.help = root.querySelector('[data-field="help"]');
    this.addButton = root.querySelector('[data-action="add"]');
    this.duplicateButton = root.querySelector('[data-action="duplicate"]');
    this.mirrorButton = root.querySelector('[data-action="mirror"]');
    this.deleteButton = root.querySelector('[data-action="delete"]');
    this.bindPanelDrag();

    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.querySelector('[data-action="close"]').onclick = () => this.setEnabled(false);
    root.querySelectorAll('[data-kind]').forEach((button) => {
      button.onclick = () => {
        this.kind = button.dataset.kind;
        this.lasso.cancel(false);
        root.querySelectorAll('[data-kind]').forEach((item) => item.classList.toggle('active', item === button));
        this.updatePanelMode();
        this.select(this.items[0] ?? null);
      };
    });
    this.itemSelect.onchange = () => this.select(this.items[Number(this.itemSelect.value)] ?? null);
    this.idInput.onchange = () => this.rename();
    this.rotationInput.oninput = () => this.applyRotation();
    this.visualHeightInput.oninput = () => this.applyVisualHeight();
    root.querySelector('[data-field="snap"]').onchange = (event) => { this.snapStep = Number(event.target.value); };
    for (const key of ['x', 'y', 'w', 'h']) root.querySelector(`[data-field="${key}"]`).onchange = () => this.applyInputs();
    this.addButton.onclick = () => this.add();
    this.duplicateButton.onclick = () => this.duplicate();
    this.mirrorButton.onclick = () => this.mirror();
    this.deleteButton.onclick = () => this.remove();
    root.querySelector('[data-action="reset"]').onclick = () => this.reset();
    root.querySelector('[data-action="save"]').onclick = () => this.save();
    root.querySelector('[data-action="next-chapter"]').onclick = () => {
      const sceneKey = this.scene.scene.key;
      this.setEnabled(false);
      window.dispatchEvent(new CustomEvent('honghu:dev-next-chapter', { detail: { sceneKey } }));
    };
  }

  bindPanelDrag() {
    const header = this.panel.querySelector('header');
    const storageKey = 'honghu.zone-editor.position';
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) {
        this.panel.style.left = `${saved.left}px`;
        this.panel.style.top = `${saved.top}px`;
      }
    } catch { /* Ignore unavailable or invalid storage. */ }

    let drag = null;
    header.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      const rect = this.panel.getBoundingClientRect();
      drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      header.setPointerCapture(event.pointerId);
      header.classList.add('dragging');
      event.preventDefault();
    });
    header.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const maxLeft = Math.max(0, window.innerWidth - this.panel.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - this.panel.offsetHeight);
      this.panel.style.left = `${Math.min(maxLeft, Math.max(0, event.clientX - drag.x))}px`;
      this.panel.style.top = `${Math.min(maxTop, Math.max(0, event.clientY - drag.y))}px`;
    });
    const finish = (event) => {
      if (!drag) return;
      drag = null;
      header.classList.remove('dragging');
      if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ left: this.panel.offsetLeft, top: this.panel.offsetTop }));
      } catch { /* Ignore unavailable storage. */ }
    };
    header.addEventListener('pointerup', finish);
    header.addEventListener('pointercancel', finish);
  }

  bindInput() {
    const canvas = this.scene.game.canvas;
    const toPointer = (event, isDown = false) => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height, button: event.button, isDown, event };
    };
    const pointerDown = (pointer) => {
      if (!this.enabled) return;
      if (this.kind === 'foreground') return this.lasso.pointerDown(pointer);
      const point = this.worldPoint(pointer);
      if (this.kind === 'visual') {
        const hit = [...this.items].reverse().find((item) => item.containsPoint?.(point));
        return this.select(hit ?? null);
      }
      const selectedHandle = this.selected?.rect ? this.handleAt(this.selected, point) : '';
      const hit = selectedHandle ? this.selected : [...this.items].reverse().find((item) => item.rect && pointInRotatedRect(item.rect, this.rotationOf(item), point, 0.12));
      if (!hit) return this.select(null);
      this.select(hit);
      const handle = selectedHandle || this.handleAt(hit, point);
      this.drag = {
        mode: handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move',
        handle,
        start: point,
        rect: [...hit.rect],
        rotation: this.rotationOf(hit),
        center: rectCenter(hit.rect)
      };
    };
    const pointerMove = (pointer) => {
      if (!this.enabled) return;
      if (this.kind === 'foreground') return this.lasso.pointerMove(pointer);
      const point = this.worldPoint(pointer);
      if (!this.drag || !pointer.isDown || !this.selected) {
        this.updateCursor(point);
        return;
      }
      if (this.drag.mode === 'move') this.moveRect(point);
      else if (this.drag.mode === 'rotate') this.rotateRect(point);
      else this.resizeRect(point);
      this.changed();
    };
    const pointerUp = (pointer) => {
      if (!this.enabled) return this.setCursor('default');
      if (this.kind === 'foreground') return this.lasso.pointerUp(pointer);
      this.drag = null;
      this.updateCursor(this.worldPoint(pointer));
    };
    const onDown = (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      canvas.setPointerCapture?.(event.pointerId);
      pointerDown(toPointer(event, true));
    };
    const onMove = (event) => pointerMove(toPointer(event, event.buttons !== 0));
    const onUp = (event) => pointerUp(toPointer(event, false));
    const onLeave = () => {
      if (this.kind === 'foreground') this.lasso.pointerOut();
      else this.setCursor('default');
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    this.scene.events.once('shutdown', () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    });
  }

  worldPoint(pointer) {
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: point.x / this.tileSize, y: point.y / this.tileSize };
  }

  handlesFor(item) {
    const [,, width, height] = item.rect;
    const center = rectCenter(item.rect);
    const rotation = this.rotationOf(item);
    const handles = {
      nw: { x: -width / 2, y: -height / 2 }, n: { x: 0, y: -height / 2 }, ne: { x: width / 2, y: -height / 2 },
      w: { x: -width / 2, y: 0 }, e: { x: width / 2, y: 0 },
      sw: { x: -width / 2, y: height / 2 }, s: { x: 0, y: height / 2 }, se: { x: width / 2, y: height / 2 }
    };
    if (this.kind === 'collision' && !item.actorCollider) handles.rotate = { x: 0, y: -height / 2 - ROTATION_HANDLE_OFFSET * 32 / this.tileSize };
    return Object.fromEntries(Object.entries(handles).map(([key, local]) => [key, transformLocal(center, local, rotation)]));
  }

  handleAt(item, point) {
    let closest = '';
    let closestDistance = Math.max(HANDLE_RADIUS, 12 / this.tileSize);
    for (const [handle, position] of Object.entries(this.handlesFor(item))) {
      const distance = Math.hypot(point.x - position.x, point.y - position.y);
      if (distance <= closestDistance) {
        closest = handle;
        closestDistance = distance;
      }
    }
    return closest;
  }

  moveRect(point) {
    const [, , width, height] = this.drag.rect;
    const nextCenter = {
      x: snap(this.drag.center.x + point.x - this.drag.start.x, this.snapStep),
      y: snap(this.drag.center.y + point.y - this.drag.start.y, this.snapStep)
    };
    this.selected.rect = fitRectInWorld(
      [nextCenter.x - width / 2, nextCenter.y - height / 2, width, height],
      this.drag.rotation,
      this.config.getWorldSize()
    );
  }

  rotateRect(point) {
    const angle = Math.atan2(point.y - this.drag.center.y, point.x - this.drag.center.x) * 180 / Math.PI + 90;
    this.selected.rotation = normalizeDegrees(Math.round(angle));
    this.selected.rect = fitRectInWorld(this.selected.rect, this.selected.rotation, this.config.getWorldSize());
  }

  resizeRect(point) {
    const [, , width, height] = this.drag.rect;
    const [worldWidth, worldHeight] = this.config.getWorldSize();
    const local = transformWorld(this.drag.center, point, this.drag.rotation);
    let left = -width / 2;
    let right = width / 2;
    let top = -height / 2;
    let bottom = height / 2;
    if (this.drag.handle.includes('w')) left = clamp(snap(local.x, this.snapStep), right - worldWidth, right - this.snapStep);
    if (this.drag.handle.includes('e')) right = clamp(snap(local.x, this.snapStep), left + this.snapStep, left + worldWidth);
    if (this.drag.handle.includes('n')) top = clamp(snap(local.y, this.snapStep), bottom - worldHeight, bottom - this.snapStep);
    if (this.drag.handle.includes('s')) bottom = clamp(snap(local.y, this.snapStep), top + this.snapStep, top + worldHeight);
    const nextWidth = right - left;
    const nextHeight = bottom - top;
    const centerOffset = transformLocal({ x: 0, y: 0 }, { x: (left + right) / 2, y: (top + bottom) / 2 }, this.drag.rotation);
    const center = { x: this.drag.center.x + centerOffset.x, y: this.drag.center.y + centerOffset.y };
    this.selected.rect = fitRectInWorld(
      [center.x - nextWidth / 2, center.y - nextHeight / 2, nextWidth, nextHeight],
      this.drag.rotation,
      this.config.getWorldSize()
    );
  }

  updateCursor(point) {
    if (!this.selected?.rect) return this.setCursor('default');
    const handle = this.handleAt(this.selected, point);
    const cursors = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize', rotate: 'grab' };
    this.setCursor(cursors[handle] ?? (pointInRotatedRect(this.selected.rect, this.rotationOf(this.selected), point) ? 'move' : 'default'));
  }

  setCursor(cursor) {
    if (this.scene.game.canvas.style.cursor !== cursor) this.scene.game.canvas.style.cursor = cursor;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    document.body.classList.toggle('dev-editor-active', enabled);
    this.graphics.setVisible(enabled);
    this.panel.classList.toggle('hidden', !enabled);
    if (enabled) this.select(this.items[0] ?? null);
    else {
      this.drag = null;
      this.lasso.cancel(false);
      this.setCursor('default');
    }
    this.updatePanelMode();
    this.render();
  }

  updatePanelMode() {
    const foreground = this.kind === 'foreground';
    const visual = this.kind === 'visual';
    const collision = this.kind === 'collision';
    const actorCollider = Boolean(this.selected?.actorCollider);
    this.panel.querySelector('[data-section="rect"]').classList.toggle('hidden', foreground || visual);
    this.panel.querySelector('[data-section="rotation"]').classList.toggle('hidden', !collision || actorCollider);
    this.panel.querySelector('[data-section="depth"]').classList.toggle('hidden', !foreground);
    this.panel.querySelector('[data-section="visual-size"]').classList.toggle('hidden', !visual);
    this.panel.querySelector('[data-section="snap"]').classList.toggle('hidden', visual);
    if (visual) {
      this.help.textContent = '选择当前章节的角色，调整贴图高度；宽度按原始比例自动计算。仅影响当前章节，点击保存 JSON 写入。';
    } else if (foreground) {
      this.help.textContent = '左键：添加锚点并磁吸图像边缘\n右键：撤销上一步 · 双击：自动闭合完成 · Esc：取消\n遮挡顺序自动比较套索最低点与人物脚底碰撞箱底边；最低点更靠下的一方显示在前。';
    } else if (actorCollider) {
      this.help.textContent = '角色碰撞箱：拖动内部修改脚点偏移，拖动边/角修改尺寸。\n碰撞箱会实时跟随人物；角色项不可删除、复制、镜像或旋转。';
    } else if (collision) {
      this.help.textContent = '拖动内部：移动 · 拖动边/角：缩放\n拖动顶部蓝色圆点：旋转 · 也可直接输入角度。';
    } else {
      this.help.textContent = '拖动内部：移动 · 拖动边/角：缩放。';
    }
    this.addButton.textContent = foreground ? (this.lasso?.armed || this.lasso?.drawing ? '正在套索…' : '开始套索') : '新增';
    this.addButton.disabled = visual;
    this.addButton.classList.toggle('armed', Boolean(this.lasso?.armed || this.lasso?.drawing));
  }

  toggle() { this.setEnabled(!this.enabled); }

  select(item) {
    this.selected = item;
    this.updatePanelMode();
    this.refreshList();
    this.refreshInputs();
    this.render();
  }

  refreshList() {
    this.itemSelect.innerHTML = this.items.map((item, index) => {
      const name = item.label ?? item.id ?? `${this.kind}_${index + 1}`;
      return `<option value="${index}">${item.actorCollider ? `人物 · ${name}` : name}</option>`;
    }).join('');
    this.itemSelect.value = String(Math.max(0, this.items.indexOf(this.selected)));
  }

  refreshInputs() {
    const actorCollider = Boolean(this.selected?.actorCollider);
    const rect = this.selected?.rect ?? ['', '', '', ''];
    this.idInput.value = this.selected?.id ?? '';
    this.idInput.disabled = !this.selected || actorCollider || this.kind === 'visual';
    this.depthInput.value = this.selected && this.kind === 'foreground' ? this.foregroundSortY(this.selected) : '';
    this.depthInput.disabled = true;
    this.visualHeightInput.value = this.kind === 'visual' ? this.actorVisualHeight(this.selected) : '';
    this.visualHeightInput.disabled = this.kind !== 'visual' || !this.selected;
    this.rotationInput.value = this.selected && this.kind === 'collision' && !actorCollider ? this.rotationOf(this.selected) : '';
    this.rotationInput.disabled = !this.selected || this.kind !== 'collision' || actorCollider;
    ['x', 'y', 'w', 'h'].forEach((key, index) => {
      const input = this.panel.querySelector(`[data-field="${key}"]`);
      input.value = rect[index];
      input.disabled = !this.selected || this.kind === 'foreground' || this.kind === 'visual';
    });
    this.duplicateButton.disabled = !this.selected || actorCollider || this.kind === 'visual';
    this.mirrorButton.disabled = !this.selected || actorCollider || this.kind === 'visual';
    this.deleteButton.disabled = !this.selected || actorCollider || this.kind === 'visual';
  }

  rename() {
    if (!this.selected) return;
    const nextId = this.idInput.value.trim();
    if (!nextId) return this.refreshInputs();
    if (this.sourceItems.some((item) => item !== this.selected && item.id === nextId)) {
      this.status.textContent = 'ID 已存在，请使用唯一名称';
      return this.refreshInputs();
    }
    this.selected.id = nextId;
    this.refreshList();
    this.changed('名称已修改，点击保存 JSON 写入');
  }

  applyInputs() {
    if (!this.selected?.rect) return;
    const values = ['x', 'y', 'w', 'h'].map((key) => Number(this.panel.querySelector(`[data-field="${key}"]`).value));
    if (values.some((value) => !Number.isFinite(value))) return;
    const [worldWidth, worldHeight] = this.config.getWorldSize();
    const width = clamp(snap(values[2], this.snapStep), this.snapStep, worldWidth);
    const height = clamp(snap(values[3], this.snapStep), this.snapStep, worldHeight);
    this.selected.rect = fitRectInWorld([snap(values[0], this.snapStep), snap(values[1], this.snapStep), width, height], this.rotationOf(this.selected), [worldWidth, worldHeight]);
    this.changed();
  }

  applyVisualHeight() {
    if (this.kind !== 'visual' || !this.selected?.actorVisual) return;
    const value = Number(this.visualHeightInput.value);
    if (!Number.isFinite(value) || value <= 0) return this.refreshInputs();
    this.selected.displayHeight = value;
    this.config.onActorVisualChange?.(this.selected.id, value);
    this.changed('角色贴图大小已修改，点击保存 JSON 写入');
  }

  applyRotation() {
    if (!this.selected?.rect || this.kind !== 'collision') return;
    const value = Number(this.rotationInput.value);
    if (!Number.isFinite(value)) return this.refreshInputs();
    this.selected.rotation = normalizeDegrees(value);
    this.selected.rect = fitRectInWorld(this.selected.rect, this.selected.rotation, this.config.getWorldSize());
    this.changed('旋转角度已修改，点击保存 JSON 写入');
  }

  createId(prefix) {
    const base = `${prefix}_${Date.now().toString(36)}`;
    let id = base;
    let suffix = 2;
    while (this.sourceItems.some((item) => item.id === id)) {
      id = `${base}_${suffix}`;
      suffix += 1;
    }
    return id;
  }

  add() {
    if (this.kind === 'foreground') return this.lasso.arm();
    if (this.kind === 'visual') return;
    const prefix = this.kind === 'collision' ? 'collision' : 'interaction';
    const [worldWidth, worldHeight] = this.config.getWorldSize();
    const width = this.kind === 'collision' ? 4 : 3;
    const height = 2;
    const item = { id: this.createId(prefix), shape: 'rect', rect: [snap((worldWidth - width) / 2, this.snapStep), snap((worldHeight - height) / 2, this.snapStep), width, height] };
    if (this.kind === 'collision') item.rotation = 0;
    if (this.kind === 'interaction') Object.assign(item, { type: 'inspect', prompt: '新交互区', action: 'inspect' });
    this.sourceItems.push(item);
    this.select(item);
    this.changed('已新增区域');
  }

  duplicate() {
    if (!this.selected) return;
    const copy = clone(this.selected);
    const prefix = this.kind === 'foreground' ? 'foreground' : this.kind;
    copy.id = this.createId(prefix);
    const [worldWidth, worldHeight] = this.config.getWorldSize();
    if (copy.points) {
      const maxX = Math.max(...copy.points.map(([x]) => x));
      const maxY = Math.max(...copy.points.map(([, y]) => y));
      const minX = Math.min(...copy.points.map(([x]) => x));
      const minY = Math.min(...copy.points.map(([, y]) => y));
      const dx = maxX + 0.5 <= worldWidth ? 0.5 : Math.max(-0.5, -minX);
      const dy = maxY + 0.5 <= worldHeight ? 0.5 : Math.max(-0.5, -minY);
      copy.points = copy.points.map(([x, y]) => [x + dx, y + dy]);
      if (Number.isFinite(Number(copy.sort_y))) copy.sort_y = clamp(Number(copy.sort_y) + dy, 0, worldHeight);
    } else if (copy.rect) {
      copy.rect[0] += 0.5;
      copy.rect[1] += 0.5;
      copy.rect = fitRectInWorld(copy.rect, this.rotationOf(copy), [worldWidth, worldHeight]);
    }
    this.sourceItems.push(copy);
    this.select(copy);
    this.changed('已复制并选中新区域，点击保存 JSON 写入');
  }

  mirror() {
    if (!this.selected) return;
    const [worldWidth] = this.config.getWorldSize();
    if (this.selected.points) {
      this.selected.points = this.selected.points.map(([x, y]) => [worldWidth - x, y]).reverse();
    } else if (this.selected.rect) {
      const [x, y, width, height] = this.selected.rect;
      this.selected.rect = [worldWidth - x - width, y, width, height];
      if (this.kind === 'collision') this.selected.rotation = normalizeDegrees(-this.rotationOf(this.selected));
    }
    this.changed('已按地图竖直中轴水平镜像，点击保存 JSON 写入');
  }

  remove() {
    if (!this.selected) return;
    const visibleIndex = this.items.indexOf(this.selected);
    const sourceIndex = this.sourceItems.indexOf(this.selected);
    if (sourceIndex >= 0) this.sourceItems.splice(sourceIndex, 1);
    this.select(this.items[Math.max(0, visibleIndex - 1)] ?? null);
    this.changed(this.kind === 'foreground' ? '已删除前景套索' : '已删除区域');
  }

  reset() {
    this.lasso.cancel(false);
    this.config.replaceDocuments(clone(this.original));
    this.selected = null;
    this.config.onChange();
    this.updatePanelMode();
    this.select(this.items[0] ?? null);
    this.status.textContent = '已恢复为打开页面时的数据';
  }

  changed(message = '有未保存修改') {
    this.config.onChange(this.kind);
    this.refreshInputs();
    this.render();
    this.status.textContent = message;
  }

  renderRect(graphics, item, kind) {
    if (!item.rect) return;
    const points = rotatedRectPoints(item.rect, this.rotationOf(item, kind)).map(({ x, y }) => ({ x: x * this.tileSize, y: y * this.tileSize }));
    graphics.fillPoints(points, true).strokePoints(points, true);
  }

  render() {
    const graphics = this.graphics.clear();
    if (!this.enabled) return;
    for (const kind of ['collision', 'interaction']) {
      const items = kind === 'collision'
        ? [...this.config.getCollisions(), ...this.actorItems]
        : this.config.getInteractions();
      graphics.lineStyle(3, COLORS[kind], 1);
      graphics.fillStyle(COLORS[kind], 0.12);
      for (const item of items) this.renderRect(graphics, item, kind);
    }
    this.lasso.render(graphics);

    if (this.selected?.rect) {
      graphics.lineStyle(3, COLORS.selected, 1).fillStyle(COLORS.selected, 1);
      const points = rotatedRectPoints(this.selected.rect, this.rotationOf(this.selected)).map(({ x, y }) => ({ x: x * this.tileSize, y: y * this.tileSize }));
      graphics.strokePoints(points, true);
      const handles = this.handlesFor(this.selected);
      const top = handles.n;
      if (handles.rotate) {
        graphics.lineStyle(2, COLORS.rotation, 1).lineBetween(top.x * this.tileSize, top.y * this.tileSize, handles.rotate.x * this.tileSize, handles.rotate.y * this.tileSize);
      }
      for (const [handle, point] of Object.entries(handles)) {
        if (handle === 'rotate') {
          graphics.fillStyle(COLORS.rotation, 1).fillCircle(point.x * this.tileSize, point.y * this.tileSize, 7);
        } else {
          graphics.fillStyle(COLORS.selected, 1).fillRect(point.x * this.tileSize - 6, point.y * this.tileSize - 6, 12, 12);
        }
      }
    }
  }

  async save() {
    const documents = this.config.documents;
    try {
      for (const [file, data] of Object.entries(documents)) {
        const response = await fetch('/__dev/save-zones', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ file, data })
        });
        if (!response.ok) throw new Error(await response.text());
      }
      this.original = clone(documents);
      this.status.textContent = '已写回项目 JSON';
    } catch {
      for (const [file, data] of Object.entries(documents)) {
        const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
        const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.split('/').pop() });
        link.click();
        URL.revokeObjectURL(link.href);
      }
      this.status.textContent = '当前服务器不可写，已下载 JSON';
    }
  }
}

export function installDevEditorToggle(game) {
  const toggle = () => {
    const scene = game.scene.getScenes(true).find((item) => item.zoneEditor);
    scene?.zoneEditor.toggle();
  };
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) {
      event.preventDefault();
      toggle();
    }
  });
}
