import type { ChoiceItem, NarrativeEntry } from "@/stores/modules/hud";
import { assetPath } from "@/common/paths";
import type {
	FormalChoiceDefinition,
	ProfileDelta,
	RiskDelta,
	RiskFailure,
} from "@/common/actionProfileSystem";

export type AfterBattleChoiceId = "A" | "B" | "C" | "D";

export const CH03_AFTER_BATTLE_FLAGS = {
	started: "CH03_AFTER_BATTLE_STARTED",
	choiceStarted: "CH03_AFTER_BATTLE_CHOICE_STARTED",
	choiceA: "CH03_AFTER_BATTLE_A",
	choiceB: "CH03_AFTER_BATTLE_B",
	choiceC: "CH03_AFTER_BATTLE_C",
	choiceD: "CH03_AFTER_BATTLE_D",
	choiceComplete: "CH03_AFTER_BATTLE_CHOICE_COMPLETE",
	complete: "CH03_AFTER_BATTLE_COMPLETE",
	replacement: "CH03_AFTER_BATTLE_REPLACEMENT",
} as const;

export const CH03_AFTER_BATTLE_IMAGE_KEYS: Record<AfterBattleChoiceId, string> = {
	A: "ch03_after_battle_A",
	B: "ch03_after_battle_B",
	C: "ch03_after_battle_C",
	D: "ch03_after_battle_D",
};

const IMAGE_PATHS: Record<AfterBattleChoiceId, string> = {
	A: assetPath("/assets/ch03/action/branch07/branch07-A.png"),
	B: assetPath("/assets/ch03/action/branch07/branch07-B.png"),
	C: assetPath("/assets/ch03/action/branch07/branch07-C.png"),
	D: assetPath("/assets/ch03/action/branch07/branch07-D.png"),
};

const LABELS: Record<AfterBattleChoiceId, string> = {
	A: "听从组长命令，留在院内控制局面",
	B: "协助照顾受伤或摔倒的队员",
	C: "看守已经缴获的枪支和物资",
	D: "擅自追赶杜老三",
};

export function afterBattleImagePath(id: AfterBattleChoiceId): string {
	return IMAGE_PATHS[id];
}

export function buildChapter3AfterBattleChoices(): ChoiceItem[] {
	return [
		{
			id: "CH03_AFTER_BATTLE_A",
			label: LABELS.A,
			detail: "组织协同 +3；原则坚持 +1；协同风险 -1",
		},
		{
			id: "CH03_AFTER_BATTLE_B",
			label: LABELS.B,
			detail: "个人担当 +3；组织协同 +1",
		},
		{
			id: "CH03_AFTER_BATTLE_C",
			label: LABELS.C,
			detail: "审慎判断 +2；原则坚持 +2；执行风险 -1",
		},
		{
			id: "CH03_AFTER_BATTLE_D",
			label: LABELS.D,
			detail: "行动决断 +2；执行风险 +2；协同风险 +3",
		},
	];
}

function choiceIdFromPanelId(id: string): AfterBattleChoiceId | null {
	const suffix = id.slice(-1);
	return suffix === "A" || suffix === "B" || suffix === "C" || suffix === "D" ? suffix : null;
}

function choiceFlag(id: AfterBattleChoiceId): string {
	return {
		A: CH03_AFTER_BATTLE_FLAGS.choiceA,
		B: CH03_AFTER_BATTLE_FLAGS.choiceB,
		C: CH03_AFTER_BATTLE_FLAGS.choiceC,
		D: CH03_AFTER_BATTLE_FLAGS.choiceD,
	}[id];
}

