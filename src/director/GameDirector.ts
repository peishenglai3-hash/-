import type Phaser from "phaser";
import type { TransitionConfig } from "@/types/director";
import type { RunSave, SaveData, SceneId } from "@/types/common";
import { TransitionAudioController } from "./TransitionAudio";
import { SceneTransitionController } from "./SceneTransition";
import { CHOICES, PROFILE_DELTAS, SCENE_EXIT } from "@/scenes/Scene01/content";
import { state } from "@/common/state";
import { assetPath } from "@/common/paths";
import {
	showEndPanel,
	hideIntro,
	hideTask,
	hideItem,
	hideDialogue,
	hideChoices,
	hideResult,
	showPrompt,
	clearFade,
} from "@/common/ui";
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

export interface DirectorOptions {
	game: Phaser.Game;
}

export class GameDirector {
	game: Phaser.Game;
	transitionAudio: TransitionAudioController;
	bgm: HTMLAudioElement;
	controller: SceneTransitionController | null = null;

	constructor({ game }: DirectorOptions) {
		this.game = game;
		this.transitionAudio = new TransitionAudioController();
		this.bgm = new Audio(assetPath("/assets/audio/prologue_bgm.wav"));
		this.bgm.loop = true;
	}

	init(): void {
		setupScene01ToScene02(this);
		setupScene02ToSettlement(this);
		setupSettlementToCh01Sc01(this);

		onSettingsChange((s) => this.applySettings(s));
		this.applySettings(getSettings());
		window.addEventListener("honghu:dev-next-chapter", ((event: CustomEvent<{ sceneKey?: string }>) => {
			this.handleDevNextChapter(event.detail?.sceneKey);
		}) as EventListener);

		// 测试/调试钩子：失败回退链路
		(window as any).gameDirector = this;
		(window as any).rollbackToCheckpoint = () =>
			this.rollbackToCheckpoint();
	}

	randomizePrologueChoice(): void {
		const choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
		state.choice = choice;
		for (const axis of Object.keys(state.profile)) state.profile[axis] = 0;
		for (const [axis, delta] of Object.entries(PROFILE_DELTAS[choice.id] ?? {}))
			state.profile[axis] = delta;
		for (const candidate of CHOICES) state.flags.delete(candidate.flag);
		state.flags.add(choice.flag);
	}

	clearStoryUi(): void {
		hideIntro();
		hideTask();
		hideItem();
		hideDialogue();
		hideChoices();
		hideResult();
		showPrompt("");
		clearFade();
	}

	handleDevNextChapter(sceneKey?: string): void {
		const activeKey = sceneKey ?? (this.game.scene.getScenes(true).find((scene: any) => scene.zoneEditor) as any)?.scene.key;
		this.randomizePrologueChoice();
		state.flags.add("FLAG_PRO_Q01_COMPLETED");
		this.controller?.cancel();
		this.clearStoryUi();

		if (activeKey === "Scene01") {
			for (const flag of ["FLAG_PRO02_AUDIO_REVIEWED", "FLAG_PRO02_QUESTION_WRITTEN", "PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"])
				state.flags.delete(flag);
			state.mode = "intro";
			state.playerLocked = true;
			state.taskOpen = false;
			state.paused = false;
			state.narrativeQueue = [];
			state.narrativeIndex = 0;
			state.inNarrative = false;
			this.game.scene.stop("Scene01");
			ambience.unlock();
			ambience.startRoom();
			this.enterScene("PrologueScene02", "PROLOGUE_SC02");
			return;
		}

		for (const flag of ["FLAG_PRO02_AUDIO_REVIEWED", "FLAG_PRO02_QUESTION_WRITTEN", "PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"])
			state.flags.add(flag);
		state.audioReviewed = true;
		state.questionWritten = true;
		state.playerLocked = true;
		state.mode = "transition";
		this.finishPrologue();
	}

	/* ===== 设置生效 ===== */

	applySettings(s: ReturnType<typeof getSettings>): void {
		this.bgm.volume = s.bgmVolume;
		this.game.sound.volume = s.sfxVolume;
		ambience.setVolume(s.sfxVolume);
	}

	// 加载：恢复状态 → 直达目标场景（不重玩序章）
	startFromSave(save: RunSave): void {
		SaveManager.applyToState(save);
		this.game.scene.stop("TitleScene");
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
