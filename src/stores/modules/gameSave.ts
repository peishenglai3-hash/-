// gameSave.ts — 本地存档系统（Pinia Setup Store）
// 槽位模型：auto（滚动自动存档，每次场景切换覆写）+ fixed（固定回退点：1927年，陈继南家中醒来）
// 存储后端：localStorage（存档为几 KB 纯 JSON，无截图，远低于 5MB 配额；与现有 redcode.* 键一致）
// 健壮性：全部读写 try/catch（隐私模式兜底）；version + checksum，读档校验失败自动丢弃
// 设计参考：GitHub 调研（RPG-JS 策略模式 / Miu2D 版本迁移 / EasyRPG 固定检查点槽）
import { ref } from "vue";
import { defineStore } from "pinia";
import { useGameStateStore } from "@/stores/modules/gameState";
import { PROFILE_AXES, RISK_DIMENSIONS } from "@/common/actionProfileSystem";
import {
	MANUAL_SAVE_SLOTS,
	type ManualSaveSlot,
} from "@/constants/storage";
import type { GameSettings, RunSave, SceneId } from "@/types/common";
import {
	getRedcodeSettings,
	setRedcodeSettings,
	getRedcodeAutoSave,
	getRedcodeAutoSaveBackup,
	setRedcodeAutoSave,
	getRedcodeFixedSave,
	getRedcodeFixedSaveBackup,
	setRedcodeFixedSave,
	getRedcodeManualSave,
	getRedcodeManualSaveBackup,
	setRedcodeManualSave,
	getRedcodeReplayEntry,
	setRedcodeReplayEntry,
} from "@/utils/storage";

export const SAVE_VERSION = 2;
export const FIXED_TAGS = ["PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"];
export const MANUAL_SLOTS = MANUAL_SAVE_SLOTS;
export type ReplayChapter = 1 | 2 | 3 | 4;

// sceneId → Phaser scene key
export const SCENE_KEY: Record<SceneId, string> = {
	PROLOGUE_SC01: "Scene01",
	PROLOGUE_SC02: "PrologueScene02",
	CH01_SC01: "Ch01Sc01Scene",
	CH01_SC02: "Ch01Sc02Scene",
	CH01_SC03: "Ch01Sc03Scene",
	CH02_TRANSITION: "Ch02TransitionScene",
	CH02_HALL: "Ch02AncestralHallScene",
	CH02_FLASHBACK: "Ch02FlashbackScene",
	CH02_DEPARTURE: "Ch02DepartureScene",
	CH03_OPENING: "Ch03OpeningScene",
	CH03_FLASHBACK3: "Ch03Flashback3Scene",
	CH03_COMPOUND: "Ch03TuCompoundScene",
	CH03_END: "Ch03ChapterEndScene",
	CH04_OPENING: "Ch04OpeningScene",
	CH04_WANGYE_TEMPLE: "Ch04WangyeTempleScene",
	CH04_CONSCIOUSNESS: "Ch04ConsciousnessScene",
	CH04_MODERN_RETURN: "Ch04ModernReturnScene",
	CH04_FINAL_CHOICE: "Ch04FinalChoiceScene",
	CH04_ANSWER_WRITTEN: "Ch04AnswerWrittenScene",
	CH04_SCENE5_VIDEO: "Ch04Scene5VideoScene",
	CH04_PORTRAIT_RESULT: "Ch04PortraitScene",
};

export const SCENE_META: Record<
	SceneId,
	{ label: string; checkpoint: string }
