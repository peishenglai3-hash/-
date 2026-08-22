import type { NarrativeEntry, ChoiceItem } from "@/stores/modules/hud";
import { assetPath } from "@/common/paths";
import type {
	FormalChoiceDefinition,
	RiskFailure,
} from "@/common/actionProfileSystem";
import type { Chapter3TaskPermission } from "./ch03RiskPrecheck";

export type ObservationChoiceId = "A" | "B" | "C" | "D";

export const CH03_OBSERVATION_FLAGS = {
	started: "CH03_OBSERVATION_STARTED",
	complete: "CH03_OBSERVATION_COMPLETE",
	replacement: "CH03_ACTION_REPLACEMENT",
	choiceA: "CH03_OBSERVATION_A",
	choiceB: "CH03_OBSERVATION_B",
	choiceC: "CH03_OBSERVATION_C",
	choiceD: "CH03_OBSERVATION_D",
	gateObserved: "GATE_OBSERVED",
	movementRestricted: "MOVEMENT_RESTRICTED",
} as const;

export const CH03_OBSERVATION_IMAGE_KEYS: Record<ObservationChoiceId, string> =
	{
		A: "ch03_observation_A",
		B: "ch03_observation_B",
		C: "ch03_observation_C",
		D: "ch03_observation_D",
	};

const CH03_OBSERVATION_IMAGE_PATHS: Record<ObservationChoiceId, string> = {
	A: assetPath("/assets/ch03/observation/observation-A.png"),
	B: assetPath("/assets/ch03/observation/observation-B.png"),
	C: assetPath("/assets/ch03/observation/observation-C.png"),
	D: assetPath("/assets/ch03/observation/observation-D.png"),
};

const CHOICE_LABELS: Record<ObservationChoiceId, string> = {
	A: "观察大门和守卫位置",
	B: "确认组长和队员都在指定位置",
	C: "检查自己负责的物资",
	D: "试图离开隐蔽位置，靠近大院查看",
};

export function observationImagePath(id: ObservationChoiceId): string {
	return CH03_OBSERVATION_IMAGE_PATHS[id];
}

export function isForwardObservationPermission(
	permission: Chapter3TaskPermission,
): boolean {
	return permission === "FORWARD_SUPPORT";
}

export function buildChapter3ObservationChoices(
	permission: Chapter3TaskPermission,
): ChoiceItem[] {
	const forwardSupport = isForwardObservationPermission(permission);
	return [
		{
			id: "CH03_OBSERVATION_A",
			label: CHOICE_LABELS.A,
			detail: forwardSupport
				? "审慎判断 +3；执行风险 -1"
				: "审慎判断 +2；执行风险 -1；后方任务追加 GATE_OBSERVED",
		},
		{
			id: "CH03_OBSERVATION_B",
			label: CHOICE_LABELS.B,
			detail: "组织协同 +3；协同风险 -1",
		},
		{
			id: "CH03_OBSERVATION_C",
			label: CHOICE_LABELS.C,
			detail: forwardSupport
				? "个人担当 +1、审慎判断 +2；执行风险 -1"
				: "仅前方辅助任务开放",
			disabled: !forwardSupport,
		},
		{
			id: "CH03_OBSERVATION_D",
			label: CHOICE_LABELS.D,
			detail: "行动决断 +2；执行风险 +1、协同风险 +2",
		},
	].map((item) => ({
		...item,
		id: item.id,
	}));
}

function choiceIdFromPanelId(id: string): ObservationChoiceId | null {
	const suffix = id.slice(-1);
	return suffix === "A" || suffix === "B" || suffix === "C" || suffix === "D"
		? suffix
		: null;
}

export interface ObservationChoiceContext {
	permission: Chapter3TaskPermission;
	coordinationRiskHigh: boolean;
}

function choiceFlag(id: ObservationChoiceId): string {
	return {
		A: CH03_OBSERVATION_FLAGS.choiceA,
		B: CH03_OBSERVATION_FLAGS.choiceB,
		C: CH03_OBSERVATION_FLAGS.choiceC,
		D: CH03_OBSERVATION_FLAGS.choiceD,
	}[id];
}

