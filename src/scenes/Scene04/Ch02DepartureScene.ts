import Phaser from "phaser";
import { onAction } from "@/common/actions";
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
	togglePause,
} from "@/common/ui";
import { useGameStateStore } from "@/stores/modules/gameState";
import { CH02_DEPARTURE_EPILOGUE } from "./ch02Departure.content";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch02_departure";

/**
 * 第二章末段“出发前／分批出发”。
 *
 * 视频负责承载祠堂内最后交代、分批离开和声音转入黑幕的专门处理；
 * 视频结束后按照剧本显示“余家大院外围”的字幕与旁白，再交给章末结算。
 */
export class Ch02DepartureScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;
	ended = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch02DepartureScene");
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch02/cinematics/ch02_to_ch03_transition.mp4");
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

		// 正常流程完整播放；E / Space 仅作为试玩和自动化测试的跳过入口。
		this.time.delayedCall(700, () => {
			onAction(this, "INTERACT", () => this.handleAdvance());
			onAction(this, "ADVANCE", () => this.handleAdvance());
		});
		onAction(this, "PAUSE", () => togglePause());
		(window as any).ch02DepartureGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
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
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(CH02_DEPARTURE_EPILOGUE, () => this.completeDeparture());
	}

	completeDeparture() {
		if (this.ended) return;
		this.ended = true;
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		this.game.events.emit("ch02:departure-complete");
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
	}
}
