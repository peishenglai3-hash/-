import Phaser from "phaser";
import { onAction } from "@/common/actions";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	clearFade,
	hideChoices,
	hideDialogue,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	advanceNarrative,
} from "@/common/ui";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch03_arrival";

/** 第三章开场：承接第二章，完整播放“抵达杜家大院外围”视频。 */
export class Ch03OpeningScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;
	ended = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch03OpeningScene");
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch03/cinematics/ch03_arrival.mp4");
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

		// 正常流程完整播放；E/Space 只作为试玩和自动化测试跳过入口。
		this.time.delayedCall(700, () => {
			onAction(this, "INTERACT", () => this.handleAdvance());
			onAction(this, "ADVANCE", () => this.handleAdvance());
		});
		(window as any).ch03OpeningGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		// contain：完整画幅，不裁剪、不拉伸；比例不完全一致时只保留黑边。
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
		this.game.events.emit("ch03:arrival-enter");
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		if ((window as any).ch03OpeningGame === this) delete (window as any).ch03OpeningGame;
	}
}
