const DEFAULT_AVATAR_BY_SPEAKER: Record<string, string> = {
	陈继南: "ch02-chen",
	心理描写: "ch02-chen",
	门边值守者: "ch02-worker",
	联络人: "ch02-liaison",
	厅内男子: "ch02-group-leader",
	另一人: "ch02-young-member",
	戴安南: "ch02-dai-annan",
	彭定邦: "ch03-peng-dingbang",
	董云庭: "ch03-dong-yunting",
	小组负责人: "ch02-group-leader",
	组长: "ch02-group-leader",
	队员: "ch02-worker",
	后院队员: "ch02-worker",
	受伤队员: "ch02-worker",
	几名队员: "ch02-captain",
	年轻队员: "ch02-young-member",
	年长队员: "ch03-elder-member",
	传话队员: "ch02-worker",
	团丁: "ch03-militia",
	院内团丁: "ch03-militia",
	"场外声音｜街面方向": "ch03-militia",
	"场外声音｜院内": "ch03-militia",
	"场外声音｜院内团丁": "ch03-militia",
};

export function defaultAvatarForSpeaker(speaker = ""): string {
	return DEFAULT_AVATAR_BY_SPEAKER[speaker] ?? "";
}