/** 交互四唯一的正式选择入口。场景不直接累加画像或风险。 */
export function buildChapter3AfterBattleFormalChoice(id: string): FormalChoiceDefinition | null {
	const choice = choiceIdFromPanelId(id);
	if (!choice) return null;
	const portraitByChoice: Record<AfterBattleChoiceId, ProfileDelta> = {
		A: { G: 3, P: 1 },
		B: { I: 3, G: 1 },
		C: { C: 2, P: 2 },
		D: { D: 2 },
	};
	const riskByChoice: Record<AfterBattleChoiceId, RiskDelta> = {
		A: { coordination: -1 },
		B: {},
		C: { execution: -1 },
		D: { execution: 2, coordination: 3 },
	};
	return {
		choiceId: `CH03_AFTER_BATTLE_${choice}`,
		chapter: 3,
		isFormalChoice: true,
		portraitChange: portraitByChoice[choice],
		riskChange: riskByChoice[choice],
		flag: choiceFlag(choice),
		tags: choice === "D" ? ["POSITION_ABANDONED"] : [],
		echoSummary: LABELS[choice],
		failureCheck: true,
	};
}

function entry(id: string, kind: NarrativeEntry["kind"], text: string, speakerName?: string): NarrativeEntry {
	return {
		entry_id: id,
		kind,
		text,
		...(speakerName ? { speaker_name: speakerName } : {}),
		style: kind === "dialogue" ? "dialogue" : kind === "thought" ? "thought" : "narration",
		cps: kind === "dialogue" ? 14 : 11,
	};
}

export function buildChapter3AfterBattleFeedback(id: AfterBattleChoiceId): NarrativeEntry[] {
	switch (id) {
		case "A":
			return [
				entry("CH03_AFTER_BATTLE_A_LEADER_1", "dialogue", "别追。", "组长"),
				entry("CH03_AFTER_BATTLE_A_LEADER_2", "dialogue", "先把院里的人看住，把出口封起来。", "组长"),
				entry("CH03_AFTER_BATTLE_A_ACTION", "narration", "你留在院内，和本组队员一起把院门、后院和院内人员重新纳入看守范围。"),
			];
		case "B":
			return [
				entry("CH03_AFTER_BATTLE_B_FALL", "narration", "一名队员在混乱中被人狠狠撞倒在地。你将倒地的人扶到墙边，帮他检查伤处。"),
				entry("CH03_AFTER_BATTLE_B_MEMBER", "dialogue", "我还能走，别耽误了大事。", "队员"),
				entry("CH03_AFTER_BATTLE_B_PLAYER", "dialogue", "先坐一会儿，别挡在门口。", "陈继南"),
			];
		case "C":
			return [
				entry("CH03_AFTER_BATTLE_C_SORT", "narration", "你按照组长要求，将散落在地上的枪支和其他物件集中到墙边，严格看管。"),
				entry("CH03_AFTER_BATTLE_C_LEADER", "dialogue", "先集中。谁拿的，等会儿再核。", "组长"),
				entry("CH03_AFTER_BATTLE_C_THOUGHT", "thought", "枪支和物资先被集中，意味着眼前最重要的不是谁先拿到，而是谁负责让它们不再散落。", "心理描写"),
			];
		case "D":
			return [
				entry("CH03_AFTER_BATTLE_D_CHASE", "narration", "你抢出墙外，追了几步。杜老三和亲信已经消失在更远处。"),
				entry("CH03_AFTER_BATTLE_D_LEADER_1", "dialogue", "回来！", "组长"),
				entry("CH03_AFTER_BATTLE_D_MISS", "narration", "你没有追上，也没有获得额外历史信息。"),
				entry("CH03_AFTER_BATTLE_D_LEADER_2", "dialogue", "院里还没收住，你追出去，谁来守这里？", "组长"),
				entry("CH03_AFTER_BATTLE_D_NARRATION", "narration", "你没有改变杜老三的逃亡结果。但你的擅自离队让前门短暂出现空缺。有人不得不放下手里的任务，把你重新拉回队伍。"),
			];
	}
}

export function buildChapter3AfterBattleFailureTask(failure: RiskFailure) {
	return {
		title: "行动前撤换",
		detail: "当前安排已经收紧。你不会继续进入行动核心，接下来会返回“陈继南家中醒来”节点。",
	};
}

export const CH03_AFTER_BATTLE_TASK = {
	title: "交互四：杜老三逃走后",
	detail: "杜老三已被董云庭击中并由亲信带入暗处。前门已破，前往组长处，确认院内控制、伤员与缴获物资的安排。",
};
