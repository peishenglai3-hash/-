import type Phaser from "phaser";

export type ModernWalkDirection = "down" | "left" | "right" | "up";

const FRAME_FILES = Array.from({ length: 8 }, (_, index) => `frame-${String(index + 1).padStart(2, "0")}.png`);

const FOLDERS: Record<ModernWalkDirection, string> = {
	down: "正面8帧",
	left: "左面8帧",
	right: "右面8帧",
	up: "背面8帧",
};

export const MODERN_WALK_DIRECTIONS = ["down", "left", "right", "up"] as const;
export const MODERN_PLAYER_SOURCE_FRAME = { width: 225, height: 720 };

export const modernWalkFrameKey = (direction: ModernWalkDirection, index: number) =>
	`modern-player-${direction}-${index}`;

export function preloadModernPlayerWalk(scene: Phaser.Scene): void {
	for (const direction of MODERN_WALK_DIRECTIONS) {
		FRAME_FILES.forEach((file, index) => {
			scene.load.image(
				modernWalkFrameKey(direction, index),
				`assets/characters/player/modern/${FOLDERS[direction]}/processed/version-rekeyed/runtime/${file}`,
			);
		});
	}
}

export function createModernPlayerWalkAnimations(scene: Phaser.Scene): void {
	for (const direction of MODERN_WALK_DIRECTIONS) {
		const key = `player-walk-${direction}-anim`;
		if (scene.anims.exists(key)) continue;
		scene.anims.create({
			key,
			frames: FRAME_FILES.map((_, index) => ({ key: modernWalkFrameKey(direction, index) })),
			frameRate: 8,
			repeat: -1,
		});
	}
}

export function setModernPlayerDirection(
	sprite: Phaser.GameObjects.Sprite,
	direction: ModernWalkDirection,
	displayHeight: number,
): void {
	const key = modernWalkFrameKey(direction, 0);
	sprite.setTexture(key, 0);
	const source = sprite.scene.textures.get(key).getSourceImage() as HTMLImageElement;
	sprite.setDisplaySize(Math.round(displayHeight * source.width / source.height), displayHeight);
}
