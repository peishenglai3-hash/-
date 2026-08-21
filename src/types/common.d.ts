/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-11 11:08:34
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-11 11:08:58
 * @FilePath: /honghu_game/src/types/common.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { ProfileValues, RiskValues } from "@/common/actionProfileSystem";

export type SceneId =
	| "PROLOGUE_SC01"
	| "PROLOGUE_SC02"
	| "CH01_SC01"
	| "CH01_SC02"
	| "CH01_SC03"
	| "CH02_TRANSITION"
	| "CH02_HALL"
	| "CH02_FLASHBACK"
	| "CH02_DEPARTURE"
	| "CH03_OPENING"
	| "CH03_FLASHBACK3"
	| "CH03_COMPOUND"
	| "CH03_END"
	| "CH04_OPENING"
	| "CH04_WANGYE_TEMPLE"
	| "CH04_CONSCIOUSNESS"
	| "CH04_MODERN_RETURN"
	| "CH04_FINAL_CHOICE"
	| "CH04_ANSWER_WRITTEN"
	| "CH04_SCENE5_VIDEO"
	| "CH04_PORTRAIT_RESULT";

export interface RunSave {
	version: number;
	kind: "auto" | "fixed" | "manual";
	slot?: number | null;
	label?: string;
	sceneId: SceneId;
	sceneLabel: string;
	checkpoint: string;
	timestamp: number;
	profile: ProfileValues;
	choice: { id: string; flag: string; echo_summary: string } | null;
	tags: string[];
	fixed: string[];
	risk: RiskValues;
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
	profile: ProfileValues;
	choice: string | null;
	choiceTag: string | null;
	echo: string | null;
	tags: string[];
	fixed: string[];
	risk: RiskValues;
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

