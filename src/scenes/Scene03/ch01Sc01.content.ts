import type { NarrativeEntry } from "@/types/common";
import { assetPath } from "@/common/paths";
import type { ProfileDelta, RiskDelta } from "@/common/actionProfileSystem";
import { FLAGS } from "./ch01Sc01.flags";

export interface Choice {
	id: string;
	label: string;
	detail: string;
	image: string;
	flag: string;
	echo_summary: string;
	result: [string, string];
	profileDelta: ProfileDelta;
	riskDelta: RiskDelta;
	tags: string[];
}

export const PROP_PATHS = {
	PAPERWEIGHT: assetPath("/assets/ch01/sc01/props/PROP007_PaperweightPressPaper_Icon_v01.png"),
	HAORI: assetPath("/assets/ch01/sc01/props/PROP018_HaoriFront_Icon_v01.png"),
	INKSTONE: assetPath("/assets/ch01/sc01/props/PROP009_InkStone_AngledView_Icon_v01.png"),
	PENHOLDER: assetPath("/assets/ch01/sc01/props/PROP010_PenHolder2_Icon_v01.png"),
	INK_PEN: assetPath("/assets/ch01/sc01/props/PROP009_010_InkAndPen_Icon.png"),
	BASIN: assetPath("/assets/ch01/sc01/props/PROP026_SmallWashStandAndCopperBasin_Icon_v01.png"),
	BOOK: assetPath("/assets/ch01/sc01/props/PROP004_ThreadBoundBook_Icon_v01.png"),
	LAMP: assetPath("/assets/ch01/sc01/props/PROP016_Lantern_Icon_v01.png"),
	BOWLS: assetPath("/assets/ch01/sc01/props/PROP029_SinglePorcelainBowl_Icon_v01.png"),
	BOWLS_MULTI: assetPath("/assets/ch01/sc01/props/PROP028_MultiplePorcelainBowls_Icon_v01.png"),
};

/** manifest 的 prop_icon 是短名（如 PROP016），实际图标文件名含完整描述名，短名拼不出真路径 */
export const PROP_ICON_FILES: Record<string, string> = {
	PROP004: PROP_PATHS.BOOK,
	PROP009: PROP_PATHS.INKSTONE,
	PROP016: PROP_PATHS.LAMP,
	PROP018: PROP_PATHS.HAORI,
	PROP026: PROP_PATHS.BASIN,
	PROP028: PROP_PATHS.BOWLS_MULTI,
	PROP029: PROP_PATHS.BOWLS,
};

export const INTRO_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "CH01_N01",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "陈继南伏在旧木桌边。油灯的火苗很小，灯芯结着黑色的焦头。",
		style: "narration",
		cps: 14,
		pause_before_ms: 600,
		advance: "manual",
	},
	{
		entry_id: "CH01_N02",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "桌上摆着粗瓷碗、一册线装书、砚台和几张压在镇纸下的纸。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "CH01_N03",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "木门半掩着，门缝外是一片被夜色压低的院子。远处虫鸣不断，偶尔夹着一两声犬吠。",
		style: "narration",
		cps: 14,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "CH01_D01",
		kind: "dialogue",
		speaker_id: "NPC_FAMILY",
		speaker_name: "家人",
		text: "继南？你这是怎么了？",
		style: "dialogue",
		cps: 20,
		pause_before_ms: 500,
		advance: "manual",
	},
	{
		entry_id: "CH01_N04",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "她问得很轻。碗里的饭已经凉了一些，筷子却还规规矩矩搭在碗沿，像是一直在等你回过神来。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "CH01_T01",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“她认识“我”。可我不认识她。”",
		style: "thought",
		cps: 18,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "CH01_T02",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“我的手好麻。”",
		style: "thought",
		cps: 18,
		pause_before_ms: 300,
		advance: "manual",
	},
];

export const OBS_BASIN_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "OBS_BASIN_N1",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "铜盆里的水没有完全静下来。",
		style: "narration",
		cps: 14,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "OBS_BASIN_N2",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "你靠近时，水面先映出房梁上的油灯，再映出一张年轻男人的脸。眉骨、鼻梁、下巴都陌生。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "OBS_BASIN_T1",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“这是谁”",
		style: "thought",
		cps: 18,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "OBS_BASIN_N3",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "洗脸架上搭着一条洗得发硬的布巾。铜盆里水光荡漾，盆上有经年累月磨洗的痕迹。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
];

export const OBS_DESK_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "OBS_DESK_N1",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "书案一角压着一册线装书。书页边缘被翻得起毛，夹页里露出半张练字纸。",
		style: "narration",
		cps: 14,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "OBS_DESK_N2",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "纸上有几行未写完的字。最下面一行，墨色比别处新一些：陳繼南。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "OBS_DESK_T1",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“陈继南。”",
		style: "thought",
		cps: 18,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "OBS_DESK_T2",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“这个名字不是家人随口叫出来的，也不是我听错了。它留在纸上，留在这具身体原本会伸手去拿的地方。”",
		style: "thought",
		cps: 16,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "OBS_DESK_N3",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "纸张旁边摆着毛笔和砚台。笔杆磨得光滑。砚中的墨还没有完全干透。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
];

