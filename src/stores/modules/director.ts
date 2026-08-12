import { ref } from "vue";
import { defineStore } from "pinia";
import Phaser from "phaser";
import type { RunSave, SaveData, SceneId } from "@/types/common";
import { TransitionAudioController } from "@/common/transitionAudio";
import { CHOICES, PROFILE_DELTAS, SCENE_EXIT } from "@/scenes/Scene01/content";
import { TitleScene } from "@/scenes/Title/TitleScene";
import { Scene01 } from "@/scenes/Scene01/Scene01";
import { PrologueScene02 } from "@/scenes/Scene02/PrologueScene02";
import { Ch01Sc01Scene } from "@/scenes/Scene03/Ch01Sc01Scene";
import { Ch01Sc02Scene } from "@/scenes/Scene03/Ch01Sc02Scene";
import { Ch01Sc03Scene } from "@/scenes/Scene03/Ch01Sc03Scene";
import { setupFlashbackFlow } from "@/components/biz/FlashbackFlow";
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

function createGame(parent: HTMLElement): Phaser.Game {
	return new Phaser.Game({
		type: Phaser.AUTO,
		parent,
		backgroundColor: "#171715",
		width: 1280,
		height: 720,
		dom: { createContainer: true },
		physics: {
			default: "arcade",
			arcade: { gravity: { x: 0, y: 0 }, debug: false },
		},
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: 1280,
			height: 720,
		},
		loader: { baseURL: import.meta.env.BASE_URL },
		scene: [TitleScene, Scene01, PrologueScene02, Ch01Sc01Scene, Ch01Sc02Scene, Ch01Sc03Scene],
	});
}

export const useDirectorStore = defineStore("director", () => {
	const game = ref<Phaser.Game | null>(null);
	const transitionAudio = new TransitionAudioController();
	const bgm = new Audio(assetPath("/assets/audio/prologue_bgm.wav"));
	bgm.loop = true;

	/* ===== 初始化 ===== */

	function init(parent: HTMLElement) {
		const g = createGame(parent);
		game.value = g;
		(window as any).game = g;
		(window as any).gameDirector = { game: g, enterScene };

		// 闪回流程路由（SC01 ↔ SC02 / SC01 ↔ SC03）
		setupFlashbackFlow({ game: g, enterScene });

		// 结算 → 第一章
		window.addEventListener("prologue:scene-exit", ((event: CustomEvent<SaveData>) => {
			const save = event.detail;
			if (save?.profile) {
				for (const [axis, value] of Object.entries(save.profile))
					state.profile[axis] = value;
			}
			if (save?.tags) {
				for (const tag of save.tags) state.flags.add(tag);
			}
			if (save?.fixed) {
				for (const tag of save.fixed) state.flags.add(tag);
			}
			hideIntro();
			g.scene.stop("Scene01");
			g.scene.stop("PrologueScene02");
			enterScene("Ch01Sc01Scene", "CH01_SC01");
		}) as EventListener);

		onSettingsChange((s) => applySettings(s));
		applySettings(getSettings());

		window.addEventListener("honghu:dev-next-chapter", ((event: CustomEvent<{ sceneKey?: string }>) => {
			handleDevNextChapter(event.detail?.sceneKey);
		}) as EventListener);

		// 测试/调试钩子：失败回退链路
		(window as any).rollbackToCheckpoint = () =>
			rollbackToCheckpoint();
	}

	/* ===== 开发工具 ===== */

	function randomizePrologueChoice(): void {
		const choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
		state.choice = choice;
		for (const axis of Object.keys(state.profile)) state.profile[axis] = 0;
		for (const [axis, delta] of Object.entries(PROFILE_DELTAS[choice.id] ?? {}))
			state.profile[axis] = delta;
		for (const candidate of CHOICES) state.flags.delete(candidate.flag);
		state.flags.add(choice.flag);
	}

	function clearStoryUi(): void {
		hideIntro();
		hideTask();
		hideItem();
		hideDialogue();
		hideChoices();
		hideResult();
		showPrompt("");
		clearFade();
	}

	function handleDevNextChapter(sceneKey?: string): void {
		const activeKey = sceneKey ?? (game.value!.scene.getScenes(true).find((scene: any) => scene.zoneEditor) as any)?.scene.key;
		randomizePrologueChoice();
		state.flags.add("FLAG_PRO_Q01_COMPLETED");
		clearStoryUi();

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
			game.value!.scene.stop("Scene01");
			ambience.unlock();
			ambience.startRoom();
			enterScene("PrologueScene02", "PROLOGUE_SC02");
			return;
		}

		for (const flag of ["FLAG_PRO02_AUDIO_REVIEWED", "FLAG_PRO02_QUESTION_WRITTEN", "PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"])
			state.flags.add(flag);
		state.audioReviewed = true;
		state.questionWritten = true;
		state.playerLocked = true;
		state.mode = "transition";
		finishPrologue();
	}

	/* ===== 设置 ===== */

	function applySettings(s: ReturnType<typeof getSettings>): void {
		bgm.volume = s.bgmVolume;
		game.value!.sound.volume = s.sfxVolume;
		ambience.setVolume(s.sfxVolume);
	}

	/* ===== 存档 & 场景切换 ===== */

	function startFromSave(save: RunSave): void {
		SaveManager.applyToState(save);
		game.value!.scene.stop("TitleScene");
		if (
			save.sceneId === "PROLOGUE_SC01" ||
			save.sceneId === "PROLOGUE_SC02"
		)
			bgm.play().catch(() => {});
		game.value!.scene.start(SCENE_KEY[save.sceneId]);
	}

	function enterScene(key: string, sceneId: SceneId): void {
		SaveManager.autosave(sceneId);
		game.value!.scene.start(key);
	}

	function rollbackToCheckpoint(): boolean {
		const save = SaveManager.loadFixed();
		if (!save) return false;
		stopPrologueBgm();
		SaveManager.applyToState(save);
		game.value!.scene.stop("Scene01");
		game.value!.scene.stop("PrologueScene02");
		game.value!.scene.stop("Ch01Sc01Scene");
		game.value!.scene.start("Ch01Sc01Scene");
		return true;
	}

	/* ===== 序章结算 ===== */

	function finishPrologue(): void {
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
		stopPrologueBgm();
		window.dispatchEvent(
			new CustomEvent("prologue:scene-exit", {
				detail: structuredClone(save),
			}),
		);
		showEndPanel(save);
	}

	function stopPrologueBgm(): void {
		try {
			bgm.pause();
			bgm.currentTime = 0;
		} catch {
			/* ignore */
		}
	}

	return {
		game,
		transitionAudio,
		bgm,
		init,
		startFromSave,
		enterScene,
		finishPrologue,
	};
});
