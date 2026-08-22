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
	getChapter3TaskAssignment,
	CH03_TASK_PERMISSION_TAGS,
	chapter3PrecheckRiskAdjustment,
} = await import("../src/scenes/Scene05/ch03RiskPrecheck.ts");
const {
	buildChapter3ObservationChoices,
	buildChapter3ObservationFormalChoice,
	CH03_OBSERVATION_FLAGS,
} = await import("../src/scenes/Scene05/ch03Observation.content.ts");
const {
	buildChapter3ActionChoices,
	buildChapter3ActionFormalChoice,
	CH03_ACTION_FLAGS,
} = await import("../src/scenes/Scene05/ch03ActionStart.content.ts");
const {
	buildChapter3GateEntryChoices,
	buildChapter3GateEntryFormalChoice,
	CH03_GATE_ATTACK_FLAGS,
} = await import("../src/scenes/Scene05/ch03GateAttack.content.ts");
const {
	buildChapter3AfterBattleChoices,
	buildChapter3AfterBattleFormalChoice,
	CH03_AFTER_BATTLE_FLAGS,
} = await import("../src/scenes/Scene05/ch03AfterBattle.content.ts");
const {
	buildChapter3ClearingChoices,
	buildChapter3ClearingFormalChoice,
	buildChapter3MooncakeChoices,
	buildChapter3MooncakeFormalChoice,
	CH03_CLEARING_FLAGS,
	CH03_MOONCAKE_FLAGS,
	moonCakeStatus,
} = await import("../src/scenes/Scene05/ch03Aftermath.content.ts");

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

let chapterFourFailureRejected = false;
try {
	applyFormalChoice({ profile: createProfile(), risk: createRisk(), flags: new Set() }, {
		choiceId: "BAD_CH04_FAILURE_CHECK",
		chapter: 4,
		isFormalChoice: true,
		portraitChange: { D: 1 },
		riskChange: {},
		failureCheck: true,
	});
} catch {
	chapterFourFailureRejected = true;
}
assert(chapterFourFailureRejected, "chapter 4 cannot enable failure checks");

// 阈值和优先级：协同 > 执行 > 身份。
assert(classifyRisk({ identity: 3, execution: 4, coordination: 6 }).identity === "LOW", "identity low threshold");
assert(classifyRisk({ identity: 4, execution: 5, coordination: 7 }).execution === "HIGH", "execution high threshold");
assert(classifyRisk({ identity: 6, execution: 7, coordination: 10 }).coordination === "FAILURE", "coordination failure threshold");
assert(getRiskFailure({ identity: 6, execution: 7, coordination: 10 }) === "coordination", "risk failure priority");

// 第三章前置检查只读风险派生权限；重新安排不得修改永久风险。
const beforeRisk = { identity: 4, execution: 5, coordination: 7 };
const access = getChapter3Access(beforeRisk);
assert(access.failure === null && access.canContinue, "high risk remains playable before failure threshold");
assert(access.permissions.information === "reduced", "identity high reduces information");
assert(access.permissions.position === "rear", "execution high assigns rear task");
assert(!access.permissions.frontGroup, "coordination high removes front-group access");
assert(same(beforeRisk, { identity: 4, execution: 5, coordination: 7 }), "chapter 3 precheck does not mutate risk");
assert(getChapter3Access({ identity: 6, execution: 0, coordination: 0 }).failure === "identity", "identity failure state");
assert(getChapter3TaskAssignment({ identity: 0, execution: 0, coordination: 0 }).permission === "FORWARD_SUPPORT", "low risk keeps forward support");
assert(getChapter3TaskAssignment({ identity: 0, execution: 5, coordination: 0 }).permission === "REAR_SUPPORT", "execution high moves to rear support");
assert(getChapter3TaskAssignment({ identity: 0, execution: 0, coordination: 7 }).permission === "REAR_COORDINATION", "coordination high moves to rear coordination");
assert(getChapter3TaskAssignment({ identity: 4, execution: 0, coordination: 0 }).permission === "ESCORTED_SUPPORT", "identity high assigns escort");
assert(getChapter3TaskAssignment({ identity: 6, execution: 0, coordination: 0 }).permission === "WITHDRAWN", "failure threshold withdraws from action");
assert(CH03_TASK_PERMISSION_TAGS.REAR_SUPPORT === "REAR_SUPPORT", "rear support keeps canonical tag");
assert(CH03_TASK_PERMISSION_TAGS.REAR_COORDINATION === "REAR_COORDINATION", "rear coordination keeps canonical tag");
assert(CH03_TASK_PERMISSION_TAGS.ESCORTED_SUPPORT === "ESCORTED_SUPPORT", "escorted support keeps canonical tag");
assert(same(chapter3PrecheckRiskAdjustment(getChapter3TaskAssignment({ identity: 0, execution: 5, coordination: 7 })), {}), "precheck never mutates permanent risk");
assert(same(chapter3PrecheckRiskAdjustment(getChapter3TaskAssignment({ identity: 4, execution: 0, coordination: 0 })), {}), "identity precheck does not mutate risk");

