<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import TransitionOverlay from "@/components/ui/TransitionOverlay.vue";
import { assetPath } from "@/common/paths";
import type { TransitionConfig } from "@/types/director";

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

const TRANSITION_REVEAL_IMAGE = assetPath(
	"/assets/transition/ch01-chenjinnan-home-reveal.png",
);

const TRANSITION_B: TransitionConfig = {
	revealEntryId: "SC02_THOUGHT_04",
	revealImage: TRANSITION_REVEAL_IMAGE,
	entries: [
		{
			entry_id: "SC02_CUE_OPEN",
			kind: "cue",
			style: "cue",
			text: "场景进入黑幕。",
			duration_ms: 1200,
		},
		{
			entry_id: "SC02_CUE_MODERN_SOUND",
			kind: "cue",
			style: "cue",
			text: "风扇仍在转动。录音设备发出轻微底噪。笔从纸页上滑落。门外传来极远的脚步声。",
			duration_ms: 2800,
		},
		{
			entry_id: "SC02_CUE_SOUND_REPLACEMENT",
			kind: "cue",
			style: "cue",
			text: "这些声音并非同时消失，而是逐一被1927年陈继南家中的声音替代。",
			duration_ms: 2200,
		},
		{
			entry_id: "SC02_CUE_NIGHT_SOUNDS",
			kind: "cue",
			style: "cue",
			text: "风扇的持续声逐渐变得模糊，夜间虫鸣却越来越近。塑料水杯被轻轻碰动的声音，逐渐转变为粗瓷碗落在木桌上的声音。",
			duration_ms: 3000,
		},
		{
			entry_id: "SC02_CUE_CHOPSTICKS",
			kind: "cue",
			style: "cue",
			text: '"嗒。"一双筷子轻轻碰在碗沿。',
			duration_ms: 1500,
		},
		{
			entry_id: "SC02_NARRATION_01",
			kind: "narration",
			style: "narration",
			text: "现代驻地门外的脚步声已经听不见了。",
			duration_ms: 2200,
		},
		{
			entry_id: "SC02_CUE_DOOR_VOICES",
			kind: "cue",
			style: "cue",
			text: "风吹动木门，发出轻微的吱响。不远处偶尔传来犬吠。黑暗中，有人在压低声音交谈，但话语太轻，暂时无法辨认具体内容。",
			duration_ms: 3000,
		},
		{
			entry_id: "SC02_CUE_UNOPENED_EYES",
			kind: "cue",
			style: "cue",
			text: "画面继续保持黑暗。你尚未睁开眼睛。",
			duration_ms: 1800,
		},
		{
			entry_id: "SC02_THOUGHT_01",
			kind: "thought",
			style: "thought",
			text: '"最先恢复的是触觉。"',
			duration_ms: 1900,
		},
		{
			entry_id: "SC02_NARRATION_02",
			kind: "narration",
			style: "narration",
			text: "好热。额头仍贴着手臂，黏黏的，风扇什么时候停了？感觉不到手臂下方的实践笔记。意识是模糊的，黑外之外还有光亮，是灯还亮着？还是天已经亮了？",
			duration_ms: 5400,
		},
		{
			entry_id: "SC02_CUE_FAMILY_CALL_01",
			kind: "cue",
			style: "cue",
			text: "近处响起一个女人的声音。",
			duration_ms: 1100,
		},
		{
			entry_id: "SC02_DIALOGUE_FAMILY_01",
			kind: "dialogue",
			style: "dialogue",
			speaker_name: "家人",
			text: "继南？",
			duration_ms: 1600,
		},
		{
			entry_id: "SC02_CUE_NO_RESPONSE",
			kind: "cue",
			style: "cue",
			text: "你没有立即回应。",
			duration_ms: 1300,
		},
		{
			entry_id: "SC02_THOUGHT_02",
			kind: "thought",
			style: "thought",
			text: "\"谁？'继南'？录音还在放吗？还是我还在梦里？\"",
			duration_ms: 2700,
		},
		{
			entry_id: "SC02_CUE_BOWL_STOPS",
			kind: "cue",
			style: "cue",
			text: "碗筷声突然停下。木凳轻轻挪动，有人靠近了一些。",
			duration_ms: 1800,
		},
		{
			entry_id: "SC02_DIALOGUE_FAMILY_02",
			kind: "dialogue",
			style: "dialogue",
			speaker_name: "家人",
			text: "继南，醒醒。",
			duration_ms: 1800,
		},
		{
			entry_id: "SC02_CUE_FINGER",
			kind: "cue",
			style: "cue",
			text: "你的右手手指先动了一下。",
			duration_ms: 1400,
		},
		{
			entry_id: "SC02_THOUGHT_03",
			kind: "thought",
			style: "thought",
			text: '"我还没有弄明白这个称呼。可这具身体仿佛早已习惯在听见它时作出回应。"',
			duration_ms: 3200,
		},
		{
			entry_id: "SC02_CUE_QUIET_INSECTS",
			kind: "cue",
			style: "cue",
			text: "所有声音短暂安静下来，只留下近处的虫鸣。",
			duration_ms: 1800,
		},
		{
			entry_id: "SC02_DATE",
			kind: "date",
			style: "date",
			text: "1927年9月10日，中秋｜戴家场",
			duration_ms: 2500,
		},
		{
			entry_id: "SC02_THOUGHT_04",
			kind: "thought",
			style: "thought",
			text: '"她是在叫我。可她叫的是——继南。"',
			duration_ms: 4000,
		},
	],
	cues: [
		{ cue_id: "fan_low", at_entry: "SC02_CUE_MODERN_SOUND", kind: "ambient" },
		{ cue_id: "recorder_noise", at_entry: "SC02_CUE_MODERN_SOUND", kind: "ambient" },
		{ cue_id: "pen_slide", at_entry: "SC02_CUE_MODERN_SOUND", kind: "one_shot" },
		{ cue_id: "footsteps_silent", at_entry: "SC02_NARRATION_01", kind: "silent" },
		{ cue_id: "insects_near", at_entry: "SC02_CUE_NIGHT_SOUNDS", kind: "ambient" },
		{ cue_id: "plastic_to_ceramic", at_entry: "SC02_CUE_NIGHT_SOUNDS", kind: "one_shot" },
		{ cue_id: "chopsticks_bowl", at_entry: "SC02_CUE_CHOPSTICKS", kind: "one_shot" },
		{ cue_id: "door_creak", at_entry: "SC02_CUE_DOOR_VOICES", kind: "one_shot" },
		{ cue_id: "dog_silent", at_entry: "SC02_CUE_DOOR_VOICES", kind: "silent" },
		{ cue_id: "low_voice_silent", at_entry: "SC02_CUE_DOOR_VOICES", kind: "silent" },
		{ cue_id: "family_silent", at_entry: "SC02_DIALOGUE_FAMILY_01", kind: "silent" },
		{ cue_id: "family_silent", at_entry: "SC02_DIALOGUE_FAMILY_02", kind: "silent" },
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
