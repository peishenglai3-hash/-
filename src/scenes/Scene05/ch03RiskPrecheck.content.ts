import type { NarrativeEntry } from "@/stores/modules/hud";
import type { Chapter3TaskAssignment } from "./ch03RiskPrecheck";

export const CH03_RISK_PRECHECK_INTRO: NarrativeEntry[] = [
	{
		entry_id: "CH03_RISK_PRECHECK_WAIT_POSITION",
		kind: "narration",
		text: "组长没有立即说明行动安排。他先看了看你，又看向负责传递消息的队员。",
		style: "narration",
		cps: 11,
	},
	{
		entry_id: "CH03_RISK_PRECHECK_LEADER_HOLD",
		kind: "dialogue",
		speaker_name: "组长",
		text: "在原来的位置待着。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH03_RISK_PRECHECK_WHISPER",
		kind: "narration",
		text: "那名队员靠近组长，低声说了几句话。内容听不完整，只能听见“刚才”“门口”和“别让他靠前”等词。",
		style: "narration",
		cps: 10,
	},
	{
		entry_id: "CH03_RISK_PRECHECK_REASSIGN",
		kind: "narration",
		text: "组长沉默片刻，重新分配人员。",
		style: "narration",
		cps: 13,
	},
	{
		entry_id: "CH03_RISK_PRECHECK_HISTORY",
		kind: "narration",
		text: "从陈家祠堂到这里，你已经经历了几次选择。那些选择不会改变今晚行动的历史结果，却会影响别人判断你是否适合靠近行动中心。",
		style: "narration",
		cps: 10,
	},
	{
		entry_id: "CH03_RISK_PRECHECK_THOUGHT",
		kind: "thought",
		speaker_name: "心理描写",
		text: "原来我做过的事，已经先于我抵达这里。",
		style: "thought",
		cps: 12,
	},
];

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
		cps: kind === "dialogue" ? 13 : 11,
	};
}

export function buildChapter3RiskInfo(
	assignment: Chapter3TaskAssignment,
): string[] {
	return [
		!assignment.access.canContinue
			? "重新安排已经完成。你暂时不会进入行动核心。"
			: assignment.permission === "FORWARD_SUPPORT"
				? "重新安排已经完成。你仍被允许继续参与行动。"
				: "重新安排已经完成。你仍可继续参与，但会从较远的位置开始。",
	];
}

