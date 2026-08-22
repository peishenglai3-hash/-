import Phaser from "phaser";
import { onAction } from "@/common/actions";
import { useGameStateStore } from "@/stores/modules/gameState";
import { clearFade, hideChoices, hideDialogue, hideInfoPanel, hideItem, hidePrompt, hideResult, hideTask } from "@/common/ui";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch02_scene_transition";

/**
 * 第一章结算面板点击“进入第二章”后的唯一视频入口。
 *
 * 视频按 contain 规则放入 1280×720 视口：不裁剪、不拉伸，源视频的完整画幅
 * 会保留；当源视频与游戏视口宽高比不一致时，只出现左右黑边。
 */
export class Ch02TransitionScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoSkipCleanup?: () => void;
	completed = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch02TransitionScene");
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch02/cinematics/ch02_scene_transition.mp4");
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
		video.on("complete", () => this.completeTransition());
		video.play();

		// 与第一章视频保持一致：正常流程完整播放，开发/测试时可用 E 或空格跳过。
		this.time.delayedCall(700, () => {
			const onSkip = () => this.completeTransition();
			onAction(this, "INTERACT", onSkip);
			onAction(this, "ADVANCE", onSkip);
			this.videoSkipCleanup = () => {
				this.input.keyboard?.off("keydown-E", onSkip);
				this.input.keyboard?.off("keydown-SPACE", onSkip);
			};
		});

		if (import.meta.env.DEV) (window as any).ch02TransitionGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		video.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
	}

	completeTransition() {
		if (this.completed) return;
		this.completed = true;
		this.videoSkipCleanup?.();
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		this.sound.stopAll();
		this.game.events.emit("ch02:arrival-enter");
	}

	shutdown() {
		this.videoSkipCleanup?.();
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
	}
}
