import { assetPath } from "@/common/paths";
import type { ChoiceItem, ResultPanelPage } from "@/stores/modules/hud";
import type { ProfileDelta } from "@/common/actionProfileSystem";
import type { NarrativeEntry } from "@/types/common";

/** 第四章场景四进入最终补写选择前的固定叙事。 */
export const CH04_FINAL_CHOICE_SETUP: NarrativeEntry[] = [
	{
		entry_id: "CH04_SC04_NOTEBOOK",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "实践笔记摊在桌上。纸页中央，仍然停留着那句在序章没有写完的话：\n如果是我，在那个地方、那个时候——",
		style: "narration",
		cps: 13,
		advance: "manual",
	},
	{
		entry_id: "CH04_SC04_BLANK",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "最后一笔的墨迹已经干了。句子后面仍留着一片空白。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "CH04_SC04_LOOK_BACK",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "伏案睡去之前，你没有写下答案。那时的“那个地方、那个时候”，对你而言还只是采访材料里的几个姓名、地点和日期。",
		style: "narration",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "CH04_SC04_NOT_CERTAIN",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "现在，你仍然无法确定，自己是否真正理解了经历过那一切的人。但你已经知道，这个问题不能只用“勇敢”或者“退缩”来回答。",
		style: "narration",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "CH04_SC04_LIMITED_KNOWLEDGE",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "传话的人压着嗓子，守路口的人盯着暗处，搬物资的人在墙影里一趟趟来回。混乱中，有人蹲下去，给伤员缠布条。",
		style: "narration",
		cps: 11,
		advance: "manual",
	},
	{
		entry_id: "CH04_SC04_NEXT_STEP",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "他们不知道后来者会如何讲述这个夜晚，也不知道眼前的行动最终会走到哪里。他们只能根据当时能够知道的事情，决定自己下一步该做什么。",
		style: "narration",
		cps: 11,
		advance: "manual",
	},
	{
		entry_id: "CH04_SC04_PICK_PEN",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "你拿起笔，把笔尖移到破折号后方。短暂停顿后，界面出现四个补写选项。",
		style: "narration",
		cps: 13,
		advance: "manual",
	},
];

export interface Ch04FinalChoiceDefinition {
	id: string;
	optionLabel: string;
	fullText: string;
	pages: ResultPanelPage[];
	profileDelta: ProfileDelta;
	flag: string;
	echoSummary: string;
}

const page = (letter: string, index: number, text: string): ResultPanelPage => ({
	image: assetPath(`/assets/ch04/final-choice/${letter}/${String(index).padStart(2, "0")}.png`),
	result: [text, ""],
});

export const CH04_FINAL_CHOICES: Ch04FinalChoiceDefinition[] = [
	{
		id: "FIN_Q01_A",
		optionLabel: "在需要行动时作出决定",
		fullText: "我会在需要行动时作出决定，也会记住一次胜利并不意味着一切已经结束。",
		pages: [
			page("A", 1, "笔尖落在纸上。"),
			page("A", 2, "你补完了序章留下的句子：\n如果是我，在那个地方、那个时候——"),
			page("A", 3, "我会在需要行动时作出决定，也会记住一次胜利并不意味着一切已经结束。"),
			page("A", 4, "你在“作出决定”几个字后停顿片刻，又继续写完了后半句。"),
			page("A", 5, "攻进杜家大院只是第一枪。\n行动之后清点物资、照看伤员、维持警戒，同样需要有人继续承担。\n王爷庙前的欢呼不代表事情结束。\n革命尚未成功，同志还需努力。"),
		],
		profileDelta: { D: 2, P: 1 },
		flag: "FIN_DECISION_CONTINUES",
		echoSummary: "在需要行动时作出决定，也记住胜利并不意味着一切已经结束。",
	},
	{
		id: "FIN_Q01_B",
		optionLabel: "与身边的人站到一起",
		fullText: "我会先找到能够彼此信任的人，不再各自沉默，而是和他们站到一起。",
		pages: [
			page("B", 1, "你补完了序章留下的句子：\n如果是我，在那个地方、那个时候——"),
			page("B", 2, "我会先找到能够彼此信任的人，不再各自沉默，而是和他们站到一起。"),
			page("B", 3, "写完之后，你在句子下方补了一个地点：\n王爷庙。"),
			page("B", 4, "单独一个人无法完成昨夜的行动。\n传话、放哨、攻门、封锁、清点和救助伤员，都需要许多人依靠彼此完成。"),
			page("B", 5, "王爷庙前真正被确认的，不只是杜家团防被击溃。\n也是那些原本分散的人，开始以农民协会和农民自卫团的方式站到一起。"),
		],
		profileDelta: { G: 2, I: 1 },
		flag: "FIN_STAND_TOGETHER",
		echoSummary: "先找到能够彼此信任的人，不再各自沉默，而是站到一起。",
	},
	{
		id: "FIN_Q01_C",
		optionLabel: "先弄清局势与分工",
		fullText: "我会先弄清局势、分工和风险，再判断自己此刻应该做什么。",
		pages: [
			page("C", 1, "你补完了序章留下的句子：\n如果是我，在那个地方、那个时候——"),
			page("C", 2, "我会先弄清局势、分工和风险，再判断自己此刻应该做什么。\n\n写完之后，你在句子旁边列下几个词：\n传话\n放哨\n封锁\n清点"),
			page("C", 3, "身处历史现场的人，未必能够看见事件的全部结果。\n他们只能听见有限的消息，接受有限的分工，并在不断变化的局势中判断下一步行动。\n\n谨慎不等于退缩。\n有时，先确认自己应该站在哪里，正是为了不让整个队伍因为一个人的误判承担风险。"),
		],
		profileDelta: { C: 2, G: 1 },
		flag: "FIN_JUDGE_POSITION",
		echoSummary: "先弄清局势、分工和风险，再判断自己此刻应该做什么。",
	},
	{
		id: "FIN_Q01_D",
		optionLabel: "从自己能够做到的事情开始",
		fullText: "我未必马上知道正确答案，但我会从自己能做的一件事开始，并随着局势调整做法。",
		pages: [
			page("D", 1, "你补完了序章留下的句子：\n如果是我，在那个地方、那个时候——"),
			page("D", 2, "我未必马上知道正确答案，但我会从自己能做的一件事开始，并随着局势调整做法。"),
			page("D", 3, "写完之后，你在句子下方依次列出几个地点：\n陈家\n祠堂\n杜家大院\n王爷庙"),
			page("D", 4, "改变并不是在某一个瞬间突然完成的。\n它可能从替人写下一张状纸开始，也可能从一次传话、一次放哨或者一次物资清点开始。\n\n一个人未必能够预先知道所有正确答案。\n但他仍然可以根据自己看见的局势，承担眼前能够承担的事情。"),
		],
		profileDelta: { I: 2, A: 1 },
		flag: "FIN_BEGIN_WITH_ACTION",
		echoSummary: "从自己能做的一件事开始，并随着局势调整做法。",
	},
];

export const CH04_FINAL_CHOICE_ITEMS: ChoiceItem[] = CH04_FINAL_CHOICES.map((choice) => ({
	id: choice.id,
	label: choice.optionLabel,
	// 选择面板只显示选项文本；画像/风险变化只在后端结算。
	detail: choice.fullText,
}));

export function getCh04FinalChoice(choiceId: string): Ch04FinalChoiceDefinition | undefined {
	return CH04_FINAL_CHOICES.find((choice) => choice.id === choiceId);
}
