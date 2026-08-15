import type { NarrativeEntry } from "@/stores/modules/hud";

/**
 * 第二章第二场“正厅内的部署”。
 *
 * 玩家只站在正厅门口，以下内容严格采用当前剧本正文的可听见部分；
 * 不把粗纸上的石子和木条解释成玩家可以辨认的完整地图。
 */
export const CH02_DEPLOYMENT_NARRATIVE: NarrativeEntry[] = [
	{
		entry_id: "CH02_DEPLOYMENT_OUTER_WAIT",
		kind: "dialogue",
		speaker_name: "厅内男子",
		text: "外头的人先不要全进来。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DEPLOYMENT_PERIMETER_WATCH",
		kind: "dialogue",
		speaker_name: "另一人",
		text: "院门和墙根都有人看着。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DEPLOYMENT_DAI_ANNAN_DELAY",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "鄂中区的刀把子，再不出鞘就要生锈了。\n今夜的事，不能再拖。",
		style: "dialogue",
		cps: 13,
	},
	{
		entry_id: "CH02_DEPLOYMENT_AUTHORITY_IN_SHADOW",
		kind: "narration",
		text: "说话的人站在油灯照不到的地方。你看不真切他的面孔，但能从旁人的让位、回应和等待中判断，他正在统一安排行动。",
		style: "narration",
		cps: 12,
	},
	{
		entry_id: "CH02_DEPLOYMENT_TARGET",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "今夜先打余老三。",
		style: "dialogue",
		cps: 14,
	},
	{
		entry_id: "CH02_DEPLOYMENT_GROUP_DISCIPLINE",
		kind: "dialogue",
		speaker_name: "戴安南",
		text: "各组到了地方，听组内安排。没有叫你动，不要先动。有人走散，先找本组的人，不要在路上乱喊。",
		style: "dialogue",
		cps: 12,
	},
	{
		entry_id: "CH02_DEPLOYMENT_MESSAGE_SPREAD",
		kind: "narration",
		text: "不久，正厅静默，传话的人疾步走出，低低的声音蔓延到院内，又迅速安静下来。\n煤油灯下的细节并没有传到每个人耳中。有人只听清了目标，有人只知道自己要跟随哪一组，还有人仍在等待本组负责人通知。但所有人都已知晓，今夜他们有个共同的敌人，他的名字是余老三。",
		style: "narration",
		cps: 11,
	},
];

export const CH02_DEPLOYMENT_TASK = {
	title: "正厅内的部署",
	detail: "你站在正厅门口，只听见传到门边的部分安排。今夜，他们有一个共同的敌人：余老三。按 E 进入闪回二：抓壮丁。",
};
