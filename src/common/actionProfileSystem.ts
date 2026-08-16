/**
 * 行动风险系统与人物画像系统的唯一数值入口。
 *
 * 场景只负责把剧情选项转换成 FormalChoiceDefinition；数值累加、风险阈值、
 * 第三章前置权限和画像轴计算都在这里完成，避免不同场景各自改写状态后漂移。
 */

export const PROFILE_AXES = ["D", "C", "I", "G", "P", "A"] as const;
export type ProfileAxis = (typeof PROFILE_AXES)[number];
export type ProfileValues = Record<ProfileAxis, number>;
export type ProfileDelta = Partial<Record<ProfileAxis, number>>;

export const RISK_DIMENSIONS = ["identity", "execution", "coordination"] as const;
export type RiskDimension = (typeof RISK_DIMENSIONS)[number];
export type RiskValues = Record<RiskDimension, number>;
export type RiskDelta = Partial<Record<RiskDimension, number>>;

export type ChapterNumber = 0 | 1 | 2 | 3 | 4;
export type RiskLevel = "LOW" | "HIGH" | "FAILURE";
export type RiskFailure = RiskDimension;

export interface ChoiceSnapshot {
	id: string;
	flag: string;
	echo_summary: string;
}

export interface ChoiceRuntimeState {
	profile: ProfileValues;
	risk: RiskValues;
	flags: Set<string>;
	choice?: ChoiceSnapshot | null;
}

/** 与参考守则中的结构化正式选择字段一一对应。 */
export interface FormalChoiceDefinition {
	choiceId: string;
	chapter: ChapterNumber;
	isFormalChoice: true;
	portraitChange: ProfileDelta;
	riskChange: RiskDelta;
	flag?: string;
	tags?: readonly string[];
	echoSummary?: string;
	nextNode?: string;
	failureCheck: boolean;
}

export interface ChoiceApplicationResult {
	failure: RiskFailure | null;
	profile: ProfileValues;
	risk: RiskValues;
}

export const RISK_THRESHOLDS: Record<
	RiskDimension,
	{ high: number; failure: number }
> = {
	identity: { high: 4, failure: 6 },
	execution: { high: 5, failure: 7 },
	coordination: { high: 7, failure: 10 },
};

export interface RiskLevels {
	identity: RiskLevel;
	execution: RiskLevel;
	coordination: RiskLevel;
}

export interface Chapter3Permissions {
	information: "full" | "reduced";
	position: "assigned" | "rear" | "peripheral";
	frontGroup: boolean;
}

export interface Chapter3Access {
	levels: RiskLevels;
	failure: RiskFailure | null;
	canContinue: boolean;
	permissions: Chapter3Permissions;
}

export type PortraitAxisDirection = "D" | "C" | "I" | "G" | "P" | "A" | "BALANCED";

export interface PortraitAxes {
	action: "D" | "C" | "BALANCED";
	responsibility: "I" | "G" | "BALANCED";
	principle: "P" | "A" | "BALANCED";
}

export interface PortraitResult {
	nets: { DC: number; IG: number; PA: number };
	axes: PortraitAxes;
	code: "DIP" | "DIA" | "DGP" | "DGA" | "CIP" | "CIA" | "CGP" | "CGA" | "BALANCED";
	name: string;
	reference: string;
}

const PORTRAIT_META: Record<Exclude<PortraitResult["code"], "BALANCED">, { name: string; reference: string }> = {
	DIP: { name: "独胆守正型", reference: "孙中山" },
	DIA: { name: "破局应变型", reference: "邓小平" },
	DGP: { name: "聚力守正型", reference: "毛泽东" },
	DGA: { name: "统筹应变型", reference: "周恩来" },
	CIP: { name: "静水守正型", reference: "朱德" },
	CIA: { name: "审势应变型", reference: "彭德怀" },
	CGP: { name: "定局守正型", reference: "刘胡兰" },
	CGA: { name: "谋局应变型", reference: "叶剑英" },
};

export function createProfile(): ProfileValues {
	return { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 };
}

export function createRisk(): RiskValues {
	return { identity: 0, execution: 0, coordination: 0 };
}

function assertInteger(value: number, label: string): void {
	if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
}

function assertProfileDelta(delta: ProfileDelta): void {
	for (const [axis, value] of Object.entries(delta)) {
		if (!(PROFILE_AXES as readonly string[]).includes(axis))
			throw new Error(`Unknown profile axis: ${axis}`);
		if (typeof value !== "number") throw new Error(`Profile delta ${axis} must be numeric`);
		assertInteger(value, `Profile delta ${axis}`);
		if (value < 0) throw new Error(`Profile delta ${axis} cannot be negative`);
	}
}

function assertRiskDelta(delta: RiskDelta): void {
	for (const [dimension, value] of Object.entries(delta)) {
		if (!(RISK_DIMENSIONS as readonly string[]).includes(dimension))
			throw new Error(`Unknown risk dimension: ${dimension}`);
		if (typeof value !== "number") throw new Error(`Risk delta ${dimension} must be numeric`);
		assertInteger(value, `Risk delta ${dimension}`);
	}
}

export function applyProfileDelta(profile: ProfileValues, delta: ProfileDelta): ProfileValues {
	assertProfileDelta(delta);
	for (const axis of PROFILE_AXES) profile[axis] += delta[axis] ?? 0;
	return profile;
}

