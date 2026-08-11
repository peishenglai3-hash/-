/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-11 11:08:34
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-11 11:08:58
 * @FilePath: /honghu_game/src/types/common.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export type SceneId = "PROLOGUE_SC01" | "PROLOGUE_SC02" | "CH01_SC01";

export interface RunSave {
	version: number;
	kind: "auto" | "fixed";
	sceneId: SceneId;
	sceneLabel: string;
	checkpoint: string;
	timestamp: number;
	profile: Record<string, number>;
	choice: { id: string; flag: string; echo_summary: string } | null;
	tags: string[];
	fixed: string[];
	risk: { identity: number; execution: number; coordination: number };
	propStates: Record<string, string>;
	checksum: string;
}

export interface GameSettings {
	bgmVolume: number;
	sfxVolume: number;
	textSpeed: number;
}

export interface SaveData {
	checkpoint: string;
	checkpointLabel: string;
	profile: Record<string, number>;
	choice: string | null;
	choiceTag: string | null;
	echo: string | null;
	tags: string[];
	fixed: string[];
	risk: { identity: number; execution: number; coordination: number };
	exit: { nextSceneCanonical: string };
}

export interface NarrativeEntry {
	entry_id: string;
	kind: string;
	speaker_id?: string;
	speaker_name?: string;
	text: string;
	style: string;
	cps?: number;
	advance?: string;
	pause_before_ms?: number;
	avatar_id?: string;
	sfx?: string;
}

export interface GameState {
	mode: string;
	flags: Set<string>;
	profile: Record<string, number>;
	choice: { id: string; flag: string; echo_summary: string } | null;
	risk: { identity: number; execution: number; coordination: number };
	propStates: Record<string, string>;
	playerLocked: boolean;
	audioReviewed: boolean;
	questionWritten: boolean;
	sleepStarted: boolean;
	taskOpen: boolean;
	taskPreviousLock: boolean;
	paused: boolean;
	inNarrative: boolean;
	narrativeQueue: NarrativeEntry[];
	narrativeIndex: number;
	typing: boolean;
	typingTimer: number | null;
	onNarrativeComplete: (() => void) | null;
	monumentSeen: boolean;
	fieldworkSeen: boolean;
	npcDialogue: Set<string>;
	leavePhase: string | null;
	leaveNpcArrived: boolean | null;
}
