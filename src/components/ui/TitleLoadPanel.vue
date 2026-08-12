<script setup lang="ts">
import { computed } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import { SaveManager } from "@/common/save";
import type { RunSave } from "@/types/common";

const hud = useHudStore();

const slots = computed<RunSave[]>(() => SaveManager.listSlots());

function fmtTime(ts: number): string {
	return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

function pick(save: RunSave) {
	hud.title.loadOpen = false;
	useDirectorStore().instance?.startFromSave(save);
}

function close() {
	hud.title.loadOpen = false;
}
</script>

<template>
	<div v-if="hud.title.loadOpen" class="title-load-panel">
		<h2>加载存档</h2>
		<div v-if="slots.length === 0" class="empty">
			暂无本地存档
			<small
				>选择「创建」开始新游戏后，自动存档与固定检查点将出现在这里</small
			>
		</div>
		<button
			v-for="save in slots"
			:key="save.kind"
			class="slot"
			@click="pick(save)"
		>
			<strong>{{
				save.kind === "fixed" ? "固定检查点" : "自动存档"
			}}</strong>
			<span>{{ save.sceneLabel }}</span>
			<small>{{ fmtTime(save.timestamp) }}</small>
			<small>
				画像 D{{ save.profile.D }} C{{ save.profile.C }} I{{
					save.profile.I
				}}
				G{{ save.profile.G }} P{{ save.profile.P }} A{{
					save.profile.A
				}}
				｜ 风险 {{ save.risk.identity }}/{{ save.risk.execution }}/{{
					save.risk.coordination
				}}
			</small>
		</button>
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
	background: #10100ee6;
	pointer-events: auto;
	color: #f8edcc;
}

.title-load-panel h2 {
	letter-spacing: 0.3em;
	font-size: 1.6rem;
	color: #e8c37a;
	text-shadow: 0 2px 8px #000;
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

.slot {
	width: min(560px, 86vw);
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

.slot:hover {
	background: #55392295;
}

.slot strong {
	color: #e8c37a;
	letter-spacing: 0.12em;
}

.slot small {
	width: 100%;
	opacity: 0.75;
	font-size: 0.78rem;
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
</style>
