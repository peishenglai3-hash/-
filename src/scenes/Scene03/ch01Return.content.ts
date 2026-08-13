import type { NarrativeEntry } from "@/types/common";

// 返回陈家链内容 —— 文本逐字来自《详细剧情3.1-第一章1.0》

// 敲门段（接 RETURN_NARRATIVE 之后）
export const KNOCK_CHAIN: NarrativeEntry[] = [
	{ entry_id: "RT_K1", kind: "cue", speaker_name: "旁白", text: "前两下间隔很短，第三下略慢。", style: "cue", cps: 14, advance: "manual" },
	{ entry_id: "RT_K2", kind: "narration", speaker_name: "旁白", text: "屋里的女人立刻把手从碗边收回去。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_K3", kind: "narration", speaker_name: "旁白", text: "敲门声响起时，她的手停了一下，随后看向你。她没有起身，像是在等你判断这个人是不是来找你的。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_K4", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "这么晚了，是谁？", style: "dialogue", cps: 16, advance: "manual" },
];

// 门前暗号 intro
export const DOOR_CODE_CHAIN: NarrativeEntry[] = [
	{ entry_id: "RT_D1", kind: "narration", speaker_name: "旁白", text: "门缝外没有人影。院里的树影被晚风吹得轻轻晃动。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_D2", kind: "cue", speaker_name: "旁白", text: "门外有人压着嗓子开口。", style: "cue", cps: 14, advance: "manual" },
	{ entry_id: "RT_D3", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "门外人", text: "夜路湿，脚下滑。", style: "dialogue", cps: 16, advance: "manual" },
	{ entry_id: "RT_D4", kind: "thought", speaker_name: "心理描写", text: "冷不丁地冒出这么一句话，这具身体却好像记得。舌头就要吐出下一句，心里却冒出另一个念头：门外的人真的是自己人吗？", style: "thought", cps: 12, advance: "manual" },
];

export interface ReturnChoice {
	id: string;
	label: string;
	detail: string;
	flag: string;
	profile: Record<string, number>;
	risk: { identity?: number; execution?: number; coordination?: number };
	tags: string[];
	feedback: NarrativeEntry[];
}

