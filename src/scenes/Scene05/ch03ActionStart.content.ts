import type { ChoiceItem, NarrativeEntry } from "@/stores/modules/hud";
import { assetPath } from "@/common/paths";
import type {
	FormalChoiceDefinition,
	ProfileDelta,
	RiskDelta,
	RiskFailure,
} from "@/common/actionProfileSystem";
import type { Chapter3TaskPermission } from "./ch03RiskPrecheck";

export type ActionStartChoiceId = "A" | "B" | "C" | "D";

export const CH03_ACTION_FLAGS = {
	started: "CH03_ACTION_START_STARTED",
	gateClosed: "CH03_ACTION_GATE_CLOSED",
	choiceStarted: "CH03_ACTION_OBSERVE_STARTED",
	choiceA: "CH03_ACTION_OBSERVE_A",
	choiceB: "CH03_ACTION_OBSERVE_B",
	choiceC: "CH03_ACTION_OBSERVE_C",
	choiceD: "CH03_ACTION_OBSERVE_D",
	choiceComplete: "CH03_ACTION_OBSERVE_COMPLETE",
	complete: "CH03_ACTION_START_COMPLETE",
	replacement: "CH03_ACTION_REPLACEMENT",
	positionAbandoned: "POSITION_ABANDONED",
} as const;

export const CH03_ACTION_IMAGE_KEYS: Record<ActionStartChoiceId, string> = {
	A: "ch03_action_A",
	B: "ch03_action_B",
	C: "ch03_action_C",
	D: "ch03_action_D",
};

const CH03_ACTION_IMAGE_PATHS: Record<ActionStartChoiceId, string> = {
	A: assetPath("/assets/ch03/action/branch04/branch04-A.png"),
	B: assetPath("/assets/ch03/action/branch04/branch04-B.png"),
	C: assetPath("/assets/ch03/action/branch04/branch04-C.png"),
	D: assetPath("/assets/ch03/action/branch04/branch04-D.png"),
};

const CHOICE_LABELS: Record<ActionStartChoiceId, string> = {
	A: "留意门缝和墙根，防止有人从前门摸出报信",
	B: "确认本组人员仍能互相照应",
	C: "检查被分配物件是否适合转移",
	D: "趁院内混乱，试图独自贴近大门",
};

export function actionImagePath(id: ActionStartChoiceId): string {
	return CH03_ACTION_IMAGE_PATHS[id];
}

export function isForwardActionPermission(
	permission: Chapter3TaskPermission,
): boolean {
	return permission === "FORWARD_SUPPORT";
}

export function buildChapter3ActionChoices(
	permission: Chapter3TaskPermission,
): ChoiceItem[] {
	const forwardSupport = isForwardActionPermission(permission);
	return [
		{
			id: "CH03_ACTION_OBSERVE_A",
			label: CHOICE_LABELS.A,
			detail: "审慎判断 +2；原则坚持 +1；执行风险 -1",
		},
		{
			id: "CH03_ACTION_OBSERVE_B",
			label: CHOICE_LABELS.B,
			detail: "组织协同 +3；情境调适 +1；协同风险 -1",
		},
		{
			id: "CH03_ACTION_OBSERVE_C",
			label: CHOICE_LABELS.C,
			detail: forwardSupport
				? "个人担当 +1；审慎判断 +2；执行风险 -1"
				: "仅前方辅助任务开放",
			disabled: !forwardSupport,
		},
		{
			id: "CH03_ACTION_OBSERVE_D",
			label: CHOICE_LABELS.D,
			detail: "行动决断 +2；执行风险 +1；协同风险 +2",
		},
	];
}

function choiceIdFromPanelId(id: string): ActionStartChoiceId | null {
	const suffix = id.slice(-1);
	return suffix === "A" || suffix === "B" || suffix === "C" || suffix === "D"
		? suffix
		: null;
}

function choiceFlag(id: ActionStartChoiceId): string {
	return {
		A: CH03_ACTION_FLAGS.choiceA,
		B: CH03_ACTION_FLAGS.choiceB,
		C: CH03_ACTION_FLAGS.choiceC,
		D: CH03_ACTION_FLAGS.choiceD,
	}[id];
}

export interface ActionStartChoiceContext {
	permission: Chapter3TaskPermission;
	coordinationRiskHigh: boolean;
}