export function buildChapter3RiskBranch(
	assignment: Chapter3TaskAssignment,
): NarrativeEntry[] {
	if (assignment.permission === "WITHDRAWN")
		return buildChapter3RiskFailure();
	if (assignment.permission === "ESCORTED_SUPPORT") {
		return [
			entry("CH03_RISK_ESCORT_LEADER", "dialogue", "你跟他。", "组长"),
			entry(
				"CH03_RISK_ESCORT_ARRIVE",
				"narration",
				"一名年长队员站到你身旁，位置不近，却始终能够看见你的动作。",
			),
			entry(
				"CH03_RISK_ESCORT_MEMBER",
				"dialogue",
				"我往哪儿走，你往哪儿走。",
				"年长队员",
			),
			entry(
				"CH03_RISK_ESCORT_PLAYER",
				"dialogue",
				"具体要做什么？",
				"陈继南",
			),
			entry(
				"CH03_RISK_ESCORT_LEADER_BUSY",
				"narration",
				"组长没有回答，而是转向另一名队员继续交代。",
			),
			entry(
				"CH03_RISK_ESCORT_LIMIT",
				"narration",
				"你没有被赶走，也没有被捆住。但从这一刻开始，你不能自由接近其他小组，也不会被告知全部安排。有人始终跟着你，既是保护，也是监视。",
			),
			entry(
				"CH03_RISK_ESCORT_THOUGHT",
				"thought",
				"我被允许继续参与，却不能再把好奇当成接近行动中心的理由。",
				"心理描写",
			),
		];
	}
	if (assignment.permission === "REAR_SUPPORT") {
		return [
			entry(
				"CH03_RISK_REAR_SUPPLY_LEADER",
				"dialogue",
				"你跟后面。",
				"组长",
			),
			entry(
				"CH03_RISK_REAR_SUPPLY_LOOK",
				"narration",
				"你看向墙边的包裹。",
			),
			entry(
				"CH03_RISK_REAR_SUPPLY_ORDER",
				"dialogue",
				"东西不用你拿。听见传话，就把话递过去。",
				"组长",
			),
			entry(
				"CH03_RISK_REAR_SUPPLY_PLAYER",
				"dialogue",
				"我不能帮着搬？",
				"陈继南",
			),
			entry(
				"CH03_RISK_REAR_SUPPLY_REPLY",
				"dialogue",
				"先把该做的做好。",
				"组长",
			),
			entry(
				"CH03_RISK_REAR_SUPPLY_NARRATION",
				"narration",
				"一名队员接过原本可能交给你的物件。你被安排在传话和后方照应的位置，行动中仍然参与，但不能擅自碰触或移动行动物资。",
			),
			entry(
				"CH03_RISK_REAR_SUPPLY_THOUGHT",
				"thought",
				"我失去了一项前方物资交接任务，却获得了更多观察外围和队伍状态的机会。",
				"心理描写",
			),
		];
	}
	if (assignment.permission === "REAR_COORDINATION") {
		return [
			entry(
				"CH03_RISK_REAR_COORD_LEADER",
				"dialogue",
				"你留在这边。",
				"组长",
			),
			entry(
				"CH03_RISK_REAR_COORD_PLAYER",
				"dialogue",
				"不是跟前面一起？",
				"陈继南",
			),
			entry(
				"CH03_RISK_REAR_COORD_ORDER",
				"dialogue",
				"前面的人够了。看好后面。有人走散，先报回来。没叫你靠前，不准自己往前。",
				"组长",
			),
			entry(
				"CH03_RISK_REAR_COORD_NARRATION",
				"narration",
				"这不是把你排除在行动之外。队伍分散接近，前方、后方和街面都需要有人确认消息没有中断。只是从这里开始，你无法通过身体动作参与攻门，只能从较远的位置听见和判断行动进展。",
			),
			entry(
				"CH03_RISK_REAR_COORD_THOUGHT",
				"thought",
				"靠近行动中心并不等于更有用。有时，先让消息不断，才是眼下能完成的事。",
				"心理描写",
			),
		];
	}
	return [
		entry(
			"CH03_RISK_FORWARD_LEADER",
			"dialogue",
			"你还跟着这一组。",
			"组长",
		),
		entry("CH03_RISK_FORWARD_POINT", "narration", "他指向靠近土路的位置。"),
		entry(
			"CH03_RISK_FORWARD_ORDER",
			"dialogue",
			"等信号，帮忙递东西。什么时候动，看前面的人。",
			"组长",
		),
		entry(
			"CH03_RISK_FORWARD_GATE_LEADER",
			"dialogue",
			"彭定邦带人动的时候，你只听他的口令。不要抢在前面。",
			"组长",
		),
		entry(
			"CH03_RISK_FORWARD_HISTORY_BOUNDARY",
			"narration",
			"你被安排在攻门队伍附近进行辅助，但不能代替彭定邦完成攻门，也不会获得指挥权。",
		),
		entry(
			"CH03_RISK_FORWARD_SCOPE",
			"narration",
			"你可以参与传递已经分配的行动物资，协助搬动用于制造声势的物件，在需要时靠近大门辅助推门，行动后协助看守集中起来的物件。",
		),
		entry(
			"CH03_RISK_FORWARD_THOUGHT",
			"thought",
			"我还在队伍前方，但能做什么、什么时候做，都要等前面的人先动。",
			"心理描写",
		),
	];
}

export function buildChapter3RiskFailure(): NarrativeEntry[] {
	return [
		entry(
			"CH03_RISK_FAILURE_LEADER",
			"dialogue",
			"先停在原来的位置。",
			"组长",
		),
		entry(
			"CH03_RISK_FAILURE_NARRATION",
			"narration",
			"传话队员站到你和前方队伍之间。组长没有再向你说明行动细节。",
		),
		entry(
			"CH03_RISK_FAILURE_THOUGHT",
			"thought",
			"我还没有真正进入行动核心，事情已经先替我做出了决定。",
			"心理描写",
		),
	];
}

export function buildChapter3RiskCompleteTask(
	assignment: Chapter3TaskAssignment,
) {
	if (assignment.permission === "WITHDRAWN") {
		return {
			title: "行动前重新安排｜暂停参与",
			detail: "当前安排不再允许你进入杜家大院行动核心，接下来会回到“陈继南家中醒来”节点。",
		};
	}
	return {
		title: "行动前重新安排｜已完成",
		detail: "安排已经完成。下一段为“等待行动时的观察”。",
	};
}
