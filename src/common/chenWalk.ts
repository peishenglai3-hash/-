import type Phaser from "phaser";

export type ChenWalkDirection = "down" | "up" | "left" | "right";

export const CHEN_WALK_DIRS = ["down", "up", "left", "right"] as const;

const FRAME_FILES = Array.from(
	{ length: 8 },
	(_, index) => `frame-${String(index + 1).padStart(2, "0")}.png`,
);

const FRAME_FOLDERS: Record<ChenWalkDirection, string> = {
	down: "正面8帧",
	up: "背面8帧",
	left: "左侧8帧",
	right: "右侧8帧",
};

export const chenFrameKey = (direction: ChenWalkDirection, index: number) =>
	`chen-walk-${direction}-${index}`;

export const chenAnimKey = (direction: ChenWalkDirection) =>
	`chen-walk-${direction}-anim`;

export function chenFrameSize(
	scene: Phaser.Scene,
	direction: ChenWalkDirection,
): { width: number; height: number } {
	const source = scene.textures
		.get(chenFrameKey(direction, 0))
		.getSourceImage() as HTMLImageElement;
	return { width: source.width, height: source.height };
}

export function chenDisplayWidth(
	scene: Phaser.Scene,
	direction: ChenWalkDirection,
	displayHeight: number,
): number {
	const source = chenFrameSize(scene, direction);
	return Math.round((displayHeight * source.width) / source.height);
}

export function preloadChenWalk(scene: Phaser.Scene): void {
	for (const direction of CHEN_WALK_DIRS) {
		FRAME_FILES.forEach((file, index) => {
			const key = chenFrameKey(direction, index);
			if (scene.textures.exists(key)) return;
			scene.load.image(
				key,
				`assets/ch01/sc01/sprites/${FRAME_FOLDERS[direction]}/processed/version-rekeyed/runtime/${file}`,
			);
		});
	}
}

export function createChenWalkAnimations(scene: Phaser.Scene): void {
	for (const direction of CHEN_WALK_DIRS) {
		const key = chenAnimKey(direction);
		if (scene.anims.exists(key)) continue;
		scene.anims.create({
			key,
			frames: FRAME_FILES.map((_, index) => ({
				key: chenFrameKey(direction, index),
			})),
			frameRate: 16,
			repeat: -1,
		});
	}
}
