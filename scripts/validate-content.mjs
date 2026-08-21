// 内容锁校验（2026-08-12 适配 Vue/TS 重构后的模块路径，经 tsx 运行）
// Node 环境无 Vite 注入的 import.meta.env，先垫片再动态导入
import.meta.env = { BASE_URL: "/", MODE: "test", DEV: false, PROD: false };

const {
	REQUIRED_NARRATIVE,
	CHOICES,
	LEAVE_NARRATIVE,
	validateNarrative,
} = await import("../src/scenes/Scene01/content.ts");
const {
	OPENING,
	AUDIO_REVIEW,
	WRITE_QUESTION,
	FALL_ASLEEP,
} = await import("../src/scenes/Scene02/content.ts");
const { TRANSITION_A, TRANSITION_B } = await import(
	"../src/scenes/transitionData.ts"
);
const {
	CH02_FLASHBACK_CHOICES,
	CH02_FLASHBACK_INTRO_THOUGHTS,
	CH02_FLASHBACK_KNOWN_INFO,
} = await import("../src/scenes/Scene04/ch02Flashback.content.ts");
const {
	CH02_DISCIPLINE_NARRATIVE,
	CH02_GROUP_ASSIGNMENT_INFO,
	CH02_GROUP_CHOICES,
	CH02_GROUP_LEADER_INTRO,
} = await import("../src/scenes/Scene04/ch02Discipline.content.ts");
const {
	CH02_MATERIALS_CHOICES,
	CH02_MATERIALS_INFO,
	CH02_MATERIALS_NARRATIVE,
} = await import("../src/scenes/Scene04/ch02Materials.content.ts");
const {
	CH02_DEPARTURE_EPILOGUE,
	CH02_DEPARTURE_VIDEO_SCRIPT,
} = await import("../src/scenes/Scene04/ch02Departure.content.ts");
const { CH04_WANGYE_TEMPLE_SCENE1 } = await import(
	"../src/scenes/Scene06/ch04Scene1.content.ts",
);
const fs = await import("node:fs/promises");
const flavorZones = JSON.parse(await fs.readFile(
	new URL("../public/data/PRO02_interactions.json", import.meta.url),
	"utf8",
)).flavor_zones;

const assert = (condition, message) => {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exit(1);
	}
};

