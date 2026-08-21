import { shallowRef } from "vue";
import { defineStore } from "pinia";
import Phaser from "phaser";
import type { GameSettings, RunSave, SaveData, SceneId } from "@/types/common";
import { TransitionAudioController } from "@/common/transitionAudio";
import { CHOICES, SCENE_EXIT } from "@/scenes/Scene01/content";
import { TitleScene } from "@/scenes/Title/TitleScene";
import { Scene01 } from "@/scenes/Scene01/Scene01";
import { PrologueScene02 } from "@/scenes/Scene02/PrologueScene02";
import { Ch01Sc01Scene } from "@/scenes/Scene03/Ch01Sc01Scene";
import { Ch01Sc02Scene } from "@/scenes/Scene03/Ch01Sc02Scene";
import { Ch01Sc03Scene } from "@/scenes/Scene03/Ch01Sc03Scene";
import { Ch02TransitionScene } from "@/scenes/Scene04/Ch02TransitionScene";
import { Ch02AncestralHallScene } from "@/scenes/Scene04/Ch02AncestralHallScene";
import { Ch02FlashbackScene } from "@/scenes/Scene04/Ch02FlashbackScene";
import { Ch02DepartureScene } from "@/scenes/Scene04/Ch02DepartureScene";
import { Ch03OpeningScene } from "@/scenes/Scene05/Ch03OpeningScene";
import { Ch03Flashback3Scene } from "@/scenes/Scene05/Ch03Flashback3Scene";
import { Ch03TuCompoundScene } from "@/scenes/Scene05/Ch03TuCompoundScene";
import { Ch03GateBreachCombatScene } from "@/scenes/Scene05/Ch03GateBreachCombatScene";
import { Ch03HistoricalNodeScene } from "@/scenes/Scene05/Ch03HistoricalNodeScene";
import { Ch03ChapterEndScene } from "@/scenes/Scene05/Ch03ChapterEndScene";
import { Ch04OpeningScene } from "@/scenes/Scene06/Ch04OpeningScene";
import { Ch04WangyeTempleScene } from "@/scenes/Scene06/Ch04WangyeTempleScene";
import { Ch04ConsciousnessScene } from "@/scenes/Scene06/Ch04ConsciousnessScene";
import { Ch04ModernReturnScene } from "@/scenes/Scene06/Ch04ModernReturnScene";
import { Ch04FinalChoiceScene } from "@/scenes/Scene06/Ch04FinalChoiceScene";
import { Ch04AnswerWrittenScene } from "@/scenes/Scene06/Ch04AnswerWrittenScene";
import { Ch04Scene5VideoScene } from "@/scenes/Scene06/Ch04Scene5VideoScene";
import { Ch04PortraitScene } from "@/scenes/Scene06/Ch04PortraitScene";
import {
	isCh04TempleShot,
	type Ch04TempleShot,
} from "@/scenes/Scene06/ch04WangyeTempleMap";
import { CH03_COMBAT_FLAGS } from "@/scenes/Scene05/ch03GateBreachCombat.content";
import {
	isTuCompoundState,
	type TuCompoundState,
} from "@/scenes/Scene05/tuCompoundMap";
import { isAncestralHallVariant } from "@/scenes/Scene04/ancestralHallMap";
import { CH02_FLASHBACK_CHOICES, CH02_FLASHBACK_FLAGS } from "@/scenes/Scene04/ch02Flashback.content";
import { CH02_DISCIPLINE_FLAGS, CH02_GROUP_CHOICES } from "@/scenes/Scene04/ch02Discipline.content";
import { CH02_MATERIALS_CHOICES, CH02_MATERIALS_FLAGS } from "@/scenes/Scene04/ch02Materials.content";
import {
	CHOICES as CH01_SC01_CHOICES,
} from "@/scenes/Scene03/ch01Sc01.content";
import { FLAGS as CH01_SC01_FLAGS } from "@/scenes/Scene03/ch01Sc01.flags";
import { useGameStateStore } from "@/stores/modules/gameState";
import { useHudStore } from "@/stores/modules/hud";
import { applyFormalChoice, getChapter3Access, PROFILE_AXES } from "@/common/actionProfileSystem";
import { assetPath } from "@/common/paths";
import {
	showEndPanel,
	hideIntro,
	hideEndPanel,
	hideTask,
	hideItem,
	hideDialogue,
	hideChoices,
	hideResult,
	hidePortraitResult,
	showPrompt,
	hideCombatHud,
	clearFade,
	hideInfoPanel,
} from "@/common/ui";
import { useGameSaveStore, SCENE_KEY } from "@/stores";
import { ambience } from "@/common/ambience";
import { applyManagedBgmVolume } from "@/common/audioBus";

const CHAPTER3_FAILURE_FLAGS = new Set([
	"CH03_RISK_PRECHECK_FAILURE",
	"CH03_ACTION_REPLACEMENT",
	"CH03_GATE_ATTACK_REPLACEMENT",
	"CH03_AFTER_BATTLE_REPLACEMENT",
	"CH03_CLEARING_REPLACEMENT",
]);

