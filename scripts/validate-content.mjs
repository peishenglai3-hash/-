import fs from 'node:fs';
import { REQUIRED_NARRATIVE, CHOICES, LEAVE_NARRATIVE, validateNarrative } from '../src/content01.js';
import { OPENING, AUDIO_REVIEW, WRITE_QUESTION, FALL_ASLEEP, FLAVOR_SPOTS } from '../src/content02.js';
import { TRANSITION_A, TRANSITION_B } from '../src/transition-content.js';
import { aabbOverlapsRotatedRect } from '../src/collision-geometry.js';
import { foregroundBottomPx } from '../src/foreground-occlusion.js';
import { actorColliderBottomAt } from '../src/actor-collider.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

validateNarrative();
assert(REQUIRED_NARRATIVE.length === 24, 'scene01 narrative lock (24 entries)');
assert(LEAVE_NARRATIVE.length === 1, 'leave narrative lock');
assert(CHOICES.length === 4, 'choice lock');
assert(OPENING.length === 6, 'scene02 opening lock');
assert(AUDIO_REVIEW.length === 4, 'scene02 audio review lock');
assert(WRITE_QUESTION.length === 13, 'scene02 write question lock');
assert(FALL_ASLEEP.length === 6, 'scene02 fall asleep lock');
assert(FLAVOR_SPOTS.length === 6, 'scene02 flavor spots');
assert(TRANSITION_A.entries.length === 5, 'transition A entries');
assert(TRANSITION_B.entries.length === 21, 'transition B entries');

const styles = new Set(['narration', 'thought', 'dialogue', 'cue', 'date']);
const lists = [REQUIRED_NARRATIVE, LEAVE_NARRATIVE, OPENING, AUDIO_REVIEW, WRITE_QUESTION, FALL_ASLEEP, TRANSITION_A.entries, TRANSITION_B.entries];
for (const list of lists) {
  for (const entry of list) {
    assert(styles.has(entry.style), `style lock for ${entry.entry_id}`);
    if (entry.style === 'dialogue') assert(entry.speaker_name, `speaker lock for ${entry.entry_id}`);
  }
}

const orientation = (a, b, c) => {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return Math.abs(cross) < 1e-8 ? 0 : Math.sign(cross);
};
const onSegment = (a, b, point) => point[0] >= Math.min(a[0], b[0]) - 1e-8
  && point[0] <= Math.max(a[0], b[0]) + 1e-8
  && point[1] >= Math.min(a[1], b[1]) - 1e-8
  && point[1] <= Math.max(a[1], b[1]) + 1e-8;
const segmentsIntersect = (a, b, c, d) => {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  if (abC !== abD && cdA !== cdB) return true;
  return (abC === 0 && onSegment(a, b, c))
    || (abD === 0 && onSegment(a, b, d))
    || (cdA === 0 && onSegment(c, d, a))
    || (cdB === 0 && onSegment(c, d, b));
};
const polygonSelfIntersects = (points) => {
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return true;
    }
  }
  return false;
};
const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point[0] * next[1] - next[0] * point[1];
}, 0) / 2);

function validateForegroundObjects(file, objects, [worldWidth, worldHeight]) {
  assert(Array.isArray(objects), `${file} foreground objects array`);
  const ids = new Set();
  for (const object of objects) {
    assert(object && typeof object === 'object', file + ' foreground object');
    assert(typeof object.id === 'string' && object.id.trim(), `${file} foreground id`);
    assert(!ids.has(object.id), `${file} unique foreground id ${object.id}`);
    ids.add(object.id);
    assert(object.shape === 'polygon', `${file} ${object.id} polygon shape`);
    assert(object.layer === 'foreground', `${file} ${object.id} foreground layer`);
    assert(object.units === 'tiles', `${file} ${object.id} tile units`);
    assert(object.enabled === true || object.enabled === false, `${file} ${object.id} enabled boolean`);
    assert(Number.isFinite(object.depth), `${file} ${object.id} finite depth`);
    assert(object.sort_y === undefined || (Number.isFinite(object.sort_y) && object.sort_y >= 0 && object.sort_y <= worldHeight), `${file} ${object.id} sort_y bounds`);
    assert(Array.isArray(object.points) && object.points.length >= 3 && object.points.length <= 512, `${file} ${object.id} point count`);
    for (const point of object.points) {
      assert(Array.isArray(point) && point.length === 2 && point.every(Number.isFinite), `${file} ${object.id} finite point`);
      assert(point[0] >= 0 && point[0] <= worldWidth && point[1] >= 0 && point[1] <= worldHeight, `${file} ${object.id} point bounds`);
    }
    assert(polygonArea(object.points) > 1e-6, `${file} ${object.id} non-zero area`);
    assert(!polygonSelfIntersects(object.points), `${file} ${object.id} non-self-intersecting`);
  }
}

