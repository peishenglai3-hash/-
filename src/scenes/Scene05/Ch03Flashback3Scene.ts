import Phaser from "phaser";
import { onAction } from "@/common/actions";
import { applyFormalChoice } from "@/common/actionProfileSystem";
import {
	advanceNarrative,
	clearFade,
	hideChoices,
	hideDialogue,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	playNarrative,
	showChoices,
	showInfoPanel,
	togglePause,
} from "@/common/ui";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	CH03_FLASHBACK3_CHOICES,
	CH03_FLASHBACK3_CURRENT_SITUATION,
	CH03_FLASHBACK3_FLAGS,
	CH03_FLASHBACK3_INTRO_THOUGHTS,
	buildChapter3Flashback3FormalChoice,
	type FlashbackThreeChoiceId,
} from "./ch03Flashback3.content";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch03_flashback_three";

type FlashbackThreePhase =
	| "video"
	| "situation"
	| "intro-thoughts"
	| "choice"
	| "choice-thoughts"
	| "complete";

/**
 * 第三章“闪回三”：视频结束后进入当前处境、心理描写和四选一。
 *
 * 本场只写入画像倾向，不追加行动风险；选择结束后由导演返回杜家大院外围，
 * 再把“行动开始：三路同时展开”作为下一任务交给后续场景。
 */
export class Ch03Flashback3Scene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;
	phase: FlashbackThreePhase = "video";

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch03Flashback3Scene");
	}

	init() {
		this.videoOverlay = undefined;
		this.videoFinished = false;
		this.phase = "video";
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch03/cinematics/ch03_flashback_three.mp4");
	}

	create() {
		this.sound.stopAll();
		hideTask();
		hideDialogue();
		hideInfoPanel();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
		this.state.mode = "transition";
		this.state.playerLocked = true;
		this.cameras.main.setBackgroundColor("#000000");

		const video = this.add
			.video(VIEW_W / 2, VIEW_H / 2, VIDEO_KEY)
			.setOrigin(0.5)
			.setDepth(3000);
		this.videoOverlay = video;
		video.once("textureready", () => this.fitVideo(video));
		video.once("complete", () => this.completeVideo());
		video.play(false);

		// 正常流程完整播放；E/Space 仅作为试玩和自动化测试的跳过入口。
		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		onAction(this, "PAUSE", () => togglePause());
		if (import.meta.env.DEV) (window as any).ch03Flashback3Game = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		// contain：完整画幅，不裁剪、不拉伸；比例不一致时保留黑边。
		video.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
	}

	handleAdvance() {
		if (this.phase === "video") return this.completeVideo();
		if (this.phase === "situation") return this.continueFromSituation();
		if (this.phase === "intro-thoughts" || this.phase === "choice-thoughts")
			return advanceNarrative();
	}

	completeVideo() {
		if (this.videoFinished) return;
		this.videoFinished = true;
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		// 视频自带音轨在此结束；本场没有额外 BGM，避免发生混音。
		this.sound.stopAll();
		this.phase = "situation";
		this.state.mode = "info";
		this.state.playerLocked = true;
		this.state.flags.add(CH03_FLASHBACK3_FLAGS.started);
		showInfoPanel({
			title: "当前处境",
			items: CH03_FLASHBACK3_CURRENT_SITUATION,
			continueLabel: "进入心理描写",
			onContinue: () => this.continueFromSituation(),
		});
	}

	continueFromSituation() {
		if (this.phase !== "situation") return;
		this.phase = "intro-thoughts";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideInfoPanel();
		playNarrative(CH03_FLASHBACK3_INTRO_THOUGHTS, () => this.startChoice());
	}

	startChoice() {
		this.phase = "choice";
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			CH03_FLASHBACK3_CHOICES.map(({ id, label, detail }) => ({
				id: `CH03_FLASHBACK3_${id}`,
				label,
				detail,
			})),
			(id: string) => this.choose(id),
			"闪回选择：站在门外时，你最先意识到什么？",
		);
	}

	choose(id: string) {
		if (this.phase !== "choice") return;
		const choiceId = id.slice(-1) as FlashbackThreeChoiceId;
		const choice = CH03_FLASHBACK3_CHOICES.find((item) => item.id === choiceId);
		if (!choice) return;
		const definition = buildChapter3Flashback3FormalChoice(id);
		if (!definition) return;
		applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_FLASHBACK3");
		hideChoices();
		this.phase = "choice-thoughts";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(choice.thoughts, () => this.completeSelection());
	}

	completeSelection() {
		if (this.phase !== "choice-thoughts") return;
		this.phase = "complete";
		this.state.flags.add(CH03_FLASHBACK3_FLAGS.complete);
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hideInfoPanel();
		hidePrompt();
		useGameSaveStore().autosave("CH03_FLASHBACK3");
		// 选择结束后短暂黑屏，再回到原先的杜家大院外围场景。
		this.cameras.main.fadeOut(1000, 0, 0, 0);
		this.time.delayedCall(1000, () => this.game.events.emit("ch03:flashback3-complete"));
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		if (import.meta.env.DEV && (window as any).ch03Flashback3Game === this)
			delete (window as any).ch03Flashback3Game;
	}
}
