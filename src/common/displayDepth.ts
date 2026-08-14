// World-space indicators must stay above actor-sorted foreground copies and below cinematics.
export const WORLD_INDICATOR_DEPTH = 1800;

const ACTOR_DEPTH_BASE = 500;

export function actorDepth(bottomY: number): number {
	return ACTOR_DEPTH_BASE + bottomY;
}

export function foregroundDepth(bottomY: number): number {
	return actorDepth(bottomY) + 0.001;
}
