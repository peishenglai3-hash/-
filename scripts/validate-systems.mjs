// 三大系统契约回归校验：选择数据、状态更新、第三章前置读取与画像结算。
// 通过 tsx 运行：npm.cmd run test:systems
import.meta.env = { BASE_URL: "/", MODE: "test", DEV: false, PROD: false };

const assert = (condition, message) => {
	if (!condition) {
		console.error(`FAIL ${message}`);
		process.exit(1);
	}
};

const systems = await import("../src/common/actionProfileSystem.ts");
const { CHOICES: PROLOGUE_CHOICES } = await import("../src/scenes/Scene01/content.ts");
const { CHOICES: CH01_Q1_CHOICES } = await import("../src/scenes/Scene03/ch01Sc01.content.ts");
const { CHOICES2: CH01_Q2_CHOICES } = await import("../src/scenes/Scene03/ch01Sc02.content.ts");
const { Q3_CHOICES, Q4_CHOICES } = await import("../src/scenes/Scene03/ch01Return.content.ts");
const { CH02_FLASHBACK_CHOICES } = await import("../src/scenes/Scene04/ch02Flashback.content.ts");
const { CH02_GROUP_CHOICES } = await import("../src/scenes/Scene04/ch02Discipline.content.ts");
const { CH02_MATERIALS_CHOICES } = await import("../src/scenes/Scene04/ch02Materials.content.ts");

const {
	applyFormalChoice,
	calculatePortrait,
	classifyRisk,
	createProfile,
	createRisk,
	getChapter3Access,
	getRiskFailure,
} = systems;

const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

// 剧本锁：序章只产生画像；第一章 Q1 的后台映射必须与章末核查一致。
assert(PROLOGUE_CHOICES.every((choice) => same(choice.profileDelta, {
	PRO_Q01_A: { C: 2, I: 1 },
	PRO_Q01_B: { C: 1, A: 2 },
	PRO_Q01_C: { I: 1, G: 2 },
	PRO_Q01_D: { D: 1, I: 2 },
	}[choice.id])), "prologue choice deltas are explicit");
assert(CH01_Q1_CHOICES.every((choice) => choice.profileDelta && choice.riskDelta), "chapter 1 Q1 has structured effects");
const q1Expected = {
	CH01_Q01_A: { profile: { D: 1, A: 1 }, risk: { identity: 0 } },
	CH01_Q01_B: { profile: { C: 2, A: 1 }, risk: { identity: 0, execution: 0 } },
	CH01_Q01_C: { profile: { P: 1, C: 1 }, risk: { identity: 2 } },
	CH01_Q01_D: { profile: { C: 2, I: 1 }, risk: { identity: 0 } },
};
for (const choice of CH01_Q1_CHOICES) {
	assert(same(choice.profileDelta, q1Expected[choice.id].profile), `${choice.id} profile mapping`);
	assert(same(choice.riskDelta, q1Expected[choice.id].risk), `${choice.id} risk mapping`);
}
assert(CH01_Q1_CHOICES.find((choice) => choice.id === "CH01_Q01_C").tags.includes("FAMILY_DOUBT"), "Q1 C FAMILY_DOUBT tag");

const assertChoiceEffects = (choices, expected, profileKey = "profileDelta", riskKey = "riskDelta") => {
	for (const choice of choices) {
		const item = expected[choice.id];
		assert(item, `${choice.id} is covered by the system audit table`);
		assert(same(choice[profileKey], item.profile), `${choice.id} exact profile effect`);
		assert(same(choice[riskKey], item.risk), `${choice.id} exact risk effect`);
	}
};
assertChoiceEffects(CH01_Q2_CHOICES, {
	CH01_Q02_A: { profile: { I: 2, P: 1 }, risk: {} },
	CH01_Q02_B: { profile: { P: 2, A: 1 }, risk: {} },
	CH01_Q02_C: { profile: { I: 2, D: 1 }, risk: {} },
	CH01_Q02_D: { profile: { G: 2, C: 1 }, risk: {} },
});
assertChoiceEffects(Q3_CHOICES, {
	CH01_Q3_A: { profile: { A: 2, G: 1 }, risk: {} },
	CH01_Q3_B: { profile: { C: 2, G: 1 }, risk: {} },
	CH01_Q3_C: { profile: { D: 2, A: 1 }, risk: { identity: 1 } },
	CH01_Q3_D: { profile: { C: 1, P: 1 }, risk: { identity: 2, coordination: 1 } },
}, "profile", "risk");
assertChoiceEffects(Q4_CHOICES, {
	CH01_Q4_A: { profile: { I: 2, A: 1 }, risk: {} },
	CH01_Q4_B: { profile: { A: 2, I: 1 }, risk: {} },
	CH01_Q4_C: { profile: { D: 2, P: 1 }, risk: {} },
	CH01_Q4_D: { profile: { C: 1, I: 2 }, risk: { identity: 1 } },
}, "profile", "risk");
assertChoiceEffects(CH02_FLASHBACK_CHOICES, {
	A: { profile: { I: 2, P: 1 }, risk: {} },
	B: { profile: { P: 2, A: 1 }, risk: {} },
	C: { profile: { G: 2, A: 1 }, risk: {} },
	D: { profile: { C: 2, G: 1 }, risk: {} },
});
assertChoiceEffects(CH02_GROUP_CHOICES, {
	A: { profile: { G: 2, C: 1 }, risk: { coordination: 0 } },
	B: { profile: { C: 2, G: 1 }, risk: { coordination: 0, execution: 0 } },
	C: { profile: { D: 1, G: 1 }, risk: { coordination: 0 } },
	D: { profile: { D: 2 }, risk: { coordination: 1 } },
});
assertChoiceEffects(CH02_MATERIALS_CHOICES, {
	A: { profile: { G: 2, C: 1 }, risk: { execution: 0 } },
	B: { profile: { C: 2 }, risk: { execution: 0 } },
	C: { profile: { G: 2, I: 1 }, risk: { execution: 0 } },
	D: { profile: { D: 1 }, risk: { identity: 1, execution: 1, coordination: 1 } },
});