export function applyRiskDelta(risk: RiskValues, delta: RiskDelta): RiskValues {
	assertRiskDelta(delta);
	for (const dimension of RISK_DIMENSIONS)
		risk[dimension] = Math.max(0, risk[dimension] + (delta[dimension] ?? 0));
	return risk;
}

function validateChoiceDefinition(choice: FormalChoiceDefinition): void {
	if (!choice.choiceId) throw new Error("Formal choice requires choiceId");
	if (!choice.isFormalChoice) throw new Error(`${choice.choiceId} is not a formal choice`);
	if (choice.chapter < 0 || choice.chapter > 4) throw new Error(`${choice.choiceId} has invalid chapter`);
	if (choice.chapter < 3 && choice.failureCheck)
		throw new Error(`${choice.choiceId} cannot check failure before Chapter 3`);
	if (choice.chapter === 0 && Object.values(choice.riskChange).some((value) => value !== 0))
		throw new Error(`${choice.choiceId} cannot mutate risk in the prologue`);
	if (choice.chapter === 4 && Object.values(choice.riskChange).some((value) => value !== 0))
		throw new Error(`${choice.choiceId} cannot mutate risk in Chapter 4`);
	assertProfileDelta(choice.portraitChange);
	assertRiskDelta(choice.riskChange);
}

export function applyFormalChoice(
	state: ChoiceRuntimeState,
	choice: FormalChoiceDefinition,
): ChoiceApplicationResult {
	validateChoiceDefinition(choice);
	applyProfileDelta(state.profile, choice.portraitChange);
	applyRiskDelta(state.risk, choice.riskChange);
	if (choice.flag) state.flags.add(choice.flag);
	for (const tag of choice.tags ?? []) state.flags.add(tag);
	if (choice.flag || choice.echoSummary !== undefined) {
		state.choice = {
			id: choice.choiceId,
			flag: choice.flag ?? choice.choiceId,
			echo_summary: choice.echoSummary ?? "",
		};
	}
	const failure = choice.failureCheck ? getRiskFailure(state.risk) : null;
	return { failure, profile: state.profile, risk: state.risk };
}

function levelFor(value: number, threshold: { high: number; failure: number }): RiskLevel {
	if (value >= threshold.failure) return "FAILURE";
	if (value >= threshold.high) return "HIGH";
	return "LOW";
}

export function classifyRisk(risk: RiskValues): RiskLevels {
	return {
		identity: levelFor(risk.identity, RISK_THRESHOLDS.identity),
		execution: levelFor(risk.execution, RISK_THRESHOLDS.execution),
		coordination: levelFor(risk.coordination, RISK_THRESHOLDS.coordination),
	};
}

/** 多项同时失败时按守则固定为协同 > 执行 > 身份。 */
export function getRiskFailure(risk: RiskValues): RiskFailure | null {
	if (risk.coordination >= RISK_THRESHOLDS.coordination.failure) return "coordination";
	if (risk.execution >= RISK_THRESHOLDS.execution.failure) return "execution";
	if (risk.identity >= RISK_THRESHOLDS.identity.failure) return "identity";
	return null;
}

/** 第三章开始前的纯读取检查；本函数不修改传入 risk。 */
export function getChapter3Access(risk: RiskValues): Chapter3Access {
	const levels = classifyRisk(risk);
	const failure = getRiskFailure(risk);
	const permissions: Chapter3Permissions = {
		information: levels.identity === "HIGH" ? "reduced" : "full",
		position: levels.execution === "HIGH" ? "rear" : "assigned",
		frontGroup: levels.coordination !== "HIGH" && levels.coordination !== "FAILURE",
	};
	return { levels, failure, canContinue: failure === null, permissions };
}

function side(value: number, other: number, left: PortraitAxisDirection, right: PortraitAxisDirection): PortraitAxisDirection {
	if (value > other) return left;
	if (value < other) return right;
	return "BALANCED";
}

export function calculatePortrait(profile: ProfileValues): PortraitResult {
	const nets = { DC: profile.D - profile.C, IG: profile.I - profile.G, PA: profile.P - profile.A };
	const axes: PortraitAxes = {
		action: side(profile.D, profile.C, "D", "C") as PortraitAxes["action"],
		responsibility: side(profile.I, profile.G, "I", "G") as PortraitAxes["responsibility"],
		principle: side(profile.P, profile.A, "P", "A") as PortraitAxes["principle"],
	};
	if (axes.action === "BALANCED" && axes.responsibility === "BALANCED" && axes.principle === "BALANCED")
		return { nets, axes, code: "BALANCED", name: "综合均衡型", reference: "李大钊" };

	// 只有完整三轴代码需要消解局部均衡；轴面仍保留 BALANCED。
	const action = axes.action === "BALANCED" ? "D" : axes.action;
	const responsibility = axes.responsibility === "BALANCED" ? "I" : axes.responsibility;
	const principle = axes.principle === "BALANCED" ? "P" : axes.principle;
	const code = `${action}${responsibility}${principle}` as Exclude<PortraitResult["code"], "BALANCED">;
	return { nets, axes, code, ...PORTRAIT_META[code] };
}
