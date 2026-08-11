import Phaser from "phaser";

// 游戏初始界面：设计图全屏 + 四个烧录木牌按钮的透明热区（悬停微光）
// 动作通过 game.events.emit("title:action", id) 派发给 GameDirector，场景本身不持有业务逻辑
const HOTSPOTS = [
	{ id: "new", x: 301, y: 641, w: 230, h: 72 },
	{ id: "load", x: 516, y: 641, w: 230, h: 72 },
	{ id: "settings", x: 736, y: 641, w: 230, h: 72 },
	{ id: "quit", x: 957, y: 641, w: 230, h: 72 },
] as const;

export class TitleScene extends Phaser.Scene {
	constructor() {
		super("TitleScene");
	}

	preload() {
		this.load.image("title_bg", "assets/ui/title_screen.png");
	}

	create() {
		// 设计图为 2000×1125，等比缩放铺满 1280×720 画布（热区坐标按此比例标定）
		this.add.image(640, 360, "title_bg").setDisplaySize(1280, 720);

		for (const spot of HOTSPOTS) {
			const zone = this.add
				.rectangle(spot.x, spot.y, spot.w, spot.h, 0xffffff, 0)
				.setInteractive();
			zone.on("pointerover", () => {
				this.tweens.add({
					targets: zone,
					fillAlpha: 0.14,
					duration: 120,
				});
			});
			zone.on("pointerout", () => {
				this.tweens.add({ targets: zone, fillAlpha: 0, duration: 120 });
			});
			zone.on("pointerdown", () => {
				this.game.events.emit("title:action", spot.id);
			});
		}

		(window as any).titleScene = this;
	}
}
