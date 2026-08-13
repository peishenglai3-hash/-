import type Phaser from "phaser";

// 程序化墨水痕迹转场（屏幕空间墨团扩散→覆盖→淡出）
// 用于：闪回一内"几天后"跳变、第一章场景1→闪回一 的进入转场
// 样式参考：D:\美术资产\第1章 美术资产\Chapter1-Flashback-Props\Chapter1_Flashback_InkSpreadMask.jpg
const INK_BLOBS = [
	{ x: 200, y: 150, r: 340, delay: 0 },
	{ x: 640, y: 90, r: 320, delay: 120 },
	{ x: 1080, y: 170, r: 340, delay: 60 },
	{ x: 120, y: 480, r: 360, delay: 200 },
	{ x: 480, y: 360, r: 380, delay: 80 },
	{ x: 820, y: 420, r: 380, delay: 160 },
	{ x: 1160, y: 500, r: 360, delay: 240 },
	{ x: 320, y: 660, r: 340, delay: 300 },
	{ x: 700, y: 700, r: 360, delay: 180 },
	{ x: 1040, y: 680, r: 340, delay: 340 },
	{ x: 640, y: 360, r: 420, delay: 420 },
	{ x: 60, y: 60, r: 300, delay: 380 },
	{ x: 1220, y: 60, r: 300, delay: 400 },
	{ x: 640, y: 540, r: 420, delay: 460 },
];

export interface InkTransitionOptions {
	// 墨团覆盖全屏后的回调（此时画面全黑，可安全切场景/切状态）
	onCovered: () => void;
	// 覆盖后是否自动淡出（切场景时由新场景负责画面，无需淡出）
	fadeOut?: boolean;
}

export function playInkTransition(
	scene: Phaser.Scene,
	{ onCovered, fadeOut = true }: InkTransitionOptions,
): void {
	const graphics = scene.add.graphics().setDepth(3000).setScrollFactor(0);
	const progress = { t: 0 };
	const redraw = () => {
		graphics.clear();
		graphics.fillStyle(0x0a0a0a, 1);
		for (const blob of INK_BLOBS) {
			const local = Math.max(0, Math.min(1, (progress.t * 2400 - blob.delay) / 1100));
			if (local <= 0) continue;
			const eased = 1 - (1 - local) * (1 - local);
			graphics.fillCircle(blob.x, blob.y, eased * blob.r);
		}
	};
	scene.tweens.add({
		targets: progress,
		t: 1,
		duration: 2400,
		ease: "Linear",
		onUpdate: redraw,
		onComplete: () => {
			scene.time.delayedCall(500, () => {
				onCovered();
				if (!fadeOut) {
					graphics.destroy();
					return;
				}
				scene.tweens.add({
					targets: graphics,
					alpha: 0,
					duration: 900,
					onComplete: () => graphics.destroy(),
				});
			});
		},
	});
}