export const OBS_DOOR_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "OBS_DOOR_N1",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "门后的木钉上挂着一件外褂。衣摆沾着干泥，像是白天出过门。",
		style: "narration",
		cps: 14,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "OBS_DOOR_N2",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "旁边还有一双草鞋，鞋底很薄，前端沾着一小点深色苔痕。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "OBS_DOOR_T1",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“这具身体显然不只在家里读书。”",
		style: "thought",
		cps: 18,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "OBS_DOOR_T2",
		kind: "thought",
		speaker_id: "PLAYER",
		speaker_name: "你",
		text: "“可我不知道他白天去过哪里，他今晚，是不是还有什么事情要做？”",
		style: "thought",
		cps: 16,
		pause_before_ms: 300,
		advance: "manual",
	},
];

export const CHOICE1_INTRO: NarrativeEntry[] = [
	{
		entry_id: "CH01_CHOICE1_N1",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "她把凉掉的碗往你面前推了推，声音放得更低。",
		style: "narration",
		cps: 14,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "CH01_CHOICE1_D1",
		kind: "dialogue",
		speaker_id: "NPC_FAMILY",
		speaker_name: "家人",
		text: "“是不是又在外头跑了一天？先喝口水。刚才喊你几遍，都没应。”",
		style: "dialogue",
		cps: 20,
		pause_before_ms: 300,
		advance: "manual",
	},
];

export const CHOICES: Choice[] = [
	{
		id: "CH01_Q01_A",
		label: "压下慌乱，低声应答：“方才做了个怪梦。”",
		detail: "行动决断 +1，情境调适 +1，身份风险 +0",
		image: assetPath("/assets/choices/a.png"),
		flag: FLAGS.CHOICE1_A,
		echo_summary: "我用一个梦，把这一刻先掩了过去。",
		result: [
			"女人没有马上追问梦见了什么，只把水递得更近。",
			"“这几日你总是睡不安稳。外头的事再急，也不能把人熬坏了。”",
		],
		profileDelta: { D: 1, A: 1 },
		riskDelta: { identity: 0 },
		tags: [],
	},
	{
		id: "CH01_Q01_B",
		label: "先不回答名字，反问：“外头方才有人说话？”",
		detail: "审慎判断 +2，情境调适 +1，身份风险 +0，执行风险 +0",
		image: assetPath("/assets/choices/b.png"),
		flag: FLAGS.CHOICE1_B,
		echo_summary: "我先把话题引到了门外。",
		result: [
			"女人顺着你的目光朝门外看了一眼。",
			"“风声吧。哪家的门响一下，都像有人来了。”",
		],
		profileDelta: { C: 2, A: 1 },
		riskDelta: { identity: 0, execution: 0 },
		tags: [],
	},
	{
		id: "CH01_Q01_C",
		label: "盯着她，直接问：“陈继南是谁？”",
		detail: "原则坚持 +1，审慎判断 +1，身份风险 +2，后续标签 FAMILY_DOUBT",
		image: assetPath("/assets/choices/c.png"),
		flag: FLAGS.CHOICE1_C,
		echo_summary: "我问出了一个不该问的问题。",
		result: [
			"屋里安静了一瞬。女人的手停在半空，碗沿轻轻磕到桌面。",
			"“你发什么热？你就是陈继南。”",
		],
		profileDelta: { P: 1, C: 1 },
		riskDelta: { identity: 2 },
		tags: ["FAMILY_DOUBT"],
	},
	{
		id: "CH01_Q01_D",
		label: "借着低头喝水的动作拖出片刻时间：“我有些头晕。让我缓一缓。”",
		detail: "审慎判断 +2，个人担当 +1，身份风险 +0",
		image: assetPath("/assets/choices/d.png"),
		flag: FLAGS.CHOICE1_D,
		echo_summary: "我给自己争到了一点喘息的时间。",
		result: [
			"女人起身去拿布巾，临走前将油灯拨亮了一点。",
			"“你先坐稳。外头要是真有人来，我再叫你。”",
		],
		profileDelta: { C: 2, I: 1 },
		riskDelta: { identity: 0 },
		tags: [],
	},
];

export const PROFILE_DELTAS: Record<string, ProfileDelta> = Object.fromEntries(
	CHOICES.map((choice) => [choice.id, choice.profileDelta]),
);

export const INK_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "CH01_INK_N1",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "你伸手碰到笔杆。指腹先感觉到木头上常年留下的细小凹痕。",
		style: "narration",
		cps: 14,
		pause_before_ms: 400,
		advance: "manual",
	},
	{
		entry_id: "CH01_INK_N2",
		kind: "narration",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "随后，砚台里尚未凝住的墨色像被一滴水搅开，慢慢漫过纸上的字。",
		style: "narration",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
	{
		entry_id: "CH01_INK_CUE",
		kind: "cue",
		speaker_id: "NARRATOR",
		speaker_name: "旁白",
		text: "虫鸣、碗筷和风吹木门的声音逐渐退远。纸张被摊平的窸窣声变得清楚。",
		style: "cue",
		cps: 14,
		pause_before_ms: 300,
		advance: "manual",
	},
];

export const TASKS_CH01_SC01 = {
	explore: {
		title: "在屋内有限区域行走",
		detail: "木桌与书案附近、铜盆旁、门边、家人身前",
	},
	observe: {
		title: "完成三处固定观察",
		detail: "铜盆、书案与姓名、门边衣物",
	},
	choice: {
		title: "回应家人",
		detail: "选择如何回答家人的问话",
	},
	ink: {
		title: "查看未干的墨",
		detail: "回到书案，查看纸与笔",
	},
	leave: {
		title: "离开陈家",
		detail: "推开半掩的木门，进入院子",
	},
	doorCode: {
		title: "门外有人",
		detail: "走到半掩的木门前，看看是谁在夜里叩门",
	},
	yard: {
		title: "走到院墙下",
		detail: "随联络人到院墙阴影下听安排",
	},
};
