const TILE_SIZE = 32;
const COLORS = { collision: 0xff4fbf, interaction: 0xffdf32, selected: 0xffffff };

const clone = (value) => structuredClone(value);
const snap = (value, step) => Math.round(value / step) * step;

export class CollisionEditor {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;
    this.enabled = false;
    this.kind = 'collision';
    this.selected = null;
    this.drag = null;
    this.snapStep = 0.25;
    this.original = clone(config.documents);
    this.graphics = scene.add.graphics().setDepth(5000).setVisible(false);
    this.createPanel();
    this.bindInput();
    scene.events.on('postupdate', this.render, this);
    scene.events.once('shutdown', () => {
      scene.events.off('postupdate', this.render, this);
      this.panel.remove();
    });
  }

  get sourceItems() {
    return this.kind === 'collision' ? this.config.getCollisions() : this.config.getInteractions();
  }

  get items() { return this.sourceItems.filter((item) => item.rect); }

  createPanel() {
    const root = document.createElement('aside');
    root.className = 'dev-zone-editor hidden';
    root.innerHTML = `
      <header><strong>ZONE FORGE</strong><button data-action="close" title="关闭">×</button></header>
      <div class="dev-zone-tabs">
        <button data-kind="collision" class="active">碰撞箱</button>
        <button data-kind="interaction">交互区</button>
      </div>
      <label>区域<select data-field="item"></select></label>
      <label>名称 / ID<input data-field="id" type="text" spellcheck="false"></label>
      <div class="dev-zone-grid">
        ${['x', 'y', 'w', 'h'].map((key) => `<label>${key.toUpperCase()}<input data-field="${key}" type="number" step="0.25"></label>`).join('')}
      </div>
      <label>吸附<select data-field="snap"><option value="1">1 格</option><option value="0.5">0.5 格</option><option value="0.25" selected>0.25 格</option><option value="0.125">0.125 格</option></select></label>
      <p>拖动矩形移动，拖动右下白色手柄缩放。</p>
      <div class="dev-zone-actions"><button data-action="add">新增</button><button data-action="delete">删除</button><button data-action="reset">重载</button><button data-action="save" class="primary">保存 JSON</button></div>
      <output data-field="status">未保存的修改会在刷新后丢失</output>`;
    document.body.appendChild(root);
    this.panel = root;
    this.itemSelect = root.querySelector('[data-field="item"]');
    this.status = root.querySelector('[data-field="status"]');
    this.idInput = root.querySelector('[data-field="id"]');

    root.addEventListener('pointerdown', (event) => event.stopPropagation());
    root.querySelector('[data-action="close"]').onclick = () => this.setEnabled(false);
    root.querySelectorAll('[data-kind]').forEach((button) => {
      button.onclick = () => {
        this.kind = button.dataset.kind;
        root.querySelectorAll('[data-kind]').forEach((item) => item.classList.toggle('active', item === button));
        this.select(this.items[0] ?? null);
      };
    });
    this.itemSelect.onchange = () => this.select(this.items[Number(this.itemSelect.value)] ?? null);
    this.idInput.onchange = () => this.rename();
    root.querySelector('[data-field="snap"]').onchange = (event) => { this.snapStep = Number(event.target.value); };
    for (const key of ['x', 'y', 'w', 'h']) {
      root.querySelector(`[data-field="${key}"]`).onchange = () => this.applyInputs();
    }
    root.querySelector('[data-action="add"]').onclick = () => this.add();
    root.querySelector('[data-action="delete"]').onclick = () => this.remove();
    root.querySelector('[data-action="reset"]').onclick = () => this.reset();
    root.querySelector('[data-action="save"]').onclick = () => this.save();
  }

  bindInput() {
    this.scene.input.on('pointerdown', (pointer) => {
      if (!this.enabled) return;
      const point = { x: pointer.worldX / TILE_SIZE, y: pointer.worldY / TILE_SIZE };
      const selectedHandle = this.selected?.rect && this.nearRect(this.selected.rect, point) ? this.resizeHandle(this.selected.rect, point) : '';
      const hit = selectedHandle ? this.selected : [...this.items].reverse().find((item) => item.rect && this.contains(item.rect, point));
      if (!hit) return this.select(null);
      this.select(hit);
      const handle = selectedHandle || this.resizeHandle(hit.rect, point);
      this.drag = { mode: handle ? 'resize' : 'move', handle, start: point, rect: [...hit.rect] };
    });
    this.scene.input.on('pointermove', (pointer) => {
      const point = { x: pointer.worldX / TILE_SIZE, y: pointer.worldY / TILE_SIZE };
      if (!this.enabled) return;
      if (!this.drag || !pointer.isDown || !this.selected) {
        this.updateCursor(point);
        return;
      }
      const dx = point.x - this.drag.start.x;
      const dy = point.y - this.drag.start.y;
      const [x, y, w, h] = this.drag.rect;
      if (this.drag.mode === 'move') {
        this.selected.rect = [snap(x + dx, this.snapStep), snap(y + dy, this.snapStep), w, h];
      } else {
        let left = x; let right = x + w; let top = y; let bottom = y + h;
        if (this.drag.handle.includes('w')) left = Math.min(snap(x + dx, this.snapStep), right - this.snapStep);
        if (this.drag.handle.includes('e')) right = Math.max(snap(x + w + dx, this.snapStep), left + this.snapStep);
        if (this.drag.handle.includes('n')) top = Math.min(snap(y + dy, this.snapStep), bottom - this.snapStep);
        if (this.drag.handle.includes('s')) bottom = Math.max(snap(y + h + dy, this.snapStep), top + this.snapStep);
        this.selected.rect = [left, top, right - left, bottom - top];
      }
      this.changed();
    });
    this.scene.input.on('pointerup', (pointer) => {
      this.drag = null;
      this.updateCursor({ x: pointer.worldX / TILE_SIZE, y: pointer.worldY / TILE_SIZE });
    });
    this.scene.input.on('pointerout', () => this.setCursor('default'));
  }

  contains([x, y, w, h], point) {
    return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
  }

  resizeHandle([x, y, w, h], point) {
    const edge = 0.35;
    const horizontal = Math.abs(point.x - x) <= edge ? 'w' : Math.abs(point.x - (x + w)) <= edge ? 'e' : '';
    const vertical = Math.abs(point.y - y) <= edge ? 'n' : Math.abs(point.y - (y + h)) <= edge ? 's' : '';
    return `${vertical}${horizontal}`;
  }

  nearRect([x, y, w, h], point) {
    const padding = 0.35;
    return point.x >= x - padding && point.x <= x + w + padding && point.y >= y - padding && point.y <= y + h + padding;
  }

  updateCursor(point) {
    if (!this.selected?.rect || !this.nearRect(this.selected.rect, point)) return this.setCursor('default');
    const handle = this.resizeHandle(this.selected.rect, point);
    const cursors = { n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize', ne: 'nesw-resize', sw: 'nesw-resize', nw: 'nwse-resize', se: 'nwse-resize' };
    this.setCursor(cursors[handle] ?? (this.contains(this.selected.rect, point) ? 'move' : 'default'));
  }

  setCursor(cursor) {
    if (this.scene.game.canvas.style.cursor !== cursor) this.scene.game.canvas.style.cursor = cursor;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.graphics.setVisible(enabled);
    this.panel.classList.toggle('hidden', !enabled);
    if (enabled) this.select(this.items[0] ?? null);
    else this.drag = null;
    this.render();
  }

  toggle() { this.setEnabled(!this.enabled); }

  select(item) {
    this.selected = item;
    this.refreshList();
    this.refreshInputs();
    this.render();
  }

  refreshList() {
    this.itemSelect.innerHTML = this.items.map((item, index) => `<option value="${index}">${item.id || `${this.kind}_${index + 1}`}</option>`).join('');
    this.itemSelect.value = String(Math.max(0, this.items.indexOf(this.selected)));
  }

  refreshInputs() {
    const rect = this.selected?.rect ?? ['', '', '', ''];
    this.idInput.value = this.selected?.id ?? '';
    ['x', 'y', 'w', 'h'].forEach((key, index) => { this.panel.querySelector(`[data-field="${key}"]`).value = rect[index]; });
  }

  rename() {
    if (!this.selected) return;
    const nextId = this.idInput.value.trim();
    if (!nextId) return this.refreshInputs();
    this.selected.id = nextId;
    this.refreshList();
    this.status.textContent = '名称已修改，点击保存 JSON 写入';
  }

  applyInputs() {
    if (!this.selected) return;
    const values = ['x', 'y', 'w', 'h'].map((key) => Number(this.panel.querySelector(`[data-field="${key}"]`).value));
    if (values.some((value) => !Number.isFinite(value))) return;
    values[2] = Math.max(this.snapStep, values[2]);
    values[3] = Math.max(this.snapStep, values[3]);
    this.selected.rect = values.map((value) => snap(value, this.snapStep));
    this.changed();
  }

  add() {
    const prefix = this.kind === 'collision' ? 'collision' : 'interaction';
    const [worldWidth, worldHeight] = this.config.getWorldSize();
    const width = this.kind === 'collision' ? 4 : 3;
    const height = 2;
    const item = { id: `${prefix}_${Date.now().toString(36)}`, shape: 'rect', rect: [snap((worldWidth - width) / 2, this.snapStep), snap((worldHeight - height) / 2, this.snapStep), width, height] };
    if (this.kind === 'interaction') Object.assign(item, { type: 'inspect', prompt: '新交互区', action: 'inspect' });
    this.sourceItems.push(item);
    this.select(item);
    this.changed('已新增区域');
  }

  remove() {
    if (!this.selected) return;
    const visibleIndex = this.items.indexOf(this.selected);
    const sourceIndex = this.sourceItems.indexOf(this.selected);
    if (sourceIndex >= 0) this.sourceItems.splice(sourceIndex, 1);
    this.select(this.items[Math.max(0, visibleIndex - 1)] ?? null);
    this.changed('已删除区域');
  }

  reset() {
    this.config.replaceDocuments(clone(this.original));
    this.selected = null;
    this.config.onChange();
    this.select(this.items[0] ?? null);
    this.status.textContent = '已恢复为打开页面时的数据';
  }

  changed(message = '有未保存修改') {
    this.config.onChange();
    this.refreshInputs();
    this.render();
    this.status.textContent = message;
  }

  render() {
    const g = this.graphics.clear();
    if (!this.enabled) return;
    for (const kind of ['collision', 'interaction']) {
      const items = kind === 'collision' ? this.config.getCollisions() : this.config.getInteractions();
      g.lineStyle(3, COLORS[kind], 1);
      g.fillStyle(COLORS[kind], 0.12);
      for (const item of items) {
        if (!item.rect) continue;
        const [x, y, w, h] = item.rect.map((value) => value * TILE_SIZE);
        g.fillRect(x, y, w, h).strokeRect(x, y, w, h);
      }
    }
    const actorRects = this.config.getActorRects?.() ?? [];
    for (const [x, y, w, h] of actorRects) {
      g.lineStyle(3, COLORS.collision, 0.9);
      g.fillStyle(COLORS.collision, 0.1);
      g.fillRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE)
        .strokeRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
    }    const playerRect = this.config.getPlayerRect?.();
    if (playerRect) {
      const [x, y, w, h] = playerRect.map((value) => value * TILE_SIZE);
      g.lineStyle(3, COLORS.collision, 1);
      g.fillStyle(COLORS.collision, 0.18);
      g.fillRect(x, y, w, h).strokeRect(x, y, w, h);
    }    if (this.selected?.rect) {
      const [x, y, w, h] = this.selected.rect.map((value) => value * TILE_SIZE);
      g.lineStyle(3, COLORS.selected, 1).strokeRect(x, y, w, h);
      g.fillStyle(COLORS.selected, 1);
      for (const [handleX, handleY] of [[x, y], [x + w / 2, y], [x + w, y], [x, y + h / 2], [x + w, y + h / 2], [x, y + h], [x + w / 2, y + h], [x + w, y + h]]) {
        g.fillRect(handleX - 6, handleY - 6, 12, 12);
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
  const params = new URLSearchParams(location.search);
  const button = document.createElement('button');
  button.className = `dev-zone-toggle${params.get('dev') === '1' ? '' : ' hidden'}`;
  button.textContent = 'DEV';
  button.title = '碰撞与交互区编辑器 (P)';
  document.body.appendChild(button);
  const toggle = () => {
    const scene = game.scene.getScenes(true).find((item) => item.zoneEditor);
    scene?.zoneEditor.toggle();
  };
  button.onclick = toggle;
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) {
      event.preventDefault();
      toggle();
    }
  });
}
