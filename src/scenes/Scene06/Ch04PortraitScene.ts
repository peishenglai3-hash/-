import Phaser from "phaser";
import { calculatePortrait } from "@/common/actionProfileSystem";
import {
	clearFade,
	hideChoices,
	hideDialogue,
	hideEndPanel,
	hideInfoPanel,
	hideItem,
	hidePortraitResult,
	hidePrompt,
	hideResult,
	hideTask,
	showPortraitResult,
} from "@/common/ui";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { addManagedBgm } from "@/common/audioBus";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	CH04_PORTRAIT_POSTERS,
	PORTRAIT_CORE_TENDENCY,
} from "./ch04PortraitPresentation";

const COMPLETE_FLAG = "CH04_PORTRAIT_REVEALED";

/** 第四章场景六：全章画像结算。只读取画像，绝不新增风险或历史分支。 */
export class Ch04PortraitScene extends Phaser.Scene {
	bgm?: Phaser.Sound.BaseSound;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04PortraitScene");
	}

	preload() {
		this.load.audio(
			"ch04_portrait_bgm",
			"assets/audio/ch04/IN7 - 国际歌 (钢琴版) [mqms2].ogg",
		);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.cameras.main.setBackgroundColor("#0b0d0d");
		this.state.mode = "end";
		this.state.playerLocked = true;
		this.state.flags.add(COMPLETE_FLAG);

		this.bgm = addManagedBgm(this, "ch04_portrait_bgm", 0.35);
		this.bgm.play();

		const portrait = calculatePortrait(this.state.profile);
		showPortraitResult({
			portrait,
			posterSrc: CH04_PORTRAIT_POSTERS[portrait.code],
			coreTendency: PORTRAIT_CORE_TENDENCY[portrait.code],
		});
		useGameSaveStore().autosave("CH04_PORTRAIT_RESULT");
		(window as any).ch04PortraitGame = this;

		// 最终面板由 Vue 负责 Esc 返回标题；Phaser 仅保持场景和音频生命周期。
		clearFade();
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
		hidePortraitResult();
		clearFade();
	}

	shutdown() {
		this.bgm?.stop();
		this.bgm?.destroy();
		this.bgm = undefined;
		if ((window as any).ch04PortraitGame === this)
			delete (window as any).ch04PortraitGame;
	}
}
