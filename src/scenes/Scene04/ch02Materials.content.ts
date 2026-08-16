import type { NarrativeEntry } from "@/stores/modules/hud";
import type { ProfileDelta, RiskDelta } from "@/common/actionProfileSystem";
export const CH02_MATERIALS_FLAGS = {
	materialsComplete: "CH02_SUPPLY_PREPARATION_COMPLETE",
	supplyHandled: "SUPPLY_HANDLED",
	supplyOpened: "SUPPLY_OPENED",
	contactCaution: "CONTACT_CAUTION",
} as const;

export const CH02_MATERIALS_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "CH02_MATERIALS_WALL_SCENE",
		kind: "narration",
		text: "小组安排完成后，画面切换到祠堂侧墙。\n墙边放着几个包裹和木桶。一些物件已经用布包住，另一些只用草绳简单捆扎。有人蹲在地上清点，有人把东西从廊下移到墙边。",
		style: "narration",
		cps: 11,
	},
	{
		entry_id: "CH02_MATERIALS_BUCKET_PASS",
		kind: "narration",
		text: "一名年轻队员抱着一只木桶经过，桶底碰到砖地，发出一声闷响。",
		style: "narration",
		cps: 12,
	},
	{
		entry_id: "CH02_MATERIALS_YOUNG_MEMBER_WARNING",
		kind: "dialogue",
		speaker_name: "年轻队员",
		text: "轻点。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_MATERIALS_LIMITED_KNOWLEDGE",
		kind: "narration",
		text: "你看不清每个包裹里的东西。\n这里能确定的只有：行动前有人在集中、转移和看护物件。至于物件的具体名称和用途，你判断不出来。",
		style: "narration",
		cps: 11,
	},
	{
		entry_id: "CH02_MATERIALS_LEADER_HELP",
		kind: "dialogue",
		speaker_name: "组长",
		text: "手上没事的，帮着看一眼。",
		style: "dialogue",
		cps: 13,
	},
	{
		entry_id: "CH02_MATERIALS_LEADER_POINT",
		kind: "narration",
		text: "他指了指墙边的物件。",
		style: "narration",
		cps: 13,
	},
	{
		entry_id: "CH02_MATERIALS_LEADER_RULE",
		kind: "dialogue",
		speaker_name: "组长",
		text: "不要乱拆。要动哪一件，先问。",
		style: "dialogue",
		cps: 13,
	},
];

export const CH02_MATERIALS_INFO = [
	"【当前处境】",
	"你可以参与简单的辅助工作，但不知道每件物品的用途。",
	"你需要在不妨碍分组安排的前提下完成一点实际工作。",
	"【已知信息】",
	"物资已经有人负责；",
	"现场需要有人搬动、整理和看护；",
	"不能擅自拆开他人负责的包裹；",
	"你不知道物品的具体用途。",
];

export interface Ch02MaterialsChoice {
	id: "A" | "B" | "C" | "D";
	label: string;
	detail: string;
	flag: string;
	profileDelta: ProfileDelta;
	riskDelta: RiskDelta;
	feedback: NarrativeEntry[];
}

