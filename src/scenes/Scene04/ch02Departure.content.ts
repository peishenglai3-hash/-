import type { NarrativeEntry } from "@/stores/modules/hud";

/**
 * 第二章末段“出发前”的视频脚本锁。
 *
 * 画面、脚步和分批出发由二向三.mp4承担；这里保留剧本锚点，避免视频
 * 资源替换时丢失对白、史实口径和玩家视角。视频结束后只把剧本指定的
 * 黑幕字幕与杜家大院外围旁白交给运行时 UI 呈现。
 */
export const CH02_DEPARTURE_VIDEO_SCRIPT = [
	"物资重新归拢。",
	"各组准备。",
	"听清楚：到了地方，先按安排站住。没有命令，不得擅自行动。",
	"我仍然不知道这一夜会怎样结束。",
	"我只知道自己被放进了一支正在形成的队伍里。接下来最容易做错的，不一定是害怕，而是自以为明白了全部。",
	"三百余人的队伍没有在一处同时展开。",
	"玩家所在的小组跟随组长离开陈家祠堂。",
	"脚步声渐渐远去。远处传来犬吠。犬吠之后，是木门、墙根和低声传话的零碎声响。",
] as const;

export const CH02_DEPARTURE_EPILOGUE: NarrativeEntry[] = [
	{
		entry_id: "CH02_DEPARTURE_OUTER_HALL_DATE",
		kind: "date",
		text: "1927年9月10日，中秋夜\n杜家大院外围",
		style: "date",
		cps: 12,
	},
	{
		entry_id: "CH02_DEPARTURE_OUTER_HALL_NARRATION",
		kind: "narration",
		text: "前方的路没有被完整呈现。\n你只知道，小组正在靠近下一处地点，有人已经蛰伏在那处黑暗之中。",
		style: "narration",
		cps: 11,
	},
];
