import type { NarrativeEntry } from "@/stores/modules/hud";

export const CH02_DISCIPLINE_FLAGS = {
	disciplineComplete: "CH02_DISCIPLINE_COMPLETE",
	groupConfirmed: "GROUP_CONFIRMED",
	signalConfirmed: "SIGNAL_CONFIRMED",
	groupRearPosition: "GROUP_REAR_POSITION",
} as const;

export const CH02_DISCIPLINE_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "CH02_DISCIPLINE_OPEN",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "目标已经说清楚了。\n接下来听纪律。",
		style: "dialogue",
		cps: 13,
	},
	{
		entry_id: "CH02_DISCIPLINE_OPEN_SILENCE",
		kind: "narration",
		text: "他没有提高声音，但正厅附近的人都安静下来。",
		style: "narration",
		cps: 13,
	},
	{
		entry_id: "CH02_DISCIPLINE_RULE_ONE",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "第一，今晚的事，都得烂在肚子里。\n熟人、亲戚、自家屋里人——都不准提，哪个嘴快，害的不光是自己。\n外围安排人放哨、传信。看到集镇方向有团防动静，马上报信，不要自己逞能。",
		style: "dialogue",
		cps: 11,
	},
	{
		entry_id: "CH02_DISCIPLINE_RULE_ONE_SPREAD",
		kind: "narration",
		text: "这几句话传出正厅后，院门附近的人开始重新确认站位。有人退到墙根，有人向院外的暗处打出简短手势。",
		style: "narration",
		cps: 11,
	},
	{
		entry_id: "CH02_DISCIPLINE_RULE_TWO",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "第二，队伍分开走。\n各组不要挤在一处。按安排的路子走，拉开距离。黑天里远远一条长影子，等于告诉人家我们来了。\n认准自己的负责人，走散了先找本组，不要在路上乱叫唤。",
		style: "dialogue",
		cps: 11,
	},
	{
		entry_id: "CH02_DISCIPLINE_RULE_TWO_GROUPS",
		kind: "narration",
		text: "院内的人开始按照所属小组分开站立。没有人从祠堂门口一起涌出去。有人留在原处等待，有人退到侧墙，有人到院外等候本组通知。",
		style: "narration",
		cps: 11,
	},
	{
		entry_id: "CH02_DISCIPLINE_RULE_THREE",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "第三，不准随意劫掠。\n进了院子，三样东西先拢到一处：地契、粮食、枪。\n其余的，哪个都不准往自己身上揣。哪个趁乱捞东西，败了名声，本组负责人先下了他的枪。",
		style: "dialogue",
		cps: 11,
	},
	{
		entry_id: "CH02_DISCIPLINE_SUPPLY_CHECK",
		kind: "narration",
		text: "墙边几名队员开始重新查看包裹和木桶。一名年轻人伸手想拿起一件没有标记的物件，旁边的人立即按住他的手，摇了摇头。",
		style: "narration",
		cps: 11,
	},
	{
		entry_id: "CH02_DISCIPLINE_WAIT_ORDER",
		kind: "dialogue",
		speaker_name: "队员",
		text: "等安排。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DISCIPLINE_SUPPLY_RETURN",
		kind: "narration",
		text: "年轻人收回手。",
		style: "narration",
		cps: 14,
	},
	{
		entry_id: "CH02_DISCIPLINE_SUPPLY_MEANING",
		kind: "narration",
		text: "这不是一场可以趁乱取利的行动。地契、粮食和武器被单独提出，说明行动目标不仅是攻击一个人，也包括控制和收缴与当地权力、生产和武装有关的物件。除了这些被明确提到的对象，其余物品都不能擅自拿取。",
		style: "narration",
		cps: 10,
	},
	{
		entry_id: "CH02_DISCIPLINE_THOUGHT_RULES",
		kind: "thought",
		speaker_name: "心理描写",
		text: "消息不能外泄，队伍不能聚成一团，东西不能见到就拿。",
		style: "thought",
		cps: 12,
	},
	{
		entry_id: "CH02_DISCIPLINE_THOUGHT_UNIFORM",
		kind: "thought",
		speaker_name: "心理描写",
		text: "这里没有形成整齐的队伍。但每个人都统一于纪律之下。",
		style: "thought",
		cps: 12,
	},
	{
		entry_id: "CH02_DISCIPLINE_ASK_CLEAR",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "都听明白了吗？",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DISCIPLINE_RESPONSE",
		kind: "dialogue",
		speaker_name: "几名队员",
		text: "明白。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DISCIPLINE_WAIT_NOTICE",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "各组认好自己的人。等通知。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DISCIPLINE_DELEGATE",
		kind: "narration",
		text: "刘绍南退回正厅内侧。几名负责人随即分头向院内、院门外和附近暗处传达安排。",
		style: "narration",
		cps: 11,
	},
];

