import Phaser from "phaser";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import { useGameStateStore } from "@/stores/modules/gameState";
import { assetPath } from "@/common/paths";
import { showFlavor } from "@/common/ui";
import { useGameSaveStore } from "@/stores";

// 游戏初始界面：设计图全屏 + 四个烧录木牌按钮的透明热区（悬停微光）
const HOTSPOTS = [
	{ id: "new", x: 301, y: 641, w: 230, h: 72 },
	{ id: "load", x: 516, y: 641, w: 230, h: 72 },
	{ id: "settings", x: 736, y: 641, w: 230, h: 72 },
	{ id: "quit", x: 957, y: 641, w: 230, h: 72 },
] as const;

export class TitleScene extends Phaser.Scene {
	titleBgm: HTMLAudioElement;

	constructor() {
		super("TitleScene");
		this.titleBgm = new Audio(assetPath("/assets/audio/title_bgm.mp3"));
		this.titleBgm.loop = true;
	}

	preload() {
		this.load.image("title_bg", "assets/ui/title_screen.png");
	}

	create() {
		// 保留浏览器回归测试与调试工具需要的当前标题场景引用。
		(window as Window & { titleScene?: TitleScene }).titleScene = this;
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
				this.handleAction(spot.id);
			});
		}

		// 场景关闭时停止标题 BGM
		this.events.once("shutdown", () => this.stopTitleBgm());

		// 标题 BGM 自动播放（浏览器限制下于首次交互起播）
		this.ensureTitleBgm();

		// 设置变更时同步 BGM 音量
		const gameSave = useGameSaveStore();
		gameSave.onSettingsChange((s) => {
			this.titleBgm.volume = s.bgmVolume;
		});
		// 初始音量
		this.titleBgm.volume = gameSave.getSettings().bgmVolume;
	}

	/* ===== 按钮动作 ===== */

	private handleAction(id: string): void {
		switch (id) {
			case "new": {
				const { game } = useDirectorStore();
				if (!game) return;
				const hud = useHudStore();
				hud.title.loadOpen = false;
				hud.title.settingsOpen = false;
				useGameStateStore().resetRunState();
				this.scene.stop("TitleScene");
				game.scene.start("Scene01");
				useGameSaveStore().autosave("PROLOGUE_SC01");
				useHudStore().showOverlay("Scene1Overlay");
				break;
			}
			case "load": {
				const hud = useHudStore();
				hud.title.settingsOpen = false;
				hud.title.loadOpen = true;
				break;
			}
			case "settings": {
				const hud = useHudStore();
				hud.title.loadOpen = false;
				hud.title.settingsOpen = true;
				break;
			}
			case "quit": {
				window.close();
				showFlavor("若浏览器不允许直接关闭，请手动关闭此标签页。");
				break;
			}
		}
	}

	/* ===== 标题 BGM ===== */

	private ensureTitleBgm(): void {
		this.titleBgm.play().catch(() => {
			const unlock = () => {
				this.titleBgm.play().catch(() => {});
				window.removeEventListener("pointerdown", unlock);
				window.removeEventListener("keydown", unlock);
			};
			window.addEventListener("pointerdown", unlock);
			window.addEventListener("keydown", unlock);
		});
	}

	private stopTitleBgm(): void {
		try {
			this.titleBgm.pause();
			this.titleBgm.currentTime = 0;
		} catch {
			/* ignore */
		}
	}
}
