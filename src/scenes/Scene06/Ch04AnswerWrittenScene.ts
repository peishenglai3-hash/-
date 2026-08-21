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
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { addManagedBgm } from "@/common/audioBus";
import { useGameStateStore } from "@/stores/modules/gameState";
import { CH04_ANSWER_WRITTEN_NARRATIVE } from "./ch04AnswerWritten.content";

const WORLD_W = 2048;
const WORLD_H = 1152;
const CAMERA_ZOOM = 1280 / WORLD_W;
const COMPLETE_FLAG = "CH04_SCENE5_COMPLETE";

/** 第四章场景五：答案写下之后。固定镜头承接最终补写，不再新增选择。 */
export class Ch04AnswerWrittenScene extends Phaser.Scene {
	player?: Phaser.GameObjects.Image;
	bgm?: Phaser.Sound.BaseSound;
	completed = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04AnswerWrittenScene");
	}

	preload() {
		this.load.image("ch04_answer_written_base", "assets/map/pro02_base.png");
		this.load.image(
			"ch04_answer_written_player",
			"assets/characters/player/modern/side-right.png",
		);
		this.load.audio(
			"ch04_answer_written_bgm",
			"assets/audio/ch04/05_写下答案_回望与结算.mp3",
		);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.cameras.main.setBackgroundColor("#10100f");
		this.add
			.image(WORLD_W / 2, WORLD_H / 2, "ch04_answer_written_base")
			.setDepth(-20);
		this.player = this.add
			.image(1118, 530, "ch04_answer_written_player")
			.setOrigin(0.5, 1)
			.setCrop(0, 0, 225, 430)
			.setDisplaySize(50, 108)
			.setDepth(30)
			.setAlpha(0.96);

		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);

		this.bgm = addManagedBgm(this, "ch04_answer_written_bgm", 0.35);
		this.bgm.play();

		this.completed = this.state.flags.has(COMPLETE_FLAG);
		this.state.mode = this.completed ? "transition" : "narrative";
		this.state.playerLocked = true;
		(window as any).ch04AnswerWrittenGame = this;

		if (this.completed) {
			fadeToBlack();
			return;
		}

		fadeToBlack();
		this.time.delayedCall(900, () => clearFade());
		this.time.delayedCall(160, () => {
			if (this.scene.isActive())
				playNarrative(CH04_ANSWER_WRITTEN_NARRATIVE, () => this.completeScene());
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
		useGameSaveStore().autosave("CH04_ANSWER_WRITTEN");
		fadeToBlack();
		this.time.delayedCall(1000, () => {
			if (this.scene.isActive()) this.game.events.emit("ch04:answer-written-complete");
		});
	}

	shutdown() {
		this.bgm?.stop();
		this.bgm?.destroy();
		this.bgm = undefined;
		if ((window as any).ch04AnswerWrittenGame === this)
			delete (window as any).ch04AnswerWrittenGame;
	}
}