const clearingFailureDefinition = buildChapter3ClearingFormalChoice("CH03_CLEARING_D");
const clearingRuntime = {
	profile: createProfile(),
	risk: { identity: 0, execution: 6, coordination: 8 },
	flags: new Set(),
};
const clearingResult = applyFormalChoice(clearingRuntime, clearingFailureDefinition);
assert(clearingResult.failure === "coordination", "clearing D checks the coordination failure threshold");
assert(clearingRuntime.risk.execution === 7 && clearingRuntime.risk.coordination === 10, "clearing D keeps independent risk deltas");
assert(CH03_CLEARING_FLAGS.replacement === "CH03_CLEARING_REPLACEMENT", "clearing failure has a recoverable replacement flag");

// 第三章交互一：四张分支图都对应正式选项；C 只在前方辅助权限下可用。
const observationForwardChoices = buildChapter3ObservationChoices("FORWARD_SUPPORT");
const observationRearChoices = buildChapter3ObservationChoices("REAR_SUPPORT");
assert(observationForwardChoices.length === 4, "observation exposes four choice images");
assert(!observationForwardChoices.find((choice) => choice.id.endsWith("_C")).disabled, "forward support unlocks supply observation");
assert(observationRearChoices.find((choice) => choice.id.endsWith("_C")).disabled, "rear support locks supply observation");

const observationA = buildChapter3ObservationFormalChoice("CH03_OBSERVATION_A", {
	permission: "REAR_SUPPORT",
	coordinationRiskHigh: false,
});
const observationARuntime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
applyFormalChoice(observationARuntime, observationA);
assert(observationARuntime.profile.C === 2, "observation A rear task adds cautious judgment +2");
assert(observationARuntime.risk.execution === 0, "observation A lowers execution risk with zero clamp");
assert(observationARuntime.flags.has(CH03_OBSERVATION_FLAGS.gateObserved), "observation A rear task records gate observation");

const observationC = buildChapter3ObservationFormalChoice("CH03_OBSERVATION_C", {
	permission: "FORWARD_SUPPORT",
	coordinationRiskHigh: false,
});
const observationCRuntime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
applyFormalChoice(observationCRuntime, observationC);
assert(observationCRuntime.profile.I === 1 && observationCRuntime.profile.C === 2, "observation C updates responsibility and caution axes");

const observationB = buildChapter3ObservationFormalChoice("CH03_OBSERVATION_B", {
	permission: "FORWARD_SUPPORT",
	coordinationRiskHigh: false,
});
const observationBRuntime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
applyFormalChoice(observationBRuntime, observationB);
assert(observationBRuntime.profile.G === 3, "observation B adds organization coordination");
assert(observationBRuntime.risk.coordination === 0, "observation B lowers coordination risk with zero clamp");

const observationD = buildChapter3ObservationFormalChoice("CH03_OBSERVATION_D", {
	permission: "REAR_COORDINATION",
	coordinationRiskHigh: true,
});
const observationDRuntime = {
	profile: createProfile(),
	risk: { identity: 0, execution: 6, coordination: 8 },
	flags: new Set(),
};
const observationDResult = applyFormalChoice(observationDRuntime, observationD);
assert(observationDResult.failure === "coordination", "observation D checks the chapter 3 failure threshold");
assert(observationDRuntime.profile.D === 2, "observation D adds action decision");
assert(observationDRuntime.flags.has(CH03_OBSERVATION_FLAGS.movementRestricted), "high coordination risk restricts movement");

