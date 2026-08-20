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
} from "@/utils/storage";

export const SAVE_VERSION = 2;
export const FIXED_TAGS = ["PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"];
export const MANUAL_SLOTS = MANUAL_SAVE_SLOTS;

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
		if (!isValidProfile(candidate.profile) || !isValidRisk(candidate.risk)) return null;
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
	if (!isValidProfile(candidate.profile) || !isValidRisk(candidate.risk)) return null;
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

	function prepareChapterReplay(chapter: 1 | 2 | 3): void {
		const source = loadAuto() ?? MANUAL_SLOTS.map((slot) => loadManual(slot)).find(Boolean) ?? loadFixed();
		if (source) applyToState(source);
		const { state, resetTransientState } = useGameStateStore();
		const prefixesToClear = chapter === 1 ? ["CH01", "CH02", "CH03"] : chapter === 2 ? ["CH02", "CH03"] : ["CH03"];
		const localTags = new Set([
			"GROUP_CONFIRMED", "SIGNAL_CONFIRMED", "GROUP_REAR_POSITION", "SUPPLY_HANDLED",
			"SUPPLY_OPENED", "CONTACT_CAUTION", "FLASHBACK_CONSCRIPTION", "GATE_OBSERVED",
			"MOVEMENT_RESTRICTED", "POSITION_ABANDONED", "PROPERTY_SUSPICION", "MOONCAKE_GROUP",
			"MOONCAKE_SELF", "MOONCAKE_KEPT", "MOONCAKE_SHARED",
		]);
		state.flags = new Set([...state.flags].filter((tag) =>
			!prefixesToClear.some((prefix) => tag.startsWith(prefix)) &&
			!(chapter <= 2 && localTags.has(tag)) &&
			!(chapter === 3 && ["GATE_OBSERVED", "MOVEMENT_RESTRICTED", "POSITION_ABANDONED", "PROPERTY_SUSPICION", "MOONCAKE_GROUP", "MOONCAKE_SELF", "MOONCAKE_KEPT", "MOONCAKE_SHARED"].includes(tag)),
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
		prepareChapterReplay,
		getCurrentSceneId: () => lastSceneId,
		applyToState,
	};
});
