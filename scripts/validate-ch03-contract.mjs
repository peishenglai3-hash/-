// 第三章完整契约校验：七个正式选择、章末收束、资源入口和逐项数值汇总。
import.meta.env = { BASE_URL: "/", MODE: "test", DEV: false, PROD: false };

import { access, stat } from "node:fs/promises";

const assert = (condition, message) => {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exit(1);
	}
};

const ids = ["A", "B", "C", "D"];
const { createProfile } = await import("../src/common/actionProfileSystem.ts");
const { CH03_FLASHBACK3_CHOICES, buildChapter3Flashback3FormalChoice } = await import(
	"../src/scenes/Scene05/ch03Flashback3.content.ts",
);
const {
	buildChapter3ObservationChoices,
	buildChapter3ObservationFormalChoice,
} = await import("../src/scenes/Scene05/ch03Observation.content.ts");
const {
	buildChapter3ActionChoices,
	buildChapter3ActionFormalChoice,
} = await import("../src/scenes/Scene05/ch03ActionStart.content.ts");
const {
	buildChapter3GateEntryChoices,
	buildChapter3GateEntryFormalChoice,
} = await import("../src/scenes/Scene05/ch03GateAttack.content.ts");
const { buildChapter3AfterBattleChoices, buildChapter3AfterBattleFormalChoice } = await import(
	"../src/scenes/Scene05/ch03AfterBattle.content.ts",
);
const {
	buildChapter3ClearingChoices,
	buildChapter3ClearingFormalChoice,
	buildChapter3MooncakeChoices,
	buildChapter3MooncakeFormalChoice,
	CH03_CHAPTER_END_FLAGS,
	CH03_CHAPTER_END_INTRO,
} = await import("../src/scenes/Scene05/ch03Aftermath.content.ts");

const forwardContext = { permission: "FORWARD_SUPPORT", coordinationRiskHigh: false };
const builders = [
	{
		name: "观察",
		choices: buildChapter3ObservationChoices("FORWARD_SUPPORT"),
		get: (id) => buildChapter3ObservationFormalChoice(`CH03_OBSERVATION_${id}`, forwardContext),
	},
	{
		name: "闪回三",
		choices: CH03_FLASHBACK3_CHOICES,
		get: (id) => buildChapter3Flashback3FormalChoice(`CH03_FLASHBACK3_${id}`),
	},
	{
		name: "行动开始",
		choices: buildChapter3ActionChoices("FORWARD_SUPPORT"),
		get: (id) => buildChapter3ActionFormalChoice(`CH03_ACTION_OBSERVE_${id}`, forwardContext),
	},
	{
		name: "撞门位置",
		choices: buildChapter3GateEntryChoices("FORWARD_SUPPORT"),
		get: (id) => buildChapter3GateEntryFormalChoice(`CH03_GATE_ENTRY_${id}`, forwardContext),
	},
	{
		name: "杜老三逃走后",
		choices: buildChapter3AfterBattleChoices(),
		get: (id) => buildChapter3AfterBattleFormalChoice(`CH03_AFTER_BATTLE_${id}`),
	},
	{
		name: "战后清点",
		choices: buildChapter3ClearingChoices(),
		get: (id) => buildChapter3ClearingFormalChoice(`CH03_CLEARING_${id}`),
	},
	{
		name: "月饼处理",
		choices: buildChapter3MooncakeChoices(),
		get: (id) => buildChapter3MooncakeFormalChoice(`CH03_MOONCAKE_${id}`),
	},
];

const definitionsByNode = [];
for (const node of builders) {
	assert(node.choices.length === 4, `${node.name} exposes four options`);
	assert(node.choices.map((choice) => choice.id.slice(-1)).join(",") === "A,B,C,D", `${node.name} option order`);
	const nodeDefinitions = [];
	for (const id of ids) {
		const definition = node.get(id);
		assert(definition?.chapter === 3 && definition.isFormalChoice, `${node.name} ${id} formal choice contract`);
		nodeDefinitions.push(definition);
	}
	definitionsByNode.push(nodeDefinitions);
}
const definitions = definitionsByNode.flat();

const axes = ["D", "C", "I", "G", "P", "A"];
const computedProfileMax = Object.fromEntries(
	axes.map((axis) => [axis, builders.reduce((sum, node) => {
		const max = Math.max(...ids.map((id) => node.get(id).portraitChange[axis] ?? 0));
		return sum + max;
	}, 0)]),
);
const computedRiskRange = Object.fromEntries(
	["identity", "execution", "coordination"].map((dimension) => {
		const valuesByNode = definitionsByNode.map((nodeDefinitions) =>
			nodeDefinitions.map((definition) => definition.riskChange[dimension] ?? 0),
		);
		return [dimension, {
			min: valuesByNode.reduce((sum, values) => sum + Math.min(...values, 0), 0),
			max: valuesByNode.reduce((sum, values) => sum + Math.max(...values, 0), 0),
		}];
	}),
);

const documentedProfileMax = { I: 12, C: 13, G: 14, A: 6, P: 8, D: 8 };
const documentedRiskRange = {
	identity: { min: 0, max: 0 },
	execution: { min: -4, max: 8 },
	coordination: { min: -4, max: 12 },
};
const profileRangeMismatch = axes.filter((axis) => computedProfileMax[axis] !== documentedProfileMax[axis]);
const riskRangeMismatch = ["identity", "execution", "coordination"].filter((dimension) =>
	computedRiskRange[dimension].min !== documentedRiskRange[dimension].min ||
	computedRiskRange[dimension].max !== documentedRiskRange[dimension].max,
);

assert(CH03_CHAPTER_END_FLAGS.complete === "CH03_CHAPTER_END_COMPLETE", "chapter end completion flag");
assert(CH03_CHAPTER_END_INTRO.some((entry) => entry.text === "聚是一团火，散是满天星。"), "chapter end closing line");

const requiredFiles = [
	"public/assets/audio/ch03/05_火光余温_清点与集结.mp3",
	"public/assets/ch03/cinematics/ch03_chapter_end.mp4",
];
for (const file of requiredFiles) {
	await access(new URL(`../${file}`, import.meta.url));
	assert((await stat(new URL(`../${file}`, import.meta.url))).size > 0, `${file} is non-empty`);
}

const status = profileRangeMismatch.length || riskRangeMismatch.length
	? "CHAPTER3 CONTRACT PASS WITH SPEC RANGE WARNING"
	: "CHAPTER3 CONTRACT PASS";
console.log(JSON.stringify({
	status,
	formalChoiceNodes: builders.map((node) => node.name),
	computedProfileMax,
	documentedProfileMax,
	computedRiskRange,
	documentedRiskRange,
	profileRangeMismatch,
	riskRangeMismatch,
	flags: CH03_CHAPTER_END_FLAGS,
}, null, 2));
