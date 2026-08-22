// 第四章契约：固定镜头叙事、最终选择、场景五转场和画像结算边界。
import { access, readFile, stat } from "node:fs/promises";

import.meta.env = { BASE_URL: "/", MODE: "test", DEV: false, PROD: false };

const assert = (condition, message) => {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exit(1);
	}
};

const { CH04_WANGYE_TEMPLE_SCENE1 } = await import(
	"../src/scenes/Scene06/ch04Scene1.content.ts",
);
const { CH04_CONSCIOUSNESS_NARRATIVE } = await import(
	"../src/scenes/Scene06/ch04Scene2.content.ts",
);
const { CH04_MODERN_RETURN_NARRATIVE } = await import(
	"../src/scenes/Scene06/ch04ModernReturn.content.ts",
);
const { CH04_ANSWER_WRITTEN_NARRATIVE } = await import(
	"../src/scenes/Scene06/ch04AnswerWritten.content.ts",
);
const {
	CH04_FINAL_CHOICE_SETUP,
	CH04_FINAL_CHOICES,
} = await import("../src/scenes/Scene06/ch04FinalChoice.content.ts");
const { applyFormalChoice, calculatePortrait } = await import("../src/common/actionProfileSystem.ts");
const { CH04_PORTRAIT_POSTERS } = await import(
	"../src/scenes/Scene06/ch04PortraitPresentation.ts",
);
const { CH04_WANGYE_TEMPLE_MAPS } = await import(
	"../src/scenes/Scene06/ch04WangyeTempleMap.ts",
);

const root = new URL("../", import.meta.url);
const json = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const fileIsNonEmpty = async (path) => {
	await access(new URL(path, root));
	return (await stat(new URL(path, root))).size > 0;
};

assert(CH04_WANGYE_TEMPLE_SCENE1.length === 25, "scene 1 narrative entry count");
assert(CH04_WANGYE_TEMPLE_SCENE1[4].entry_id === "CH04_SC01_DATE", "scene 1 date entry position");
assert(CH04_WANGYE_TEMPLE_SCENE1.at(-1)?.entry_id === "CH04_SC01_END", "scene 1 ending entry");
assert(CH04_CONSCIOUSNESS_NARRATIVE.length === 16, "scene 2 narrative entry count");
assert(
	CH04_CONSCIOUSNESS_NARRATIVE.every((entry) => entry.advance === "manual"),
	"scene 2 manual dialogue advance",
);
assert(
	CH04_CONSCIOUSNESS_NARRATIVE.some((entry) => entry.text.includes("你看见了吗？")),
	"scene 2 unknown voice opening",
);
assert(
	CH04_CONSCIOUSNESS_NARRATIVE.some((entry) => entry.text.includes("后来怎样站到了一起")),
	"scene 2 unknown voice closing",
);
assert(
	CH04_CONSCIOUSNESS_NARRATIVE
		.filter((entry) => entry.speaker_id === "UNKNOWN_MIND")
		.every((entry) => !entry.avatar_id),
	"scene 2 unknown voice has no avatar",
);
assert(
	!CH04_CONSCIOUSNESS_NARRATIVE.some((entry) => entry.kind === "choice"),
	"scene 2 has no player choice",
);
assert(CH04_MODERN_RETURN_NARRATIVE.length === 16, "scene 3 narrative entry count");
assert(
	CH04_MODERN_RETURN_NARRATIVE.some((entry) => entry.text.includes("杜老三负伤逃窜")),
	"scene 3 document line",
);
assert(
	CH04_MODERN_RETURN_NARRATIVE.filter((entry) => entry.kind === "thought").every(
		(entry) => entry.avatar_id === "prologue-player",
	),
	"scene 3 modern protagonist avatar",
);
assert(CH04_FINAL_CHOICE_SETUP.length === 7, "scene 4 setup entry count");
assert(
	CH04_FINAL_CHOICE_SETUP.at(-1)?.text.includes("四个补写选项"),
	"scene 4 choice handoff",
);
assert(CH04_ANSWER_WRITTEN_NARRATIVE.length === 9, "scene 5 narrative entry count");
assert(
	CH04_ANSWER_WRITTEN_NARRATIVE.every((entry) => entry.advance === "manual"),
	"scene 5 manual dialogue advance",
);
assert(
	CH04_ANSWER_WRITTEN_NARRATIVE.some((entry) => entry.text.includes("选择记住什么")),
	"scene 5 closing reflection",
);
assert(CH04_FINAL_CHOICES.length === 4, "FIN-Q01 choice count");
const expectedPageCounts = { FIN_Q01_A: 5, FIN_Q01_B: 5, FIN_Q01_C: 3, FIN_Q01_D: 4 };
for (const choice of CH04_FINAL_CHOICES) {
	assert(choice.pages.length === expectedPageCounts[choice.id], `${choice.id} page count`);
	assert(
		Object.values(choice.profileDelta).reduce((sum, value) => sum + value, 0) === 3,
		`${choice.id} portrait total`,
	);
	assert(!/[+−-]\d/.test(choice.optionLabel), `${choice.id} no frontend numeric effect`);
	assert(choice.pages.every((page) => page.image.includes("/assets/ch04/final-choice/")), `${choice.id} image paths`);
	const simulatedState = {
		profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
		risk: { identity: 0, execution: 0, coordination: 0 },
		flags: new Set(),
		choice: null,
	};
	applyFormalChoice(simulatedState, {
		choiceId: choice.id,
		chapter: 4,
		isFormalChoice: true,
		portraitChange: choice.profileDelta,
		riskChange: {},
		flag: choice.flag,
		echoSummary: choice.echoSummary,
		failureCheck: false,
	});
	assert(Object.values(simulatedState.profile).reduce((sum, value) => sum + value, 0) === 3, `${choice.id} backend portrait total`);
	assert(Object.values(simulatedState.risk).every((value) => value === 0), `${choice.id} backend risk isolation`);
	assert(simulatedState.flags.has(choice.flag), `${choice.id} backend flag`);
	for (const resultPage of choice.pages) {
		const relative = resultPage.image.replace(/^\/+/, "");
		assert(await fileIsNonEmpty(`public/${relative}`), `${choice.id} ${relative}`);
	}
}
assert(
	await fileIsNonEmpty("public/assets/audio/ch04/05_写下答案_回望与结算.mp3"),
	"chapter 4 modern/reckoning BGM",
);
assert(
	await fileIsNonEmpty("public/assets/ch04/cinematics/ch04_scene5_to_portrait.mp4"),
	"chapter 4 scene 5 transition video",
);
assert(
	await fileIsNonEmpty("public/assets/audio/ch04/IN7 - 国际歌 (钢琴版) [mqms2].ogg"),
	"chapter 4 portrait BGM",
);
for (const code of ["DIP", "DIA", "DGP", "DGA", "CIP", "CIA", "CGP", "CGA", "BALANCED"]) {
	const relative = CH04_PORTRAIT_POSTERS[code].replace(/^\/+/, "");
	assert(await fileIsNonEmpty(`public/${relative}`), `${code} final poster`);
}
const portraitFixtures = {
	DIP: { D: 1, C: 0, I: 1, G: 0, P: 1, A: 0 },
	DIA: { D: 1, C: 0, I: 1, G: 0, P: 0, A: 1 },
	DGP: { D: 1, C: 0, I: 0, G: 1, P: 1, A: 0 },
	DGA: { D: 1, C: 0, I: 0, G: 1, P: 0, A: 1 },
	CIP: { D: 0, C: 1, I: 1, G: 0, P: 1, A: 0 },
	CIA: { D: 0, C: 1, I: 1, G: 0, P: 0, A: 1 },
	CGP: { D: 0, C: 1, I: 0, G: 1, P: 1, A: 0 },
	CGA: { D: 0, C: 1, I: 0, G: 1, P: 0, A: 1 },
	BALANCED: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
};
for (const [code, profile] of Object.entries(portraitFixtures)) {
	assert(calculatePortrait(profile).code === code, `${code} portrait code mapping`);
}

