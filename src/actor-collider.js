const DEFAULT_TILE_SIZE = 32;

const finitePair = (value, fallback) => Array.isArray(value)
  && value.length === 2
  && value.every(Number.isFinite)
  ? value
  : [...fallback];

export function ensureActorColliderConfig(document, id, defaults) {
  document.actor_colliders ??= {};
  const current = document.actor_colliders[id] ?? {};
  const profile = {
    offset: finitePair(current.offset, defaults.offset),
    size: finitePair(current.size, defaults.size)
  };
  if (profile.size[0] <= 0 || profile.size[1] <= 0) profile.size = [...defaults.size];
  document.actor_colliders[id] = profile;
  return profile;
}

export function ensureActorVisualConfig(document, id, defaultHeight) {
  document.actor_visuals ??= {};
  const current = document.actor_visuals[id] ?? {};
  const height = Number(current.display_height);
  current.display_height = Number.isFinite(height) && height > 0 ? height : defaultHeight;
  current.offset = finitePair(current.offset, [0, 0]);
  document.actor_visuals[id] = current;
  return current;
}

export function createActorVisualEntry({ id, label, getActor, getProfile, getAnchor, onPositionChange, tileSize = DEFAULT_TILE_SIZE }) {
  return {
    id,
    label,
    shape: 'visual',
    actorVisual: true,
    get enabled() {
      return getProfile()?.enabled !== false;
    },
    getActor,
    remove() {
      if (id === 'PLAYER') return;
      const profile = getProfile();
      if (profile) profile.enabled = false;
      getActor()?.setVisible?.(false);
    },
    get displayHeight() {
      return getProfile()?.display_height ?? '';
    },
    set displayHeight(value) {
      const profile = getProfile();
      if (profile) profile.display_height = Number(value);
    },
    get displayWidth() {
      const actor = getActor();
      return actor?.displayWidth ?? '';
    },
    get textureKey() {
      return getActor()?.texture?.key ?? '';
    },
    getContour() {
      return actorAlphaContour(getActor(), tileSize);
    },
    get bounds() {
      const bounds = getActor()?.getBounds?.();
      if (!bounds) return null;
      return { x: bounds.x / tileSize, y: bounds.y / tileSize, width: bounds.width / tileSize, height: bounds.height / tileSize };
    },
    get position() {
      const actor = getActor();
      return actor ? { x: actor.x / tileSize, y: actor.y / tileSize } : null;
    },
    set position(value) {
      const profile = getProfile();
      const anchor = getAnchor?.() ?? this.position;
      if (!profile || !anchor || !value) return;
      profile.offset = [value.x - anchor.x, value.y - anchor.y];
      onPositionChange?.(id, profile.offset);
    },
    get anchor() {
      return getAnchor?.() ?? this.position;
    },
    containsPoint(point) {
      const bounds = this.bounds;
      if (!bounds) return false;
      return point.x >= bounds.x && point.x <= bounds.x + bounds.width
        && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    }
  };
}

export function actorAlphaContour(actor, tileSize = DEFAULT_TILE_SIZE) {
  const source = actor?.texture?.getSourceImage?.();
  if (!source) return null;
  const frame = actor.frame;
  const sourceWidth = Number(frame?.cutWidth ?? source.width);
  const sourceHeight = Number(frame?.cutHeight ?? source.height);
  if (!(sourceWidth > 0 && sourceHeight > 0)) return null;

  const maxDimension = 128;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(2, Math.round(sourceWidth * scale));
  const height = Math.max(2, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.clearRect(0, 0, width, height);
  context.drawImage(
    source,
    Number(frame?.cutX ?? 0), Number(frame?.cutY ?? 0), sourceWidth, sourceHeight,
    0, 0, width, height,
  );
  const pixels = context.getImageData(0, 0, width, height).data;
  const opaque = (x, y) => x >= 0 && y >= 0 && x < width && y < height && pixels[(y * width + x) * 4 + 3] >= 12;
  const edges = new Map();
  const addEdge = (start, end) => {
    const key = `${start[0]},${start[1]}`;
    const list = edges.get(key) ?? [];
    list.push(end);
    edges.set(key, list);
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!opaque(x, y)) continue;
      if (!opaque(x, y - 1)) addEdge([x, y], [x + 1, y]);
      if (!opaque(x + 1, y)) addEdge([x + 1, y], [x + 1, y + 1]);
      if (!opaque(x, y + 1)) addEdge([x + 1, y + 1], [x, y + 1]);
      if (!opaque(x - 1, y)) addEdge([x, y + 1], [x, y]);
    }
  }
  const loops = [];
  while (edges.size) {
    const [startKey, startEnds] = edges.entries().next().value;
    let start = startKey.split(',').map(Number);
    let current = [...start];
    const loop = [current];
    for (let guard = 0; guard < width * height * 2; guard += 1) {
      const key = `${current[0]},${current[1]}`;
      const ends = edges.get(key);
      if (!ends?.length) break;
      const next = ends.pop();
      if (!ends.length) edges.delete(key);
      current = next;
      if (current[0] === start[0] && current[1] === start[1]) break;
      loop.push(current);
    }
    if (loop.length >= 3) loops.push(loop);
  }
  const area = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2);
  const contour = loops.sort((a, b) => area(b) - area(a))[0];
  const bounds = actor.getBounds?.();
  if (!contour?.length || !bounds) return null;
  const points = contour.map(([x, y]) => {
    const nx = x / width;
    const ny = y / height;
    const mappedX = actor.flipX ? 1 - nx : nx;
    const mappedY = actor.flipY ? 1 - ny : ny;
    return [bounds.x / tileSize + mappedX * bounds.width / tileSize, bounds.y / tileSize + mappedY * bounds.height / tileSize];
  });
  const stride = Math.max(1, Math.ceil(points.length / 256));
  return points.filter((_, index) => index % stride === 0);
}

export function actorColliderRectAt(x, y, profile, tileSize = DEFAULT_TILE_SIZE) {
  const offset = finitePair(profile?.offset, [0, 0]);
  const size = finitePair(profile?.size, [1, 1]);
  return [
    x + offset[0] * tileSize,
    y + offset[1] * tileSize,
    size[0] * tileSize,
    size[1] * tileSize
  ];
}

export function actorColliderBottomAt(x, y, profile, tileSize = DEFAULT_TILE_SIZE) {
  const [, top, , height] = actorColliderRectAt(x, y, profile, tileSize);
  return top + height;
}

export function createActorColliderEntry({ id, label, getActor, getProfile, tileSize = DEFAULT_TILE_SIZE }) {
  return {
    id,
    label,
    shape: 'rect',
    actorCollider: true,
    get rect() {
      const actor = getActor();
      const profile = getProfile();
      if (!actor || !profile) return null;
      return [
        actor.x / tileSize + profile.offset[0],
        actor.y / tileSize + profile.offset[1],
        profile.size[0],
        profile.size[1]
      ];
    },
    set rect(value) {
      const actor = getActor();
      const profile = getProfile();
      if (!actor || !profile || !Array.isArray(value) || value.length !== 4) return;
      profile.offset = [value[0] - actor.x / tileSize, value[1] - actor.y / tileSize];
      profile.size = [value[2], value[3]];
    }
  };
}