/** 将交互二接入统一的正式选择入口，避免场景自行改写画像和风险。 */
export function buildChapter3ActionFormalChoice(
	id: string,
	context: ActionStartChoiceContext,
): FormalChoiceDefinition | null {
	const choice = choiceIdFromPanelId(id);
	if (!choice) return null;
	if (choice === "C" && !isForwardActionPermission(context.permission))
		return null;

	const profileByChoice: Record<ActionStartChoiceId, ProfileDelta> = {
		A: { C: 2, P: 1 },
		B: { G: 3, A: 1 },
		C: { I: 1, C: 2 },
		D: { D: 2 },
	};
	const riskByChoice: Record<ActionStartChoiceId, RiskDelta> = {
		A: { execution: -1 },
		B: { coordination: -1 },
		C: { execution: -1 },
		D: { execution: 1, coordination: 2 },
	};

	return {
		choiceId: `CH03_ACTION_OBSERVE_${choice}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: profileByChoice[choice],
		riskChange: riskByChoice[choice],
		flag: choiceFlag(choice),
		tags:
			choice === "D" && context.coordinationRiskHigh
				? [CH03_ACTION_FLAGS.positionAbandoned]
				: [],
		echoSummary: CHOICE_LABELS[choice],
		failureCheck: true,
	};
}

function entry(
	id: string,
	kind: NarrativeEntry["kind"],
	text: string,
	speaker_name?: string,
): NarrativeEntry {
	return {
		entry_id: id,
		kind,
		text,
		...(speaker_name ? { speaker_name } : {}),
		style:
			kind === "dialogue"
				? "dialogue"
				: kind === "thought"
					? "thought"
					: "narration",
		cps: kind === "dialogue" ? 14 : 11,
	};
}

export const CH03_ACTION_INTRO: NarrativeEntry[] = [
	entry(
		"CH03_ACTION_START_BURST_01",
		"narration",
		"街面方向先传来一串爆响。声音不完全像零散鞭炮。铁皮桶把回声压得又闷又密，隔着院墙听去，像远处有人连续开枪。",
	),
	entry(
		"CH03_ACTION_START_STREET_SHOUT_01",
		"dialogue",
		"围住了！",
		"场外声音｜街面方向",
	),
	entry(
		"CH03_ACTION_START_STREET_SHOUT_02",
		"dialogue",
		"不要让他们报信！",
		"场外声音｜街面方向",
	),
	entry(
		"CH03_ACTION_START_BURST_02",
		"narration",
		"呼喊很快被新一轮爆响打断。",
	),
	entry(
		"CH03_ACTION_START_LIGHTS",
		"narration",
		"大院内的灯光接连晃动。正门边的团丁猛地站直，回头向院内喊话。另一人几步退到门后。",
	),
	entry(
		"CH03_ACTION_START_DOOR",
		"narration",
		"木门从里面被重重合上。门闩落下。",
	),
	entry(
		"CH03_ACTION_START_MILITIA_CALL",
		"dialogue",
		"街上来了多少人？",
		"场外声音｜院内团丁",
	),
	entry("CH03_ACTION_START_NO_REPLY", "narration", "没有人回答。"),
	entry(
		"CH03_ACTION_START_REAR_ROUTE",
		"narration",
		"后院方向传来一声短促的喝止，接着是脚步踩过木板的声音。",
	),
	entry(
		"CH03_ACTION_START_THREE_ROUTES",
		"narration",
		"后院一路已经堵住了后门。街面一路没有直接进入院内，却把声势压在四周。院里的人无法判断外面究竟有多少队伍，只能听见一阵接一阵的爆响和呼喊。",
	),
	entry(
		"CH03_ACTION_START_FRONT_HOLD",
		"narration",
		"前门这一组没有立刻冲出去。先要守住门口，等待下一步行动。",
	),
];

export function buildChapter3ActionFeedback(
	id: ActionStartChoiceId,
	context: ActionStartChoiceContext,
): NarrativeEntry[] {
	switch (id) {
		case "A":
			return [
				entry(
					"CH03_ACTION_A_OBSERVE",
					"narration",
					"你压低身体，盯住门边和墙根。门内有人撞了一下门板，又很快退开。你向组长示意门后仍有人活动。",
				),
				entry("CH03_ACTION_A_LEADER", "dialogue", "盯住。", "组长"),
				entry(
					"CH03_ACTION_A_THOUGHT",
					"thought",
					"真正要看住的，不只是门本身，还有门内外消息如何流动。",
					"心理描写",
				),
			];
		case "B":
			return [
				entry(
					"CH03_ACTION_B_CHECK",
					"narration",
					"你沿着本组藏身的位置逐一确认。有人因为爆响而想往前探，被同伴按住肩膀；有人握得太紧，手里的物件已经发出轻微碰撞声，你提醒他把物件贴近衣侧。队员看向你，朝你点了点头。",
				),
				entry(
					"CH03_ACTION_B_THOUGHT",
					"thought",
					"有人在，彼此能照应，才不至于在声响里各自失去位置。",
					"心理描写",
				),
			];
		case "C":
			return [
				entry(
					"CH03_ACTION_C_CHECK",
					"narration",
					"你检查自己被明确分配的物件和绳结，确认移动时不会拖出声响。",
				),
				entry(
					"CH03_ACTION_C_THOUGHT",
					"thought",
					"手里的东西只要在该动的时候不掉链子，就已经是准备的一部分。",
					"心理描写",
				),
			];
		case "D":
			return [
				entry(
					"CH03_ACTION_D_LEADER_STOP",
					"dialogue",
					"前门关着，街上在响。你现在过去，就是给里面的人指位置。",
					"组长",
				),
				...(context.coordinationRiskHigh
					? [
							entry(
								"CH03_ACTION_D_RESTRICTED",
								"dialogue",
								"留在后面。前面不用你了。",
								"组长",
							),
						]
					: [
							entry(
								"CH03_ACTION_D_RETURN",
								"dialogue",
								"回来。不要再离开。",
								"组长",
							),
						]),
				entry(
					"CH03_ACTION_D_THOUGHT",
					"thought",
					"我以为靠近一步就能看得更清楚，可这一刻，靠近本身就可能变成暴露。",
					"心理描写",
				),
			];
	}
}

export function buildChapter3ActionFailureTask(failure: RiskFailure) {
	return {
		title: "行动前撤换",
		detail: "当前安排已经收紧。你不会进入行动核心，接下来会返回“陈继南家中醒来”节点。",
	};
}