function isChapter3FailureSave(save: RunSave): boolean {
	return save.sceneId === "CH03_COMPOUND" && save.tags.some((tag) => CHAPTER3_FAILURE_FLAGS.has(tag));
}

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
		scene: [
			TitleScene,
			Scene01,
			PrologueScene02,
			Ch01Sc01Scene,
			Ch01Sc02Scene,
			Ch01Sc03Scene,
			Ch02TransitionScene,
			Ch02AncestralHallScene,
			Ch02FlashbackScene,
			Ch02DepartureScene,
			Ch03OpeningScene,
			Ch03Flashback3Scene,
			Ch03TuCompoundScene,
			Ch03GateBreachCombatScene,
			Ch03HistoricalNodeScene,
			Ch03ChapterEndScene,
			Ch04OpeningScene,
			Ch04WangyeTempleScene,
			Ch04ConsciousnessScene,
			Ch04ModernReturnScene,
			Ch04FinalChoiceScene,
			Ch04AnswerWrittenScene,
			Ch04Scene5VideoScene,
			Ch04PortraitScene,
		],
	});
}

const MANAGED_SCENE_KEYS = [
	"TitleScene",
	"Scene01",
	"PrologueScene02",
	"Ch01Sc01Scene",
	"Ch01Sc02Scene",
	"Ch01Sc03Scene",
	"Ch02TransitionScene",
	"Ch02AncestralHallScene",
	"Ch02FlashbackScene",
	"Ch02DepartureScene",
	"Ch03OpeningScene",
	"Ch03Flashback3Scene",
	"Ch03TuCompoundScene",
	"Ch03GateBreachCombatScene",
	"Ch03HistoricalNodeScene",
	"Ch03ChapterEndScene",
	"Ch04OpeningScene",
	"Ch04WangyeTempleScene",
	"Ch04ConsciousnessScene",
	"Ch04ModernReturnScene",
	"Ch04FinalChoiceScene",
	"Ch04AnswerWrittenScene",
	"Ch04Scene5VideoScene",
	"Ch04PortraitScene",
] as const;

function stopManagedScenes(game: Phaser.Game): void {
	for (const sceneKey of MANAGED_SCENE_KEYS) game.scene.stop(sceneKey);
}