// 选择执行器：画像直接累加，风险按 max(0, old + delta)，并记录标签与最后一次正式选择。
const runtime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
const result = applyFormalChoice(runtime, {
	choiceId: "TEST_CH03_CHOICE_A",
	chapter: 3,
	isFormalChoice: true,
	portraitChange: { D: 2, P: 1 },
	riskChange: { identity: 1, coordination: -5 },
	flag: "TEST_CHOICE",
	tags: ["TEST_TAG"],
	echoSummary: "test",
	failureCheck: true,
});
assert(runtime.profile.D === 2 && runtime.profile.P === 1, "formal choice updates profile");
assert(runtime.risk.identity === 1 && runtime.risk.coordination === 0, "formal choice clamps risk at zero");
assert(runtime.flags.has("TEST_CHOICE") && runtime.flags.has("TEST_TAG"), "formal choice updates flags");
assert(runtime.choice.id === "TEST_CH03_CHOICE_A", "formal choice records choice snapshot");
assert(result.failure === null, "non-threshold choice does not fail");

let chapterOneFailureRejected = false;
try {
	applyFormalChoice({ profile: createProfile(), risk: createRisk(), flags: new Set() }, {
		choiceId: "BAD_CH01_FAILURE_CHECK",
		chapter: 1,
		isFormalChoice: true,
		portraitChange: {},
		riskChange: { identity: 1 },
		failureCheck: true,
	});
} catch {
	chapterOneFailureRejected = true;
}
assert(chapterOneFailureRejected, "chapter 1/2 cannot enable failure checks");

// 阈值和优先级：协同 > 执行 > 身份。
assert(classifyRisk({ identity: 3, execution: 4, coordination: 6 }).identity === "LOW", "identity low threshold");
assert(classifyRisk({ identity: 4, execution: 5, coordination: 7 }).execution === "HIGH", "execution high threshold");
assert(classifyRisk({ identity: 6, execution: 7, coordination: 10 }).coordination === "FAILURE", "coordination failure threshold");
assert(getRiskFailure({ identity: 6, execution: 7, coordination: 10 }) === "coordination", "risk failure priority");

// 第三章前置检查只读风险，并把高风险映射为权限/位置表现，不写回永久风险。
const beforeRisk = { identity: 4, execution: 5, coordination: 7 };
const access = getChapter3Access(beforeRisk);
assert(access.failure === null && access.canContinue, "high risk remains playable before failure threshold");
assert(access.permissions.information === "reduced", "identity high reduces information");
assert(access.permissions.position === "rear", "execution high assigns rear task");
assert(!access.permissions.frontGroup, "coordination high removes front-group access");
assert(same(beforeRisk, { identity: 4, execution: 5, coordination: 7 }), "chapter 3 precheck does not mutate risk");
assert(getChapter3Access({ identity: 6, execution: 0, coordination: 0 }).failure === "identity", "identity failure state");

// 画像只按三条净值轴计算；局部均衡可见，完整均衡才是 BALANCED。
const balanced = calculatePortrait(createProfile());
assert(balanced.code === "BALANCED" && balanced.axes.action === "BALANCED", "full portrait balance");
const partial = calculatePortrait({ D: 2, C: 2, I: 1, G: 0, P: 0, A: 1 });
assert(partial.axes.action === "BALANCED" && partial.code === "DIA", "partial axis balance keeps default type resolution");

// 所有正式节点都必须携带结构化画像/风险字段；这里不允许回退到“凭文案猜数值”。
for (const [name, choices] of [
	["CH01_Q2", CH01_Q2_CHOICES],
	["CH01_Q3", Q3_CHOICES],
	["CH01_Q4", Q4_CHOICES],
	["CH02_FLASHBACK", CH02_FLASHBACK_CHOICES],
	["CH02_GROUP", CH02_GROUP_CHOICES],
	["CH02_MATERIALS", CH02_MATERIALS_CHOICES],
]) {
	for (const choice of choices) {
		const profile = choice.profileDelta ?? choice.profile;
		const risk = choice.riskDelta ?? choice.risk;
		assert(profile && risk, `${name} ${choice.id} has structured profile/risk fields`);
	}
}

console.log("SYSTEM CONTRACT PASS");
