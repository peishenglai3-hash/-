// save.ts — 本地存档系统（SaveManager）
// 槽位模型：auto（滚动自动存档，每次场景切换覆写）+ fixed（固定回退点：1927年，陈继南家中醒来）
// 存储后端：localStorage（存档为几 KB 纯 JSON，无截图，远低于 5MB 配额；与现有 redcode.* 键一致）
// 健壮性：全部读写 try/catch（隐私模式兜底）；version + checksum，读档校验失败自动丢弃
// 设计参考：GitHub 调研（RPG-JS 策略模式 / Miu2D 版本迁移 / EasyRPG 固定检查点槽）
import { state, resetTransientState } from "@/common/state";
import type { GameSettings, RunSave, SceneId } from "@/types/common";

const KEY_SETTINGS = "redcode.settings";
const KEY_AUTO = "redcode.save.auto";
const KEY_FIXED = "redcode.save.fixed";

export const SAVE_VERSION = 1;
export const FIXED_TAGS = ["PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"];

// sceneId → Phaser scene key
export const SCENE_KEY: Record<SceneId, string> = {
	PROLOGUE_SC01: "Scene01",
	PROLOGUE_SC02: "PrologueScene02",
	CH01_SC01: "Ch01Sc01Scene",
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
};

export const DEFAULT_SETTINGS: GameSettings = {
	bgmVolume: 0.35,
	sfxVolume: 0.7,
	textSpeed: 1,
};

function readJSON<T>(key: string): T | null {
	try {
		const raw = window.localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function writeJSON(key: string, value: unknown): boolean {
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

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
): RunSave {
	const base = {
		version: SAVE_VERSION,
		kind,
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

function verify(raw: unknown): RunSave | null {
	if (!raw || typeof raw !== "object") return null;
	const save = raw as RunSave;
	if (save.version !== SAVE_VERSION) return null;
	const { checksum: sum, ...rest } = save;
	if (checksum(rest as Omit<RunSave, "checksum">) !== sum) return null;
	return save;
}

export const SaveManager = {
	// 场景切换自动存档：写 auto 槽（滚动覆写）
	autosave(sceneId: SceneId): RunSave | null {
		const tags = [...state.flags];
		const fixed = tags.filter((t) => FIXED_TAGS.includes(t));
		const save = buildSave("auto", sceneId, tags, fixed, { ...state.risk });
		return writeJSON(KEY_AUTO, save) ? save : null;
	},

	// 固定存档点：玩家进入陈继南家中、场景整体呈现时写入。
	// 严格对齐任务单：仅保留序章画像与序章标签（过滤 CH01 旗标），三风险归 0，双固定标签。
	writeFixedCheckpoint(): RunSave | null {
		const tags = [...state.flags].filter((t) => !t.startsWith("CH01"));
		const save = buildSave("fixed", "CH01_SC01", tags, [...FIXED_TAGS], {
			identity: 0,
			execution: 0,
			coordination: 0,
		});
		return writeJSON(KEY_FIXED, save) ? save : null;
	},

	loadAuto(): RunSave | null {
		return verify(readJSON(KEY_AUTO));
	},

	loadFixed(): RunSave | null {
		return verify(readJSON(KEY_FIXED));
	},

	// 读档面板列表：固定槽在前，自动槽在后（损坏/空槽自动过滤）
	listSlots(): RunSave[] {
		return [this.loadFixed(), this.loadAuto()].filter(
			(s): s is RunSave => s !== null,
		);
	},

	// 将存档还原到运行时 state（旗标/画像/选择/风险/道具状态），瞬态字段复位
	applyToState(save: RunSave): void {
		state.flags = new Set([...save.tags, ...save.fixed]);
		for (const axis of Object.keys(state.profile)) state.profile[axis] = 0;
		for (const [axis, value] of Object.entries(save.profile))
			state.profile[axis] = value;
		state.choice = save.choice ? { ...save.choice } : null;
		state.risk = { ...save.risk };
		state.propStates = {
			notebook: "default",
			phone: "default",
			recorder: "default",
			...save.propStates,
		};
		resetTransientState();
	},
};

// ===== 设置（音量/文字速度）——持久化 + 订阅生效 =====

let settings: GameSettings = {
	...DEFAULT_SETTINGS,
	...(readJSON<Partial<GameSettings>>(KEY_SETTINGS) ?? {}),
};
const settingsListeners: Array<(s: GameSettings) => void> = [];

export function getSettings(): GameSettings {
	return { ...settings };
}

export function updateSettings(patch: Partial<GameSettings>): void {
	settings = { ...settings, ...patch };
	writeJSON(KEY_SETTINGS, settings);
	for (const listener of settingsListeners) listener(getSettings());
}

export function onSettingsChange(listener: (s: GameSettings) => void): void {
	settingsListeners.push(listener);
}

export function getTextSpeedMult(): number {
	return settings.textSpeed || 1;
}
