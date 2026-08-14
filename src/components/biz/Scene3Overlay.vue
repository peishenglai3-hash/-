<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import TransitionOverlay from "@/components/ui/TransitionOverlay.vue";
import { TRANSITION_B } from "@/scenes/transitionData";

const hud = useHudStore();
const directorStore = useDirectorStore();

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
		for (const cue of TRANSITION_B.cues) {
			if (cue.at_entry === entryId) directorStore.transitionAudio.playCue(cue.cue_id);
		}
	}

	function render(entry: (typeof TRANSITION_B.entries)[number]) {
		local.subtitleStyle = entry.style || "cue";
		local.kindText =
			entry.kind === "cue"
				? "环境声"
				: entry.style === "date"
					? ""
					: entry.style === "thought"
						? "心理描写"
						: entry.style === "dialogue"
							? entry.speaker_name || "家人"
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

	async function showReveal() {
		local.revealSrc = TRANSITION_B.revealImage!;
		local.revealShown = true;
		await nextTick();
		local.revealFadeIn = true;
	}

	function next() {
		const entry = TRANSITION_B.entries[index++];
		if (!entry) {
			directorStore.transitionAudio.stop();
			directorStore.finishPrologue();
			hud.hideOverlay();
			return;
		}

		playCues(entry.entry_id);

		if (entry.entry_id === TRANSITION_B.revealEntryId) {
			showReveal();
			timers.push(
				window.setTimeout(() => {
					render(entry);
					timers.push(window.setTimeout(next, entry.duration_ms));
				}, 820),
			);
			return;
		}

		render(entry);
		timers.push(window.setTimeout(next, entry.duration_ms));
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
