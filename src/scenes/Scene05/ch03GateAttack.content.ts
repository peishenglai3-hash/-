import type { ChoiceItem, NarrativeEntry } from "@/stores/modules/hud";
import { assetPath } from "@/common/paths";
import type {
	FormalChoiceDefinition,
	ProfileDelta,
	RiskDelta,
	RiskFailure,
} from "@/common/actionProfileSystem";
import type { Chapter3TaskPermission } from "./ch03RiskPrecheck";

export type GateEntryChoiceId = "A" | "B" | "C" | "D";

export const CH03_GATE_ATTACK_FLAGS = {
	started: "CH03_GATE_ATTACK_STARTED",
	narrativeComplete: "CH03_GATE_ATTACK_NARRATIVE_COMPLETE",
	fireStarted: "CH03_GATE_ATTACK_FIRE_STARTED",
	choiceStarted: "CH03_GATE_ENTRY_STARTED",
	choiceA: "CH03_GATE_ENTRY_A",
	choiceB: "CH03_GATE_ENTRY_B",
	choiceC: "CH03_GATE_ENTRY_C",
	choiceD: "CH03_GATE_ENTRY_D",
	choiceComplete: "CH03_GATE_ENTRY_COMPLETE",
	complete: "CH03_GATE_ATTACK_COMPLETE",
	replacement: "CH03_GATE_ATTACK_REPLACEMENT",
	positionAbandoned: "POSITION_ABANDONED",
} as const;

export const CH03_GATE_ENTRY_IMAGE_KEYS: Record<GateEntryChoiceId, string> = {
	A: "ch03_gate_entry_A",
	B: "ch03_gate_entry_B",
	C: "ch03_gate_entry_C",
	D: "ch03_gate_entry_D",
};

const CH03_GATE_ENTRY_IMAGE_PATHS: Record<GateEntryChoiceId, string> = {
	A: assetPath("/assets/ch03/action/branch05/branch05-A.png"),
	B: assetPath("/assets/ch03/action/branch05/branch05-B.png"),
	C: assetPath("/assets/ch03/action/branch05/branch05-C.png"),
	D: assetPath("/assets/ch03/action/branch05/branch05-D.png"),
};

const CHOICE_LABELS: Record<GateEntryChoiceId, string> = {
	A: "按彭定邦口令，与众人同时发力",
	B: "先稳住身边队员的位置，再共同发力",
	C: "顶住木柱回弹，给前面的人留出重新抬起的时间",
	D: "脱离队伍，试图翻墙进入院内",
};

export function gateEntryImagePath(id: GateEntryChoiceId): string {
	return CH03_GATE_ENTRY_IMAGE_PATHS[id];
}

export function isForwardGatePermission(
	permission: Chapter3TaskPermission,
): boolean {
	return permission === "FORWARD_SUPPORT";
}

export function buildChapter3GateEntryChoices(
	permission: Chapter3TaskPermission,
): ChoiceItem[] {
	const forwardSupport = isForwardGatePermission(permission);
	const unavailableDetail = "仅前方辅助组可以进入前门辅助位置；当前通过传话和远处人影参与";
	return [
		{
			id: "CH03_GATE_ENTRY_A",
			label: CHOICE_LABELS.A,
			detail: forwardSupport
				? "组织协同 +3；行动决断 +1；协同风险 -1"
				: unavailableDetail,
			disabled: !forwardSupport,
		},
		{
			id: "CH03_GATE_ENTRY_B",
			label: CHOICE_LABELS.B,
			detail: forwardSupport
				? "组织协同 +2；审慎判断 +2；执行风险 -1"
				: unavailableDetail,
			disabled: !forwardSupport,
		},
		{
			id: "CH03_GATE_ENTRY_C",
			label: CHOICE_LABELS.C,
			detail: forwardSupport
				? "个人担当 +2；原则坚持 +1；执行风险 +1"
				: unavailableDetail,
			disabled: !forwardSupport,
		},
		{
			id: "CH03_GATE_ENTRY_D",
			label: CHOICE_LABELS.D,
			detail: "行动决断 +2；执行风险 +2；协同风险 +3；追加 POSITION_ABANDONED",
		},
	];
}

