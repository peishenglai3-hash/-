import { readFile } from "node:fs/promises";
import { join } from "node:path";

const project = new URL("../", import.meta.url);

async function source(relativePath) {
	return readFile(new URL(relativePath, project), "utf8");
}

function assert(condition, message) {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exitCode = 1;
	}
}

const managedScenes = [
	"src/scenes/Scene03/Ch01Sc01Scene.ts",
	"src/scenes/Scene03/Ch01Sc02Scene.ts",
	"src/scenes/Scene03/Ch01Sc03Scene.ts",
	"src/scenes/Scene04/Ch02AncestralHallScene.ts",
	"src/scenes/Scene05/Ch03TuCompoundScene.ts",
	"src/scenes/Scene05/Ch03GateBreachCombatScene.ts",
	"src/scenes/Scene06/Ch04AnswerWrittenScene.ts",
	"src/scenes/Scene06/Ch04FinalChoiceScene.ts",
	"src/scenes/Scene06/Ch04ModernReturnScene.ts",
	"src/scenes/Scene06/Ch04PortraitScene.ts",
];

const videoOnlyScenes = [
	"src/scenes/Scene04/Ch02TransitionScene.ts",
	"src/scenes/Scene04/Ch02FlashbackScene.ts",
	"src/scenes/Scene04/Ch02DepartureScene.ts",
	"src/scenes/Scene05/Ch03OpeningScene.ts",
	"src/scenes/Scene05/Ch03Flashback3Scene.ts",
	"src/scenes/Scene05/Ch03HistoricalNodeScene.ts",
	"src/scenes/Scene05/Ch03ChapterEndScene.ts",
	"src/scenes/Scene06/Ch04OpeningScene.ts",
	"src/scenes/Scene06/Ch04Scene5VideoScene.ts",
];

const bus = await source("src/common/audioBus.ts");
assert(bus.includes("stopManagedBgms(scene.sound)"), "managed BGM creation must clear older managed BGM");
assert(bus.includes("__redcodeAudioBus !== \"bgm\""), "audio bus must leave unmarked SFX untouched");

for (const path of managedScenes) {
	const text = await source(path);
	assert(text.includes("addManagedBgm("), `${path} uses the managed BGM bus`);
	assert(text.includes("sound.stopAll()"), `${path} clears scene audio before starting its BGM`);
}

for (const path of videoOnlyScenes) {
	const text = await source(path);
	assert(!text.includes("addManagedBgm("), `${path} does not layer chapter BGM over video audio`);
	assert(text.includes("sound.stopAll()"), `${path} clears BGM before video playback`);
}

const chapter2 = await source("src/scenes/Scene04/Ch02AncestralHallScene.ts");
const chapter3 = await source("src/scenes/Scene05/Ch03TuCompoundScene.ts");
assert(chapter2.includes("stopChapter2Bgm()"), "Chapter 2 cue changes stop the previous cue");
assert(chapter3.includes("stopChapter3Bgm()"), "Chapter 3 cue changes stop the previous cue");

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({
	status: "AUDIO ROUTING PASS",
	managedScenes: managedScenes.length,
	videoOnlyScenes: videoOnlyScenes.length,
	policy: "one managed BGM at a time; video scenes use video audio only",
}, null, 2));
