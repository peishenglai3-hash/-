import type Phaser from "phaser";

// 陈继南行走素材共享模块：第一章场景1 与 闪回一 共用同一套逐帧资源
// 素材：public/assets/ch01/sc02/sprites/{dir}/frame-N.png（左向为修复版 5 帧，其余 8 帧）
export type ChenWalkDirection = "down" | "up" | "left" | "right";

export const CHEN_WALK_DIRS = ["down", "up", "left", "right"] as const;

const FRAME_COUNT: Record<ChenWalkDirection, number> = {
	down: 8,
	up: 8,
	right: 8,
	left: 5,
};

export const CHEN_SOURCE_FRAME = { width: 1024, height: 1536 };

export const chenFrameKey = (dir: ChenWalkDirection, index: number) =>
	`chen-walk-${dir}-${index}`;

export const chenAnimKey = (dir: ChenWalkDirection) => `chen-walk-${dir}-anim`;

export const chenDisplayWidth = (displayHeight: number) =>
	Math.round((displayHeight * CHEN_SOURCE_FRAME.width) / CHEN_SOURCE_FRAME.height);

export function preloadChenWalk(scene: Phaser.Scene): void {
	for (const dir of CHEN_WALK_DIRS) {
		for (let i = 0; i < FRAME_COUNT[dir]; i += 1) {
			const key = chenFrameKey(dir, i);
			if (!scene.textures.exists(key))
				scene.load.image(key, `assets/ch01/sc02/sprites/${dir}/frame-${i + 1}.png`);
		}
	}
}

export function createChenWalkAnimations(scene: Phaser.Scene): void {
	for (const dir of CHEN_WALK_DIRS) {
		const key = chenAnimKey(dir);
		if (scene.anims.exists(key)) continue;
		const count = FRAME_COUNT[dir];
		// 左向 5 帧用乒乓序列（1-2-3-4-5-4-3-2）补成自然循环
		const order =
			dir === "left"
				? [0, 1, 2, 3, 4, 3, 2, 1]
				: Array.from({ length: count }, (_, i) => i);
		scene.anims.create({
			key,
			frames: order.map((i) => ({ key: chenFrameKey(dir, i) })),
			frameRate: 8,
			repeat: -1,
		});
	}
}
