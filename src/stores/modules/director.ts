import { ref } from "vue";
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
import { CH03_COMBAT_FLAGS } from "@/scenes/Scene05/ch03GateBreachCombat.content";
import {
	isTuCompoundState,
	type TuCompoundState,
} from "@/scenes/Scene05/tuCompoundMap";
import { isAncestralHallVariant } from "@/scenes/Scene04/ancestralHallMap";
import {
	CHOICES as CH01_SC01_CHOICES,
} from "@/scenes/Scene03/ch01Sc01.content";
import { FLAGS as CH01_SC01_FLAGS } from "@/scenes/Scene03/ch01Sc01.flags";
import { useGameStateStore } from "@/stores/modules/gameState";
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
	showPrompt,
	hideCombatHud,
	clearFade,
	hideInfoPanel,
} from "@/common/ui";
import { useGameSaveStore, SCENE_KEY } from "@/stores";
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
		],
	});
}

export const useDirectorStore = defineStore("director", () => {
	const gameState = useGameStateStore();
	const gameSave = useGameSaveStore();
	const game = ref<Phaser.Game | null>(null);
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
		(window as any).gameDirector = {
			game: g,
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
			getChapter3Access: readChapter3Access,
		};
		const query = new URLSearchParams(window.location.search);
		const requestedMap = query.get("ch2map");
		const requestedChapter3State = query.get("ch3state");
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
			enterScene("Ch01Sc01Scene", "CH01_SC01");
		}) as EventListener);

		gameSave.onSettingsChange((s) => applySettings(s));
		applySettings(gameSave.getSettings());

		window.addEventListener("honghu:dev-next-chapter", ((event: CustomEvent<{ sceneKey?: string }>) => {
			handleDevNextChapter(event.detail?.sceneKey);
		}) as EventListener);

		// 测试/调试钩子：失败回退链路
		(window as any).rollbackToCheckpoint = () =>
			rollbackToCheckpoint();
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
		hideIntro();
		hideEndPanel();
		hideTask();
		hideItem();
		hideDialogue();
		hideChoices();
		hideResult();
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

	function startChapter2Opening(): void {
		const g = game.value;
		if (!g) return;
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

	function startChapter3Opening(): void {
		const g = game.value;
		if (!g) return;
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
			clearStoryUi();
			gameState.state.flags.add("CH01_YARD_DONE");
			gameState.state.mode = "transition";
			gameState.state.playerLocked = true;
			game.value!.events.emit("ch01:sc03-complete");
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
		game.value!.sound.volume = s.sfxVolume;
		ambience.setVolume(s.sfxVolume);
	}

	/* ===== 存档 & 场景切换 ===== */

	function startFromSave(save: RunSave): void {
		gameSave.applyToState(save);
		game.value!.scene.stop("TitleScene");
		if (save.sceneId === "CH02_TRANSITION") return startChapter2Opening();
		if (save.sceneId === "CH02_HALL") return openChapter2Map("main", "arrival");
		if (save.sceneId === "CH02_FLASHBACK") return startChapter2Flashback();
		if (save.sceneId === "CH02_DEPARTURE") return startChapter2ToChapter3Transition();
		if (save.sceneId === "CH03_OPENING") return startChapter3Opening();
		if (save.sceneId === "CH03_FLASHBACK3") return startChapter3Flashback3();
		if (save.sceneId === "CH03_END") return startChapter3End();
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
		(window as any).chapter3Access = access;
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
		g.scene.stop("PrologueScene02");
		g.scene.stop("Scene01");
		g.scene.start("TitleScene");
	}

	function rollbackToCheckpoint(): boolean {
		const save = gameSave.loadFixed();
		if (!save) return false;
		stopPrologueBgm();
		gameSave.applyToState(save);
		game.value!.scene.stop("Scene01");
		game.value!.scene.stop("PrologueScene02");
		game.value!.scene.stop("Ch01Sc01Scene");
		game.value!.scene.stop("Ch03Flashback3Scene");
		game.value!.scene.stop("Ch03TuCompoundScene");
		game.value!.scene.stop("Ch03GateBreachCombatScene");
		game.value!.scene.stop("Ch03HistoricalNodeScene");
		game.value!.scene.stop("Ch03ChapterEndScene");
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
		enterScene,
		startChapter2Opening,
		startChapter3Opening,
		startChapter3Flashback3,
		startChapter3Combat,
		startChapter3End,
		goToTitle,
		finishPrologue,
	};
});
