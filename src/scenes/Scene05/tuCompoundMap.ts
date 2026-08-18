import type { LayeredMapDefinition } from "@/common/layeredMap";

/**
 * 第三章杜家大院地图的可复用状态。
 *
 * 资产目录沿用美术交付的状态命名；剧情代码只依赖这个类型，不直接拼接
 * 文件路径，后续风险分支和行动节点可以通过状态切换复用同一套地图契约。
 */
export type TuCompoundState =
	| "STATE_WAITING"
	| "STATE_GATE_CLOSED"
	| "STATE_GATE_ATTACK"
	| "STATE_FIRE_STARTED"
	| "STATE_GATE_BROKEN"
	| "STATE_AFTER_BATTLE"
	| "STATE_DEPARTURE";

const LAYER_FILES = {
	L01_GROUND: "L01_GROUND.png",
	L02_GROUND_DETAIL: "L02_GROUND_DETAIL.png",
	L03_STRUCTURE_LOW: "L03_STRUCTURE_LOW.png",
	L04_PROP_INTERACT: "L04_PROP_INTERACT.png",
	L06_OCCLUSION_HIGH: "L06_OCCLUSION_HIGH.png",
	L07_LIGHT_FX: "L07_LIGHT_FX.png",
};

export const TU_COMPOUND_STATE_CATALOG: Record<
	TuCompoundState,
	{ label: string; storyUse: string }
> = {
	STATE_WAITING: {
		label: "隐蔽等待",
		storyUse: "抵达杜家大院外围、风险预检查、交互一等待行动时的观察",
	},
	STATE_GATE_CLOSED: {
		label: "正门闭合",
		storyUse: "三路行动开始、门闩落下、大门合拢后的观察",
	},
	STATE_GATE_ATTACK: {
		label: "撞门受阻",
		storyUse: "前门撞击尚未破门、决定火攻榨房前后的固定场景",
	},
	STATE_FIRE_STARTED: {
		label: "榨房起火",
		storyUse: "榨房火攻开始、三路行动同步表现",
	},
	STATE_GATE_BROKEN: {
		label: "大门破开",
		storyUse: "前门突破、三路队伍合拢及固定历史节点前后",
	},
	STATE_AFTER_BATTLE: {
		label: "战后清点",
		storyUse: "杜老三逃走后、武器物资与伤员清点",
	},
	STATE_DEPARTURE: {
		label: "分批离场",
		storyUse: "清点结束、玩家所在小组重新集合并前往王爷庙",
	},
};

function stateSlug(state: TuCompoundState): string {
	return state.toLowerCase();
}

function createDefinition(state: TuCompoundState): LayeredMapDefinition {
	const slug = stateSlug(state);
	const id = `ch03_tu_compound_${slug}`;
	return {
		id,
		assetRoot: `assets/ch03/tu-compound/${state}`,
		manifestPath: `data/ch03_tu_compound_${state}_manifest.json`,
		manifestKey: `${id}_manifest`,
		objectPath: `data/ch03_tu_compound_${state}_objects.json`,
		objectKey: `${id}_objects`,
		layerFiles: { ...LAYER_FILES },
		layerKeys: Object.fromEntries(
			Object.keys(LAYER_FILES).map((layerName) => [
				layerName,
				`${id}_${layerName}`,
			]),
		),
	};
}

export const TU_COMPOUND_MAPS: Record<TuCompoundState, LayeredMapDefinition> = {
	STATE_WAITING: createDefinition("STATE_WAITING"),
	STATE_GATE_CLOSED: createDefinition("STATE_GATE_CLOSED"),
	STATE_GATE_ATTACK: createDefinition("STATE_GATE_ATTACK"),
	STATE_FIRE_STARTED: createDefinition("STATE_FIRE_STARTED"),
	STATE_GATE_BROKEN: createDefinition("STATE_GATE_BROKEN"),
	STATE_AFTER_BATTLE: createDefinition("STATE_AFTER_BATTLE"),
	STATE_DEPARTURE: createDefinition("STATE_DEPARTURE"),
};

export function isTuCompoundState(value: string | null): value is TuCompoundState {
	return Boolean(value && value in TU_COMPOUND_MAPS);
}
