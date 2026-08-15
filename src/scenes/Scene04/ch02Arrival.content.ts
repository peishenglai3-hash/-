import type { NarrativeEntry } from "@/stores/modules/hud";

/**
 * 第二章第一场“抵达”的运行时文本。
 *
 * 这里保留剧本给出的对白、心理描写和场景旁白；三百余人的规模通过
 * 祠堂正厅、院内、院门外及附近暗处的分层人影表现，不在画面中硬塞逐人角色。
 */
export const CH02_ARRIVAL_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "CH02_ARRIVAL_GUARD_CHECK",
		kind: "dialogue",
		speaker_name: "门边值守者",
		text: "这一组的？",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_ARRIVAL_LIAISON_CONFIRM",
		kind: "dialogue",
		speaker_name: "联络人",
		text: "是。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_ARRIVAL_THOUGHT_GUARD",
		kind: "thought",
		text: "他没有因为这句回答放松警惕。",
		style: "thought",
		cps: 14,
	},
	{
		entry_id: "CH02_ARRIVAL_THOUGHT_NAMES",
		kind: "thought",
		text: "这里的人彼此认识，却没听见任何一个人的名字从他人嘴里冒出来。\n确认只需要做到够用，不能多到让旁人听清。",
		style: "thought",
		cps: 14,
	},
	{
		entry_id: "CH02_ARRIVAL_COURTYARD",
		kind: "narration",
		text: "院内已经来了不少人。有人靠在墙边，有人蹲在树下，有人站在廊柱后。院门外、墙根下和邻近屋后的暗处，也不时传来低声交谈。",
		style: "narration",
		cps: 12,
	},
	{
		entry_id: "CH02_ARRIVAL_HALL_LIGHT",
		kind: "narration",
		text: "祠堂正厅里点着两盏油灯，灯光只能照到靠近门口的一小片地面。几个人围在低桌旁，其他人没有全部挤进去，而是分散在院内等候。",
		style: "narration",
		cps: 12,
	},
	{
		entry_id: "CH02_ARRIVAL_ASYMMETRIC_GROUP",
		kind: "narration",
		text: "这里没有形成整齐的队伍。有人已经知道自己该跟谁走，有人还在等传话；有人不断看向正厅，有人低头检查衣角和鞋带，也有人抱着手臂站在墙边，始终没有开口。",
		style: "narration",
		cps: 12,
	},
	{
		entry_id: "CH02_ARRIVAL_SCALE_NOTE",
		kind: "narration",
		text: "按照本作采用的史实口径，今夜参与行动者在三百人以上。祠堂和院落无法容纳所有人，更多人分散在院外及附近暗处，等候进一步安排。",
		style: "narration",
		cps: 11,
	},
];

export const CH02_ARRIVAL_TASK = {
	title: "抵达·陈家祠堂",
	detail: "门边的确认已经结束。走到正厅门口，按 E 进入正厅整体状态。",
};
