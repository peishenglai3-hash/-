import Phaser from "phaser";
import { onAction } from "@/common/actions";
import { useGameStateStore } from "@/stores/modules/gameState";
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
} from "@/common/ui";
import { CH03_COMBAT_FLAGS } from "./ch03GateBreachCombat.content";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch03_historical_dong_shoots_du";

/**
 * 第三章固定历史节点：董云庭击中杜老三。
 * 视频自带声音，本场不叠加章节 BGM；画面始终 contain，保证源视频不裁剪。
 */
export class Ch03HistoricalNodeScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch03HistoricalNodeScene");
	}

	init() {
		this.videoOverlay = undefined;
		this.videoFinished = false;
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch03/cinematics/ch03_dong_shoots_du.mp4");
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

		// 允许测试/试玩用 E 或 Space 跳过；正常流程仍以 complete 为准。
		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		(window as any).ch03HistoricalNodeGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		video.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
	}

	handleAdvance() {
		if (!this.videoFinished) this.completeVideo();
		else if (this.state.inNarrative) advanceNarrative();
	}

	completeVideo() {
		if (this.videoFinished) return;
		this.videoFinished = true;
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		this.sound.stopAll();
		this.state.flags.add(CH03_COMBAT_FLAGS.historicalNodeSeen);
		this.state.mode = "transition";
		this.state.playerLocked = true;
		this.game.events.emit("ch03:historical-node-complete");
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		if ((window as any).ch03HistoricalNodeGame === this)
			delete (window as any).ch03HistoricalNodeGame;
	}
}