// 第三章行动开始：四张分支图对应的画像/风险入口与交互一保持同一套正式选择契约。
const actionForwardChoices = buildChapter3ActionChoices("FORWARD_SUPPORT");
const actionRearChoices = buildChapter3ActionChoices("REAR_SUPPORT");
assert(actionForwardChoices.length === 4, "action start exposes four choice images");
assert(!actionForwardChoices.find((choice) => choice.id.endsWith("_C")).disabled, "forward support unlocks action supply check");
assert(actionRearChoices.find((choice) => choice.id.endsWith("_C")).disabled, "rear support locks action supply check");

const actionExpected = {
	A: { profile: { C: 2, P: 1 }, risk: { execution: -1 } },
	B: { profile: { G: 3, A: 1 }, risk: { coordination: -1 } },
	C: { profile: { I: 1, C: 2 }, risk: { execution: -1 } },
	D: { profile: { D: 2 }, risk: { execution: 1, coordination: 2 } },
};
for (const id of ["A", "B", "C", "D"]) {
	const definition = buildChapter3ActionFormalChoice(`CH03_ACTION_OBSERVE_${id}`, {
		permission: "FORWARD_SUPPORT",
		coordinationRiskHigh: false,
	});
	const runtime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
	applyFormalChoice(runtime, definition);
	assert(same(runtime.profile, { D: actionExpected[id].profile.D ?? 0, C: actionExpected[id].profile.C ?? 0, I: actionExpected[id].profile.I ?? 0, G: actionExpected[id].profile.G ?? 0, P: actionExpected[id].profile.P ?? 0, A: actionExpected[id].profile.A ?? 0 }), `action ${id} exact profile effect`);
	assert(runtime.risk.execution === Math.max(0, actionExpected[id].risk.execution ?? 0), `action ${id} execution risk effect`);
	assert(runtime.risk.coordination === Math.max(0, actionExpected[id].risk.coordination ?? 0), `action ${id} coordination risk effect`);
}
assert(buildChapter3ActionFormalChoice("CH03_ACTION_OBSERVE_C", {
	permission: "REAR_SUPPORT",
	coordinationRiskHigh: false,
}) === null, "rear action permission rejects supply choice");
const actionD = buildChapter3ActionFormalChoice("CH03_ACTION_OBSERVE_D", {
	permission: "REAR_COORDINATION",
	coordinationRiskHigh: true,
});
const actionDRuntime = {
	profile: createProfile(),
	risk: { identity: 0, execution: 6, coordination: 8 },
	flags: new Set(),
};
const actionDResult = applyFormalChoice(actionDRuntime, actionD);
assert(actionDResult.failure === "coordination", "action D checks the chapter 3 failure threshold");
assert(actionDRuntime.profile.D === 2, "action D adds action decision");
assert(actionDRuntime.flags.has(CH03_ACTION_FLAGS.positionAbandoned), "high coordination action D abandons front position");

// 第三章交互三：只有前方辅助权限可进入撞门辅助位置；后方/受监视分支仍保留脱离队伍的风险选项。
const gateForwardChoices = buildChapter3GateEntryChoices("FORWARD_SUPPORT");
const gateRearChoices = buildChapter3GateEntryChoices("REAR_SUPPORT");
assert(gateForwardChoices.length === 4, "gate entry exposes four choice images");
assert(gateForwardChoices.every((choice) => !choice.disabled), "forward support unlocks gate entry choices");
assert(gateRearChoices.filter((choice) => choice.disabled).length === 3, "rear support keeps only remote D entry available");