export const CH02_MATERIALS_CHOICES: Ch02MaterialsChoice[] = [
	{
		id: "A",
		label: "按照外部标记，把物资交给对应小组。",
		detail: "组织协同 +2，审慎判断 +1",
		flag: CH02_MATERIALS_FLAGS.supplyHandled,
		profileDelta: { G: 2, C: 1 },
		riskDelta: { execution: 0 },
		feedback: [
			{
				entry_id: "CH02_MATERIALS_A_HANDOFF",
				kind: "narration",
				text: "你没有打开包裹，只按照布条和摆放位置，将几件物件分别交给等候在廊下的人。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_MATERIALS_A_MISTAKE",
				kind: "narration",
				text: "第一次，你把一个包裹递错了方向。那人没有接，只用下巴向另一边点了点。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_MATERIALS_A_CORRECTION",
				kind: "dialogue",
				speaker_name: "队员",
				text: "不是这边。看布条。",
				style: "dialogue",
				cps: 14,
			},
			{
				entry_id: "CH02_MATERIALS_A_RECHECK",
				kind: "narration",
				text: "你重新核对后，将包裹交过去。",
				style: "narration",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_A_LEADER",
				kind: "dialogue",
				speaker_name: "组长",
				text: "拿不准先看清楚，不要急。",
				style: "dialogue",
				cps: 13,
			},
		],
	},
	{
		id: "B",
		label: "检查包裹是否松脱，但不打开查看内容。",
		detail: "审慎判断 +2",
		flag: CH02_MATERIALS_FLAGS.supplyHandled,
		profileDelta: { C: 2 },
		riskDelta: { execution: 0 },
		feedback: [
			{
				entry_id: "CH02_MATERIALS_B_CHECK",
				kind: "narration",
				text: "你蹲下检查草绳和布角。一个包裹的绳结已经松开。你没有拆开，只抬头询问旁边的队员。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_MATERIALS_B_INSTRUCTION",
				kind: "dialogue",
				speaker_name: "队员",
				text: "把绳子绕两圈，别动里面。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_B_RETYING",
				kind: "narration",
				text: "你照着重新系好，又把包裹放回墙边。",
				style: "narration",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_B_REPOSITION",
				kind: "narration",
				text: "一个经过的队员顺手把它挪到不易被碰到的位置。",
				style: "narration",
				cps: 12,
			},
			{
				entry_id: "CH02_MATERIALS_B_THOUGHT",
				kind: "thought",
				speaker_name: "心理描写",
				text: "谨慎不是把每一件事都“查到底”。",
				style: "thought",
				cps: 12,
			},
		],
	},
	{
		id: "C",
		label: "主动帮助另一名队员搬动木桶。",
		detail: "组织协同 +2，个人担当 +1",
		flag: CH02_MATERIALS_FLAGS.supplyHandled,
		profileDelta: { G: 2, I: 1 },
		riskDelta: { execution: 0 },
		feedback: [
			{
				entry_id: "CH02_MATERIALS_C_BUCKET",
				kind: "narration",
				text: "你接过年轻队员手里的木桶。桶底有些不稳。你刚走两步，桶身便向一侧倾了倾，年轻队员立即伸手托住。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_MATERIALS_C_GUIDANCE",
				kind: "dialogue",
				speaker_name: "年轻队员",
				text: "别提太高，贴着地走。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_C_MOVE",
				kind: "narration",
				text: "你和他一起把木桶拖到墙边。",
				style: "narration",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_C_THANKS",
				kind: "dialogue",
				speaker_name: "年轻队员",
				text: "多谢。",
				style: "dialogue",
				cps: 14,
			},
			{
				entry_id: "CH02_MATERIALS_C_CHECK_IN",
				kind: "narration",
				text: "他没有问你的姓名，只朝小组所在的位置看了一眼，确认你没有离开太久。",
				style: "narration",
				cps: 11,
			},
		],
	},
	{
		id: "D",
		label: "擅自打开一个包裹，确认里面是什么。",
		detail: "行动决断 +1；身份、执行、协同风险 +1",
		flag: CH02_MATERIALS_FLAGS.supplyOpened,
		profileDelta: { D: 1 },
		riskDelta: { identity: 1, execution: 1, coordination: 1 },
		feedback: [
			{
				entry_id: "CH02_MATERIALS_D_OPEN",
				kind: "narration",
				text: "你解开包裹外层的绳结。",
				style: "narration",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_D_STOP",
				kind: "narration",
				text: "布刚掀开一角，旁边的人便立刻按住你的手。",
				style: "narration",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_D_ORDER",
				kind: "dialogue",
				speaker_name: "队员",
				text: "得到命令了吗？",
				style: "dialogue",
				cps: 14,
			},
			{
				entry_id: "CH02_MATERIALS_D_LEADER_REBUKE",
				kind: "dialogue",
				speaker_name: "组长",
				text: "这里的东西不是给你查的。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_D_RETIE",
				kind: "narration",
				text: "他没有当众斥责，只把包裹重新系好，并将它交给另一名队员看管。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_MATERIALS_D_RETURN",
				kind: "dialogue",
				speaker_name: "组长",
				text: "回队伍里去。别再离开自己的位置。",
				style: "dialogue",
				cps: 13,
			},
			{
				entry_id: "CH02_MATERIALS_D_NOTICE",
				kind: "narration",
				text: "附近的交谈短暂停了一下。没有人围过来，但几个人已经注意到你。",
				style: "narration",
				cps: 11,
			},
			{
				entry_id: "CH02_MATERIALS_D_THOUGHT_01",
				kind: "thought",
				speaker_name: "心理描写",
				text: "我只是想知道自己正在参与什么。",
				style: "thought",
				cps: 12,
			},
			{
				entry_id: "CH02_MATERIALS_D_THOUGHT_02",
				kind: "thought",
				speaker_name: "心理描写",
				text: "可是想知道更多，并不等于有资格碰更多。",
				style: "thought",
				cps: 11,
			},
		],
	},
];

export const CH02_MATERIALS_TASK = {
	title: "物资准备",
	detail: "去祠堂侧墙上方物资包裹旁，找头顶黄色“！”标记的组长听取安排。",
};

export const CH02_MATERIALS_COMPLETE_TASK = {
	title: "正式选择二：协助准备｜完成",
	detail: "物资已经重新归拢。按 E 进入出发前的最后交代。",
};
