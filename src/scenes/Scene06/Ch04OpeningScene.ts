import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	advanceNarrative,
	clearFade,
	hideChoices,
	hideDialogue,
	hideEndPanel,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
} from "@/common/ui";
import { useGameStateStore } from "@/stores/modules/gameState";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch04_opening";

/** 第四章开场：第三章结束后进入戴家场王爷庙。视频自身带音轨，本场不叠加 BGM。 */
export class Ch04OpeningScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04OpeningScene");
	}

	init() {
		this.videoOverlay = undefined;
		this.videoFinished = false;
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch04/cinematics/ch04_opening.mp4");
	}

	create() {
		this.sound.stopAll();
		hideEndPanel();
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
		if (import.meta.env.DEV) (window as any).ch04OpeningGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		// contain：完整显示 1672×941 画幅，不裁剪、不拉伸；比例不一致时只留黑边。
		video.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
	}

	handleAdvance() {
		if (!this.videoFinished) {
			this.completeVideo();
			return;
		}
		if (this.state.inNarrative) advanceNarrative();
	}

	completeVideo() {
		if (this.videoFinished) return;
		this.videoFinished = true;
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		this.sound.stopAll();
		this.state.flags.add("CH04_OPENING_VIDEO_SEEN");
		this.game.events.emit("ch04:opening-complete");
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		if (import.meta.env.DEV && (window as any).ch04OpeningGame === this)
			delete (window as any).ch04OpeningGame;
	}
}
