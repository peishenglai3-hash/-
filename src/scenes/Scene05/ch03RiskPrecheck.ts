import {
	getChapter3Access,
	type Chapter3Access,
	type RiskDelta,
	type RiskLevel,
	type RiskValues,
} from "@/common/actionProfileSystem";

/**
 * 第三章风险预检查产生的任务权限。
 *
 * 这是风险值的派生结果，不是一次新的正式选择，也不修改永久风险。
 * 后续场景可以使用 permission/restrictions 决定可接触的行动对象。
 */
export type Chapter3TaskPermission =
	| "FORWARD_SUPPORT"
	| "REAR_SUPPORT"
	| "REAR_COORDINATION"
	| "ESCORTED_SUPPORT"
	| "WITHDRAWN";

export const CH03_RISK_PRECHECK_FLAGS = {
	started: "CH03_RISK_PRECHECK_STARTED",
	complete: "CH03_RISK_PRECHECK_COMPLETE",
	riskFailure: "CH03_RISK_PRECHECK_FAILURE",
	forwardSupport: "CH03_TASK_FORWARD_SUPPORT",
	rearSupport: "CH03_TASK_REAR_SUPPORT",
	rearCoordination: "CH03_TASK_REAR_COORDINATION",
	escortedSupport: "CH03_TASK_ESCORTED_SUPPORT",
	withdrawn: "CH03_TASK_WITHDRAWN",
	adjusted: "CH03_RISK_PRECHECK_ADJUSTED",
} as const;

/** 对外稳定标签；保留 CH03_TASK_* 旧标签作为存档兼容别名。 */
export const CH03_TASK_PERMISSION_TAGS: Record<Chapter3TaskPermission, string> = {
	FORWARD_SUPPORT: "FORWARD_SUPPORT",
	REAR_SUPPORT: "REAR_SUPPORT",
	REAR_COORDINATION: "REAR_COORDINATION",
	ESCORTED_SUPPORT: "ESCORTED_SUPPORT",
	WITHDRAWN: "WITHDRAWN",
};

export interface Chapter3TaskAssignment {
	access: Chapter3Access;
	permission: Chapter3TaskPermission;
	/** 同时出现多项偏高风险时保留全部限制，供后续节点组合判断。 */
	restrictions: Chapter3TaskPermission[];
	label: string;
	safetyLabel: string;
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
	LOW: "低",
	HIGH: "偏高",
	FAILURE: "过高",
};

export const TASK_PERMISSION_LABELS: Record<Chapter3TaskPermission, string> = {
	FORWARD_SUPPORT: "前方辅助",
	REAR_SUPPORT: "后方支援",
	REAR_COORDINATION: "后方协同",
	ESCORTED_SUPPORT: "陪同支援",
	WITHDRAWN: "退出行动",
};

/**
 * 将三项风险映射为本场可接触的行动范围。
 * 优先级遵循“严格限制优先”：身份限制 > 执行限制 > 协同限制；
 * 同时保留 restrictions，避免组合风险被压扁成一个展示标签。
 */
export function getChapter3TaskAssignment(
	risk: RiskValues,
): Chapter3TaskAssignment {
	const access = getChapter3Access(risk);
	if (!access.canContinue) {
		return {
			access,
			permission: "WITHDRAWN",
			restrictions: ["WITHDRAWN"],
			label: TASK_PERMISSION_LABELS.WITHDRAWN,
			safetyLabel: "不进入行动核心",
		};
	}

	const restrictions: Chapter3TaskPermission[] = [];
	if (access.levels.identity === "HIGH")
		restrictions.push("ESCORTED_SUPPORT");
	if (access.levels.execution === "HIGH") restrictions.push("REAR_SUPPORT");
	if (access.levels.coordination === "HIGH")
		restrictions.push("REAR_COORDINATION");

	const permission = restrictions[0] ?? "FORWARD_SUPPORT";
	return {
		access,
		permission,
		restrictions,
		label: TASK_PERMISSION_LABELS[permission],
		safetyLabel: restrictions.length === 0 ? "可继续参与" : "受限参与",
	};
}

export function riskLevelLabel(level: RiskLevel): string {
	return RISK_LEVEL_LABELS[level];
}

export function taskPermissionFlag(permission: Chapter3TaskPermission): string {
	return {
		FORWARD_SUPPORT: CH03_RISK_PRECHECK_FLAGS.forwardSupport,
		REAR_SUPPORT: CH03_RISK_PRECHECK_FLAGS.rearSupport,
		REAR_COORDINATION: CH03_RISK_PRECHECK_FLAGS.rearCoordination,
		ESCORTED_SUPPORT: CH03_RISK_PRECHECK_FLAGS.escortedSupport,
		WITHDRAWN: CH03_RISK_PRECHECK_FLAGS.withdrawn,
	}[permission];
}

export function taskPermissionCanonicalTag(permission: Chapter3TaskPermission): string {
	return CH03_TASK_PERMISSION_TAGS[permission];
}

export function taskPermissionFlags(permission: Chapter3TaskPermission): string[] {
	return [taskPermissionFlag(permission), taskPermissionCanonicalTag(permission)];
}

/**
 * 兼容旧调用方的占位接口。
 *
 * 按最新系统守则，前置检查只能读取风险并派生权限，不得修改永久风险。
 * 正式选择的风险变化仍由 applyFormalChoice 统一结算。
 */
export function chapter3PrecheckRiskAdjustment(
	_assignment: Chapter3TaskAssignment,
): RiskDelta {
	return {};
}

export function taskPermissionFromFlags(
	flags: ReadonlySet<string>,
): Chapter3TaskPermission | null {
	const permissions: Chapter3TaskPermission[] = [
		"FORWARD_SUPPORT",
		"REAR_SUPPORT",
		"REAR_COORDINATION",
		"ESCORTED_SUPPORT",
		"WITHDRAWN",
	];
	return (
		permissions.find((permission) =>
			taskPermissionFlags(permission).some((tag) => flags.has(tag)),
		) ?? null
	);
}
