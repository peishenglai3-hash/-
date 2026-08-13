/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 11:55:11
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 12:08:52
 * @FilePath: /github_honghu_game/src/stores/modules/gameState.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ref } from "vue";
import { defineStore } from "pinia";
import type { NarrativeEntry } from "@/types/common";

export class GameState {
	mode: string = "intro";
	flags: Set<string> = new Set();
	profile: Record<string, number> = { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 };
	choice: { id: string; flag: string; echo_summary: string } | null = null;
	risk: { identity: number; execution: number; coordination: number } = {
		identity: 0,
		execution: 0,
		coordination: 0,
	};
	propStates: Record<string, string> = {
		notebook: "default",
		phone: "default",
		recorder: "default",
	};
	playerLocked: boolean = true;
	audioReviewed: boolean = false;
	questionWritten: boolean = false;
	sleepStarted: boolean = false;
	taskOpen: boolean = false;
	taskPreviousLock: boolean = false;
	paused: boolean = false;
	inNarrative: boolean = false;
	narrativeQueue: NarrativeEntry[] = [];
	narrativeIndex: number = 0;
	typing: boolean = false;
	typingTimer: number | null = null;
	onNarrativeComplete: (() => void) | null = null;
	monumentSeen: boolean = false;
	fieldworkSeen: boolean = false;
	npcDialogue: Set<string> = new Set();
	leavePhase: string | null = null;
	leaveNpcArrived: boolean | null = null;
}

// ===== Pinia Store（Setup Store 风格，等价于 useGameState 组合式函数） =====

export const useGameStateStore = defineStore("gameState", () => {
	const state = ref(new GameState());

	function resetTransientState() {
		state.value.mode = "intro";
		state.value.playerLocked = true;
		state.value.audioReviewed = false;
		state.value.questionWritten = false;
		state.value.sleepStarted = false;
		state.value.taskOpen = false;
		state.value.taskPreviousLock = false;
		state.value.paused = false;
		state.value.inNarrative = false;
		state.value.narrativeQueue = [];
		state.value.narrativeIndex = 0;
		state.value.typing = false;
		state.value.typingTimer = null;
		state.value.onNarrativeComplete = null;
		state.value.monumentSeen = false;
		state.value.fieldworkSeen = false;
		state.value.npcDialogue = new Set();
		state.value.leavePhase = null;
		state.value.leaveNpcArrived = null;
	}

	function resetRunState() {
		state.value = new GameState();
	}

	if (typeof window !== "undefined") {
		(window as any).prologueState = state.value;
	}

	return {
		state,
		resetTransientState,
		resetRunState,
	};
});
