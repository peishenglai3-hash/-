import type { NarrativeEntry } from "@/stores/modules/hud";

export const CH03_COMBAT_FLAGS = {
	ready: "CH03_GATE_BREACH_READY",
	started: "CH03_GATE_BREACH_STARTED",
	captureComplete: "CH03_GATE_BREACH_CAPTURE_COMPLETE",
	pursuitStarted: "CH03_GATE_BREACH_PURSUIT_STARTED",
	complete: "CH03_GATE_BREACH_COMPLETE",
	historicalNodeStarted: "CH03_HISTORICAL_NODE_STARTED",
	historicalNodeSeen: "CH03_HISTORICAL_NODE_SEEN",
	failure: "CH03_GATE_BREACH_FAILURE",
} as const;

export const CH03_GATE_BREACH_TASK = {
	title: "交互三完成｜大门撞开：三路合拢",
	detail: "进入杜家大院，先俘虏团丁，再跟随董云庭追击杜老三。陈继南不能代替历史人物完成关键行动。",
};

export const CH03_GATE_BREACH_COMPLETE_TASK = {
	title: "大门撞开：三路合拢｜完成",
	detail: "团丁已被控制。董云庭已经完成固定历史行动，杜老三的去向将在下一段历史影像中确认。",
};

export const CH03_GATE_BREACH_FAILURE_TASK = {
	title: "突入暂时受阻",
	detail: "陈继南在烟火和枪声中失去行动能力。可以按 E 重新进入这段战斗切片；本次重试不会重新计算三大系统。",
};

function entry(
	id: string,
	kind: NarrativeEntry["kind"],
	text: string,
	speakerName?: string,
): NarrativeEntry {
	return {
		entry_id: id,
		kind,
		text,
		...(speakerName ? { speaker_name: speakerName } : {}),
		style:
			kind === "dialogue"
				? "dialogue"
				: kind === "thought"
					? "thought"
					: "narration",
		cps: kind === "dialogue" ? 14 : 11,
	};
}

export const CH03_GATE_BREACH_INTRO: NarrativeEntry[] = [
	entry("CH03_GATE_BREACH_OPEN", "narration", "又一次撞击后，铁皮大门的固定处发出撕裂般的声响。门板向内歪开。"),
	entry("CH03_GATE_BREACH_SMOKE", "narration", "烟雾中，灯火迷离。一些团丁刚从酒席间起身，脚步不稳；有人试图拿武器，有人向后院方向逃去。"),
	entry("CH03_GATE_BREACH_THREE_ROUTES", "narration", "后门有人堵住，街面爆响仍未停下。前门撞开之后，三路队伍才真正向同一座大院合拢。"),
	entry("CH03_GATE_BREACH_TASK", "dialogue", "先控制住能控制的人。别追进后院，董云庭会带路。", "组长"),
];

export const CH03_GATE_BREACH_CAPTURE_INTRO: NarrativeEntry[] = [
	entry("CH03_GATE_BREACH_CAPTURE_INTRO", "narration", "团丁被一个接一个按住。有人丢下武器，有人还想往侧院跑。你必须先让眼前的抵抗停下来。"),
	entry("CH03_GATE_BREACH_CAPTURE_RULE", "thought", "枪声能让人倒下，却不能替行动完成俘虏。接近失去抵抗能力的人，按住他，交给身后的队员。"),
];

export const CH03_GATE_BREACH_PURSUIT_INTRO: NarrativeEntry[] = [
	entry("CH03_GATE_BREACH_REAR_SHOUT", "dialogue", "后门有人！", "后院队员"),
	entry("CH03_GATE_BREACH_PURSUIT", "narration", "院里的抵抗已经被压住一角。董云庭从烟里转过身，朝后院方向追去。你必须跟住他的路线，但不能代替他完成对杜老三的追击。"),
];

export const CH03_GATE_BREACH_FINISH: NarrativeEntry[] = [
	entry("CH03_GATE_BREACH_DONG", "dialogue", "杜老三往后院跑了，跟上！", "董云庭"),
	entry("CH03_GATE_BREACH_FLEE", "narration", "前方的人影一闪而过，消失在后院更深的暗处。街面、后院和前门的声音仍交织在一起。你跟着队伍继续向前，但这一夜的关键行动仍由他们完成。"),
];