> = {
	PROLOGUE_SC01: {
		label: "序章·纪念碑广场",
		checkpoint: "PROLOGUE_SC01_MONUMENT",
	},
	PROLOGUE_SC02: { label: "序章·实践驻地", checkpoint: "PROLOGUE_SC02_CAMP" },
	CH01_SC01: {
		label: "第一章·陈继南家中",
		checkpoint: "CH01_SC01_CHEN_HOME_WAKE",
	},
	CH01_SC02: {
		label: "第一章·闪回·状纸",
		checkpoint: "CH01_SC02_FLASHBACK_PETITION",
	},
	CH01_SC03: {
		label: "第一章·外景院墙",
		checkpoint: "CH01_SC03_YARD",
	},
	CH02_TRANSITION: {
		label: "第二章·场景衔接",
		checkpoint: "CH02_TRANSITION",
	},
	CH02_HALL: {
		label: "第二章·陈家祠堂",
		checkpoint: "CH02_HALL",
	},
	CH02_FLASHBACK: {
		label: "第二章·闪回·抓壮丁",
		checkpoint: "CH02_FLASHBACK_CONSCRIPTION",
	},
	CH02_DEPARTURE: {
		label: "第二章·出发前",
		checkpoint: "CH02_END_PRE_OPERATION",
	},
	CH03_OPENING: {
		label: "第三章·抵达杜家大院外围",
		checkpoint: "CH03_OPENING_ARRIVAL",
	},
	CH03_FLASHBACK3: {
		label: "第三章·闪回三·站在门外",
		checkpoint: "CH03_FLASHBACK3_DOORWAY",
	},
	CH03_COMPOUND: {
		label: "第三章·杜家大院外围",
		checkpoint: "CH03_TU_COMPOUND_WAITING",
	},
	CH03_END: {
		label: "第三章·行动结束：三路结果汇合",
		checkpoint: "CH03_ACTION_END",
	},
	CH04_OPENING: {
		label: "第四章·戴家场王爷庙开场",
		checkpoint: "CH04_OPENING_TRANSITION",
	},
	CH04_WANGYE_TEMPLE: {
		label: "第四章·戴家场王爷庙戏台",
		checkpoint: "CH04_WANGYE_TEMPLE_SCENE1",
	},
	CH04_CONSCIOUSNESS: {
		label: "第四章·意识交错",
		checkpoint: "CH04_CONSCIOUSNESS",
	},
	CH04_MODERN_RETURN: {
		label: "第四章·回到现代",
		checkpoint: "CH04_MODERN_RETURN",
	},
	CH04_FINAL_CHOICE: {
		label: "第四章·补完序章留下的问题",
		checkpoint: "CH04_FINAL_CHOICE",
	},
	CH04_ANSWER_WRITTEN: {
		label: "第四章·答案写下之后",
		checkpoint: "CH04_ANSWER_WRITTEN",
	},
	CH04_SCENE5_VIDEO: {
		label: "第四章·答案写下之后的转场",
		checkpoint: "CH04_SCENE5_VIDEO",
	},
	CH04_PORTRAIT_RESULT: {
		label: "第四章·历史现场画像",
		checkpoint: "CH04_PORTRAIT_RESULT",
	},
};

export const DEFAULT_SETTINGS: GameSettings = {
	bgmVolume: 0.35,
	sfxVolume: 0.7,
	textSpeed: 1,
};

// 简易校验和（djb2 变体），防存档损坏静默读入
function checksum(payload: Omit<RunSave, "checksum">): string {
	const json = JSON.stringify(payload);
	let hash = 0;
	for (let i = 0; i < json.length; i += 1)
		hash = ((hash << 5) - hash + json.charCodeAt(i)) | 0;
	return hash.toString(36);
}

function buildSave(
	kind: RunSave["kind"],
	sceneId: SceneId,
	tags: string[],
	fixed: string[],
	risk: { identity: number; execution: number; coordination: number },
	options: { slot?: number | null; label?: string } = {},
): RunSave {
	const { state } = useGameStateStore();
	const base: Omit<RunSave, "checksum"> = {
		version: SAVE_VERSION,
		kind,
		slot: options.slot ?? null,
		label: options.label ?? `${SCENE_META[sceneId].label} · ${kind === "manual" ? "手动存档" : "自动记录"}`,
		sceneId,
		sceneLabel: SCENE_META[sceneId].label,
		checkpoint: SCENE_META[sceneId].checkpoint,
		timestamp: Date.now(),
		profile: { ...state.profile },
		choice: state.choice ? { ...state.choice } : null,
		tags,
		fixed,
		risk,
		propStates: { ...state.propStates },
	};
	return { ...base, checksum: checksum(base) };
}

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidProfile(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return PROFILE_AXES.every((axis) => isNonNegativeInteger(record[axis]));
}

function isValidRisk(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return RISK_DIMENSIONS.every((dimension) => isNonNegativeInteger(record[dimension]));
}

function isValidSceneId(value: unknown): value is SceneId {
	return typeof value === "string" && value in SCENE_META;
}

function isValidTags(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((tag) => typeof tag === "string");
}

function isValidChoice(value: unknown): boolean {
	if (value === null) return true;
	if (!value || typeof value !== "object") return false;
	const choice = value as Record<string, unknown>;
	return ["id", "flag", "echo_summary"].every((key) => typeof choice[key] === "string");
}

function isValidSaveShape(candidate: Record<string, unknown>): boolean {
	if (!isValidSceneId(candidate.sceneId)) return false;
	if (!["auto", "fixed", "manual"].includes(String(candidate.kind))) return false;
	if (typeof candidate.sceneLabel !== "string" || typeof candidate.checkpoint !== "string") return false;
	if (candidate.label !== undefined && typeof candidate.label !== "string") return false;
	if (typeof candidate.timestamp !== "number" || !Number.isFinite(candidate.timestamp) || candidate.timestamp <= 0) return false;
	if (!isValidTags(candidate.tags) || !isValidTags(candidate.fixed)) return false;
	if (!isValidChoice(candidate.choice) || !isValidProfile(candidate.profile) || !isValidRisk(candidate.risk)) return false;
	if (!candidate.propStates || typeof candidate.propStates !== "object" || Array.isArray(candidate.propStates)) return false;
	const slot = candidate.slot;
	if (candidate.kind === "manual") return MANUAL_SLOTS.includes(slot as ManualSaveSlot);
	return slot === null || slot === undefined;
}