export const useDirectorStore = defineStore("director", () => {
	const gameState = useGameStateStore();
	const gameSave = useGameSaveStore();
	const game = shallowRef<Phaser.Game | null>(null);
	const transitionAudio = new TransitionAudioController();
	const bgm = new Audio(assetPath("/assets/audio/prologue_bgm.wav"));
	bgm.loop = true;

	/* ===== 初始化 ===== */

	function init(parent: HTMLElement) {
		if (game.value) return;
		const g = createGame(parent);
		game.value = g;
		(window as any).game = g;
		g.events.on("ch03:risk-failure", () => {
			// 第三章本场只触发既有固定回退点，不在地图层复制一套存档逻辑。
			rollbackToCheckpoint();
		});
		if (import.meta.env.DEV) (window as any).gameDirector = {
			game: g,
			bgm,
			finishPrologue,
			enterScene,
			enterChapter2: startChapter2Opening,
			enterChapter2Map: openChapter2Map,
			enterChapter2Flashback: startChapter2Flashback,
			enterChapter2Discipline: () => openChapter2Map("mainhall-close", "discipline"),
			enterChapter2Materials: () => openChapter2Map("sidewall", "materials"),
			enterChapter3Transition: startChapter2ToChapter3Transition,
			enterChapter3Opening: startChapter3Opening,
			enterChapter3Flashback3: startChapter3Flashback3,
			enterChapter3Map: openChapter3Map,
			enterChapter3Combat: startChapter3Combat,
			enterChapter3HistoricalNode: startChapter3HistoricalNode,
			enterChapter4Opening: startChapter4Opening,
			enterChapter4Temple: openChapter4Temple,
			enterChapter4Consciousness: startChapter4Consciousness,
			enterChapter4ModernReturn: startChapter4ModernReturn,
			enterChapter4FinalChoice: startChapter4FinalChoice,
			enterChapter4AnswerWritten: startChapter4AnswerWritten,
			enterChapter4Scene5Video: startChapter4Scene5Video,
			enterChapter4Portrait: startChapter4Portrait,
			replayChapter,
			getChapter3Access: readChapter3Access,
		};
		const query = new URLSearchParams(window.location.search);
		const requestedMap = query.get("ch2map");
		const requestedChapter3State = query.get("ch3state");
		const requestedChapter4Shot = query.get("ch4shot");
		const requestedChapter4Scene = query.get("ch4scene");
		if (isAncestralHallVariant(requestedMap)) {
			window.setTimeout(() => openChapter2Map(requestedMap), 0);
		} else if (isTuCompoundState(requestedChapter3State)) {
			window.setTimeout(() => openChapter3Map(requestedChapter3State), 0);
		} else if (query.get("chapter") === "2") {
			// 仅第二章试玩入口：从第二章入口视频开始，不要求先完成第一章。
			window.setTimeout(() => startChapter2Opening(), 0);
		} else if (query.get("chapter") === "3" && query.get("combat") === "1") {
			// 战斗切片试玩入口：直接进入大门撞开后的独立战斗场景。
			window.setTimeout(() => startChapter3Combat(), 0);
		} else if (query.get("chapter") === "3") {
			// 第三章试玩入口：先播放章节衔接视频，再进入杜家大院外围底座。
			window.setTimeout(() => startChapter3Opening(), 0);
		} else if (query.get("chapter") === "4" && requestedChapter4Scene === "consciousness") {
			// 第四章意识交错验收入口：固定镜头、跳过前置视频和场景一。
			window.setTimeout(() => startChapter4Consciousness("SHOT_WIDE"), 0);
		} else if (query.get("chapter") === "4" && requestedChapter4Scene === "modern-return") {
			// 第四章场景三验收入口：复用序章实践驻地，跳过王爷庙前置段落。
			window.setTimeout(() => startChapter4ModernReturn(), 0);
		} else if (query.get("chapter") === "4" && requestedChapter4Scene === "final-choice") {
			// 第四章最终选择验收入口：直接进入实践笔记补写流程。
			window.setTimeout(() => startChapter4FinalChoice(), 0);
		} else if (query.get("chapter") === "4" && requestedChapter4Scene === "answer-written") {
			// 第四章场景五验收入口：跳过最终选择，直接查看答案写下之后。
			window.setTimeout(() => startChapter4AnswerWritten(), 0);
		} else if (query.get("chapter") === "4" && requestedChapter4Scene === "scene5-video") {
			// 第四章场景五转场视频验收入口。
			window.setTimeout(() => startChapter4Scene5Video(), 0);
		} else if (query.get("chapter") === "4" && requestedChapter4Scene === "portrait") {
			// 第四章最终画像验收入口：直接按当前画像状态结算。
			window.setTimeout(() => startChapter4Portrait(), 0);
		} else if (query.get("chapter") === "4" && isCh04TempleShot(requestedChapter4Shot)) {
			// 第四章地图镜头验收入口：绕过视频，直接查看指定镜头。
			window.setTimeout(() => openChapter4Temple(requestedChapter4Shot), 0);
		} else if (query.get("chapter") === "4") {
			// 第四章试玩入口：先播放“戴家场王爷庙”开场视频。
			window.setTimeout(() => startChapter4Opening(), 0);
		}

		// 闪回流程路由（SC01 ↔ SC02 / SC01 ↔ SC03）
		setupFlashbackFlow(g);
		g.events.on("ch02:arrival-enter", () => {
			g.scene.stop("Ch02TransitionScene");
			openChapter2Map("main", "arrival");
		});
		g.events.on("ch02:deployment-enter", () => {
			openChapter2Map("mainhall-close", "deployment");
		});
		g.events.on("ch02:flashback-enter", () => {
			startChapter2Flashback();
		});
		g.events.on("ch02:discipline-enter", () => {
			openChapter2Map("mainhall-close", "discipline");
		});
		g.events.on("ch02:materials-enter", () => {
			openChapter2Map("sidewall", "materials");
		});
		g.events.on("ch02:chapter3-transition", () => {
			g.scene.stop("Ch02AncestralHallScene");
			clearStoryUi();
			g.scene.start("Ch02DepartureScene");
		});
		g.events.on("ch02:departure-complete", () => {
			g.scene.stop("Ch02DepartureScene");
			finishChapter2();
		});
		g.events.on("ch03:arrival-enter", () => {
			g.scene.stop("Ch03OpeningScene");
			openChapter3Map("STATE_WAITING");
		});
		g.events.on("ch03:flashback3-enter", () => {
			g.scene.stop("Ch03TuCompoundScene");
			startChapter3Flashback3();
		});
		g.events.on("ch03:flashback3-complete", () => {
			g.scene.stop("Ch03Flashback3Scene");
			openChapter3Map("STATE_WAITING");
		});
		g.events.on("ch03:gate-breach-combat-enter", () => {
			startChapter3Combat();
		});
		g.events.on("ch03:historical-node-enter", () => {
			startChapter3HistoricalNode();
		});
		g.events.on("ch03:historical-node-complete", () => {
			// Complete is emitted from the video scene's input callback. Defer the
			// scene-manager mutation by one tick so Phaser can finish that callback
			// before stopping the video and starting the after-battle map.
			window.setTimeout(() => openChapter3Map("STATE_AFTER_BATTLE"), 80);
		});
		g.events.on("ch03:chapter-end-enter", () => {
			g.scene.stop("Ch03TuCompoundScene");
			startChapter3End();
		});
		g.events.on("ch04:opening-complete", () => {
			// 与视频场景解耦，避免在视频 complete 回调内直接切换场景。
			window.setTimeout(() => openChapter4Temple("SHOT_WIDE"), 80);
		});
		g.events.on("ch04:wangye-temple-complete", () => {
			// 群众声音达到高点后直接进入意识交错；切换延后一拍，避免在
			// NarrativeStore 的完成回调中同步修改 Phaser 场景列表。
			window.setTimeout(() => startChapter4Consciousness("SHOT_WIDE"), 80);
		});
		g.events.on("ch04:consciousness-complete", () => {
			// 意识交错结束后以短黑幕进入现代实践驻地。
			window.setTimeout(() => startChapter4ModernReturn(), 80);
		});
		g.events.on("ch04:modern-return-complete", () => {
			window.setTimeout(() => startChapter4FinalChoice(), 80);
		});
		g.events.on("ch04:final-choice-complete", () => {
			// 最终选择完成后先停留在“答案写下之后”，让玩家看到选择从纸面
			// 回到自身的收束，再进入专用转场视频和最终画像结算。
			window.setTimeout(() => startChapter4AnswerWritten(), 80);
		});
		g.events.on("ch04:answer-written-complete", () => {
			window.setTimeout(() => startChapter4Scene5Video(), 80);
		});
		g.events.on("ch04:scene5-video-complete", () => {
			window.setTimeout(() => startChapter4Portrait(), 80);
		});

		// 结算 → 第一章
		window.addEventListener("prologue:scene-exit", ((event: CustomEvent<SaveData>) => {
			const save = event.detail;
			if (save?.profile) {
				for (const axis of PROFILE_AXES)
					gameState.state.profile[axis] = save.profile[axis] ?? 0;
			}
			if (save?.tags) {
				for (const tag of save.tags) gameState.state.flags.add(tag);
			}
			if (save?.fixed) {
				for (const tag of save.fixed) gameState.state.flags.add(tag);
			}
			hideIntro();
			g.scene.stop("Scene01");
			g.scene.stop("PrologueScene02");
			gameSave.captureChapterEntry(1);
			enterScene("Ch01Sc01Scene", "CH01_SC01");
		}) as EventListener);

		gameSave.onSettingsChange((s) => applySettings(s));
		applySettings(gameSave.getSettings());

		window.addEventListener("honghu:dev-next-chapter", ((event: CustomEvent<{ sceneKey?: string }>) => {
			handleDevNextChapter(event.detail?.sceneKey);
		}) as EventListener);

		// 测试/调试钩子：失败回退链路
		if (import.meta.env.DEV)
			(window as any).rollbackToCheckpoint = () => rollbackToCheckpoint();
	}

	/* ===== 闪回流程路由 ===== */

	// 闪回一·状纸：SC01 墨迹触发 → SC02；SC02 完成 → 返回 SC01（均走 enterScene 自动存档）
	// 返回陈家链：SC01 暗号选择后 → 外景院墙；联络通知完成 → 回 SC01 告别
	function setupFlashbackFlow(g: Phaser.Game): void {
		g.events.on("ch01:sc02-enter", () => {
			// 离开 tween 回调后先完整关闭旧场景，避免两个区域编辑器短暂共存。
			window.setTimeout(() => {
				g.scene.stop("Ch01Sc01Scene");
				enterScene("Ch01Sc02Scene", "CH01_SC02");
			}, 0);
		});
		g.events.on("ch01:sc02-complete", () => {
			g.scene.stop("Ch01Sc02Scene");
			enterScene("Ch01Sc01Scene", "CH01_SC01");
		});
		g.events.on("ch01:sc03-enter", () => {
			window.setTimeout(() => {
				g.scene.stop("Ch01Sc01Scene");
				enterScene("Ch01Sc03Scene", "CH01_SC03");
			}, 0);
		});
		g.events.on("ch01:sc03-complete", () => {
			g.scene.stop("Ch01Sc03Scene");
			enterScene("Ch01Sc01Scene", "CH01_SC01");
		});
	}

	/* ===== 开发工具 ===== */

	function randomizePrologueChoice(): void {
		const choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
		for (const axis of PROFILE_AXES) gameState.state.profile[axis] = 0;
		gameState.state.risk = { identity: 0, execution: 0, coordination: 0 };
		for (const candidate of CHOICES) gameState.state.flags.delete(candidate.flag);
		applyFormalChoice(gameState.state, {
			choiceId: choice.id,
			chapter: 0,
			isFormalChoice: true,
			portraitChange: choice.profileDelta,
			riskChange: choice.riskDelta,
			flag: choice.flag,
			echoSummary: choice.echo_summary,
			failureCheck: false,
		});
	}

	function completeCh01Sc01ForDev(): void {
		const choice = CH01_SC01_CHOICES[Math.floor(Math.random() * CH01_SC01_CHOICES.length)];
		for (const candidate of CH01_SC01_CHOICES) gameState.state.flags.delete(candidate.flag);
		applyFormalChoice(gameState.state, {
			choiceId: choice.id,
			chapter: 1,
			isFormalChoice: true,
			portraitChange: choice.profileDelta,
			riskChange: choice.riskDelta,
			flag: choice.flag,
			tags: choice.tags,
			echoSummary: choice.echo_summary,
			failureCheck: false,
		});
		for (const flag of [
			CH01_SC01_FLAGS.VIDEO_SEEN,
			CH01_SC01_FLAGS.OBS_BASIN,
			CH01_SC01_FLAGS.OBS_DESK,
			CH01_SC01_FLAGS.OBS_DOOR,
		])
			gameState.state.flags.add(flag);
		gameState.state.flags.add(choice.flag);
		gameSave.autosave("CH01_SC01");
	}

	function clearStoryUi(): void {
		useHudStore().paused = false;
		gameState.state.paused = false;
		hideIntro();
		hideEndPanel();
		hideTask();
		hideItem();
		hideDialogue();
		hideChoices();
		hideResult();
		hidePortraitResult();
		hideInfoPanel();
		hideCombatHud();
		showPrompt("");
		clearFade();
	}

	function openChapter2Map(variant = "main", entry: "preview" | "arrival" | "deployment" | "discipline" | "materials" = "preview"): void {
		const g = game.value;
		if (!g) return;
		const selectedVariant = isAncestralHallVariant(variant) ? variant : "main";
		gameSave.autosave("CH02_HALL");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
		]) {
			if (sceneKey !== "Ch02AncestralHallScene") g.scene.stop(sceneKey);
		}
		g.scene.start("Ch02AncestralHallScene", { variant: selectedVariant, entry });
	}

	function startChapter2Opening(captureEntry = true): void {
		const g = game.value;
		if (!g) return;
		if (captureEntry) gameSave.captureChapterEntry(2);
		gameSave.autosave("CH02_TRANSITION");
		clearStoryUi();
		stopManagedAudio();
		(window as any).hideTitleCard?.();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
		]) g.scene.stop(sceneKey);
		transitionAudio.prime();
		g.scene.start("Ch02TransitionScene");
	}

	function startChapter2Flashback(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH02_FLASHBACK");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02DepartureScene",
		]) g.scene.stop(sceneKey);
		g.scene.start("Ch02FlashbackScene");
	}

	function startChapter2ToChapter3Transition(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH02_DEPARTURE");
		clearStoryUi();
		stopManagedAudio();
		g.scene.stop("Ch02AncestralHallScene");
		g.scene.start("Ch02DepartureScene");
	}

	function startChapter3Opening(captureEntry = true): void {
		const g = game.value;
		if (!g) return;
		if (captureEntry) gameSave.captureChapterEntry(3);
		gameSave.autosave("CH03_OPENING");
		clearStoryUi();
		stopManagedAudio();
		(window as any).hideTitleCard?.();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03Flashback3Scene",
			"Ch03TuCompoundScene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		transitionAudio.prime();
		g.scene.start("Ch03OpeningScene");
	}

	function startChapter3Flashback3(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH03_FLASHBACK3");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03TuCompoundScene",
			"Ch03Flashback3Scene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		g.scene.start("Ch03Flashback3Scene");
	}

	function openChapter3Map(state: TuCompoundState = "STATE_WAITING"): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH03_COMPOUND");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03Flashback3Scene",
			"Ch03TuCompoundScene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		g.scene.start("Ch03TuCompoundScene", { state });
	}

	function startChapter3Combat(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH03_COMPOUND");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03Flashback3Scene",
			"Ch03TuCompoundScene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		g.scene.start("Ch03GateBreachCombatScene");
	}

	function startChapter3HistoricalNode(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH03_COMPOUND");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03Flashback3Scene",
			"Ch03TuCompoundScene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		g.scene.start("Ch03HistoricalNodeScene");
	}

	function startChapter3End(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH03_END");
		clearStoryUi();
		stopManagedAudio();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03Flashback3Scene",
			"Ch03TuCompoundScene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		g.scene.start("Ch03ChapterEndScene");
	}

	function startChapter4Opening(captureEntry = true): void {
		const g = game.value;
		if (!g) return;
		if (captureEntry) gameSave.captureChapterEntry(4);
		gameSave.autosave("CH04_OPENING");
		clearStoryUi();
		stopManagedAudio();
		(window as any).hideTitleCard?.();
		stopManagedScenes(g);
		// 视频自身带声音；不启动章节 BGM，避免与视频音轨混音。
		g.scene.start("Ch04OpeningScene");
	}

	function openChapter4Temple(shot: Ch04TempleShot = "SHOT_WIDE"): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_WANGYE_TEMPLE");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04WangyeTempleScene", { shot });
	}

	function startChapter4Consciousness(shot: Ch04TempleShot = "SHOT_WIDE"): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_CONSCIOUSNESS");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04ConsciousnessScene", { shot });
	}

	function startChapter4ModernReturn(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_MODERN_RETURN");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04ModernReturnScene");
	}

	function startChapter4FinalChoice(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_FINAL_CHOICE");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04FinalChoiceScene");
	}

	function startChapter4AnswerWritten(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_ANSWER_WRITTEN");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04AnswerWrittenScene");
	}

	function startChapter4Scene5Video(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_SCENE5_VIDEO");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04Scene5VideoScene");
	}

	function startChapter4Portrait(): void {
		const g = game.value;
		if (!g) return;
		gameSave.autosave("CH04_PORTRAIT_RESULT");
		clearStoryUi();
		stopManagedAudio();
		stopManagedScenes(g);
		g.scene.start("Ch04PortraitScene");
	}

	function finishChapter2(): void {
		const runSave = gameSave.autosave("CH02_DEPARTURE");
		const chapter3Access = readChapter3Access();
		const save = {
			checkpoint: "CH02_END_PRE_OPERATION",
			checkpointLabel: "第二章·陈家祠堂行动前的集结",
			profile: { ...gameState.state.profile },
			choiceTag: gameState.state.choice?.flag ?? null,
			fixed: [...gameState.state.flags],
			risk: { ...gameState.state.risk },
		};
		gameState.state.mode = "end";
		gameState.state.playerLocked = true;
		try {
			window.localStorage.setItem(
				"redcode.chapter2.save",
				JSON.stringify({ chapter: 2, runSave, chapter3Access, ...save, timestamp: Date.now() }),
			);
		} catch {
			/* storage unavailable */
		}
		clearStoryUi();
		showEndPanel(save, {
			title: "第二章·陈家祠堂行动前的集结｜完成",
			hint: "第三章·抵达杜家大院外围",
			buttonLabel: "进入第三章",
			next: "chapter3",
		});
	}

	// 开发跳转：进入第二章链路前补齐序章与第一章的随机画像和必要剧情旗标，
	// 保证章末结算的 chapter3Access 与风险判定有完整输入。
	function prepareChapter2EntryForDev(): void {
		if (!CHOICES.some((choice) => gameState.state.flags.has(choice.flag))) randomizePrologueChoice();
		gameState.state.flags.add("FLAG_PRO_Q01_COMPLETED");
		for (const flag of ["FLAG_PRO02_AUDIO_REVIEWED", "FLAG_PRO02_QUESTION_WRITTEN", "PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"])
			gameState.state.flags.add(flag);
		gameState.state.audioReviewed = true;
		gameState.state.questionWritten = true;
		if (!CH01_SC01_CHOICES.some((choice) => gameState.state.flags.has(choice.flag))) completeCh01Sc01ForDev();
		gameState.state.flags.add("CH01_YARD_DONE");
	}

	function completeCh02FlashbackForDev(): void {
		if (!CH02_FLASHBACK_CHOICES.some((choice) => gameState.state.flags.has(choice.flag))) {
			const choice = CH02_FLASHBACK_CHOICES[Math.floor(Math.random() * CH02_FLASHBACK_CHOICES.length)];
			applyFormalChoice(gameState.state, {
				choiceId: `CH02_FLASHBACK_${choice.id}`,
				chapter: 2,
				isFormalChoice: true,
				portraitChange: choice.profileDelta,
				riskChange: choice.riskDelta,
				flag: choice.flag,
				echoSummary: choice.label,
				failureCheck: false,
			});
		}
		gameState.state.flags.add(CH02_FLASHBACK_FLAGS.started);
		gameState.state.flags.add(CH02_FLASHBACK_FLAGS.complete);
	}

	function completeCh02GroupChoiceForDev(): void {
		if (!CH02_GROUP_CHOICES.some((choice) => gameState.state.flags.has(choice.flag))) {
			const choice = CH02_GROUP_CHOICES[Math.floor(Math.random() * CH02_GROUP_CHOICES.length)];
			applyFormalChoice(gameState.state, {
				choiceId: `CH02_GROUP_${choice.id}`,
				chapter: 2,
				isFormalChoice: true,
				portraitChange: choice.profileDelta,
				riskChange: choice.riskDelta,
				flag: choice.flag,
				echoSummary: choice.label,
				failureCheck: false,
			});
		}
		gameState.state.flags.add(CH02_DISCIPLINE_FLAGS.disciplineComplete);
	}

	function completeCh02MaterialsChoiceForDev(): void {
		if (!CH02_MATERIALS_CHOICES.some((choice) => gameState.state.flags.has(choice.flag))) {
			const choice = CH02_MATERIALS_CHOICES[Math.floor(Math.random() * CH02_MATERIALS_CHOICES.length)];
			applyFormalChoice(gameState.state, {
				choiceId: `CH02_MATERIALS_${choice.id}`,
				chapter: 2,
				isFormalChoice: true,
				portraitChange: choice.profileDelta,
				riskChange: choice.riskDelta,
				flag: choice.flag,
				tags: choice.id === "D" ? [CH02_MATERIALS_FLAGS.contactCaution] : [],
				echoSummary: choice.label,
				failureCheck: false,
			});
		}
		gameState.state.flags.add(CH02_MATERIALS_FLAGS.materialsComplete);
	}

	function handleDevNextChapter(sceneKey?: string): void {
		const activeKey = sceneKey ?? ([...game.value!.scene.getScenes(true)].reverse().find((scene: any) => scene.zoneEditor) as any)?.scene.key;
		if (activeKey === "Ch01Sc01Scene" || activeKey === "Ch01Sc02Scene") {
			clearStoryUi();
			completeCh01Sc01ForDev();
			gameState.state.mode = "transition";
			gameState.state.playerLocked = true;
			game.value!.scene.stop("Ch01Sc02Scene");
			game.value!.events.emit("ch01:sc03-enter");
			return;
		}

		if (activeKey === "Ch01Sc03Scene") {
			// 一二章衔接：院墙联络完成后不再折返陈家，补齐第一章状态直接进入第二章开场。
			prepareChapter2EntryForDev();
			gameState.state.mode = "transition";
			gameState.state.playerLocked = true;
			startChapter2Opening();
			return;
		}

		// 第二章各幕按剧情顺序推进一幕；章末出发视频后落到第二章结算（第三章待接入）。
		if (activeKey === "Ch02TransitionScene") {
			prepareChapter2EntryForDev();
			openChapter2Map("main", "arrival");
			return;
		}
		if (activeKey === "Ch02AncestralHallScene") {
			prepareChapter2EntryForDev();
			const entry = (game.value!.scene.getScene("Ch02AncestralHallScene") as any)?.entry ?? "preview";
			if (entry === "deployment") startChapter2Flashback();
			else if (entry === "discipline") {
				completeCh02FlashbackForDev();
				completeCh02GroupChoiceForDev();
				openChapter2Map("sidewall", "materials");
			} else if (entry === "materials") {
				completeCh02FlashbackForDev();
				completeCh02GroupChoiceForDev();
				completeCh02MaterialsChoiceForDev();
				startChapter2ToChapter3Transition();
			}
			else openChapter2Map("mainhall-close", "deployment");
			return;
		}
		if (activeKey === "Ch02FlashbackScene") {
			prepareChapter2EntryForDev();
			completeCh02FlashbackForDev();
			openChapter2Map("mainhall-close", "discipline");
			return;
		}
		if (activeKey === "Ch02DepartureScene") {
			prepareChapter2EntryForDev();
			completeCh02FlashbackForDev();
			completeCh02GroupChoiceForDev();
			completeCh02MaterialsChoiceForDev();
			game.value!.scene.stop("Ch02DepartureScene");
			finishChapter2();
			return;
		}

		randomizePrologueChoice();
		gameState.state.flags.add("FLAG_PRO_Q01_COMPLETED");
		clearStoryUi();

		if (activeKey === "Scene01") {
			for (const flag of ["FLAG_PRO02_AUDIO_REVIEWED", "FLAG_PRO02_QUESTION_WRITTEN", "PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"])
				gameState.state.flags.delete(flag);
			gameState.state.mode = "intro";
			gameState.state.playerLocked = true;
			gameState.state.taskOpen = false;
			gameState.state.paused = false;
			gameState.state.narrativeQueue = [];
			gameState.state.narrativeIndex = 0;
			gameState.state.inNarrative = false;
			game.value!.scene.stop("Scene01");
			ambience.unlock();
			ambience.startRoom();
			enterScene("PrologueScene02", "PROLOGUE_SC02");
			return;
		}

		for (const flag of ["FLAG_PRO02_AUDIO_REVIEWED", "FLAG_PRO02_QUESTION_WRITTEN", "PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"])
			gameState.state.flags.add(flag);
		gameState.state.audioReviewed = true;
		gameState.state.questionWritten = true;
		gameState.state.playerLocked = true;
		gameState.state.mode = "transition";
		finishPrologue();
	}

	/* ===== 设置 ===== */

	function applySettings(s: GameSettings): void {
		bgm.volume = s.bgmVolume;
		// Phaser 轨道只承载场景 BGM；战斗/环境音效走独立 Web Audio 总线。
		if (game.value) {
			game.value.sound.volume = 1;
			applyManagedBgmVolume(game.value.sound, s.bgmVolume);
		}
		ambience.setVolume(s.sfxVolume);
	}

	/* ===== 存档 & 场景切换 ===== */

	function replayChapter(chapter: 1 | 2 | 3 | 4): void {
		const g = game.value;
		if (!g) return;
		gameSave.prepareChapterReplay(chapter);
		if (chapter === 2) {
			startChapter2Opening();
			return;
		}
		if (chapter === 3) {
			startChapter3Opening();
			return;
		}
		if (chapter === 4) {
			startChapter4Opening();
			return;
		}

		clearStoryUi();
		stopManagedAudio();
		(window as any).hideTitleCard?.();
		for (const sceneKey of [
			"TitleScene",
			"Scene01",
			"PrologueScene02",
			"Ch01Sc01Scene",
			"Ch01Sc02Scene",
			"Ch01Sc03Scene",
			"Ch02TransitionScene",
			"Ch02AncestralHallScene",
			"Ch02FlashbackScene",
			"Ch02DepartureScene",
			"Ch03OpeningScene",
			"Ch03Flashback3Scene",
			"Ch03TuCompoundScene",
			"Ch03GateBreachCombatScene",
			"Ch03HistoricalNodeScene",
			"Ch03ChapterEndScene",
		]) g.scene.stop(sceneKey);
		gameSave.autosave("CH01_SC01");
		g.scene.start("Ch01Sc01Scene");
	}

	function startFromSave(save: RunSave): void {
		if (isChapter3FailureSave(save)) {
			// 失败自动存档只作为崩溃/刷新保护；重新加载时仍必须回到固定点，
			// 不能停留在第三章失败任务上绕过回退规则。
			gameSave.applyToState(save);
			game.value!.scene.stop("TitleScene");
			if (rollbackToCheckpoint()) return;
		}
		gameSave.applyToState(save);
		game.value!.scene.stop("TitleScene");
		if (save.sceneId === "CH02_TRANSITION") return startChapter2Opening(false);
		if (save.sceneId === "CH02_HALL") return openChapter2Map("main", "arrival");
		if (save.sceneId === "CH02_FLASHBACK") return startChapter2Flashback();
		if (save.sceneId === "CH02_DEPARTURE") return startChapter2ToChapter3Transition();
		if (save.sceneId === "CH03_OPENING") return startChapter3Opening(false);
		if (save.sceneId === "CH03_FLASHBACK3") return startChapter3Flashback3();
		if (save.sceneId === "CH03_END") return startChapter3End();
		if (save.sceneId === "CH04_OPENING") return startChapter4Opening(false);
		if (save.sceneId === "CH04_WANGYE_TEMPLE") {
			return gameState.state.flags.has("CH04_SCENE1_COMPLETE")
				? startChapter4Consciousness("SHOT_WIDE")
				: openChapter4Temple("SHOT_WIDE");
		}
		if (save.sceneId === "CH04_CONSCIOUSNESS") return startChapter4Consciousness("SHOT_WIDE");
		if (save.sceneId === "CH04_MODERN_RETURN") {
			return gameState.state.flags.has("CH04_SCENE3_COMPLETE")
				? startChapter4FinalChoice()
				: startChapter4ModernReturn();
		}
		if (save.sceneId === "CH04_FINAL_CHOICE") {
			return gameState.state.flags.has("CH04_FINAL_CHOICE_COMPLETE")
				? startChapter4AnswerWritten()
				: startChapter4FinalChoice();
		}
		if (save.sceneId === "CH04_ANSWER_WRITTEN") {
			return gameState.state.flags.has("CH04_SCENE5_COMPLETE")
				? startChapter4Scene5Video()
				: startChapter4AnswerWritten();
		}
		if (save.sceneId === "CH04_SCENE5_VIDEO") {
			return gameState.state.flags.has("CH04_SCENE5_VIDEO_COMPLETE")
				? startChapter4Portrait()
				: startChapter4Scene5Video();
		}
		if (save.sceneId === "CH04_PORTRAIT_RESULT") return startChapter4Portrait();
		if (save.sceneId === "CH03_COMPOUND") {
			return openChapter3Map(
				gameState.state.flags.has(CH03_COMBAT_FLAGS.historicalNodeSeen) ? "STATE_AFTER_BATTLE" : "STATE_WAITING",
			);
		}
		if (
			save.sceneId === "PROLOGUE_SC01" ||
			save.sceneId === "PROLOGUE_SC02"
		)
			bgm.play().catch(() => {});
		game.value!.scene.start(SCENE_KEY[save.sceneId]);
	}

	function readChapter3Access() {
		const access = getChapter3Access(gameState.state.risk);
		gameState.state.chapter3Access = access;
		if (import.meta.env.DEV) (window as any).chapter3Access = access;
		return access;
	}

	function enterScene(key: string, sceneId: SceneId): void {
		gameSave.autosave(sceneId);
		game.value!.scene.start(key);
	}

	/** 章末结算后的标题路由；第二章入口由结算面板单独调用 startChapter2Opening。 */
	function goToTitle(): void {
		const g = game.value;
		if (!g) return;
		clearStoryUi();
		stopManagedAudio();
		ambience.stopRoom();
		stopPrologueBgm();
		(window as any).hideTitleCard?.();
		g.scene.stop("Ch01Sc01Scene");
		g.scene.stop("Ch01Sc02Scene");
		g.scene.stop("Ch01Sc03Scene");
		g.scene.stop("Ch02TransitionScene");
		g.scene.stop("Ch02AncestralHallScene");
		g.scene.stop("Ch02FlashbackScene");
		g.scene.stop("Ch02DepartureScene");
		g.scene.stop("Ch03OpeningScene");
		g.scene.stop("Ch03Flashback3Scene");
		g.scene.stop("Ch03TuCompoundScene");
		g.scene.stop("Ch03GateBreachCombatScene");
		g.scene.stop("Ch03HistoricalNodeScene");
		g.scene.stop("Ch03ChapterEndScene");
		g.scene.stop("Ch04OpeningScene");
		g.scene.stop("Ch04WangyeTempleScene");
		g.scene.stop("Ch04ConsciousnessScene");
		g.scene.stop("Ch04ModernReturnScene");
		g.scene.stop("Ch04FinalChoiceScene");
		g.scene.stop("Ch04AnswerWrittenScene");
		g.scene.stop("Ch04Scene5VideoScene");
		g.scene.stop("Ch04PortraitScene");
		g.scene.stop("PrologueScene02");
		g.scene.stop("Scene01");
		g.scene.start("TitleScene");
	}

	function rollbackToCheckpoint(): boolean {
		const save = gameSave.loadFixed();
		if (!save) return false;
		const retainedProfile = { ...gameState.state.profile };
		stopPrologueBgm();
		gameSave.applyToState(save);
		for (const axis of PROFILE_AXES)
			gameState.state.profile[axis] = retainedProfile[axis] ?? 0;
		game.value!.scene.stop("Scene01");
		game.value!.scene.stop("PrologueScene02");
		game.value!.scene.stop("Ch01Sc01Scene");
		game.value!.scene.stop("Ch03Flashback3Scene");
		game.value!.scene.stop("Ch03TuCompoundScene");
		game.value!.scene.stop("Ch03GateBreachCombatScene");
		game.value!.scene.stop("Ch03HistoricalNodeScene");
		game.value!.scene.stop("Ch03ChapterEndScene");
		gameSave.autosave("CH01_SC01");
		game.value!.scene.start("Ch01Sc01Scene");
		return true;
	}

	/* ===== 序章结算 ===== */

	function finishPrologue(): void {
		const save: SaveData = {
			checkpoint: SCENE_EXIT.nextSceneCanonical,
			checkpointLabel: "1927年，陈继南家中醒来",
			profile: gameState.state.profile,
			choice: gameState.state.choice?.id ?? null,
			choiceTag: gameState.state.choice?.flag ?? null,
			echo: gameState.state.choice?.echo_summary ?? null,
			tags: [...gameState.state.flags],
			fixed: ["PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"],
			risk: { identity: 0, execution: 0, coordination: 0 },
			exit: SCENE_EXIT,
		};
		try {
			window.localStorage.setItem(
				"redcode.prologue.flags",
				JSON.stringify([...gameState.state.flags]),
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

	function stopManagedAudio(): void {
		const g = game.value;
		if (!g) return;
		// Phaser 音频是全局 SoundManager；只停旧场景的管理音轨，视频自身的
		// HTMLMediaElement 音轨仍由各视频场景在销毁视频对象时结束。
		g.sound.stopAll();
		stopPrologueBgm();
		transitionAudio.stop();
		ambience.stopRoom();
		ambience.stopTape();
	}

	return {
		game,
		transitionAudio,
		bgm,
		init,
		startFromSave,
		replayChapter,
		enterScene,
		startChapter2Opening,
		startChapter3Opening,
		startChapter3Flashback3,
		startChapter3Combat,
		startChapter3End,
		startChapter4Opening,
		startChapter4Consciousness,
		startChapter4ModernReturn,
		startChapter4FinalChoice,
		startChapter4AnswerWritten,
		startChapter4Scene5Video,
		startChapter4Portrait,
		goToTitle,
		finishPrologue,
	};
});
