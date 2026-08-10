const DEFAULT_TILE_SIZE = 32;

function toWorldPoints(points, units, tileSize) {
  if (!Array.isArray(points)) return null;
  const scale = units === 'pixels' || units === 'px' || units === 'world' ? 1 : tileSize;
  const result = [];

  for (const point of points) {
    const x = Number(Array.isArray(point) ? point[0] : point?.x);
    const y = Number(Array.isArray(point) ? point[1] : point?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const next = { x: x * scale, y: y * scale };
    const previous = result[result.length - 1];
    if (!previous || previous.x !== next.x || previous.y !== next.y) result.push(next);
  }

  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (first.x === last.x && first.y === last.y) result.pop();
  }

  if (result.length < 3) return null;
  let twiceArea = 0;
  for (let index = 0; index < result.length; index += 1) {
    const current = result[index];
    const next = result[(index + 1) % result.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) > 0.001 ? result : null;
}

function copyBackground(scene, background, depth) {
  const overlay = scene.add.image(
    background.x,
    background.y,
    background.texture.key,
    background.frame?.name
  );

  overlay
    .setOrigin(background.originX, background.originY)
    .setDisplaySize(background.displayWidth, background.displayHeight)
    .setRotation(background.rotation)
    .setScrollFactor(background.scrollFactorX, background.scrollFactorY)
    .setAlpha(background.alpha)
    .setFlip(background.flipX, background.flipY)
    .setBlendMode(background.blendMode)
    .setDepth(depth)
    .setVisible(background.visible);

  if (background.isTinted) {
    overlay.setTint(
      background.tintTopLeft,
      background.tintTopRight,
      background.tintBottomLeft,
      background.tintBottomRight
    );
  }
  overlay.cameraFilter = background.cameraFilter;
  return overlay;
}

export class ForegroundOcclusionRenderer {
  constructor(scene, {
    background,
    getObjects,
    resolveDepth,
    tileSize = DEFAULT_TILE_SIZE
  }) {
    if (!scene || !background) throw new TypeError('scene and background are required');
    if (background.parentContainer) throw new Error('background must be on the root display list');
    if (typeof getObjects !== 'function') throw new TypeError('getObjects must be a function');
    if (typeof resolveDepth !== 'function') throw new TypeError('resolveDepth must be a function');
    if (!Number.isFinite(tileSize) || tileSize <= 0) throw new TypeError('tileSize must be positive');

    this.scene = scene;
    this.background = background;
    this.getObjects = getObjects;
    this.resolveDepth = resolveDepth;
    this.tileSize = tileSize;
    this.groups = [];
    this.destroyed = false;
    this.handleShutdown = () => this.destroy();
    scene.events.once('shutdown', this.handleShutdown);
    this.rebuild();
  }

  rebuild() {
    if (this.destroyed) return this;
    this.clearGroups();

    const groups = new Map();
    const objects = this.getObjects();
    for (const object of Array.isArray(objects) ? objects : []) {
      if (!object || object.enabled === false) continue;
      const depth = Number(this.resolveDepth(object));
      if (!Number.isFinite(depth)) continue;
      const points = toWorldPoints(object.points ?? object.polygon, object.units, this.tileSize);
      if (!points) continue;
      if (!groups.has(depth)) groups.set(depth, []);
      groups.get(depth).push(points);
    }

    for (const [depth, polygons] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      let graphics = null;
      let mask = null;
      let image = null;
      try {
        graphics = this.scene.make.graphics({ x: 0, y: 0, add: false });
        graphics.setScrollFactor(this.background.scrollFactorX, this.background.scrollFactorY);
        graphics.fillStyle(0xffffff, 1);
        for (const points of polygons) graphics.fillPoints(points, true, true);

        mask = graphics.createGeometryMask();
        image = copyBackground(this.scene, this.background, depth).setMask(mask);
        this.groups.push({ depth, graphics, mask, image });
      } catch (error) {
        image?.clearMask(false);
        image?.destroy();
        mask?.destroy();
        graphics?.destroy();
        this.clearGroups();
        throw error;
      }
    }

    return this;
  }

  clearGroups() {
    for (const group of this.groups) {
      group.image?.clearMask(false);
      group.image?.destroy();
      group.mask?.destroy();
      group.graphics?.destroy();
    }
    this.groups.length = 0;
  }

  destroy() {
    if (this.destroyed) return;
    this.scene?.events.off('shutdown', this.handleShutdown);
    this.clearGroups();
    this.destroyed = true;
    this.scene = null;
    this.background = null;
    this.getObjects = null;
    this.resolveDepth = null;
    this.handleShutdown = null;
  }
}
