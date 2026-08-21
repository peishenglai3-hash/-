import { assetPath } from "@/common/paths";
import type { PortraitResult } from "@/common/actionProfileSystem";

export const CH04_PORTRAIT_POSTERS: Record<PortraitResult["code"], string> = {
	DIP: assetPath("/assets/ch04/final-posters/独胆守正.png"),
	DIA: assetPath("/assets/ch04/final-posters/破局应变.png"),
	DGP: assetPath("/assets/ch04/final-posters/聚力守正.png"),
	DGA: assetPath("/assets/ch04/final-posters/统筹应变.png"),
	CIP: assetPath("/assets/ch04/final-posters/静水守正.png"),
	CIA: assetPath("/assets/ch04/final-posters/审视应变.png"),
	CGP: assetPath("/assets/ch04/final-posters/定局守正.png"),
	CGA: assetPath("/assets/ch04/final-posters/谋局应变.png"),
	BALANCED: assetPath("/assets/ch04/final-posters/综合均衡.png"),
};

export const PORTRAIT_AXIS_GUIDE = [
	{ code: "D / C", title: "行动决断 / 审慎判断", text: "先行动，或先确认局势与条件。" },
	{ code: "I / G", title: "个人担当 / 组织协同", text: "亲自承担，或依靠分工与集体完成。" },
	{ code: "P / A", title: "原则坚持 / 情境调适", text: "守住原则，或随现场条件调整做法。" },
] as const;

export const PORTRAIT_CORE_TENDENCY: Record<PortraitResult["code"], string> = {
	DIP: "你倾向于主动推进，愿意亲自承担责任，并在压力下守住自己的基本原则。",
	DIA: "你倾向于主动推进，愿意亲自承担责任，并根据现实条件调整行动方式。",
	DGP: "你倾向于主动推进，依靠组织协同完成行动，并守住基本原则。",
	DGA: "你倾向于主动推进，通过组织协同推进任务，并根据现实条件调整方法。",
	CIP: "你倾向于先确认条件，愿意亲自承担责任，并在压力下守住基本原则。",
	CIA: "你倾向于先确认条件，愿意亲自承担责任，并根据现实条件调整行动方式。",
	CGP: "你倾向于先确认条件，遵循组织分工，并守住基本原则。",
	CGA: "你倾向于先确认条件，通过组织协同并根据现实条件调整方法。",
	BALANCED: "你没有在三组画像轴上形成明显的固定偏向，能够根据现场条件在不同方向之间切换。",
};

export function portraitAxisLabel(
	axis: "D" | "C" | "I" | "G" | "P" | "A" | "BALANCED",
): string {
	return axis === "BALANCED" ? "均衡" : `${axis} 倾向`;
}
