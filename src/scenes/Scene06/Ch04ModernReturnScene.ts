import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	advanceNarrative,
	clearFade,
	fadeToBlack,
	hideChoices,
	hideDialogue,
	hideEndPanel,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	playNarrative,
} from "@/common/ui";
import { useGameStateStore } from "@/stores/modules/gameState";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { addManagedBgm } from "@/common/audioBus";
import { CH04_MODERN_RETURN_NARRATIVE } from "./ch04ModernReturn.content";

const WORLD_W = 2048;
const WORLD_H = 1152;
const CAMERA_ZOOM = 1280 / WORLD_W;
const COMPLETE_FLAG = "CH04_SCENE3_COMPLETE";

/**
 * 第四章场景三：现代实践驻地。
 *
 * 实践驻地是序章已经完成验收的固定底图；本场只复用该图和序章陈继南
 * 的人物资源，不重新复制一套地图或把穿越后的醒来误做成可探索玩法。
 */
export class Ch04ModernReturnScene extends Phaser.Scene {
	player?: Phaser.GameObjects.Image;
	bgm?: Phaser.Sound.BaseSound;
	completed = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04ModernReturnScene");
	}

	preload() {
		this.load.image("ch04_modern_return_base", "assets/map/pro02_base.png");
		this.load.image(
			"ch04_modern_return_player",
			"assets/characters/player/modern/side-right.png",
		);
		this.load.audio(
			"ch04_modern_return_bgm",
			"assets/audio/ch04/05_写下答案_回望与结算.mp3",
		);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.cameras.main.setBackgroundColor("#10100f");

		this.add
			.image(WORLD_W / 2, WORLD_H / 2, "ch04_modern_return_base")
			.setDepth(-20);
		this.player = this.add
			.image(1118, 530, "ch04_modern_return_player")
			.setOrigin(0.5, 1)
			// 现有序章站立素材没有“伏案”专用帧；裁出上半身并压到桌前，
			// 让它表现为从桌面抬头，而不是把完整人物放在桌上站立。
			.setCrop(0, 0, 225, 430)
			.setDisplaySize(50, 108)
			.setDepth(30)
			.setAlpha(0.96);

		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);

		this.bgm = addManagedBgm(this, "ch04_modern_return_bgm", 0.35);
		this.bgm.play();

		this.completed = this.state.flags.has(COMPLETE_FLAG);
		this.state.playerLocked = true;
		this.state.mode = this.completed ? "transition" : "narrative";
		(window as any).ch04ModernReturnGame = this;

		if (this.completed) {
			fadeToBlack();
			return;
		}

		// 以短暂黑幕承接意识交错；底图在黑幕下完成加载，避免闪出半成品。
		fadeToBlack();
		this.time.delayedCall(900, () => clearFade());
		this.time.delayedCall(160, () => {
			if (this.scene.isActive())
				playNarrative(CH04_MODERN_RETURN_NARRATIVE, () => this.completeScene());
		});

		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
	}

	resetHud() {
		hideEndPanel();
		hideTask();
		hideDialogue();
		hideInfoPanel();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
	}

	handleAdvance() {
		if (this.state.inNarrative) advanceNarrative();
	}

	completeScene() {
		if (this.completed) return;
		this.completed = true;
		this.state.flags.add(COMPLETE_FLAG);
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideDialogue();
		this.bgm?.stop();
		useGameSaveStore().autosave("CH04_MODERN_RETURN");
		fadeToBlack();
		this.time.delayedCall(1000, () => {
			if (this.scene.isActive()) this.game.events.emit("ch04:modern-return-complete");
		});
	}

	shutdown() {
		this.bgm?.stop();
		this.bgm?.destroy();
		this.bgm = undefined;
		if ((window as any).ch04ModernReturnGame === this)
			delete (window as any).ch04ModernReturnGame;
	}
}