function choiceIdFromPanelId(id: string): GateEntryChoiceId | null {
	const suffix = id.slice(-1);
	return suffix === "A" || suffix === "B" || suffix === "C" || suffix === "D"
		? suffix
		: null;
}

function choiceFlag(id: GateEntryChoiceId): string {
	return {
		A: CH03_GATE_ATTACK_FLAGS.choiceA,
		B: CH03_GATE_ATTACK_FLAGS.choiceB,
		C: CH03_GATE_ATTACK_FLAGS.choiceC,
		D: CH03_GATE_ATTACK_FLAGS.choiceD,
	}[id];
}

export interface GateEntryChoiceContext {
	permission: Chapter3TaskPermission;
	coordinationRiskHigh: boolean;
}

/** 交互三的唯一正式选择入口；场景不直接改写画像和风险。 */
export function buildChapter3GateEntryFormalChoice(
	id: string,
	context: GateEntryChoiceContext,
): FormalChoiceDefinition | null {
	const choice = choiceIdFromPanelId(id);
	if (!choice) return null;
	if (choice !== "D" && !isForwardGatePermission(context.permission)) return null;

	const profileByChoice: Record<GateEntryChoiceId, ProfileDelta> = {
		A: { G: 3, D: 1 },
		B: { G: 2, C: 2 },
		C: { I: 2, P: 1 },
		D: { D: 2 },
	};
	const riskByChoice: Record<GateEntryChoiceId, RiskDelta> = {
		A: { coordination: -1 },
		B: { execution: -1 },
		C: { execution: 1 },
		D: { execution: 2, coordination: 3 },
	};

	return {
		choiceId: `CH03_GATE_ENTRY_${choice}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: profileByChoice[choice],
		riskChange: riskByChoice[choice],
		flag: choiceFlag(choice),
		tags: choice === "D" ? [CH03_GATE_ATTACK_FLAGS.positionAbandoned] : [],
		echoSummary: CHOICE_LABELS[choice],
		failureCheck: true,
	};
}

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

export const CH03_GATE_ATTACK_TASK = {
	title: "大门受阻：决定火攻榨房",
	detail: "前门连续撞击仍未破开。确认任务后，戴安南和彭定邦将以榨房起火牵制院内守卫。",
};

export const CH03_GATE_ENTRY_COMPLETE_TASK = {
	title: "交互三：撞门前，如何进入位置？",
	detail: "位置选择已记录。前门、后院与街面三路行动仍在继续，等待下一处行动节点。",
};

export const CH03_GATE_ATTACK_INTRO: NarrativeEntry[] = [
	entry("CH03_GATE_ATTACK_HIT_01", "narration", "门板先被撞出一声闷响。"),
	entry("CH03_GATE_ATTACK_HIT_02", "narration", "随后是第二下、第三下。"),
	entry(
		"CH03_GATE_ATTACK_VIBRATION",
		"narration",
		"铁皮大门没有打开，只在撞击后发出长而刺耳的震颤。",
	),
	entry(
		"CH03_GATE_ATTACK_RETREAT",
		"narration",
		"前门队员向后退开。有人肩膀撞在门板上，踉跄了一步。门仍然合着，院墙上方没有出现缺口。",
	),
	entry(
		"CH03_GATE_ATTACK_BLOCKED",
		"narration",
		"街上的爆响一阵接一阵，院里的脚步声已经乱了。后院方向传来喝止声和身体撞在墙上的闷响，有人想翻墙，又被按了回去。可那扇铁皮大门还是没倒。前门若一直打不开，院内的人就仍有时间稳住阵脚。",
	),
	entry(
		"CH03_GATE_ATTACK_WHISPER",
		"narration",
		"不远处，戴安南和彭定邦在暗处短暂交谈。你听不见全部内容，只听见“榨房”“火”“不能拖”等零碎词句。",
	),
	entry("CH03_GATE_ATTACK_DAI", "dialogue", "点榨房。", "戴安南"),
	entry("CH03_GATE_ATTACK_PENG", "dialogue", "前门的人准备。", "彭定邦"),
	entry(
		"CH03_GATE_ATTACK_OIL_PRESS",
		"narration",
		"杜家榨房与大院相连。火势和浓烟一旦起来，院内的守卫就不得不分神，也更难守住原来的位置。",
	),
];

export const CH03_FIRE_SYNC_INTRO: NarrativeEntry[] = [
	entry(
		"CH03_FIRE_SYNC_REAR",
		"narration",
		"后院方向先传来一阵急促脚步。有人似乎想从墙后翻出，紧接着是一声喝止和身体落地的闷响。",
	),
	entry(
		"CH03_FIRE_SYNC_STREET",
		"narration",
		"街面方向的铁皮桶爆响没有停止，反而更密。",
	),
	entry(
		"CH03_FIRE_SYNC_SMOKE",
		"narration",
		"大院侧边升起一股烟。起初只有薄薄一层，随后火光从榨房方向映到院墙上。墙内的人影来回跑动，原本守在正门附近的团丁也开始向侧院退去。",
	),
	entry("CH03_FIRE_SYNC_SHOUT", "dialogue", "榨房着了！", "场外声音｜院内"),
	entry(
		"CH03_FIRE_SYNC_CHAOS",
		"narration",
		"榨房着了。先过墙的是烟，后过墙的是火。火不是只为烧开一条路。院里的脚步声全乱了。有人喊救火，有人往后院跑，有人还钉在前门，却不知道该看哪头。街上的爆响越来越密。原本坚固的前门，此刻只能堵住他们自己的生路。",
	),
	entry("CH03_FIRE_SYNC_GROUP_LEADER", "dialogue", "前面让开！准备撞门！", "组长"),
];

export function buildChapter3GateEntryFeedback(
	id: GateEntryChoiceId,
): NarrativeEntry[] {
	switch (id) {
		case "A":
			return [
				entry("CH03_GATE_ENTRY_A_PENG", "dialogue", "听我数！别抢！", "彭定邦"),
				entry(
					"CH03_GATE_ENTRY_A_FORCE",
					"narration",
					"你握住木柱后段，在口令落下时向前送力。木柱撞上门板，震动从掌心一直顶到肩膀。",
				),
			];
		case "B":
			return [
				entry(
					"CH03_GATE_ENTRY_B_STABILIZE",
					"narration",
					"你看见旁边队员脚下踩到散落的木片，便用手臂顶住他。等他重新站稳，才跟上下一次撞击。",
				),
			];
		case "C":
			return [
				entry(
					"CH03_GATE_ENTRY_C_REBOUND",
					"narration",
					"撞击后，木柱向后弹回。你没有抢着往前，而是压住回弹的力量，让前面的人能重新调整位置。",
				),
				entry(
					"CH03_GATE_ENTRY_C_NARRATION",
					"narration",
					"这不是最显眼的位置。但如果木柱失去控制，下一次撞击就要重新来过。",
				),
			];
		case "D":
			return [
				entry("CH03_GATE_ENTRY_D_MEMBER", "dialogue", "后面有人守着，你翻进去做什么？", "队员"),
				entry("CH03_GATE_ENTRY_D_LEADER", "dialogue", "回来，前门缺人。", "组长"),
			];
	}
}

export function buildChapter3GateAttackFailureTask(failure: RiskFailure) {
	return {
		title: "行动前撤换",
		detail: `交互三使${failure === "coordination" ? "协同" : failure === "execution" ? "执行" : "身份"}风险达到失败阈值。你不会进入行动核心，系统将返回“陈继南家中醒来”节点。`,
	};
}