validateNarrative();
assert(REQUIRED_NARRATIVE.length === 24, "scene01 narrative lock (24 entries)");
assert(LEAVE_NARRATIVE.length === 1, "leave narrative lock");
assert(CHOICES.length === 4, "choice lock");
assert(OPENING.length === 6, "scene02 opening lock");
assert(AUDIO_REVIEW.length === 4, "scene02 audio review lock");
assert(WRITE_QUESTION.length === 13, "scene02 write question lock");
assert(FALL_ASLEEP.length === 6, "scene02 fall asleep lock");
assert(flavorZones.length === 6, "scene02 flavor zones");
assert(flavorZones.every((zone) => zone.type === "flavor" && Array.isArray(zone.rect) && zone.rect.length === 4 && zone.line), "scene02 flavor zone shape");
assert(TRANSITION_A.entries.length === 5, "transition A entries");
assert(TRANSITION_B.entries.length === 21, "transition B entries");
assert(CH02_FLASHBACK_KNOWN_INFO.length === 4, "chapter 2 flashback known information");
assert(CH02_FLASHBACK_INTRO_THOUGHTS.length === 2, "chapter 2 flashback intro thoughts");
assert(
	CH02_FLASHBACK_CHOICES.length === 4 &&
	CH02_FLASHBACK_CHOICES.map((choice) => choice.id).join(",") === "A,B,C,D",
	"chapter 2 flashback choice order",
);
assert(
	CH02_FLASHBACK_CHOICES.every((choice) => choice.thoughts.length >= 2),
	"chapter 2 flashback choice thoughts",
);
assert(CH02_DISCIPLINE_NARRATIVE.length === 17, "chapter 2 discipline narrative lock");
assert(CH02_GROUP_LEADER_INTRO.length === 1, "chapter 2 group leader intro lock");
assert(CH02_GROUP_ASSIGNMENT_INFO.length === 12, "chapter 2 group assignment info lock");
assert(
	CH02_GROUP_CHOICES.length === 4 &&
	CH02_GROUP_CHOICES.map((choice) => choice.id).join(",") === "A,B,C,D",
	"chapter 2 group choice order",
);
assert(CH02_GROUP_CHOICES.every((choice) => choice.feedback.length >= 5), "chapter 2 group feedback lock");
assert(CH02_MATERIALS_NARRATIVE.length === 7, "chapter 2 materials narrative lock");
assert(CH02_MATERIALS_INFO.length === 8, "chapter 2 materials info lock");
assert(
	CH02_MATERIALS_CHOICES.length === 4 &&
	CH02_MATERIALS_CHOICES.map((choice) => choice.id).join(",") === "A,B,C,D",
	"chapter 2 materials choice order",
);
assert(CH02_MATERIALS_CHOICES.every((choice) => choice.feedback.length >= 5), "chapter 2 materials feedback lock");
assert(
	[CH02_FLASHBACK_CHOICES, CH02_GROUP_CHOICES, CH02_MATERIALS_CHOICES].length === 3 &&
	[CH02_FLASHBACK_CHOICES, CH02_GROUP_CHOICES, CH02_MATERIALS_CHOICES].every((choices) => choices.length === 4),
	"chapter 2 formal choice node count",
);
assert(CH02_DEPARTURE_VIDEO_SCRIPT.length === 8, "chapter 2 departure video script lock");
assert(CH02_DEPARTURE_EPILOGUE.length === 2, "chapter 2 departure epilogue lock");
assert(CH02_DEPARTURE_EPILOGUE[0].text.includes("杜家大院外围"), "chapter 2 departure location subtitle lock");
assert(CH02_DEPARTURE_EPILOGUE[1].text.includes("正在靠近下一处地点"), "chapter 2 departure approach narration lock");
assert(CH04_WANGYE_TEMPLE_SCENE1.length === 25, "chapter 4 scene 1 narrative lock");
assert(CH04_WANGYE_TEMPLE_SCENE1[4].text === "1927年9月11日\n戴家场王爷庙戏台", "chapter 4 date/location lock");
assert(CH04_WANGYE_TEMPLE_SCENE1.some((entry) => entry.text.includes("杜家团防已经被打垮")), "chapter 4 stage defeat line lock");
assert(CH04_WANGYE_TEMPLE_SCENE1.some((entry) => entry.text.includes("涂济洲")), "chapter 4 Tu Jizhou name lock");
assert(CH04_WANGYE_TEMPLE_SCENE1.some((entry) => entry.text.includes("彭国材")), "chapter 4 Peng Guocai name lock");

const styles = new Set(["narration", "thought", "dialogue", "cue", "date"]);
const lists = [
	REQUIRED_NARRATIVE,
	LEAVE_NARRATIVE,
	OPENING,
	AUDIO_REVIEW,
	WRITE_QUESTION,
	FALL_ASLEEP,
	TRANSITION_A.entries,
	TRANSITION_B.entries,
	CH02_FLASHBACK_INTRO_THOUGHTS,
	...CH02_FLASHBACK_CHOICES.map((choice) => choice.thoughts),
	CH02_DISCIPLINE_NARRATIVE,
	CH02_GROUP_LEADER_INTRO,
	...CH02_GROUP_CHOICES.map((choice) => choice.feedback),
	CH02_MATERIALS_NARRATIVE,
	...CH02_MATERIALS_CHOICES.map((choice) => choice.feedback),
	CH02_DEPARTURE_EPILOGUE,
	CH04_WANGYE_TEMPLE_SCENE1,
];
for (const list of lists) {
	for (const entry of list) {
		assert(styles.has(entry.style), `style lock for ${entry.entry_id}`);
		if (entry.style === "dialogue") assert(entry.speaker_name, `speaker lock for ${entry.entry_id}`);
	}
}

console.log("CONTENT LOCK PASS");
