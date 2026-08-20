<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import { useGameSaveStore } from "@/stores";
import type { RunSave } from "@/types/common";

const hud = useHudStore();
const gameSave = useGameSaveStore();

const slots = computed<RunSave[]>(() =>
	[gameSave.loadFixed(), gameSave.loadAuto()].filter(
		(save): save is RunSave => save !== null,
	),
);
const manualSlots = computed(() => gameSave.listManualSlots());
const replayChapters = [
	{ chapter: 1 as const, label: "第一章", detail: "从陈继南家中醒来重新体验" },
	{ chapter: 2 as const, label: "第二章", detail: "从陈家祠堂场景衔接重新体验" },
	{ chapter: 3 as const, label: "第三章", detail: "从杜家大院外围开场重新体验" },
];

function fmtTime(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

function pick(save: RunSave) {
	hud.title.loadOpen = false;
	useDirectorStore().startFromSave(save);
}

function replay(chapter: 1 | 2 | 3) {
	hud.title.loadOpen = false;
	useDirectorStore().replayChapter(chapter);
}

function close() {
	hud.title.loadOpen = false;
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key === "Escape" && hud.title.loadOpen) close();
}

onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
	<div
		v-if="hud.title.loadOpen"
		class="title-load-panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby="load-panel-title"
	>
		<h2 id="load-panel-title">加载存档</h2>

		<section class="save-section">
			<h3>手动存档</h3>
			<div class="manual-grid">
				<button
					v-for="item in manualSlots"
					:key="item.slot"
					class="manual-slot"
					:disabled="!item.save"
					@click="item.save && pick(item.save)"
				>
					<strong>槽位 {{ item.slot }}</strong>
					<span v-if="item.save">{{ item.save.label || item.save.sceneLabel }}</span>
					<span v-else class="empty-slot">空槽位</span>
					<small v-if="item.save">{{ fmtTime(item.save.timestamp) }}</small>
				</button>
			</div>
		</section>

		<section class="save-section">
			<h3>继续游戏</h3>
			<div v-if="slots.length === 0" class="empty">
				暂无本地存档
				<small>选择「创建」开始新游戏后，自动存档与固定检查点将出现在这里</small>
			</div>
			<button
				v-for="save in slots"
				:key="save.kind"
				class="slot"
				@click="pick(save)"
			>
				<strong>{{ save.kind === "fixed" ? "固定检查点" : "自动存档" }}</strong>
				<span>{{ save.sceneLabel }}</span>
				<small>{{ fmtTime(save.timestamp) }}</small>
				<small>已记录此前选择与行动状态</small>
			</button>
		</section>

		<section class="save-section replay-section">
			<h3>章节重玩</h3>
			<p>重玩会保留进入该章前的既有状态，重新体验本章分支。</p>
			<button
				v-for="entry in replayChapters"
				:key="entry.chapter"
				class="replay-button"
				@click="replay(entry.chapter)"
			>
				<strong>{{ entry.label }}</strong>
				<span>{{ entry.detail }}</span>
			</button>
		</section>

		<button class="back" @click="close">返 回</button>
	</div>
</template>

<style scoped>
.title-load-panel {
	position: absolute;
	inset: 0;
	z-index: 40;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.9rem;
	padding: 2rem 1rem;
	overflow: auto;
	background: #10100ee6;
	pointer-events: auto;
	color: #f8edcc;
}

.title-load-panel h2 {
	margin: 0;
	letter-spacing: 0.3em;
	font-size: 1.6rem;
	color: #e8c37a;
	text-shadow: 0 2px 8px #000;
}

.save-section {
	width: min(560px, 86vw);
}

.save-section h3 {
	margin: 0 0 0.45rem;
	color: #e8c37a;
	font-size: 0.95rem;
	letter-spacing: 0.16em;
}

.replay-section p {
	margin: 0 0 0.6rem;
	color: #d4c29f;
	font-size: 0.8rem;
}

.manual-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.55rem;
}

.title-load-panel .empty {
	text-align: center;
	opacity: 0.75;
	line-height: 1.9;
}

.title-load-panel .empty small {
	display: block;
	font-size: 0.8rem;
	opacity: 0.8;
}

.slot,
.manual-slot {
	width: 100%;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 0.4rem 1rem;
	padding: 0.7rem 1.2rem;
	border: 1px solid #d3ad64;
	background: #3b2718d9;
	color: #f8edcc;
	text-align: left;
	cursor: pointer;
	font: inherit;
}

.slot:hover:not(:disabled),
.manual-slot:hover:not(:disabled) {
	background: #55392295;
}

.slot:disabled,
.manual-slot:disabled {
	opacity: 0.65;
	cursor: default;
}

.manual-slot {
	min-height: 86px;
	padding: 0.65rem 0.7rem;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.25rem;
}

.empty-slot {
	color: #b9a986;
	font-size: 0.82rem;
}

.slot strong,
.manual-slot strong {
	color: #e8c37a;
	letter-spacing: 0.12em;
}

.slot small,
.manual-slot small {
	width: 100%;
	opacity: 0.75;
	font-size: 0.78rem;
}

.replay-button {
	width: 100%;
	display: flex;
	align-items: baseline;
	gap: 0.65rem;
	margin-top: 0.45rem;
	padding: 0.55rem 0.8rem;
	border: 1px solid #80623c;
	background: #251b12;
	color: #f8edcc;
	text-align: left;
	cursor: pointer;
	font: inherit;
}

.replay-button:hover {
	border-color: #d3ad64;
	background: #3a2a18;
}

.replay-button strong {
	min-width: 5em;
	color: #e8c37a;
}

.replay-button span {
	opacity: 0.8;
	font-size: 0.8rem;
}

.back {
	margin-top: 0.4rem;
	padding: 0.45rem 2.2rem;
	border: 1px solid #d3ad64;
	background: #3b2718d9;
	color: #f8edcc;
	letter-spacing: 0.2em;
	cursor: pointer;
	font: inherit;
}

@media (max-width: 620px) {
	.manual-grid {
		grid-template-columns: 1fr;
	}

	.replay-button {
		flex-direction: column;
		gap: 0.2rem;
	}
}
</style>
