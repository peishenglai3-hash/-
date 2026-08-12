import { reactive } from "vue";
import type { TransitionState } from "@/types/director";

export function createTransitionState(): TransitionState {
	return reactive({
		active: false,
		subtitleVisible: false,
		subtitleStyle: "cue",
		kindText: "",
		text: "",
		dateVisible: false,
		dateText: "",
		revealShown: false,
		revealFadeIn: false,
		revealSrc: "",
	});
}
