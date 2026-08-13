import type { NarrativeEntry } from "@/types/common";
import { FLAGS2 } from "./ch01Sc02.flags";

// 第一章场景2（闪回一·状纸）内容数据 —— 文本逐字来自《详细剧情3.1-第一章1.0》

export const ARRIVE_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "FB01_ARR_1",
		kind: "narration",
		speaker_name: "旁白",
		text: "屋门前仍是一张木桌，只是桌上的油灯更亮，窗外还是白日。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_ARR_2",
		kind: "narration",
		speaker_name: "旁白",
		text: "一个衣角沾着水渍、身着斗笠蓑衣的渔民站在门槛外。他没有进屋，双手一直攥着一张被揉得发皱的文书。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_ARR_3",
		kind: "narration",
		speaker_name: "旁白",
		text: "少年陈继南坐在桌旁，年纪比现在更小些。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
];

// beat1：门边渔民——湖上的委屈与写状纸
export const FISHERMAN_CHAIN: NarrativeEntry[] = [
	{
		entry_id: "FB01_F1",
		kind: "dialogue",
		speaker_id: "NPC_FISHERMAN",
		speaker_name: "渔民",
		text: "俺也去过几处。人家一听是湖上的事，就说写不得。",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
	{
		entry_id: "FB01_F2",
		kind: "dialogue",
		speaker_id: "NPC_CHEN_YOUNG",
		speaker_name: "少年陈继南",
		text: "谁不让你下湖？",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
	{
		entry_id: "FB01_F3",
		kind: "narration",
		speaker_name: "旁白",
		text: "渔民没有立刻回答。他先回头看了一眼门外，才把声音压下去。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_F4",
		kind: "dialogue",
		speaker_id: "NPC_FISHERMAN",
		speaker_name: "渔民",
		text: "不是不让下湖。是下了湖，打的鱼要交；不交，就说我占了张财主家的水面。",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
	{
		entry_id: "FB01_F5",
		kind: "narration",
		speaker_name: "旁白",
		text: "他说得很小心，怕自己讲错一个字，就连最后一点求人的资格也没有了。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_F6",
		kind: "narration",
		speaker_name: "旁白",
		text: "少年陈继南没有立刻提笔。他问起湖在哪一段、对方什么时候来收、家里靠什么过日子，又让渔民把已经交过的东西一项项说清。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_F7",
		kind: "cue",
		speaker_name: "旁白",
		text: "笔尖落在纸上的沙沙声。",
		style: "cue",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_F8",
		kind: "narration",
		speaker_name: "旁白",
		text: "字并不华丽，但一笔一画写得很稳。事情从哪里起、受了什么亏、想请人查明什么，都被写在同一张纸上。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
];

// 递交状纸（渔民切状态2）——接状纸与身体残留感受
export const HANDOFF_CHAIN: NarrativeEntry[] = [
	{
		entry_id: "FB01_P1",
		kind: "narration",
		speaker_name: "旁白",
		text: "渔民接过状纸时不敢用力。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_P2",
		kind: "narration",
		speaker_name: "旁白",
		text: "纸上的场景没有继续展开为审案结果。只有一段由身体残留而来的、断断续续的感受：",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_P3",
		kind: "narration",
		speaker_name: "旁白",
		text: "有人愿意收下状纸；有人终于把受的委屈讲清；几天后，渔民又来过一次，空着的手里多了一包用布裹好的干鱼。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_P4",
		kind: "dialogue",
		speaker_id: "NPC_FISHERMAN",
		speaker_name: "渔民",
		text: "我没别的东西。这个你收下。",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
	{
		entry_id: "FB01_P5",
		kind: "dialogue",
		speaker_id: "NPC_CHEN_YOUNG",
		speaker_name: "少年陈继南",
		text: "留给家里。",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
];

// 几天后（墨水转场后，渔民切状态3）——干鱼与谢绝
export const FISH_CHAIN: NarrativeEntry[] = [
	{
		entry_id: "FB01_FISH1",
		kind: "dialogue",
		speaker_id: "NPC_FISHERMAN",
		speaker_name: "渔民",
		text: "我没别的东西。这个你收下。",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
	{
		entry_id: "FB01_FISH2",
		kind: "dialogue",
		speaker_id: "NPC_CHEN_YOUNG",
		speaker_name: "少年陈继南",
		text: "留给家里。",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
];

export interface Choice2 {
	id: string;
	label: string;
	detail: string;
	flag: string;
	thoughts: string[];
}

// 正式选择二：如何理解这段片段？
export const CHOICES2: Choice2[] = [
	{
		id: "CH01_Q02_A",
		label: "有人愿意把话写下来，事情才可能被别人听见。",
		detail: "个人担当 +2，原则坚持 +1",
		flag: FLAGS2.CHOICE2_A,
		thoughts: [
			"能不能改变结果，并不只在写字的人手里。但如果没人替他把事讲清，连被听见的机会也没有。",
		],
	},
	{
		id: "CH01_Q02_B",
		label: "一个人的出身，不能替他决定该站在哪一边。",
		detail: "原则坚持 +2，情境调适 +1",
		flag: FLAGS2.CHOICE2_B,
		thoughts: [
			"读过书、住在有书案的屋子里，并不等于必然看不见门外的人。真正让人站到哪一边的，是他如何对待自己已经看见的事。",
		],
	},
	{
		id: "CH01_Q02_C",
		label: "读书若只为自己谋路，手里的笔就太轻了。",
		detail: "个人担当 +2，行动决断 +1",
		flag: FLAGS2.CHOICE2_C,
		thoughts: [
			"笔不能替人下湖，也不能替人挨饿。但它可以让一个原本有苦无处诉的人，暂时不必独自承担。",
		],
	},
	{
		id: "CH01_Q02_D",
		label: "一张状纸能救一时，却救不了所有靠湖吃饭的人。",
		detail: "组织协同 +2，审慎判断 +1",
		flag: FLAGS2.CHOICE2_D,
		thoughts: [
			"这次有人得了帮助。可如果规矩仍由欺压人的人定，下一张状纸还会出现。",
			"一个人能做的事有限，很多人的处境却不会等。",
		],
	},
];

export const PROFILE_DELTAS2: Record<string, Record<string, number>> = {
	CH01_Q02_A: { I: 2, P: 1 },
	CH01_Q02_B: { P: 2, A: 1 },
	CH01_Q02_C: { I: 2, D: 1 },
	CH01_Q02_D: { G: 2, C: 1 },
};

// 离场：墨迹漫开，回到今夜
export const EXIT_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "FB01_X1",
		kind: "narration",
		speaker_name: "旁白",
		text: "墨迹重新漫开，覆盖了桌面。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_X2",
		kind: "thought",
		speaker_name: "心理描写",
		text: "这不是我的记忆。",
		style: "thought",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "FB01_X3",
		kind: "thought",
		speaker_name: "心理描写",
		text: "可是那种迟疑过后仍决定写下去的感觉，我还记得。",
		style: "thought",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "FB01_X4",
		kind: "cue",
		speaker_name: "旁白",
		text: "毛笔从桌面轻轻滚落。",
		style: "cue",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_X5",
		kind: "cue",
		speaker_name: "旁白",
		text: "虫鸣重新贴近耳边。",
		style: "cue",
		cps: 14,
		advance: "manual",
	},
];

// 返回陈家（在 SC01 夜场景播放）
export const RETURN_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "FB01_R1",
		kind: "narration",
		speaker_name: "旁白",
		text: "你仍站在书案前，手指停在笔杆上。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_R2",
		kind: "narration",
		speaker_name: "旁白",
		text: "女人已经坐回桌边。她没有看见刚才那段闪回，只看见你出神得太久。",
		style: "narration",
		cps: 14,
		advance: "manual",
	},
	{
		entry_id: "FB01_R3",
		kind: "dialogue",
		speaker_id: "NPC_FAMILY",
		speaker_name: "家人",
		text: "继南？",
		style: "dialogue",
		cps: 16,
		advance: "manual",
	},
	{
		entry_id: "FB01_R4",
		kind: "thought",
		speaker_name: "心理描写",
		text: "她第二次叫这个名字时，我已经觉得理所当然。",
		style: "thought",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "FB01_R5",
		kind: "thought",
		speaker_name: "心理描写",
		text: "它仍然不是我的名字。但在今夜之前，它属于这个身体，也属于一些我还不知道的选择。",
		style: "thought",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "FB01_R6",
		kind: "cue",
		speaker_name: "旁白",
		text: "门外响起三下敲门声。",
		style: "cue",
		cps: 14,
		advance: "manual",
	},
];
