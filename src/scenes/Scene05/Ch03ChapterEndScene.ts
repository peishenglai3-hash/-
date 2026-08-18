import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	clearFade,
	hideChoices,
	hideDialogue,
	hideEndPanel,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	showEndPanel,
} from "@/common/ui";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { useGameStateStore } from "@/stores/modules/gameState";
import { CH03_CHAPTER_END_FLAGS } from "./ch03Aftermath.content";

const VIEW_W = 1280;
const VIEW_H = 720;
const VIDEO_KEY = "ch03_chapter_end";

/**
 * 第三章章末视频：行动结束后三路结果汇合。
 * 视频自带音轨，本场不启动 BGM；contain 显示确保 1672×941 源画幅不被裁切。
 */
export class Ch03ChapterEndScene extends Phaser.Scene {
	videoOverlay?: Phaser.GameObjects.Video;
	videoFinished = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch03ChapterEndScene");
	}

	init() {
		this.videoOverlay = undefined;
		this.videoFinished = false;
	}

	preload() {
		this.load.video(VIDEO_KEY, "assets/ch03/cinematics/ch03_chapter_end.mp4");
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
		this.state.flags.add(CH03_CHAPTER_END_FLAGS.started);
		this.cameras.main.setBackgroundColor("#000000");

		if (this.state.flags.has(CH03_CHAPTER_END_FLAGS.complete)) {
			this.showCompletedPanel();
		} else {
			const video = this.add
				.video(VIEW_W / 2, VIEW_H / 2, VIDEO_KEY)
				.setOrigin(0.5)
				.setDepth(3000);
			this.videoOverlay = video;
			video.once("textureready", () => this.fitVideo(video));
			video.once("complete", () => this.completeVideo());
			video.play(false);
		}

		// 正常流程以视频结束为准；E/Space 保留为试玩和自动化测试的跳过入口。
		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		(window as any).ch03ChapterEndGame = this;
	}

	fitVideo(video: Phaser.GameObjects.Video) {
		video.setSizeToFrame();
		const sourceWidth = video.video?.videoWidth || video.frame?.realWidth || VIEW_W;
		const sourceHeight = video.video?.videoHeight || video.frame?.realHeight || VIEW_H;
		const scale = Math.min(VIEW_W / sourceWidth, VIEW_H / sourceHeight);
		video.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
	}

	handleAdvance() {
		if (!this.videoFinished && this.videoOverlay) this.completeVideo();
	}

	completeVideo() {
		if (this.videoFinished) return;
		this.videoFinished = true;
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		this.sound.stopAll();
		this.state.flags.add(CH03_CHAPTER_END_FLAGS.complete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		this.showCompletedPanel();
	}

	showCompletedPanel() {
		this.state.mode = "end";
		this.state.playerLocked = true;
		const saveStore = useGameSaveStore();
		const saved = saveStore.autosave("CH03_END");
		const save = saved ?? {
			checkpointLabel: "第三章·行动结束：三路结果汇合",
			checkpoint: "CH03_ACTION_END",
			profile: { ...this.state.profile },
			choiceTag: this.state.choice?.flag ?? null,
			fixed: [...this.state.flags].filter((flag) => flag.startsWith("FIXED_")),
			risk: { ...this.state.risk },
		};
		showEndPanel(save, {
			title: "第三章·行动结束：三路结果汇合｜完成",
			hint: saved ? "第三章故事到此结束" : "本地存档暂不可用；本次结果保留在当前页面，请勿立即关闭。",
			buttonLabel: "返回标题",
			next: "title",
		});
	}

	shutdown() {
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		if ((window as any).ch03ChapterEndGame === this)
			delete (window as any).ch03ChapterEndGame;
	}
}
