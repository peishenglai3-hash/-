import type { ChoiceItem, NarrativeEntry } from "@/stores/modules/hud";
import { assetPath } from "@/common/paths";
import type {
	FormalChoiceDefinition,
	ProfileDelta,
	RiskDelta,
} from "@/common/actionProfileSystem";

export type ClearingChoiceId = "A" | "B" | "C" | "D";
export type MooncakeChoiceId = "A" | "B" | "C" | "D";
export type MooncakeStatus =
	| "MOONCAKE_SHARED"
	| "MOONCAKE_GROUP"
	| "MOONCAKE_SELF"
	| "MOONCAKE_KEPT";

export const CH03_CHAPTER_END_FLAGS = {
	started: "CH03_CHAPTER_END_STARTED",
	complete: "CH03_CHAPTER_END_COMPLETE",
} as const;

export const CH03_CLEARING_FLAGS = {
	started: "CH03_CLEARING_STARTED",
	choiceStarted: "CH03_CLEARING_CHOICE_STARTED",
	choiceA: "CH03_CLEARING_A",
	choiceB: "CH03_CLEARING_B",
	choiceC: "CH03_CLEARING_C",
	choiceD: "CH03_CLEARING_D",
	choiceComplete: "CH03_CLEARING_CHOICE_COMPLETE",
	complete: "CH03_CLEARING_COMPLETE",
} as const;

export const CH03_MOONCAKE_FLAGS = {
	started: "CH03_MOONCAKE_STARTED",
	choiceStarted: "CH03_MOONCAKE_CHOICE_STARTED",
	choiceA: "CH03_MOONCAKE_A",
	choiceB: "CH03_MOONCAKE_B",
	choiceC: "CH03_MOONCAKE_C",
	choiceD: "CH03_MOONCAKE_D",
	choiceComplete: "CH03_MOONCAKE_CHOICE_COMPLETE",
	complete: "CH03_MOONCAKE_COMPLETE",
} as const;

export const CH03_CLEARING_IMAGE_KEYS: Record<ClearingChoiceId, string> = {
	A: "ch03_clearing_A",
	B: "ch03_clearing_B",
	C: "ch03_clearing_C",
	D: "ch03_clearing_D",
};

export const CH03_MOONCAKE_IMAGE_KEYS: Record<MooncakeChoiceId, string> = {
	A: "ch03_mooncake_A",
	B: "ch03_mooncake_B",
	C: "ch03_mooncake_C",
	D: "ch03_mooncake_D",
};

const CLEARING_IMAGE_PATHS: Record<ClearingChoiceId, string> = {
	A: assetPath("/assets/ch03/action/branch08/branch08-A.png"),
	B: assetPath("/assets/ch03/action/branch08/branch08-B.png"),
	C: assetPath("/assets/ch03/action/branch08/branch08-C.png"),
	D: assetPath("/assets/ch03/action/branch08/branch08-D.png"),
};

const MOONCAKE_IMAGE_PATHS: Record<MooncakeChoiceId, string> = {
	A: assetPath("/assets/ch03/action/branch09/branch09-A.png"),
	B: assetPath("/assets/ch03/action/branch09/branch09-B.png"),
	C: assetPath("/assets/ch03/action/branch09/branch09-C.png"),
	D: assetPath("/assets/ch03/action/branch09/branch09-D.png"),
};

const CLEARING_LABELS: Record<ClearingChoiceId, string> = {
	A: "集中缴获的枪支和弹药",
	B: "核对所属小组人员",
	C: "帮助受伤和疲惫的队员",
	D: "私自翻看缴获财物",
};

const MOONCAKE_LABELS: Record<MooncakeChoiceId, string> = {
	A: "分给身边受伤的队员",
	B: "与所属小组队员分食",
	C: "自己吃下一部分，保持体力",
	D: "完整保留下来",
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
		style: kind === "dialogue" ? "dialogue" : kind === "thought" ? "thought" : "narration",
		cps: kind === "dialogue" ? 14 : 11,
	};
}

