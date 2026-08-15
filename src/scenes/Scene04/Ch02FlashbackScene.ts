import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	advanceNarrative,
	clearFade,
	closeTask,
	hideChoices,
	hideDialogue,
	hideInfoPanel,
	hidePrompt,
	hideResult,
	hideTask,
	playNarrative,
	showChoices,
	showInfoPanel,
	showTask,
	taskNeedsConfirmation,
	togglePause,
} from "@/common/ui";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	CH02_FLASHBACK_CHOICES,
	CH02_FLASHBACK_COMPLETE_TASK,
	CH02_FLASHBACK_FLAGS,
	CH02_FLASHBACK_INTRO_THOUGHTS,
	CH02_FLASHBACK_KNOWN_INFO,
} from "./ch02Flashback.content";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch02_flashback_conscription";

type FlashbackPhase =
	| "video"
	| "known-info"
	| "intro-thoughts"
	| "choice"
	| "choice-thoughts"
	| "complete";

/**
 * 第二章“闪回二：抓壮丁”。
 *
 * 视频结束后仍停留在本场景的黑幕中：先读已知信息，再进入心理描写和
 * 四选一。这里不负责返回祠堂，也不提前打开后续场景。
 */
export class Ch02FlashbackScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;
	phase: FlashbackPhase = "video";

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch02FlashbackScene");
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch02/cinematics/ch02_flashback_conscription.mp4");
	}

	create() {
		this.sound.stopAll();
		hideTask();
		hideDialogue();
		hideInfoPanel();
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

		// 正常流程播放完整视频；E/Space 仅作为开发和测试时的跳过入口。
		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		onAction(this, "PAUSE", () => togglePause());
		(window as any).ch02FlashbackGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		video.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
	}

	handleAdvance() {
		if (this.phase === "video") return this.completeVideo();
		if (this.phase === "known-info") return this.continueFromKnownInfo();
		if (this.phase === "intro-thoughts" || this.phase === "choice-thoughts")
			return advanceNarrative();
		if (this.phase === "complete") {
			if (taskNeedsConfirmation()) return closeTask();
			return this.beginDisciplineTransition();
		}
	}

	completeVideo() {
		if (this.videoFinished) return;
		this.videoFinished = true;
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		this.sound.stopAll();
		this.phase = "known-info";
		this.state.mode = "info";
		this.state.playerLocked = true;
		this.state.flags.add(CH02_FLASHBACK_FLAGS.started);
		showInfoPanel({
			title: "已知信息",
			items: CH02_FLASHBACK_KNOWN_INFO,
			continueLabel: "进入心理描写",
			onContinue: () => this.continueFromKnownInfo(),
		});
	}

	continueFromKnownInfo() {
		if (this.phase !== "known-info") return;
		this.phase = "intro-thoughts";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideInfoPanel();
		playNarrative(CH02_FLASHBACK_INTRO_THOUGHTS, () => this.startChoice());
	}

	startChoice() {
		this.phase = "choice";
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			CH02_FLASHBACK_CHOICES.map(({ id, label, detail }) => ({ id, label, detail })),
			(id: string) => this.choose(id),
			"闪回选择：最难从这段片段中移开的是什么？",
		);
	}

	choose(id: string) {
		const choice = CH02_FLASHBACK_CHOICES.find((item) => item.id === id);
		if (!choice) return;
		for (const [axis, delta] of Object.entries(choice.profileDelta))
			this.state.profile[axis] = (this.state.profile[axis] ?? 0) + delta;
		this.state.choice = {
			id: `CH02_FLASHBACK_${choice.id}`,
			flag: choice.flag,
			echo_summary: choice.label,
		};
		this.state.flags.add(choice.flag);
		hideChoices();
		this.phase = "choice-thoughts";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(choice.thoughts, () => this.completeSelection());
	}

	completeSelection() {
		this.phase = "complete";
		this.state.mode = "end";
		this.state.playerLocked = true;
		this.state.flags.add(CH02_FLASHBACK_FLAGS.complete);
		hideDialogue();
		hideChoices();
		hidePrompt();
		showTask(CH02_FLASHBACK_COMPLETE_TASK);
	}

	beginDisciplineTransition() {
		if (this.phase !== "complete" || this.state.mode === "transition") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.cameras.main.fadeOut(260, 0, 0, 0);
		this.time.delayedCall(280, () => this.game.events.emit("ch02:discipline-enter"));
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
	}
}
