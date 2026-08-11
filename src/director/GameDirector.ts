import type Phaser from "phaser";
import type { TransitionConfig } from "@/types/director";
import type { RunSave, SaveData, SceneId } from "@/types/common";
import { TransitionAudioController } from "./TransitionAudio";
import { SceneTransitionController } from "./SceneTransition";
import { SCENE_EXIT } from "@/scenes/Scene01/content";
import { state, resetRunState } from "@/common/state";
import { assetPath } from "@/common/paths";
import { showEndPanel, showFlavor, hud } from "@/common/ui";
import {
	SaveManager,
	SCENE_KEY,
	getSettings,
	onSettingsChange,
} from "@/common/save";
import { ambience } from "@/common/ambience";
import { setupScene01ToScene02 } from "./flow/Scene01ToScene02";
import { setupScene02ToSettlement } from "./flow/Scene02ToSettlement";
import { setupSettlementToCh01Sc01 } from "./flow/SettlementToCh01Sc01";
import { setupDebugRoute } from "./flow/DebugRoute";

export interface DirectorOptions {
	game: Phaser.Game;
}

export class GameDirector {
	game: Phaser.Game;
	transitionAudio: TransitionAudioController;
	bgm: HTMLAudioElement;
	titleBgm: HTMLAudioElement;
	controller: SceneTransitionController | null = null;

	constructor({ game }: DirectorOptions) {
		this.game = game;
		this.transitionAudio = new TransitionAudioController();
		this.bgm = new Audio(assetPath("/assets/audio/prologue_bgm.wav"));
		this.bgm.loop = true;
		this.titleBgm = new Audio(assetPath("/assets/audio/title_bgm.mp3"));
		this.titleBgm.loop = true;
	}

	init(): void {
		setupDebugRoute(this);
		setupScene01ToScene02(this);
		setupScene02ToSettlement(this);
		setupSettlementToCh01Sc01(this);

		this.game.events.on("title:action", (id: string) =>
			this.handleTitleAction(id),
		);
		onSettingsChange((s) => this.applySettings(s));
		this.applySettings(getSettings());
		this.ensureTitleBgm();

		// 测试/调试钩子：失败回退链路
		(window as any).gameDirector = this;
		(window as any).rollbackToCheckpoint = () =>
			this.rollbackToCheckpoint();
	}

	/* ===== 设置生效 ===== */

	applySettings(s: ReturnType<typeof getSettings>): void {
		this.bgm.volume = s.bgmVolume;
		this.titleBgm.volume = s.bgmVolume;
		this.game.sound.volume = s.sfxVolume;
		ambience.setVolume(s.sfxVolume);
	}

	/* ===== 标题界面 ===== */

	// 自动播放限制：先尝试直播，被浏览器拒绝则在首次用户交互时起播
	ensureTitleBgm(): void {
		this.titleBgm.play().catch(() => {
			const unlock = () => {
				this.titleBgm.play().catch(() => {});
				window.removeEventListener("pointerdown", unlock);
				window.removeEventListener("keydown", unlock);
			};
			window.addEventListener("pointerdown", unlock);
			window.addEventListener("keydown", unlock);
		});
	}

	stopTitleBgm(): void {
		try {
			this.titleBgm.pause();
			this.titleBgm.currentTime = 0;
		} catch {
			/* ignore */
		}
	}

	leaveTitle(): void {
		this.stopTitleBgm();
		this.game.scene.stop("TitleScene");
	}

	handleTitleAction(id: string): void {
		if (id === "new") this.beginNewGame();
		else if (id === "load") hud.title.loadOpen = true;
		else if (id === "settings") hud.title.settingsOpen = true;
		else if (id === "quit") {
			window.close();
			showFlavor("若浏览器不允许直接关闭，请手动关闭此标签页。");
		}
	}

	// 创建：重置整局状态 → 离开标题 → 开场视频流程 → Scene01 + 自动存档
	beginNewGame(): void {
		resetRunState();
		this.leaveTitle();
		this.game.scene.start("Scene01");
		SaveManager.autosave("PROLOGUE_SC01");
		this.game.events.emit("director:new-game");
	}

	// 加载：恢复状态 → 直达目标场景（不重玩序章）
	startFromSave(save: RunSave): void {
		SaveManager.applyToState(save);
		this.leaveTitle();
		if (
			save.sceneId === "PROLOGUE_SC01" ||
			save.sceneId === "PROLOGUE_SC02"
		)
			this.bgm.play().catch(() => {});
		this.game.scene.start(SCENE_KEY[save.sceneId]);
	}

	// 场景切换统一入口：自动存档 + 启动（旧场景停止由各 flow 负责）
	enterScene(key: string, sceneId: SceneId): void {
		SaveManager.autosave(sceneId);
		this.game.scene.start(key);
	}

	// 失败回退：返回固定存档点（1927年，陈继南家中醒来）。
	// 不重玩现代序章；序章画像/标签与穿越后画像恢复以固定存档为准；三风险归 0。
	rollbackToCheckpoint(): boolean {
		const save = SaveManager.loadFixed();
		if (!save) return false;
		this.stopPrologueBgm();
		SaveManager.applyToState(save);
		this.game.scene.stop("Scene01");
		this.game.scene.stop("PrologueScene02");
		this.game.scene.stop("Ch01Sc01Scene");
		this.game.scene.start("Ch01Sc01Scene");
		return true;
	}

	/* ===== 通用 ===== */

	runTransition(config: TransitionConfig, onComplete: () => void): void {
		this.controller?.cancel();
		this.controller = new SceneTransitionController({
			audio: this.transitionAudio,
			entries: config.entries,
			cues: config.cues,
			revealEntryId: config.revealEntryId,
			revealImageSrc: config.revealImage,
			onComplete,
		});
		this.controller.start();
	}

	/* ===== 序章结算 ===== */

	finishPrologue(): void {
		const save: SaveData = {
			checkpoint: SCENE_EXIT.nextSceneCanonical,
			checkpointLabel: "1927年，陈继南家中醒来",
			profile: state.profile,
			choice: state.choice?.id ?? null,
			choiceTag: state.choice?.flag ?? null,
			echo: state.choice?.echo_summary ?? null,
			tags: [...state.flags],
			fixed: ["PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"],
			risk: { identity: 0, execution: 0, coordination: 0 },
			exit: SCENE_EXIT,
		};
		try {
			window.localStorage.setItem(
				"redcode.prologue.flags",
				JSON.stringify([...state.flags]),
			);
			window.localStorage.setItem(
				"redcode.prologue.save",
				JSON.stringify(save),
			);
		} catch {
			/* storage unavailable */
		}
		// Stop prologue BGM before Chapter 1 scene starts to avoid overlap.
		this.stopPrologueBgm();
		window.dispatchEvent(
			new CustomEvent("prologue:scene-exit", {
				detail: structuredClone(save),
			}),
		);
		showEndPanel(save);
	}

	stopPrologueBgm(): void {
		try {
			this.bgm.pause();
			this.bgm.currentTime = 0;
		} catch {
			/* ignore */
		}
	}
}