export const CH03_CLEARING_INTRO: NarrativeEntry[] = [
	entry("CH03_CLEARING_SOUND", "cue", "街面方向的爆响逐渐减少。"),
	entry("CH03_CLEARING_FIRE", "narration", "火焰仍在燃烧，木料偶尔发出爆裂声。院内的脚步声没有完全停止，但已经从奔跑变成来回走动。"),
	entry("CH03_CLEARING_WEAPONS", "narration", "有人把枪支放到同一处。有人在门边喊着本组的名字。有人坐在墙根，捂住受伤的手臂。"),
	entry("CH03_CLEARING_THOUGHT", "narration", "大院已经被攻破。但行动还没有结束。武器不能散落在各处，人员不能在混乱中失散，缴获的物资也不能任由谁先拿走。"),
];

export const CH03_MOONCAKE_INTRO: NarrativeEntry[] = [
	entry("CH03_MOONCAKE_PAUSE", "narration", "清点暂时停下。"),
	entry("CH03_MOONCAKE_TOUCH", "narration", "你摸到衣袋里的月饼。它在行动中被压碎了一角，油纸上沾了泥，仍然能闻到一点甜味。今天是中秋。"),
];

export const CH03_CLEARING_TASK = {
	title: "战后清点：行动结束后的第一件事",
	detail: "街面爆响渐弱，院内仍在清点人员、枪支和缴获物资。前往组长处，听完安排后选择优先协助的事项。",
};

export const CH03_MOONCAKE_TASK = {
	title: "交互六：月饼的处理",
	detail: "清点暂时停下。衣袋里的月饼沾了泥，今天是中秋。前往组长处，决定如何处理它。",
};

export const CH03_AFTERMATH_COMPLETE_TASK = {
	title: "战后清点与集结｜完成",
	detail: "缴获物资、人员清查和月饼的处理已经记录。后续行动将读取本次清点与物件状态。",
};

export const CH03_CHAPTER_END_TASK = {
	title: "行动结束：三路结果汇合",
	detail: "街面声势已经停下，后院守住了出口，前门内正在集中人员、武器和物资。前往组长处，听完三路结果汇合的收束。",
};

export const CH03_CHAPTER_END_INTRO: NarrativeEntry[] = [
	entry("CH03_CHAPTER_END_LAST_BURST", "cue", "街面方向最后一串爆响停下。"),
	entry("CH03_CHAPTER_END_REAR_REPORT", "narration", "后院方向传来两次短促的传话。"),
	entry("CH03_CHAPTER_END_REAR_REPORT_ONE", "dialogue", "人还在。", "队员"),
	entry("CH03_CHAPTER_END_REAR_REPORT_TWO", "dialogue", "后门守住了。", "队员"),
	entry("CH03_CHAPTER_END_FRONT_CLEAR", "narration", "前门内，缴获的枪支和物资被集中到墙边。受伤和疲惫的人被安排坐下。"),
	entry("CH03_CHAPTER_END_NARRATION", "narration", "前门被撞开，院内团丁溃散或被俘。后院一路没有让逃跑者轻易离开。街面一路用爆响和呼喊制造出大于实际人数的声势，也阻断了院内向外报信的可能。"),
	entry("CH03_CHAPTER_END_CLOSING", "narration", "聚是一团火，散是满天星。"),
];

function choiceIdFromPanelId(id: string): ClearingChoiceId | null {
	const suffix = id.slice(-1);
	return suffix === "A" || suffix === "B" || suffix === "C" || suffix === "D" ? suffix : null;
}

function flagForClearing(id: ClearingChoiceId): string {
	return {
		A: CH03_CLEARING_FLAGS.choiceA,
		B: CH03_CLEARING_FLAGS.choiceB,
		C: CH03_CLEARING_FLAGS.choiceC,
		D: CH03_CLEARING_FLAGS.choiceD,
	}[id];
}

function flagForMooncake(id: MooncakeChoiceId): string {
	return {
		A: CH03_MOONCAKE_FLAGS.choiceA,
		B: CH03_MOONCAKE_FLAGS.choiceB,
		C: CH03_MOONCAKE_FLAGS.choiceC,
		D: CH03_MOONCAKE_FLAGS.choiceD,
	}[id];
}

export function clearingImagePath(id: ClearingChoiceId): string {
	return CLEARING_IMAGE_PATHS[id];
}

export function mooncakeImagePath(id: MooncakeChoiceId): string {
	return MOONCAKE_IMAGE_PATHS[id];
}