export const CH02_GROUP_LEADER_INTRO: NarrativeEntry[] = [
	{
		entry_id: "CH02_GROUP_ASSIGNMENT_LEADER",
		kind: "dialogue",
		speaker_name: "小组负责人",
		text: "你跟这一组。\n到了地方听组长口令。按命令行事。",
		style: "dialogue",
		cps: 13,
	},
];

export const CH02_GROUP_ASSIGNMENT_INFO = [
	"【已知信息】",
	"今夜将按照部署分组行动；",
	"刘绍南负责统一安排；",
	"行动首先针对余老三；",
	"你被分入普通行动小组；",
	"你不能取代真实历史人物完成关键行动。",
	"【未知信息】",
	"小组组长是谁；",
	"小组具体负责什么；",
	"行动信号是什么；",
	"各组之间如何联系；",
	"到达后由谁下令。",
];

export interface Ch02GroupChoice {
	id: "A" | "B" | "C" | "D";
	label: string;
	detail: string;
	flag: string;
	profileDelta: Record<string, number>;
	riskDelta: Record<string, number>;
	feedback: NarrativeEntry[];
}

export const CH02_GROUP_CHOICES: Ch02GroupChoice[] = [
	{
		id: "A",
		label: "先确认组长和自己的任务：“我跟谁？到了以后做什么？”",
		detail: "组织协同 +2，审慎判断 +1",
		flag: CH02_DISCIPLINE_FLAGS.groupConfirmed,
		profileDelta: { G: 2, C: 1 },
		riskDelta: { coordination: 0 },
		feedback: [
			{
				entry_id: "CH02_GROUP_A_FEEDBACK",
				kind: "narration",
				text: "小组负责人没有因为你的问题发怒。他先看了一眼四周，确认附近没人靠得太近，才向你示意站在前面的一个矮壮男子。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_GROUP_A_LEADER",
				kind: "dialogue",
				speaker_name: "小组负责人",
				text: "他带你。",
				style: "dialogue",
				cps: 14,
			},
			{
				entry_id: "CH02_GROUP_A_CAPTAIN",
				kind: "dialogue",
				speaker_name: "组长",
				text: "到了再听我说。你先跟在后面，不要离队。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_GROUP_A_GESTURE",
				kind: "narration",
				text: "他用手指在自己袖口上轻轻点了两下，提醒你记住这个人。",
				style: "narration",
				cps: 12,
			},
			{
				entry_id: "CH02_GROUP_A_THOUGHT",
				kind: "thought",
				speaker_name: "心理描写",
				text: "我尚不知晓完整计划，但至少知道该跟谁走、什么时候做出行动。",
				style: "thought",
				cps: 12,
			},
		],
	},
	{
		id: "B",
		label: "先确认行动信号：“如果听不清口令，我怎么知道该不该动？”",
		detail: "审慎判断 +2，组织协同 +1",
		flag: CH02_DISCIPLINE_FLAGS.signalConfirmed,
		profileDelta: { C: 2, G: 1 },
		riskDelta: { coordination: 0, execution: 0 },
		feedback: [
			{
				entry_id: "CH02_GROUP_B_BROW",
				kind: "narration",
				text: "组长的眉头动了一下。",
				style: "narration",
				cps: 14,
			},
			{
				entry_id: "CH02_GROUP_B_SIGNAL",
				kind: "dialogue",
				speaker_name: "组长",
				text: "听不清就看前面的人。前面没动，你不要动。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_GROUP_B_DISPERSE",
				kind: "dialogue",
				speaker_name: "组长",
				text: "真散了，先退到约好的地方找本组的人。别在黑处乱喊名字。",
				style: "dialogue",
				cps: 12,
			},
			{
				entry_id: "CH02_GROUP_B_NARRATION",
				kind: "narration",
				text: "他说的不是一套复杂口令，而是几条在混乱中仍能执行的判断。",
				style: "narration",
				cps: 12,
			},
			{
				entry_id: "CH02_GROUP_B_THOUGHT_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "我原本想得到一个准确、不会出错的信号。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_GROUP_B_THOUGHT_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "可在这样的夜里，真正可靠的也许不是一句暗号。",
				style: "thought",
				cps: 12,
			},
		],
	},
	{
		id: "C",
		label: "不再追问，直接站到指定位置等待。",
		detail: "行动决断 +1，组织协同 +1",
		flag: CH02_DISCIPLINE_FLAGS.groupConfirmed,
		profileDelta: { D: 1, G: 1 },
		riskDelta: { coordination: 0 },
		feedback: [
			{
				entry_id: "CH02_GROUP_C_STATION",
				kind: "narration",
				text: "你走到小组末尾站定。组长看了看你的站位，将一个刚要靠近的人往旁边拨开半步。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_GROUP_C_FOLLOW",
				kind: "dialogue",
				speaker_name: "组长",
				text: "别挤在一起。你跟住前面这个。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_GROUP_C_NARRATION",
				kind: "narration",
				text: "那人点了点头，没有再问你是谁。站定以后，等待本身也变成了一件需要完成的事。你不能因为听不见厅里的全部安排，就不断改变位置；也不能因为害怕被认出异常，就离人群太远。",
				style: "narration",
				cps: 10,
			},
			{
				entry_id: "CH02_GROUP_C_THOUGHT_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "现在不是把所有事情都弄明白的时候。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_GROUP_C_THOUGHT_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "至少，我可以先不让自己的迟疑妨碍别人。",
				style: "thought",
				cps: 12,
			},
		],
	},
	{
		id: "D",
		label: "请求调到更靠近正厅的位置：“我能不能跟前面的人一起？”",
		detail: "行动决断 +2",
		flag: CH02_DISCIPLINE_FLAGS.groupRearPosition,
		profileDelta: { D: 2 },
		riskDelta: { coordination: 1 },
		feedback: [
			{
				entry_id: "CH02_GROUP_D_LOOK",
				kind: "narration",
				text: "小组负责人看了你一会儿。",
				style: "narration",
				cps: 14,
			},
			{
				entry_id: "CH02_GROUP_D_GROUP",
				kind: "dialogue",
				speaker_name: "小组负责人",
				text: "你跟这一组，就是这一组。",
				style: "dialogue",
				cps: 14,
			},
			{
				entry_id: "CH02_GROUP_D_POSITION",
				kind: "dialogue",
				speaker_name: "小组负责人",
				text: "各人有各人的位置。想往前，不是自己挑。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_GROUP_D_MOVE_BACK",
				kind: "narration",
				text: "他把你安排到队伍中后段，距离正厅更远。",
				style: "narration",
				cps: 13,
			},
			{
				entry_id: "CH02_GROUP_D_CAPTAIN",
				kind: "dialogue",
				speaker_name: "组长",
				text: "你先在这里。到了地方听安排，别自己往前冲。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_GROUP_D_THOUGHT_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "我只是想离关键人物近一点。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_GROUP_D_THOUGHT_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "行动不允许无组织无纪律。",
				style: "thought",
				cps: 12,
			},
		],
	},
];

export const CH02_DISCIPLINE_TASK = {
	title: "祠堂会议：宣布战时纪律",
	detail: "走到正厅矮桌旁，按 E 听取戴安南传达的行动纪律。",
};

export const CH02_FIND_GROUP_LEADER_TASK = {
	title: "正式选择一：接受小组安排",
	detail: "去院内侧边找头顶黄色“！”标记的小组负责人，按 E 确认你被分入哪一组。",
};

export const CH02_GROUP_CHOICE_COMPLETE_TASK = {
	title: "正式选择一｜完成",
	detail: "你已经接受了一个小组位置和相应的行动规则。按 E 切换到祠堂侧墙，开始物资准备。",
};
