import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	advanceNarrative,
	advanceResult,
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
	showChoices,
	showResult,
} from "@/common/ui";
import { applyFormalChoice } from "@/common/actionProfileSystem";
import { useGameStateStore } from "@/stores/modules/gameState";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { addManagedBgm } from "@/common/audioBus";
import {
	CH04_FINAL_CHOICE_ITEMS,
	CH04_FINAL_CHOICE_SETUP,
	getCh04FinalChoice,
} from "./ch04FinalChoice.content";

const WORLD_W = 2048;
const WORLD_H = 1152;
const CAMERA_ZOOM = 1280 / WORLD_W;
const COMPLETE_FLAG = "CH04_FINAL_CHOICE_COMPLETE";

/** 第四章场景四：实践笔记的最终补写选择。 */
export class Ch04FinalChoiceScene extends Phaser.Scene {
	player?: Phaser.GameObjects.Image;
	bgm?: Phaser.Sound.BaseSound;
	completed = false;
	mode: "narrative" | "choice" | "result" | "transition" = "narrative";
	selectedChoiceId?: string;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04FinalChoiceScene");
	}

	preload() {
		this.load.image("ch04_final_choice_base", "assets/map/pro02_base.png");
		this.load.image(
			"ch04_final_choice_player",
			"assets/characters/player/modern/side-right.png",
		);
		this.load.audio(
			"ch04_final_choice_bgm",
			"assets/audio/ch04/05_写下答案_回望与结算.mp3",
		);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.cameras.main.setBackgroundColor("#10100f");
		this.add
			.image(WORLD_W / 2, WORLD_H / 2, "ch04_final_choice_base")
			.setDepth(-20);
		this.player = this.add
			.image(1118, 530, "ch04_final_choice_player")
			.setOrigin(0.5, 1)
			// 与现代回返保持相同的序章人物表现：上半身露出桌面，避免站立在桌上。
			.setCrop(0, 0, 225, 430)
			.setDisplaySize(50, 108)
			.setDepth(30)
			.setAlpha(0.96);
		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);

		this.bgm = addManagedBgm(this, "ch04_final_choice_bgm", 0.35);
		this.bgm.play();

		this.completed = this.state.flags.has(COMPLETE_FLAG);
		this.state.playerLocked = true;
		this.state.mode = this.completed ? "end" : "narrative";
		this.mode = this.completed ? "transition" : "narrative";
		if (import.meta.env.DEV) (window as any).ch04FinalChoiceGame = this;

		if (this.completed) {
			fadeToBlack();
			return;
		}

		fadeToBlack();
		this.time.delayedCall(900, () => clearFade());
		this.time.delayedCall(160, () => {
			if (this.scene.isActive())
				playNarrative(CH04_FINAL_CHOICE_SETUP, () => this.openChoice());
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
		if (this.mode === "result") {
			advanceResult();
			return;
		}
		if (this.mode === "narrative" && this.state.inNarrative) advanceNarrative();
	}

	openChoice() {
		if (this.completed) return;
		this.mode = "choice";
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			CH04_FINAL_CHOICE_ITEMS,
			(choiceId) => this.choose(choiceId),
			"怎样补完这句话？",
		);
	}

	choose(choiceId: string) {
		if (this.mode !== "choice" || this.selectedChoiceId) return;
		const choice = getCh04FinalChoice(choiceId);
		if (!choice) return;
		this.selectedChoiceId = choice.id;
		this.mode = "result";
		this.state.mode = "result";

		// FIN-Q01 的四个选项都只增加画像，不写入风险；数值永远不进入前端面板。
		applyFormalChoice(this.state, {
			choiceId: choice.id,
			chapter: 4,
			isFormalChoice: true,
			portraitChange: choice.profileDelta,
			riskChange: {},
			flag: choice.flag,
			echoSummary: choice.echoSummary,
			failureCheck: false,
		});

		hideChoices();
		showResult({
			image: choice.pages[0].image,
			result: choice.pages[0].result,
			pages: choice.pages,
			pageIndex: 0,
			hint: "Space 继续",
			onComplete: () => this.completeChoice(),
		});
	}

	completeChoice() {
		if (this.completed) return;
		this.completed = true;
		this.mode = "transition";
		this.state.mode = "end";
		this.state.playerLocked = true;
		this.state.flags.add(COMPLETE_FLAG);
		this.bgm?.stop();
		useGameSaveStore().autosave("CH04_FINAL_CHOICE");
		fadeToBlack();
		this.time.delayedCall(1000, () => {
			if (this.scene.isActive()) this.game.events.emit("ch04:final-choice-complete");
		});
	}

	shutdown() {
		this.bgm?.stop();
		this.bgm?.destroy();
		this.bgm = undefined;
		if (import.meta.env.DEV && (window as any).ch04FinalChoiceGame === this)
			delete (window as any).ch04FinalChoiceGame;
	}
}