export function buildChapter3ClearingChoices(): ChoiceItem[] {
	return [
		{ id: "CH03_CLEARING_A", label: CLEARING_LABELS.A, detail: "原则坚持 +2；审慎判断 +2；执行风险 -1" },
		{ id: "CH03_CLEARING_B", label: CLEARING_LABELS.B, detail: "组织协同 +3；个人担当 +1；协同风险 -1" },
		{ id: "CH03_CLEARING_C", label: CLEARING_LABELS.C, detail: "个人担当 +3；情境调适 +1" },
		{ id: "CH03_CLEARING_D", label: CLEARING_LABELS.D, detail: "审慎判断 +1；执行风险 +1；协同风险 +2" },
	];
}

export function buildChapter3MooncakeChoices(): ChoiceItem[] {
	return [
		{ id: "CH03_MOONCAKE_A", label: MOONCAKE_LABELS.A, detail: "个人担当 +3；组织协同 +1；物件状态 MOONCAKE_SHARED" },
		{ id: "CH03_MOONCAKE_B", label: MOONCAKE_LABELS.B, detail: "组织协同 +3；情境调适 +1；物件状态 MOONCAKE_GROUP" },
		{ id: "CH03_MOONCAKE_C", label: MOONCAKE_LABELS.C, detail: "情境调适 +3；审慎判断 +1；物件状态 MOONCAKE_SELF" },
		{ id: "CH03_MOONCAKE_D", label: MOONCAKE_LABELS.D, detail: "原则坚持 +2；个人担当 +1；物件状态 MOONCAKE_KEPT" },
	];
}

/** 交互五：只有 D 在选择后达到偏高协同风险时才追加 PROPERTY_SUSPICION。 */
export function buildChapter3ClearingFormalChoice(
	id: string,
	propertySuspicion = false,
): FormalChoiceDefinition | null {
	const choice = choiceIdFromPanelId(id);
	if (!choice) return null;
	const portraitByChoice: Record<ClearingChoiceId, ProfileDelta> = {
		A: { P: 2, C: 2 },
		B: { G: 3, I: 1 },
		C: { I: 3, A: 1 },
		D: { C: 1 },
	};
	const riskByChoice: Record<ClearingChoiceId, RiskDelta> = {
		A: { execution: -1 },
		B: { coordination: -1 },
		C: {},
		D: { execution: 1, coordination: 2 },
	};
	return {
		choiceId: `CH03_CLEARING_${choice}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: portraitByChoice[choice],
		riskChange: riskByChoice[choice],
		flag: flagForClearing(choice),
		tags: choice === "D" && propertySuspicion ? ["PROPERTY_SUSPICION"] : [],
		echoSummary: CLEARING_LABELS[choice],
		failureCheck: false,
	};
}

export function buildChapter3MooncakeFormalChoice(id: string): FormalChoiceDefinition | null {
	const choice = choiceIdFromPanelId(id) as MooncakeChoiceId | null;
	if (!choice) return null;
	const portraitByChoice: Record<MooncakeChoiceId, ProfileDelta> = {
		A: { I: 3, G: 1 },
		B: { G: 3, A: 1 },
		C: { A: 3, C: 1 },
		D: { P: 2, I: 1 },
	};
	return {
		choiceId: `CH03_MOONCAKE_${choice}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: portraitByChoice[choice],
		riskChange: {},
		flag: flagForMooncake(choice),
		tags: [moonCakeStatus(choice)],
		echoSummary: MOONCAKE_LABELS[choice],
		failureCheck: false,
	};
}

export function moonCakeStatus(id: MooncakeChoiceId): MooncakeStatus {
	const statuses: Record<MooncakeChoiceId, MooncakeStatus> = {
		A: "MOONCAKE_SHARED",
		B: "MOONCAKE_GROUP",
		C: "MOONCAKE_SELF",
		D: "MOONCAKE_KEPT",
	};
	return statuses[id];
}