// 正式选择三：如何回应门外联络人的暗号？
export const Q3_CHOICES: ReturnChoice[] = [
	{
		id: "CH01_Q3_A",
		label: "顺着身体浮现的习惯，隔门答出约定回应。",
		detail: "情境调适 +2，组织协同 +1，身份风险 +0",
		flag: "CH01_Q3_A",
		profile: { A: 2, G: 1 },
		risk: {},
		tags: [],
		feedback: [
			{ entry_id: "RT_Q3A1", kind: "narration", speaker_name: "旁白", text: "你说出那句话时，连自己都不确定它从哪里来的。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3A2", kind: "narration", speaker_name: "旁白", text: "门外沉默片刻，随后传来一声很轻的吐气声。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3A3", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "门外人", text: "是继南。出来一步。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3A4", kind: "narration", speaker_name: "旁白", text: "门外的人没有继续说话，也没有隔着门交代事情。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3A5", kind: "thought", speaker_name: "心理描写", text: "身体替我认出了这条路。我只能决定，要不要跟着它走。", style: "thought", cps: 12, advance: "manual" },
		],
	},
	{
		id: "CH01_Q3_B",
		label: "不立刻答话，先贴近门缝听外面的动静。",
		detail: "审慎判断 +2，组织协同 +1，执行风险 +0，身份风险 +0",
		flag: "CH01_Q3_B",
		profile: { C: 2, G: 1 },
		risk: {},
		tags: [],
		feedback: [
			{ entry_id: "RT_Q3B1", kind: "narration", speaker_name: "旁白", text: "院里没有脚步乱动的声音。你听见一人压着呼吸，稍远处像还有另一个人守在墙边。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3B2", kind: "narration", speaker_name: "旁白", text: "你没有让家人靠近，只等了半息，才给出回应。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3B3", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "门外人", text: "出来一步。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3B4", kind: "thought", speaker_name: "心理描写", text: "对方没有催问，也没有在门外继续交谈。至少，谨慎没有让他立刻失去耐心。", style: "thought", cps: 12, advance: "manual" },
		],
	},
	{
		id: "CH01_Q3_C",
		label: "直接拉开门，只用眼神确认来人。",
		detail: "行动决断 +2，情境调适 +1，身份风险 +1",
		flag: "CH01_Q3_C",
		profile: { D: 2, A: 1 },
		risk: { identity: 1 },
		tags: ["CONTACT_CAUTION"],
		feedback: [
			{ entry_id: "RT_Q3C1", kind: "narration", speaker_name: "旁白", text: "木门拉开一条缝。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3C2", kind: "narration", speaker_name: "旁白", text: "门外站着一个戴斗笠的年轻人，衣摆被夜露打湿。他先看向你，又迅速扫过屋内。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3C3", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "你今晚怎么这样急？", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3C4", kind: "narration", speaker_name: "旁白", text: "他没有等你解释，只将声音压到最低。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3C5", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "出来一步。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3C6", kind: "narration", speaker_name: "旁白", text: "他没有隔着门说事。你随他走到院墙的阴影下，屋里的油灯只剩下一小块昏黄，已经照不到这里。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3C7", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "陈家祠堂。人已经到了。别走大路，到了以后听安排。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3C8", kind: "thought", speaker_name: "心理描写", text: "他认识陈继南。可他显然不喜欢陈继南跳过原本该有的规矩。", style: "thought", cps: 12, advance: "manual" },
		],
	},
	{
		id: "CH01_Q3_D",
		label: "隔门连续追问：“谁让你来的？祠堂有谁？要做什么？”",
		detail: "审慎判断 +1，原则坚持 +1，身份风险 +2，协同风险 +1",
		flag: "CH01_Q3_D",
		profile: { C: 1, P: 1 },
		risk: { identity: 2, coordination: 1 },
		tags: ["CONTACT_CAUTION", "FAMILY_DOUBT"],
		feedback: [
			{ entry_id: "RT_Q3D1", kind: "narration", speaker_name: "旁白", text: "门外的人没有回答第二个问题。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3D2", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "门里不是说话的地方。你若连我都认不出，今夜更该少问、快走。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3D3", kind: "narration", speaker_name: "旁白", text: "他停了一下，声音更加压低。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3D4", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "出来一步。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q3D5", kind: "narration", speaker_name: "旁白", text: "屋内的女人抬头看了你一眼。她没有听见具体内容，却已察觉门外的人不愿在门口久留。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q3D6", kind: "thought", speaker_name: "心理描写", text: "问题本身没有错。也许是我问得太多、问得太急，让人分不清我是在求证，还是事情出了岔子。", style: "thought", cps: 12, advance: "manual" },
		],
	},
];

// 院墙阴影下：联络通知
export const YARD_CHAIN: NarrativeEntry[] = [
	{ entry_id: "RT_Y1", kind: "narration", speaker_name: "旁白", text: "联络人站在背风处，没有靠得太近。他先看了看院门，又看向屋内，确认没有旁人跟出。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_Y2", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "陈家祠堂。人已经到了。", style: "dialogue", cps: 16, advance: "manual" },
	{ entry_id: "RT_Y3", kind: "narration", speaker_name: "旁白", text: "他停顿片刻，像是在判断你是否听清。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_Y4", kind: "dialogue", speaker_id: "NPC_CONTACT", speaker_name: "联络人", text: "别走大路。到了以后先找自己那一边的人，别乱挤，别乱问。今夜人多，听安排。", style: "dialogue", cps: 16, advance: "manual" },
	{ entry_id: "RT_Y5", kind: "narration", speaker_name: "旁白", text: "他没有说行动内容，没有说目标，也没有说会有多少人。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_Y6", kind: "narration", speaker_name: "旁白", text: "这些话只告诉你该去哪里、如何到达，以及到了以后不要擅自行动。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_Y7", kind: "thought", speaker_name: "心理描写", text: "陈家祠堂。好熟悉。对了，我在搜集到的史料里见到过。", style: "thought", cps: 12, advance: "manual" },
	{ entry_id: "RT_Y8", kind: "thought", speaker_name: "心理描写", text: "可我在材料中读到的是已经发生过的历史。难不成，我现在还在它尚未发生的夜里？", style: "thought", cps: 12, advance: "manual" },
	{ entry_id: "RT_Y9", kind: "thought", speaker_name: "心理描写", text: "门里，有一个不知道内情的家人。门外的人也没有把地点说给她听。", style: "thought", cps: 12, advance: "manual" },
	{ entry_id: "RT_Y10", kind: "thought", speaker_name: "心理描写", text: "每个人都在少说一句。", style: "thought", cps: 12, advance: "manual" },
];

// 正式选择四 intro：告别与月饼
export const FAREWELL_INTRO: NarrativeEntry[] = [
	{ entry_id: "RT_F1", kind: "narration", speaker_name: "旁白", text: "联络人退到院外。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_F2", kind: "narration", speaker_name: "旁白", text: "你回到屋内。女人从桌上拿起那块月饼，用旧纸包好，递到你面前。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_F3", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "中秋夜，路上空着肚子更难走。", style: "dialogue", cps: 16, advance: "manual" },
	{ entry_id: "RT_F4", kind: "narration", speaker_name: "旁白", text: "她没有问门外的人是谁，也没有问你要去哪里。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_F5", kind: "narration", speaker_name: "旁白", text: "她只知道你今晚可能还要出门，知道你近来常常有些话不肯带回家。至于那些话究竟是什么，她没有得到答案。", style: "narration", cps: 14, advance: "manual" },
	{ entry_id: "RT_F6", kind: "thought", speaker_name: "心理描写", text: "她没有拦我。", style: "thought", cps: 12, advance: "manual" },
	{ entry_id: "RT_F7", kind: "thought", speaker_name: "心理描写", text: "也许陈继南以前出门时，她也是这样把不该问的话留在屋里，再递来一点能带走的东西。", style: "thought", cps: 12, advance: "manual" },
];

// 正式选择四：怎样向家人告别？
export const Q4_CHOICES: ReturnChoice[] = [
	{
		id: "CH01_Q4_A",
		label: "接过月饼，认真说：“我会回来。你别等太晚。”",
		detail: "个人担当 +2，情境调适 +1，身份风险 +0",
		flag: "CH01_Q4_A",
		profile: { I: 2, A: 1 },
		risk: {},
		tags: ["MOONCAKE_PROMISE"],
		feedback: [
			{ entry_id: "RT_Q4A1", kind: "narration", speaker_name: "旁白", text: "她没有追问“回来做什么”，只把包月饼的纸角压紧。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4A2", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "我知道。走你的路，脚下看着点。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q4A3", kind: "thought", speaker_name: "心理描写", text: "我不能保证自己能替陈继南兑现这句话。但至少此刻，我不想让她独自面对一扇重新合上的门。", style: "thought", cps: 12, advance: "manual" },
		],
	},
	{
		id: "CH01_Q4_B",
		label: "掰下一小块月饼吃掉，将余下的包好收进衣袋。",
		detail: "情境调适 +2，个人担当 +1，执行风险 +0",
		flag: "CH01_Q4_B",
		profile: { A: 2, I: 1 },
		risk: {},
		tags: ["MOONCAKE_SHARED"],
		feedback: [
			{ entry_id: "RT_Q4B1", kind: "narration", speaker_name: "旁白", text: "月饼偏硬，甜味很淡，像是省着糖做出来的。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4B2", kind: "narration", speaker_name: "旁白", text: "女人看着你吃下那一小块，神情松了一点。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4B3", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "知道饿就好。别总把自己当铁打的。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q4B4", kind: "thought", speaker_name: "心理描写", text: "身体记得这味道。我没有记忆，这味道却很熟悉。", style: "thought", cps: 12, advance: "manual" },
		],
	},
	{
		id: "CH01_Q4_C",
		label: "将月饼收入衣袋，只简短说：“我得走了。”",
		detail: "行动决断 +2，原则坚持 +1，协同风险 +0",
		flag: "CH01_Q4_C",
		profile: { D: 2, P: 1 },
		risk: {},
		tags: ["MOONCAKE_UNSPOKEN"],
		feedback: [
			{ entry_id: "RT_Q4C1", kind: "narration", speaker_name: "旁白", text: "女人的手还停在桌边。她点头，没有挽留。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4C2", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "去吧。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q4C3", kind: "narration", speaker_name: "旁白", text: "院外传来一声很轻的脚步声，联络人在提醒时间，但没有进入屋内催促。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4C4", kind: "thought", speaker_name: "心理描写", text: "我不敢多说。说得越多，可能错得越多。", style: "thought", cps: 12, advance: "manual" },
		],
	},
	{
		id: "CH01_Q4_D",
		label: "看着月饼迟迟没有伸手，低声问：“我以前出门，你也总这样等吗？”",
		detail: "审慎判断 +1，个人担当 +2，身份风险 +1",
		flag: "CH01_Q4_D",
		profile: { C: 1, I: 2 },
		risk: { identity: 1 },
		tags: ["FAMILY_DOUBT", "MOONCAKE_PROMISE"],
		feedback: [
			{ entry_id: "RT_Q4D1", kind: "narration", speaker_name: "旁白", text: "女人愣了一下，随后把月饼放进你掌心。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4D2", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "你以前不爱问这些。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q4D3", kind: "narration", speaker_name: "旁白", text: "她抬眼望向黑下去的院子。", style: "narration", cps: 14, advance: "manual" },
			{ entry_id: "RT_Q4D4", kind: "dialogue", speaker_id: "NPC_FAMILY", speaker_name: "家人", text: "但你每回出去，我都等。", style: "dialogue", cps: 16, advance: "manual" },
			{ entry_id: "RT_Q4D5", kind: "thought", speaker_name: "心理描写", text: "她没有回答我想知道的全部。", style: "thought", cps: 12, advance: "manual" },
			{ entry_id: "RT_Q4D6", kind: "thought", speaker_name: "心理描写", text: "可我忽然明白，陈继南在这间屋里，不只是纸上的三个字。有人等他吃饭、等他回来、又不得不放他出门。", style: "thought", cps: 12, advance: "manual" },
		],
	},
];

// 章末黑幕叙述
export const ENDING_NARRATIVE: NarrativeEntry[] = [
	{ entry_id: "RT_E1", kind: "narration", speaker_name: "旁白", text: "月亮被薄云遮住，院里的路只剩下一点发白的轮廓。", style: "narration", cps: 12, advance: "manual" },
	{ entry_id: "RT_E2", kind: "narration", speaker_name: "旁白", text: "衣袋里的月饼压在掌心旁边。你不知道陈继南原本会怎样走出这道门，也不知道自己接下来能不能把这个名字扮演得足够像。", style: "narration", cps: 12, advance: "manual" },
	{ entry_id: "RT_E3", kind: "narration", speaker_name: "旁白", text: "但陈家祠堂有人在等。", style: "narration", cps: 12, advance: "manual" },
	{ entry_id: "RT_E4", kind: "narration", speaker_name: "旁白", text: "而历史里那场尚未发生的集结，已经开始了。", style: "narration", cps: 12, advance: "manual" },
	{ entry_id: "RT_E5", kind: "cue", speaker_name: "旁白", text: "木门轻轻合拢。", style: "cue", cps: 12, advance: "manual" },
	{ entry_id: "RT_E6", kind: "cue", speaker_name: "旁白", text: "虫鸣被脚步声替代。脚步没有被完整演出，只持续数息，随后渐弱。", style: "cue", cps: 12, advance: "manual" },
];

export const END_SUBTITLE = ["1927年9月10日，中秋夜", "陈家垸，陈家祠堂"];