function verify(raw: unknown): RunSave | null {
	if (!raw || typeof raw !== "object") return null;
	const candidate = raw as Record<string, unknown>;
	const sum = candidate.checksum;
	const { checksum: _ignored, ...rest } = candidate;
	if (typeof sum !== "string") return null;

	// v1 was the previous auto/fixed schema. Validate it against its original
	// payload first, then upgrade it so old browser saves remain loadable.
	if (candidate.version === 1) {
		if (checksum(rest as Omit<RunSave, "checksum">) !== sum) return null;
		if (!isValidProfile(candidate.profile) || !isValidRisk(candidate.risk) || !isValidSaveShape({ ...candidate, version: SAVE_VERSION, slot: null })) return null;
		const migrated: Omit<RunSave, "checksum"> = {
			...(rest as Omit<RunSave, "checksum">),
			version: SAVE_VERSION,
			slot: null,
			label: typeof candidate.sceneLabel === "string" ? `${candidate.sceneLabel} · 迁移存档` : "迁移存档",
		};
		return { ...migrated, checksum: checksum(migrated) };
	}

	if (candidate.version !== SAVE_VERSION) return null;
	if (checksum(rest as Omit<RunSave, "checksum">) !== sum) return null;
	if (!isValidSaveShape(candidate)) return null;
	return candidate as unknown as RunSave;
}