const gateExpected = {
	A: { profile: { D: 1, G: 3 }, risk: { coordination: -1 } },
	B: { profile: { C: 2, G: 2 }, risk: { execution: -1 } },
	C: { profile: { I: 2, P: 1 }, risk: { execution: 1 } },
	D: { profile: { D: 2 }, risk: { execution: 2, coordination: 3 } },
};
for (const id of ["A", "B", "C", "D"]) {
	const definition = buildChapter3GateEntryFormalChoice(`CH03_GATE_ENTRY_${id}`, {
		permission: "FORWARD_SUPPORT",
		coordinationRiskHigh: false,
	});
	const runtime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
	applyFormalChoice(runtime, definition);
	assert(same(runtime.profile, {
		D: gateExpected[id].profile.D ?? 0,
		C: gateExpected[id].profile.C ?? 0,
		I: gateExpected[id].profile.I ?? 0,
		G: gateExpected[id].profile.G ?? 0,
		P: gateExpected[id].profile.P ?? 0,
		A: gateExpected[id].profile.A ?? 0,
	}), `gate entry ${id} exact profile effect`);
	assert(runtime.risk.execution === Math.max(0, gateExpected[id].risk.execution ?? 0), `gate entry ${id} execution effect`);
	assert(runtime.risk.coordination === Math.max(0, gateExpected[id].risk.coordination ?? 0), `gate entry ${id} coordination effect`);
}
assert(buildChapter3GateEntryFormalChoice("CH03_GATE_ENTRY_A", {
	permission: "REAR_SUPPORT",
	coordinationRiskHigh: false,
}) === null, "rear support rejects front gate A entry");
const gateD = buildChapter3GateEntryFormalChoice("CH03_GATE_ENTRY_D", {
	permission: "REAR_COORDINATION",
	coordinationRiskHigh: false,
});
const gateDRuntime = {
	profile: createProfile(),
	risk: { identity: 0, execution: 5, coordination: 8 },
	flags: new Set(),
};
const gateDResult = applyFormalChoice(gateDRuntime, gateD);
assert(gateDResult.failure === "coordination", "gate entry D checks coordination failure threshold");
assert(gateDRuntime.flags.has(CH03_GATE_ATTACK_FLAGS.positionAbandoned), "gate entry D records abandoned position");

// 第三章交互四：固定历史节点之后的院内控制选择，必须继续走统一三大系统入口。
const afterBattleChoices = buildChapter3AfterBattleChoices();
assert(afterBattleChoices.length === 4, "after-battle exposes four choice images");
const afterBattleExpected = {
	A: { profile: { G: 3, P: 1 }, risk: { coordination: -1 } },
	B: { profile: { I: 3, G: 1 }, risk: {} },
	C: { profile: { C: 2, P: 2 }, risk: { execution: -1 } },
	D: { profile: { D: 2 }, risk: { execution: 2, coordination: 3 } },
};
for (const id of ["A", "B", "C", "D"]) {
	const definition = buildChapter3AfterBattleFormalChoice(`CH03_AFTER_BATTLE_${id}`);
	const runtime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
	applyFormalChoice(runtime, definition);
	assert(same(runtime.profile, {
		D: afterBattleExpected[id].profile.D ?? 0,
		C: afterBattleExpected[id].profile.C ?? 0,
		I: afterBattleExpected[id].profile.I ?? 0,
		G: afterBattleExpected[id].profile.G ?? 0,
		P: afterBattleExpected[id].profile.P ?? 0,
		A: afterBattleExpected[id].profile.A ?? 0,
	}), `after-battle ${id} exact profile effect`);
	assert(runtime.risk.execution === Math.max(0, afterBattleExpected[id].risk.execution ?? 0), `after-battle ${id} execution effect`);
	assert(runtime.risk.coordination === Math.max(0, afterBattleExpected[id].risk.coordination ?? 0), `after-battle ${id} coordination effect`);
}
const afterBattleD = buildChapter3AfterBattleFormalChoice("CH03_AFTER_BATTLE_D");
const afterBattleDRuntime = {
	profile: createProfile(),
	risk: { identity: 0, execution: 5, coordination: 8 },
	flags: new Set(),
};
const afterBattleDResult = applyFormalChoice(afterBattleDRuntime, afterBattleD);
assert(afterBattleDResult.failure === "coordination", "after-battle D checks coordination failure threshold");
assert(afterBattleDRuntime.flags.has("POSITION_ABANDONED"), "after-battle D records position abandoned");
assert(CH03_AFTER_BATTLE_FLAGS.choiceD === "CH03_AFTER_BATTLE_D", "after-battle flags remain stable");

