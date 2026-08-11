import type { GameState, NarrativeEntry } from "@/types/common";

export const state: GameState = {
	mode: "intro",
	flags: new Set(),
	profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
	choice: null,
	risk: { identity: 0, execution: 0, coordination: 0 },
	propStates: { notebook: "default", phone: "default", recorder: "default" },
	playerLocked: true,
	audioReviewed: false,
	questionWritten: false,
	sleepStarted: false,
	taskOpen: false,
	taskPreviousLock: false,
	paused: false,
	inNarrative: false,
	narrativeQueue: [],
	narrativeIndex: 0,
	typing: false,
	typingTimer: null,
	onNarrativeComplete: null,
	monumentSeen: false,
	fieldworkSeen: false,
	npcDialogue: new Set(),
	leavePhase: null,
	leaveNpcArrived: null,
};

// 瞬态运行时字段复位（读档/新游戏共用；不清旗标与画像）
export function resetTransientState(): void {
	state.mode = "intro";
	state.playerLocked = true;
	state.audioReviewed = false;
	state.questionWritten = false;
	state.sleepStarted = false;
	state.taskOpen = false;
	state.taskPreviousLock = false;
	state.paused = false;
	state.inNarrative = false;
	state.narrativeQueue = [];
	state.narrativeIndex = 0;
	state.typing = false;
	state.typingTimer = null;
	state.onNarrativeComplete = null;
	state.monumentSeen = false;
	state.fieldworkSeen = false;
	state.npcDialogue = new Set();
	state.leavePhase = null;
	state.leaveNpcArrived = null;
}

// 新开一局：旗标/画像/选择/风险/道具状态全部清零
export function resetRunState(): void {
	state.flags = new Set();
	state.profile = { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 };
	state.choice = null;
	state.risk = { identity: 0, execution: 0, coordination: 0 };
	state.propStates = {
		notebook: "default",
		phone: "default",
		recorder: "default",
	};
	resetTransientState();
}

if (typeof window !== "undefined") {
	(window as any).prologueState = state;
}
