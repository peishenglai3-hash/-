<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import TransitionOverlay from "@/components/ui/TransitionOverlay.vue";
import { clearFade } from "@/common/ui";
import { useGameStateStore } from "@/stores/modules/gameState";
import { ambience } from "@/common/ambience";
import type { TransitionConfig } from "@/types/director";

const hud = useHudStore();
const directorStore = useDirectorStore();
const gameState = useGameStateStore();

const local = reactive({
	active: false,
	subtitleVisible: true,
	subtitleStyle: "cue",
	kindText: "",
	text: "",
	dateVisible: false,
	dateText: "",
	revealShown: false,
	revealFadeIn: false,
	revealSrc: "",
});

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

const transitionProps = computed(() => local);

const timers: number[] = [];

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers.length = 0;
}

onUnmounted(() => clearTimers());

onMounted(() => {
	if (!directorStore.game) return;
	const g = directorStore.game!;

	/* ---- 内联转场播放 ---- */
	let index = 0;

	function playCues(entryId: string) {
		for (const cue of TRANSITION_A.cues) {
			if (cue.at_entry === entryId) directorStore.transitionAudio.playCue(cue.cue_id);
		}
	}

	function render(entry: (typeof TRANSITION_A.entries)[number]) {
		local.subtitleStyle = entry.style || "cue";
		local.kindText =
			entry.kind === "cue"
				? "环境声"
				: entry.style === "date"
					? ""
					: "旁白";
		local.text = entry.text;
		local.subtitleVisible = true;
		local.dateVisible = false;
		if (entry.style === "date") {
			local.subtitleVisible = false;
			local.dateText = entry.text;
			local.dateVisible = true;
		}
	}

	function next() {
		const entry = TRANSITION_A.entries[index++];
		if (!entry) {
			directorStore.transitionAudio.stop();
			/* ---- onComplete ---- */
			clearFade();
			g.scene.stop("Scene01");
			gameState.state.mode = "intro";
			gameState.state.playerLocked = true;
			hud.hideTask();
			gameState.state.paused = false;
			gameState.state.narrativeQueue = [];
			gameState.state.narrativeIndex = 0;
			gameState.state.inNarrative = false;
			ambience.unlock();
			ambience.startRoom();
			directorStore.enterScene("PrologueScene02", "PROLOGUE_SC02");
			hud.hideOverlay();
			return;
		}

		playCues(entry.entry_id);
		render(entry);
		const timer = window.setTimeout(next, entry.duration_ms);
		timers.push(timer);
	}

	/* ---- start ---- */
	local.active = true;
	directorStore.transitionAudio.start();
	next();
});
</script>

<template>
	<TransitionOverlay v-bind="transitionProps" />
</template>
