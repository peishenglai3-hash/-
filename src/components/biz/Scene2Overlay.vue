<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import TransitionOverlay from "@/components/ui/TransitionOverlay.vue";
import { clearFade } from "@/common/ui";
import { state } from "@/common/state";
import { ambience } from "@/common/ambience";
import type { TransitionConfig } from "@/types/director";

const hud = useHudStore();
const directorStore = useDirectorStore();

const TRANSITION_A: TransitionConfig = {
	revealEntryId: null,
	revealImage: null,
	entries: [
		{
			entry_id: "SC01_CUE_BLACK",
			kind: "cue",
			style: "cue",
			text: "场景进入黑幕。",
			duration_ms: 1200,
		},
		{
			entry_id: "SC01_CUE_STEPS",
			kind: "cue",
			style: "cue",
			text: "脚步踩过地面的轻响。",
			duration_ms: 2400,
		},
		{
			entry_id: "SC01_CUE_CAR",
			kind: "cue",
			style: "cue",
			text: "车辆启动。",
			duration_ms: 2200,
		},
		{
			entry_id: "SC01_CUE_INSECTS",
			kind: "cue",
			style: "cue",
			text: "路旁虫鸣逐渐远去。短暂安静后，风扇转动声缓缓出现。",
			duration_ms: 3200,
		},
		{
			entry_id: "SC01_DATE",
			kind: "date",
			style: "date",
			text: "当晚｜暑期实践驻地",
			duration_ms: 2500,
		},
	],
	cues: [
		{ cue_id: "footsteps_light", at_entry: "SC01_CUE_STEPS" },
		{ cue_id: "car_engine", at_entry: "SC01_CUE_CAR" },
		{ cue_id: "insects_recede", at_entry: "SC01_CUE_INSECTS" },
		{ cue_id: "fan_emerge", at_entry: "SC01_CUE_INSECTS" },
	],
};

const transitionProps = computed(() => ({
	active: hud.transition.active,
	subtitleVisible: hud.transition.subtitleVisible,
	subtitleStyle: hud.transition.subtitleStyle,
	kindText: hud.transition.kindText,
	text: hud.transition.text,
	dateVisible: hud.transition.dateVisible,
	dateText: hud.transition.dateText,
	revealShown: hud.transition.revealShown,
	revealFadeIn: hud.transition.revealFadeIn,
	revealSrc: hud.transition.revealSrc,
}));

onMounted(() => {
	const director = directorStore.instance;
	if (!director) return;

	director.runTransition(TRANSITION_A, () => {
		clearFade();
		director.game.scene.stop("Scene01");
		state.mode = "intro";
		state.playerLocked = true;
		state.taskOpen = false;
		state.paused = false;
		state.narrativeQueue = [];
		state.narrativeIndex = 0;
		state.inNarrative = false;
		ambience.unlock();
		ambience.startRoom();
		director.enterScene("PrologueScene02", "PROLOGUE_SC02");
		hud.hideOverlay();
	});
});
</script>

<template>
	<TransitionOverlay v-bind="transitionProps" />
</template>
