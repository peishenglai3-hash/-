/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 11:55:11
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 12:08:52
 * @FilePath: /github_honghu_game/src/stores/modules/gameState.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { markRaw, shallowRef } from "vue";
import { defineStore } from "pinia";
import type { NarrativeEntry } from "@/types/common";
import type {
	Chapter3Access,
	ChoiceSnapshot,
	ProfileValues,
	RiskValues,
} from "@/common/actionProfileSystem";
import { createProfile, createRisk } from "@/common/actionProfileSystem";
import type { Chapter3TaskPermission } from "@/scenes/Scene05/ch03RiskPrecheck";

export class GameState {
	mode: string = "intro";
	flags: Set<string> = new Set();
	profile: ProfileValues = createProfile();
	choice: ChoiceSnapshot | null = null;
	risk: RiskValues = createRisk();
	chapter3Access: Chapter3Access | null = null;
	chapter3TaskPermission: Chapter3TaskPermission | null = null;
	propStates: Record<string, string> = {
		notebook: "default",
		phone: "default",
		recorder: "default",
		mooncake: "default",
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
	// 游戏状态是纯命令式共享数据，不需要 Vue 响应式：
	// ref() 会把整个 GameState 深度响应式化（profile/flags/choice 全变 Proxy），
	// 导致 finishPrologue() 里 structuredClone(save) 抛 DataCloneError，
	// 序章结算事件无法派发、第一章无法启动。
	// markRaw + shallowRef 保持与旧版模块单例一致的普通对象语义。
	const state = shallowRef(markRaw(new GameState()));

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
		state.value.chapter3Access = null;
		state.value.chapter3TaskPermission = null;
	}

	function resetRunState() {
		state.value = markRaw(new GameState());
		if (typeof window !== "undefined") {
			// 新游戏会替换整个状态对象，保持浏览器调试/回归入口指向当前实例。
			(window as any).prologueState = state.value;
		}
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