function validateCollisionRectangles(file, objects, [worldWidth, worldHeight]) {
  assert(Array.isArray(objects), `${file} collision array`);
  const ids = new Set();
  for (const object of objects) {
    assert(object && typeof object === 'object', `${file} collision object`);
    assert(typeof object.id === 'string' && object.id.trim(), `${file} collision id`);
    assert(!ids.has(object.id), `${file} unique collision id ${object.id}`);
    ids.add(object.id);
    assert(Array.isArray(object.rect) && object.rect.length === 4 && object.rect.every(Number.isFinite), `${file} ${object.id} finite rect`);
    assert(object.rect[2] > 0 && object.rect[3] > 0, `${file} ${object.id} positive rect size`);
    assert(object.rotation === undefined || Number.isFinite(object.rotation), `${file} ${object.id} finite rotation`);
    assert(object.rect[0] >= 0 && object.rect[0] + object.rect[2] <= worldWidth, `${file} ${object.id} rect x bounds`);
    assert(object.rect[1] >= 0 && object.rect[1] + object.rect[3] <= worldHeight, `${file} ${object.id} rect y bounds`);
  }
}

function validateActorColliders(file, colliders) {
  assert(colliders && typeof colliders === 'object' && !Array.isArray(colliders), `${file} actor collider map`);
  for (const [id, collider] of Object.entries(colliders)) {
    assert(Array.isArray(collider.offset) && collider.offset.length === 2 && collider.offset.every(Number.isFinite), `${file} ${id} finite actor offset`);
    assert(Array.isArray(collider.size) && collider.size.length === 2 && collider.size.every(Number.isFinite), `${file} ${id} finite actor size`);
    assert(collider.size.every((value) => value > 0), `${file} ${id} positive actor size`);
  }
}

const scene01Manifest = JSON.parse(fs.readFileSync(new URL('../public/data/scene01_manifest.json', import.meta.url), 'utf8'));
const scene02Logic = JSON.parse(fs.readFileSync(new URL('../public/data/PRO02_logic.json', import.meta.url), 'utf8'));
validateCollisionRectangles(
  'scene01_manifest.json',
  scene01Manifest.collision,
  [scene01Manifest.grid.width, scene01Manifest.grid.height]
);
validateActorColliders('scene01_manifest.json', scene01Manifest.actor_colliders);
validateActorColliders('PRO02_logic.json', scene02Logic.actor_colliders);
for (const id of ['NPC_CH00_STUDENT_A', 'NPC_CH00_STUDENT_B', 'LEAVE_NPC_A', 'LEAVE_NPC_B']) {
  const zone = scene01Manifest.interactions.find((item) => item.id === id);
  assert(zone?.type === 'dialogue' && Array.isArray(zone.rect), `scene01 editable NPC interaction ${id}`);
}
validateCollisionRectangles(
  'PRO02_logic.json',
  scene02Logic.collision_zones,
  [scene02Logic.logical_grid.width, scene02Logic.logical_grid.height]
);
validateForegroundObjects(
  'scene01_manifest.json',
  scene01Manifest.foreground_occlusion?.objects,
  [scene01Manifest.grid.width, scene01Manifest.grid.height]
);
validateForegroundObjects(
  'PRO02_logic.json',
  scene02Logic.foreground_layers?.objects,
  [scene02Logic.logical_grid.width, scene02Logic.logical_grid.height]
);
assert(!polygonSelfIntersects([[0, 0], [2, 0], [2, 2], [0, 2]]), 'foreground square geometry probe');
assert(polygonSelfIntersects([[0, 0], [2, 2], [0, 2], [2, 0]]), 'foreground bow-tie geometry probe');
assert(aabbOverlapsRotatedRect([4.5, 4.5, 1, 1], [4, 2, 2, 6], 35), 'rotated collision overlap probe');
assert(!aabbOverlapsRotatedRect([0, 0, 1, 1], [4, 2, 2, 6], 35), 'rotated collision separation probe');
assert(foregroundBottomPx({ points: [[1, 2], [3, 7], [5, 4]], units: 'tiles' }, 32) === 224, 'foreground automatic bottom probe');
assert(foregroundBottomPx({ sort_y: 5, points: [[1, 9], [3, 10], [5, 8]], units: 'tiles' }, 32) === 320, 'foreground polygon bottom overrides legacy midpoint');
assert(actorColliderBottomAt(320, 240, { offset: [-0.5, -0.75], size: [1, 1.5] }, 32) === 264, 'actor depth uses collider bottom edge');
console.log('PASS prologue content lock: scene01 24+1 entries / 4 choices, scene02 6+4+13+6 entries / 6 flavors, transitions A5+B21');