for (const shot of ["SHOT_WIDE", "SHOT_MEDIUM", "SHOT_CLOSE"]) {
	const slug = shot.toLowerCase();
	const manifest = await json(`public/data/ch04_wangye_temple_${slug}_manifest.json`);
	const objects = await json(`public/data/ch04_wangye_temple_${slug}_objects.json`);
	assert(manifest.canvas.width === 1664 && manifest.canvas.height === 936, `${shot} canvas contract`);
	assert(manifest.render_order.join(",") === "L01_GROUND,L02_GROUND_DETAIL,L03_STRUCTURE_LOW,L04_PROP_INTERACT,L05_COLLISION_TRIGGER,L06_OCCLUSION_HIGH,L07_LIGHT_FX", `${shot} layer order contract`);
	assert(objects.fixed_performance === true && objects.characters_baked === false, `${shot} runtime layering contract`);
	const names = new Set((objects.objects ?? []).map((object) => object.name));
	for (const name of ["ZONE_STAGE_ANNOUNCEMENT", "ZONE_FRONT_CROWD", "SPAWN_STAGE_SPEAKER", "TRG_CAPTURED_WEAPONS"]) {
		assert(names.has(name), `${shot} object ${name}`);
	}
	for (const layerName of [
		"L01_GROUND.png",
		"L02_GROUND_DETAIL.png",
		"L03_STRUCTURE_LOW.png",
		"L04_PROP_INTERACT.png",
		"L05_COLLISION_TRIGGER.png",
		"L06_OCCLUSION_HIGH.png",
		"L07_LIGHT_FX.png",
	]) {
		assert(await fileIsNonEmpty(`public/assets/ch04/wangye-temple/${shot}/${layerName}`), `${shot} ${layerName}`);
	}
}

assert(await fileIsNonEmpty("public/assets/ch04/cinematics/ch04_opening.mp4"), "chapter 4 opening video");
const report = await json("public/data/ch04_wangye_temple_validation_report.json");
assert(report.valid === true && report.package_count === 3, "authored map validation report");
assert(Object.keys(CH04_WANGYE_TEMPLE_MAPS).length === 3, "runtime map shot registry");

console.log(JSON.stringify({
	status: "CHAPTER4 SCENE1-6 CONTRACT PASS",
	narrativeEntries: {
		scene1: CH04_WANGYE_TEMPLE_SCENE1.length,
		scene2: CH04_CONSCIOUSNESS_NARRATIVE.length,
		scene3: CH04_MODERN_RETURN_NARRATIVE.length,
		scene4Setup: CH04_FINAL_CHOICE_SETUP.length,
		scene5: CH04_ANSWER_WRITTEN_NARRATIVE.length,
	},
	finalChoicePages: Object.fromEntries(CH04_FINAL_CHOICES.map((choice) => [choice.id, choice.pages.length])),
	shots: Object.keys(CH04_WANGYE_TEMPLE_MAPS),
	canvas: "1664x936",
	video: "assets/ch04/cinematics/ch04_opening.mp4",
	scene5Video: "assets/ch04/cinematics/ch04_scene5_to_portrait.mp4",
	portraitPosters: Object.keys(CH04_PORTRAIT_POSTERS),
}, null, 2));