export function buildChapter3ClearingFeedback(id: ClearingChoiceId, propertySuspicion = false): NarrativeEntry[] {
	switch (id) {
		case "A":
			return [
				entry("CH03_CLEARING_A_SORT", "narration", "你先把散落在地上的枪支和弹药集中到墙边。"),
				entry("CH03_CLEARING_A_HAND", "narration", "一名队员伸手想拿走其中一件，你立即按住。"),
				entry("CH03_CLEARING_A_PLAYER_1", "dialogue", "先放一起，等组长来核。", "陈继南"),
				entry("CH03_CLEARING_A_MEMBER", "dialogue", "我只是看一眼。", "队员"),
				entry("CH03_CLEARING_A_PLAYER_2", "dialogue", "看也一起看。", "陈继南"),
			];
		case "B":
			return [
				entry("CH03_CLEARING_B_COUNT", "narration", "你没有先去看缴获物资，而是按照刚才的分组确认人员。"),
				entry("CH03_CLEARING_B_REAR", "narration", "前门这边的人基本已经回来。后院方向传来消息：有人还在核对，暂时不能立即撤开。"),
				entry("CH03_CLEARING_B_LEADER", "dialogue", "清查人数方便等会儿统一行动。", "组长"),
			];
		case "C":
			return [
				entry("CH03_CLEARING_C_WOUNDED", "narration", "你走向一名坐在墙根的队员。他脸色发白，手臂在激战中受伤，流血不止。另一名队员把衣角撕下一条，先替他简单包扎。"),
				entry("CH03_CLEARING_C_MEMBER", "dialogue", "别管我，去看着枪。", "受伤队员"),
				entry("CH03_CLEARING_C_PLAYER", "dialogue", "东西有人看。你先把手包住。", "陈继南"),
				entry("CH03_CLEARING_C_NARRATION", "narration", "激战过后，人的声音才渐渐从背景中浮现。刚才被爆响、火光和脚步压住的疼痛，现在一处一处清晰起来。"),
			];
		case "D":
			return [
				entry("CH03_CLEARING_D_OPEN", "narration", "你打开一只没有封好的包裹。里面有钱物和日常用品，具体数量尚未核明。"),
				entry("CH03_CLEARING_D_MEMBER", "dialogue", propertySuspicion ? "你在翻什么？" : "先别动，组长要登记。", "队员"),
				...(propertySuspicion ? [entry("CH03_CLEARING_D_LOOKS", "narration", "周围有两个人回头看过来。你没有拿走任何东西，但在人员、物资和去向都没有核清的时候，单独翻看本身就足以引起怀疑。")] : [entry("CH03_CLEARING_D_CAUTION", "narration", "你没有拿走任何东西，只把包裹重新放回原处，等组长登记。")]),
			];
	}
}

export function buildChapter3MooncakeFeedback(id: MooncakeChoiceId): NarrativeEntry[] {
	switch (id) {
		case "A":
			return [
				entry("CH03_MOONCAKE_A_BREAK", "narration", "你把月饼掰开，先递给手掌受伤的队员。"),
				entry("CH03_MOONCAKE_A_MEMBER", "dialogue", "你自己留着。", "受伤队员"),
				entry("CH03_MOONCAKE_A_PLAYER", "dialogue", "我还有。", "陈继南"),
				entry("CH03_MOONCAKE_A_END", "narration", "他没有再推辞。"),
			];
		case "B":
			return [
				entry("CH03_MOONCAKE_B_SHARE", "narration", "你把月饼分成几小块。每个人只拿到一点，没人说“够不够”，也没人把最后一块独自留下。"),
				entry("CH03_MOONCAKE_B_LEADER", "dialogue", "真是打了一场硬仗。", "组长"),
			];
		case "C":
			return [
				entry("CH03_MOONCAKE_C_EAT", "narration", "你把月饼掰下一小块吃掉。甜味很快消失，嘴里只剩下干涩的粉末。"),
				entry("CH03_MOONCAKE_C_NARRATION", "narration", "只是照顾自己，接下来的路上仍然需要体力。"),
			];
		case "D":
			return [
				entry("CH03_MOONCAKE_D_KEEP", "narration", "你重新包好月饼，没有吃，也没有递给别人。"),
				entry("CH03_MOONCAKE_D_THOUGHT_1", "thought", "它已经不只是一块月饼。"),
				entry("CH03_MOONCAKE_D_THOUGHT_2", "thought", "它和我一起从“家”里出来，经过了这场行动。也许回去以后，我仍需要一些东西来记住今晚发生过什么。"),
			];
	}
}
