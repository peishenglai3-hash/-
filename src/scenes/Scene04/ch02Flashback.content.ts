import type { NarrativeEntry } from "@/stores/modules/hud";
import type { ProfileDelta, RiskDelta } from "@/common/actionProfileSystem";

export const CH02_FLASHBACK_FLAGS = {
	started: "FLASHBACK_CONSCRIPTION",
	choiceA: "FLASHBACK_CONSCRIPTION_A",
	choiceB: "FLASHBACK_CONSCRIPTION_B",
	choiceC: "FLASHBACK_CONSCRIPTION_C",
	choiceD: "FLASHBACK_CONSCRIPTION_D",
	complete: "FLASHBACK_CONSCRIPTION_COMPLETE",
} as const;

export const CH02_FLASHBACK_KNOWN_INFO = [
	"你看到的是一名青壮年被团丁带走；",
	"妇人试图阻拦，却被以“上头有令”为由推开；",
	"周围有人看见，却没有人单独上前；",
	"这场抓捕与“涂老五”的势力和名号有关。",
];

export const CH02_FLASHBACK_INTRO_THOUGHTS: NarrativeEntry[] = [
	{
		entry_id: "CH02_FLASHBACK_INTRO_THOUGHT_01",
		kind: "thought",
		speaker_name: "心理描写",
		text: "如果这是陈继南的记忆，为什么当时他也选择了沉默？",
		style: "thought",
		cps: 12,
		advance: "manual",
	},
	{
		entry_id: "CH02_FLASHBACK_INTRO_THOUGHT_02",
		kind: "thought",
		speaker_name: "心理描写",
		text: "被绑着的男人、哀求的女人、扼住人脖颈的大手、尘土飞扬的村路、低头弯腰躲在阴影里的人。没有来龙去脉，只有这些东西令人久久难以释怀。",
		style: "thought",
		cps: 11,
		advance: "manual",
	},
];

export interface Ch02FlashbackChoice {
	id: "A" | "B" | "C" | "D";
	label: string;
	detail: string;
	flag: string;
	profileDelta: ProfileDelta;
	riskDelta: RiskDelta;
	thoughts: NarrativeEntry[];
}

export const CH02_FLASHBACK_CHOICES: Ch02FlashbackChoice[] = [
	{
		id: "A",
		label: "一根绳子带走的，不只是一个人，也是一个家庭的生计。",
		detail: "个人担当 +2，原则坚持 +1",
		flag: CH02_FLASHBACK_FLAGS.choiceA,
		profileDelta: { I: 2, P: 1 },
		riskDelta: {},
		thoughts: [
			{
				entry_id: "CH02_FLASHBACK_CHOICE_A_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "被带走的人，大概很难再回来。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_FLASHBACK_CHOICE_A_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "时间不等人。地要有人种，柴要有人挑，老人和孩子也要有人照看。一个人被绳子拖走，留下的人却必须立刻接过他没有完成的重担。",
				style: "thought",
				cps: 11,
			},
		],
	},
	{
		id: "B",
		label: "团丁总能用“上头有令”，替自己的暴力找一个说法。",
		detail: "原则坚持 +2，情境调适 +1",
		flag: CH02_FLASHBACK_FLAGS.choiceB,
		profileDelta: { P: 2, A: 1 },
		riskDelta: {},
		thoughts: [
			{
				entry_id: "CH02_FLASHBACK_CHOICE_B_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "如果所有人都只说自己是在执行命令，那么伤害就好像没有真正属于任何一个人。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_FLASHBACK_CHOICE_B_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "可命令不会自己把人推倒。总有人选择伸手，也总有人从这种命令中得到好处。",
				style: "thought",
				cps: 12,
			},
		],
	},
	{
		id: "C",
		label: "周围的人不是没有愤怒，而是不敢单独行动。",
		detail: "组织协同 +2，情境调适 +1",
		flag: CH02_FLASHBACK_FLAGS.choiceC,
		profileDelta: { G: 2, A: 1 },
		riskDelta: {},
		thoughts: [
			{
				entry_id: "CH02_FLASHBACK_CHOICE_C_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "一个人站出来，可能只会让绳子多捆住一个人。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_FLASHBACK_CHOICE_C_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "可所有人都这样想，路上就只剩下被带走的人，和越来越远的脚步。",
				style: "thought",
				cps: 12,
			},
		],
	},
	{
		id: "D",
		label: "涂老五也许只是眼前的施暴者，后面还有更大的征发和团防势力。",
		detail: "审慎判断 +2，组织协同 +1",
		flag: CH02_FLASHBACK_FLAGS.choiceD,
		profileDelta: { C: 2, G: 1 },
		riskDelta: {},
		thoughts: [
			{
				entry_id: "CH02_FLASHBACK_CHOICE_D_01",
				kind: "narration",
				speaker_name: "旁白",
				text: "这段片段没有让你看见完整的命令链，也没有把所有压迫都归结到一个人身上。",
				style: "narration",
				cps: 12,
			},
			{
				entry_id: "CH02_FLASHBACK_CHOICE_D_02",
				kind: "narration",
				speaker_name: "旁白",
				text: "涂老五是眼前可见的对象，但抓壮丁、摊派和团防所形成的压力，不会随着一个人的倒下自动消失。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_FLASHBACK_CHOICE_D_03",
				kind: "thought",
				speaker_name: "心理描写",
				text: "如果只看见一个人，我可能会把一切都归结为一个人的恶。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_FLASHBACK_CHOICE_D_04",
				kind: "thought",
				speaker_name: "心理描写",
				text: "可如果只看见背后的势力，又可能忘了具体的人是怎样被一双手推倒、怎样从自家门口消失的。",
				style: "thought",
				cps: 11,
			},
		],
	},
];

export const CH02_FLASHBACK_COMPLETE_TASK = {
	title: "闪回二：抓壮丁｜选择完成",
	detail: "片段停留在黑暗中。按 E 返回祠堂，继续听取宣布战时纪律。",
};
