const EPSILON = 1e-8;

export function normalizeDegrees(value) {
  if (!Number.isFinite(Number(value))) return 0;
  const normalized = ((Number(value) + 180) % 360 + 360) % 360 - 180;
  return Math.abs(normalized) < EPSILON ? 0 : normalized;
}

export function rotatedRectPoints([x, y, width, height], rotation = 0) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radians = normalizeDegrees(rotation) * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2]
  ].map(([localX, localY]) => ({
    x: centerX + localX * cosine - localY * sine,
    y: centerY + localX * sine + localY * cosine
  }));
}

export function pointInRotatedRect(rect, rotation, point, padding = 0) {
  const [x, y, width, height] = rect;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radians = -normalizeDegrees(rotation) * Math.PI / 180;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  const localX = dx * Math.cos(radians) - dy * Math.sin(radians);
  const localY = dx * Math.sin(radians) + dy * Math.cos(radians);
  return Math.abs(localX) <= width / 2 + padding && Math.abs(localY) <= height / 2 + padding;
}

function projection(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const value = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function polygonsOverlap(first, second) {
  const polygons = [first, second];
  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      const edgeX = next.x - current.x;
      const edgeY = next.y - current.y;
      const length = Math.hypot(edgeX, edgeY);
      if (length < EPSILON) continue;
      const axis = { x: -edgeY / length, y: edgeX / length };
      const firstProjection = projection(first, axis);
      const secondProjection = projection(second, axis);
      if (firstProjection.max <= secondProjection.min + EPSILON
        || secondProjection.max <= firstProjection.min + EPSILON) return false;
    }
  }
  return true;
}

export function aabbOverlapsRotatedRect(aabb, rect, rotation = 0) {
  const [x, y, width, height] = aabb;
  const aabbPoints = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
  return polygonsOverlap(aabbPoints, rotatedRectPoints(rect, rotation));
}
