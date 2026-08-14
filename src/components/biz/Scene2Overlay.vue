<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import TransitionOverlay from "@/components/ui/TransitionOverlay.vue";
import { clearFade } from "@/common/ui";
import { useGameStateStore } from "@/stores/modules/gameState";
import { ambience } from "@/common/ambience";
import { TRANSITION_A } from "@/scenes/transitionData";

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
			gameState.state.taskOpen = false;
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