export const useGameSaveStore = defineStore("gameSave", () => {
	// ===== 设置（音量/文字速度）——持久化 + 订阅生效 =====

	const settings = ref<GameSettings>({
		...DEFAULT_SETTINGS,
		...(getRedcodeSettings() ?? {}),
	});
	const settingsListeners: Array<(s: GameSettings) => void> = [];
	let lastSceneId: SceneId = "PROLOGUE_SC01";

	function getSettings(): GameSettings {
		return { ...settings.value };
	}

	function updateSettings(patch: Partial<GameSettings>): void {
		settings.value = { ...settings.value, ...patch };
		setRedcodeSettings(settings.value);
		for (const listener of settingsListeners) listener(getSettings());
	}

	function onSettingsChange(listener: (s: GameSettings) => void): void {
		settingsListeners.push(listener);
	}

	function getTextSpeedMult(): number {
		return settings.value.textSpeed || 1;
	}

	// ===== 存档槽位 =====

	// 场景切换自动存档：写 auto 槽（滚动覆写）
	function autosave(sceneId: SceneId): RunSave | null {
		const { state } = useGameStateStore();
		lastSceneId = sceneId;
		const tags = [...state.flags];
		const fixed = tags.filter((t) => FIXED_TAGS.includes(t));
		const save = buildSave("auto", sceneId, tags, fixed, { ...state.risk });
		return setRedcodeAutoSave(save) ? save : null;
	}

	function saveManual(slot: ManualSaveSlot, label?: string): RunSave | null {
		const { state } = useGameStateStore();
		const tags = [...state.flags];
		const fixed = tags.filter((t) => FIXED_TAGS.includes(t));
		const save = buildSave("manual", lastSceneId, tags, fixed, { ...state.risk }, {
			slot,
			label: label ?? `${SCENE_META[lastSceneId].label} · 手动存档 ${slot}`,
		});
		return setRedcodeManualSave(slot, save) ? save : null;
	}

	// 固定存档点：玩家进入陈继南家中、场景整体呈现时写入。
	// 严格对齐任务单：仅保留序章画像与序章标签（过滤 CH01 旗标），三风险归 0，双固定标签。
	function writeFixedCheckpoint(): RunSave | null {
		const { state } = useGameStateStore();
		const tags = [...state.flags].filter((t) => !t.startsWith("CH01"));
		const save = buildSave("fixed", "CH01_SC01", tags, [...FIXED_TAGS], {
			identity: 0,
			execution: 0,
			coordination: 0,
		});
		return setRedcodeFixedSave(save) ? save : null;
	}

	function loadAuto(): RunSave | null {
		return verify(getRedcodeAutoSave()) ?? verify(getRedcodeAutoSaveBackup());
	}

	function loadFixed(): RunSave | null {
		return verify(getRedcodeFixedSave()) ?? verify(getRedcodeFixedSaveBackup());
	}

	function loadManual(slot: ManualSaveSlot): RunSave | null {
		return verify(getRedcodeManualSave(slot)) ?? verify(getRedcodeManualSaveBackup(slot));
	}

	function listManualSlots(): Array<{ slot: ManualSaveSlot; save: RunSave | null }> {
		return MANUAL_SLOTS.map((slot) => ({ slot, save: loadManual(slot) }));
	}

	// 读档面板列表：固定槽在前，自动槽在后（损坏/空槽自动过滤）
	function listSlots(): RunSave[] {
		return [loadFixed(), loadAuto(), ...MANUAL_SLOTS.map((slot) => loadManual(slot))].filter(
			(s): s is RunSave => s !== null,
		);
	}

	function captureChapterEntry(chapter: ReplayChapter): RunSave | null {
		const sceneId: Record<ReplayChapter, SceneId> = {
			1: "CH01_SC01",
			2: "CH02_TRANSITION",
			3: "CH03_OPENING",
			4: "CH04_OPENING",
		};
		const { state } = useGameStateStore();
		const tags = [...state.flags];
		const fixed = tags.filter((t) => FIXED_TAGS.includes(t));
		const save = buildSave("auto", sceneId[chapter], tags, fixed, { ...state.risk });
		return setRedcodeReplayEntry(chapter, save) ? save : null;
	}

	function loadChapterEntry(chapter: ReplayChapter): RunSave | null {
		return verify(getRedcodeReplayEntry(chapter));
	}

	function prepareChapterReplay(chapter: ReplayChapter): void {
		const source = loadChapterEntry(chapter) ?? loadAuto() ?? MANUAL_SLOTS.map((slot) => loadManual(slot)).find(Boolean) ?? loadFixed();
		if (source) applyToState(source);
		const { state, resetTransientState } = useGameStateStore();
		const prefixesToClear = chapter === 1
			? ["CH01", "CH02", "CH03", "CH04"]
			: chapter === 2
				? ["CH02", "CH03", "CH04"]
				: chapter === 3
					? ["CH03", "CH04"]
					: ["CH04"];
		const localTags = new Set([
			"GROUP_CONFIRMED", "SIGNAL_CONFIRMED", "GROUP_REAR_POSITION", "SUPPLY_HANDLED",
			"SUPPLY_OPENED", "CONTACT_CAUTION", "FLASHBACK_CONSCRIPTION", "GATE_OBSERVED",
			"MOVEMENT_RESTRICTED", "POSITION_ABANDONED", "PROPERTY_SUSPICION", "MOONCAKE_GROUP",
			"MOONCAKE_SELF", "MOONCAKE_KEPT", "MOONCAKE_SHARED",
		]);
		state.flags = new Set([...state.flags].filter((tag) =>
			!prefixesToClear.some((prefix) => tag.startsWith(prefix)) &&
			!(chapter <= 2 && localTags.has(tag)) &&
			!(chapter === 3 && ["GATE_OBSERVED", "MOVEMENT_RESTRICTED", "POSITION_ABANDONED", "PROPERTY_SUSPICION", "MOONCAKE_GROUP", "MOONCAKE_SELF", "MOONCAKE_KEPT", "MOONCAKE_SHARED"].includes(tag)) &&
			!(chapter === 4 && tag.startsWith("FIN_")),
		));
		state.choice = null;
		state.chapter3Access = null;
		state.chapter3TaskPermission = null;
		state.propStates = {
			notebook: "default",
			phone: "default",
			recorder: "default",
			mooncake: "default",
		};
		resetTransientState();
	}

	// 将存档还原到运行时 state（旗标/画像/选择/风险/道具状态），瞬态字段复位
	function applyToState(save: RunSave): void {
		const { state, resetTransientState } = useGameStateStore();
		lastSceneId = save.sceneId;
		state.flags = new Set([...save.tags, ...save.fixed]);
		for (const axis of PROFILE_AXES) state.profile[axis] = 0;
		for (const axis of PROFILE_AXES)
			state.profile[axis] = save.profile[axis] ?? 0;
		state.choice = save.choice ? { ...save.choice } : null;
		state.risk = { ...save.risk };
		state.propStates = {
			notebook: "default",
			phone: "default",
			recorder: "default",
			mooncake: "default",
			...save.propStates,
		};
		resetTransientState();
	}

	return {
		settings,
		getSettings,
		updateSettings,
		onSettingsChange,
		getTextSpeedMult,
		autosave,
		saveManual,
		writeFixedCheckpoint,
		loadAuto,
		loadFixed,
		loadManual,
		listManualSlots,
		listSlots,
		captureChapterEntry,
		loadChapterEntry,
		prepareChapterReplay,
		getCurrentSceneId: () => lastSceneId,
		applyToState,
	};
});
