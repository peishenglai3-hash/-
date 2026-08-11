import type { GameState, NarrativeEntry } from "@/types/common";

export const state: GameState = {
	mode: "intro",
	flags: new Set(),
	profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
	choice: null,
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

if (typeof window !== "undefined") {
	(window as any).prologueState = state;
}
