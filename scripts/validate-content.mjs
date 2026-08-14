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
];
for (const list of lists) {
	for (const entry of list) {
		assert(styles.has(entry.style), `style lock for ${entry.entry_id}`);
		if (entry.style === "dialogue") assert(entry.speaker_name, `speaker lock for ${entry.entry_id}`);
	}
}

console.log("CONTENT LOCK PASS");