/** 将当前选项转换成唯一的正式选择定义，数值仍由统一系统入口提交。 */
export function buildChapter3ObservationFormalChoice(
	id: string,
	context: ObservationChoiceContext,
): FormalChoiceDefinition | null {
	const choice = choiceIdFromPanelId(id);
	if (!choice) return null;
	if (choice === "C" && !isForwardObservationPermission(context.permission))
		return null;

	const profileByChoice = {
		A: { C: context.permission === "FORWARD_SUPPORT" ? 3 : 2 },
		B: { G: 3 },
		C: { I: 1, C: 2 },
		D: { D: 2 },
	} as const;
	const riskByChoice = {
		A: { execution: -1 },
		B: { coordination: -1 },
		C: { execution: -1 },
		D: { execution: 1, coordination: 2 },
	} as const;

	const tags: string[] = [];
	if (choice === "A" && !isForwardObservationPermission(context.permission))
		tags.push(CH03_OBSERVATION_FLAGS.gateObserved);
	if (choice === "D" && context.coordinationRiskHigh)
		tags.push(CH03_OBSERVATION_FLAGS.movementRestricted);

	return {
		choiceId: `CH03_OBSERVATION_${choice}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: profileByChoice[choice],
		riskChange: riskByChoice[choice],
		flag: choiceFlag(choice),
		tags,
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

export function buildChapter3ObservationFeedback(
	id: ObservationChoiceId,
	context: ObservationChoiceContext,
): NarrativeEntry[] {
	switch (id) {
		case "A":
			return [
				entry(
					"CH03_OBSERVATION_A_THOUGHT_1",
					"thought",
					"门口的人并没有完全放松。",
					"心理描写",
				),
				entry(
					"CH03_OBSERVATION_A_THOUGHT_2",
					"thought",
					"但他们的注意力被院内的声音牵走了。真正需要确认的，不是他们有没有防备，而是他们有没有发现墙外这些人。",
					"心理描写",
				),
				entry(
					"CH03_OBSERVATION_A_LEADER",
					"dialogue",
					context.permission === "FORWARD_SUPPORT"
						? "记住门口的位置。等前面动，你跟着传话。"
						: "看清就行。不要自己靠过去。",
					"组长",
				),
			];
		case "B":
			return [
				entry("CH03_OBSERVATION_B_REPLY", "dialogue", "我在。", "队员"),
				entry(
					"CH03_OBSERVATION_B_CHECK",
					"narration",
					"另一边没有回答。组长没有让人高声呼喊，而是派一名熟悉情况的人沿墙根确认。片刻后，那人回来点头。",
				),
				entry(
					"CH03_OBSERVATION_B_LEADER",
					"dialogue",
					"人齐。",
					"组长",
				),
				entry(
					"CH03_OBSERVATION_B_THOUGHT_1",
					"thought",
					"人齐不是一句让人安心的话。",
					"心理描写",
				),
				entry(
					"CH03_OBSERVATION_B_THOUGHT_2",
					"thought",
					"它意味着接下来每一个位置都有人承担，也意味着每一个人都不可或缺。",
					"心理描写",
				),
			];
		case "C":
			return [
				entry(
					"CH03_OBSERVATION_C_LEADER",
					"dialogue",
					"只看你手里的。别碰旁边的。",
					"组长",
				),
				entry(
					"CH03_OBSERVATION_C_CHECK",
					"narration",
					"你检查绳结和外层包布。你无法确认物件的全部用途，只能确认它是否松脱、是否容易在移动时发出声响。",
				),
				entry(
					"CH03_OBSERVATION_C_THOUGHT_1",
					"thought",
					"准备工作不是把一切都弄清楚。",
					"心理描写",
				),
				entry(
					"CH03_OBSERVATION_C_THOUGHT_2",
					"thought",
					"做好自己该做的。",
					"心理描写",
				),
			];
		case "D":
			return [
				entry(
					"CH03_OBSERVATION_D_LEADER_STOP",
					"dialogue",
					"回来。",
					"组长",
				),
				entry(
					"CH03_OBSERVATION_D_PLAYER",
					"dialogue",
					"我只是想看清楚。",
					"陈继南",
				),
				entry(
					"CH03_OBSERVATION_D_LEADER_REPLY",
					"dialogue",
					"看不清就等传话。现在靠近，只有让里面的人看见。",
					"组长",
				),
				...(context.coordinationRiskHigh
					? [
							entry(
								"CH03_OBSERVATION_D_RESTRICTED",
								"dialogue",
								"从现在起，他跟着你。",
								"组长",
							),
						]
					: [
							entry(
								"CH03_OBSERVATION_D_RETURN",
								"dialogue",
								"不要再离开。",
								"组长",
							),
						]),
			];
	}
}

export function buildChapter3ObservationCompleteTask(
	permission: Chapter3TaskPermission,
	failure: RiskFailure | null,
) {
	if (failure) {
		return {
			title: "行动前撤换",
			detail: `观察选择使${failure === "coordination" ? "协同" : failure === "execution" ? "执行" : "身份"}风险达到失败阈值。你不会进入行动核心，系统将返回“陈继南家中醒来”节点。`,
		};
	}
	return {
		title: "交互一｜等待行动时的观察",
		detail: `观察已完成。当前任务权限：${permission === "FORWARD_SUPPORT" ? "前方辅助" : "受限支援"}；等待后续行动安排。`,
	};
}
