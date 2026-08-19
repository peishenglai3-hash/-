import type {
	FormalChoiceDefinition,
	ProfileDelta,
	RiskDelta,
} from "@/common/actionProfileSystem";
import type { NarrativeEntry } from "@/stores/modules/hud";

export type FlashbackThreeChoiceId = "A" | "B" | "C" | "D";

export const CH03_FLASHBACK3_FLAGS = {
	started: "CH03_FLASHBACK3_STARTED",
	choiceA: "CH03_FLASHBACK3_A",
	choiceB: "CH03_FLASHBACK3_B",
	choiceC: "CH03_FLASHBACK3_C",
	choiceD: "CH03_FLASHBACK3_D",
	complete: "CH03_FLASHBACK3_COMPLETE",
} as const;

export const CH03_FLASHBACK3_CURRENT_SITUATION = [
	"门内仍在吃喝，门外的人还没有散去。",
	"你没有立刻能改变这一夜的办法。你只能看见：食物被剩下，有人在等待，而门槛把两边的人隔开。",
];

export const CH03_FLASHBACK3_INTRO_THOUGHTS: NarrativeEntry[] = [
	{
		entry_id: "CH03_FLASHBACK3_INTRO_THOUGHT_01",
		kind: "thought",
		speaker_name: "心理描写",
		text: "我不是不知道这里出了问题。",
		style: "thought",
		cps: 12,
	},
	{
		entry_id: "CH03_FLASHBACK3_INTRO_THOUGHT_02",
		kind: "thought",
		speaker_name: "心理描写",
		text: "真正让我停住的是：看见以后，到底该先做什么；而无论先做什么，似乎都不够。",
		style: "thought",
		cps: 11,
	},
];

export interface FlashbackThreeChoice {
	id: FlashbackThreeChoiceId;
	label: string;
	detail: string;
	flag: string;
	profileDelta: ProfileDelta;
	riskDelta: RiskDelta;
	thoughts: NarrativeEntry[];
}

function thought(
	id: string,
	text: string,
	kind: NarrativeEntry["kind"] = "thought",
): NarrativeEntry {
	return {
		entry_id: id,
		kind,
		speaker_name: kind === "narration" ? "旁白" : "心理描写",
		text,
		style: kind,
		cps: kind === "narration" ? 11 : 12,
	};
}

export const CH03_FLASHBACK3_CHOICES: FlashbackThreeChoice[] = [
	{
		id: "A",
		label: "先让眼前的人撑过今晚，别的事才能往后谈。",
		detail: "个人担当 +3；情境调适 +1",
		flag: CH03_FLASHBACK3_FLAGS.choiceA,
		profileDelta: { I: 3, A: 1 },
		riskDelta: {},
		thoughts: [
			thought(
				"CH03_FLASHBACK3_A_THOUGHT_01",
				"人饿着的时候，太远的话解决不了眼前的事。",
			),
		],
	},
	{
		id: "B",
		label: "一口吃的能救急，却救不了所有人。",
		detail: "审慎判断 +2；组织协同 +2",
		flag: CH03_FLASHBACK3_FLAGS.choiceB,
		profileDelta: { C: 2, G: 2 },
		riskDelta: {},
		thoughts: [
			thought("CH03_FLASHBACK3_B_THOUGHT_01", "救急不能不做。"),
			thought(
				"CH03_FLASHBACK3_B_THOUGHT_02",
				"可如果每一次都只能等着施舍，门外的人就永远没有真正离开门外。",
			),
		],
	},
	{
		id: "C",
		label: "门内的人未必都亲手赶过谁，但这道门一直有人维护。",
		detail: "原则坚持 +2；审慎判断 +2",
		flag: CH03_FLASHBACK3_FLAGS.choiceC,
		profileDelta: { P: 2, C: 2 },
		riskDelta: {},
		thoughts: [
			thought(
				"CH03_FLASHBACK3_C_NARRATION",
				"门内外的距离由许多东西共同造成：钱、身份、秩序、习惯，以及谁有资格决定食物如何分配。",
				"narration",
			),
			thought(
				"CH03_FLASHBACK3_C_THOUGHT_01",
				"问题不只是某一个人的冷漠。",
			),
			thought(
				"CH03_FLASHBACK3_C_THOUGHT_02",
				"它已经变成了一种人人都习惯、却总有人被挡在外面的规矩。",
			),
		],
	},
	{
		id: "D",
		label: "看见了，就不能再把自己放在门外，当作与我无关。",
		detail: "行动决断 +2；个人担当 +2",
		flag: CH03_FLASHBACK3_FLAGS.choiceD,
		profileDelta: { D: 2, I: 2 },
		riskDelta: {},
		thoughts: [
			thought(
				"CH03_FLASHBACK3_D_THOUGHT_01",
				"行动未必立刻有结果。",
			),
			thought(
				"CH03_FLASHBACK3_D_THOUGHT_02",
				"可如果永远等到自己完全准备好，可能就永远不会迈出第一步。",
			),
		],
	},
];

function choiceIdFromPanelId(id: string): FlashbackThreeChoiceId | null {
	const suffix = id.slice(-1);
	return suffix === "A" || suffix === "B" || suffix === "C" || suffix === "D" ? suffix : null;
}

/** 闪回三的唯一正式选择入口，和第三章其余选择共享同一后台契约。 */
export function buildChapter3Flashback3FormalChoice(id: string): FormalChoiceDefinition | null {
	const choiceId = choiceIdFromPanelId(id);
	if (!choiceId) return null;
	const choice = CH03_FLASHBACK3_CHOICES.find((item) => item.id === choiceId);
	if (!choice) return null;
	return {
		choiceId: `CH03_FLASHBACK3_${choice.id}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: choice.profileDelta,
		riskChange: choice.riskDelta,
		flag: choice.flag,
		echoSummary: choice.label,
		failureCheck: false,
	};
}

export const CH03_FLASHBACK3_ENTRY_TASK = {
	title: "闪回三：站在门外时，你最先意识到什么？",
	detail: "等待行动时的观察已经完成。按 E 进入闪回三。",
};

export const CH03_ACTION_START_TASK = {
	title: "行动开始：三路同时展开",
	detail: "闪回已经结束。杜家大院外围的队伍正在等待最后信号，下一段将从三路同时展开的行动开始。",
};
