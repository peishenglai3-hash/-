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