// 第三章交互五：战后清点，D 只在选择后的协同风险进入偏高区间时追加 PROPERTY_SUSPICION。
const clearingChoices = buildChapter3ClearingChoices();
assert(clearingChoices.length === 4, "clearing exposes four choice images");
const clearingExpected = {
	A: { profile: { C: 2, P: 2 }, risk: { execution: -1 } },
	B: { profile: { G: 3, I: 1 }, risk: { coordination: -1 } },
	C: { profile: { I: 3, A: 1 }, risk: {} },
	D: { profile: { C: 1 }, risk: { execution: 1, coordination: 2 } },
};
for (const id of ["A", "B", "C", "D"]) {
	const definition = buildChapter3ClearingFormalChoice(`CH03_CLEARING_${id}`);
	const runtime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
	applyFormalChoice(runtime, definition);
	assert(same(runtime.profile, {
		D: clearingExpected[id].profile.D ?? 0,
		C: clearingExpected[id].profile.C ?? 0,
		I: clearingExpected[id].profile.I ?? 0,
		G: clearingExpected[id].profile.G ?? 0,
		P: clearingExpected[id].profile.P ?? 0,
		A: clearingExpected[id].profile.A ?? 0,
	}), `clearing ${id} exact profile effect`);
	assert(runtime.risk.execution === Math.max(0, clearingExpected[id].risk.execution ?? 0), `clearing ${id} execution effect`);
	assert(runtime.risk.coordination === Math.max(0, clearingExpected[id].risk.coordination ?? 0), `clearing ${id} coordination effect`);
}
const clearingD = buildChapter3ClearingFormalChoice("CH03_CLEARING_D", true);
const clearingDRuntime = { profile: createProfile(), risk: { identity: 0, execution: 0, coordination: 5 }, flags: new Set() };
applyFormalChoice(clearingDRuntime, clearingD);
assert(clearingDRuntime.flags.has("PROPERTY_SUSPICION"), "clearing D high coordination adds property suspicion");
assert(clearingDRuntime.flags.has(CH03_CLEARING_FLAGS.choiceD), "clearing flags remain stable");

// 第三章交互六：月饼只改变画像与物件状态，不改变三项行动风险。
const mooncakeChoices = buildChapter3MooncakeChoices();
assert(mooncakeChoices.length === 4, "mooncake exposes four choice images");
const mooncakeExpected = {
	A: { profile: { I: 3, G: 1 }, status: "MOONCAKE_SHARED" },
	B: { profile: { G: 3, A: 1 }, status: "MOONCAKE_GROUP" },
	C: { profile: { A: 3, C: 1 }, status: "MOONCAKE_SELF" },
	D: { profile: { P: 2, I: 1 }, status: "MOONCAKE_KEPT" },
};
for (const id of ["A", "B", "C", "D"]) {
	const definition = buildChapter3MooncakeFormalChoice(`CH03_MOONCAKE_${id}`);
	const runtime = { profile: createProfile(), risk: createRisk(), flags: new Set() };
	applyFormalChoice(runtime, definition);
	assert(same(runtime.profile, {
		D: mooncakeExpected[id].profile.D ?? 0,
		C: mooncakeExpected[id].profile.C ?? 0,
		I: mooncakeExpected[id].profile.I ?? 0,
		G: mooncakeExpected[id].profile.G ?? 0,
		P: mooncakeExpected[id].profile.P ?? 0,
		A: mooncakeExpected[id].profile.A ?? 0,
	}), `mooncake ${id} exact profile effect`);
	assert(same(runtime.risk, createRisk()), `mooncake ${id} leaves risk unchanged`);
	assert(runtime.flags.has(moonCakeStatus(id)), `mooncake ${id} records ${mooncakeExpected[id].status}`);
}
assert(CH03_MOONCAKE_FLAGS.choiceComplete === "CH03_MOONCAKE_CHOICE_COMPLETE", "mooncake flags remain stable");

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
