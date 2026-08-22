<script setup lang="ts">
import { ref } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useGameSaveStore } from "@/stores";
import { MANUAL_SAVE_SLOTS, type ManualSaveSlot } from "@/constants/storage";

const hud = useHudStore();
const gameSave = useGameSaveStore();
const saveStatus = ref("");

function save(slot: ManualSaveSlot) {
	const result = gameSave.saveManual(slot);
	saveStatus.value = result
		? `已保存：槽位 ${slot} · ${result.sceneLabel}`
		: "暂时无法写入本地存档，请检查浏览器存储权限。";
}
</script>

<template>
	<div
		v-if="hud.paused"
		class="pause-panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby="pause-title"
	>
		<section class="pause-card">
			<h2 id="pause-title">已暂停</h2>
			<p>当前场景：{{ gameSave.getCurrentSceneId() }}</p>
			<div class="pause-save">
				<span>及时保存</span>
				<div class="pause-save-buttons">
					<button
						v-for="slot in MANUAL_SAVE_SLOTS"
						:key="slot"
						type="button"
						@click="save(slot)"
					>
						槽位 {{ slot }}
					</button>
				</div>
			</div>
			<small class="save-status" aria-live="polite">{{ saveStatus }}</small>
			<small class="pause-hint">按 ESC 继续</small>
		</section>
	</div>
</template>

<style scoped>
.pause-panel {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	padding: 1rem;
	background: #000000b0;
	z-index: 26;
	color: #f5e8c3;
	pointer-events: auto;
}

.pause-card {
	width: min(440px, 88vw);
	padding: 1.6rem 1.8rem 1.3rem;
	border: 1px solid #b18b50;
	background: linear-gradient(145deg, #211a13f7, #0c0a08f5);
	box-shadow: 0 12px 40px #000c;
	text-align: center;
}

.pause-card h2 {
	margin: 0;
	font-size: clamp(1.4rem, 3vw, 2rem);
	letter-spacing: 0.3em;
	color: #f0d18d;
}

.pause-card p {
	margin: 0.75rem 0 1.15rem;
	color: #cbb98f;
	font-size: 0.8rem;
}

.pause-save {
	display: grid;
	gap: 0.55rem;
	padding-top: 0.9rem;
	border-top: 1px solid #6d5739;
	color: #ead7ad;
	font-size: 0.85rem;
	letter-spacing: 0.12em;
}

.pause-save-buttons {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.45rem;
}

.pause-save-buttons button {
	padding: 0.5rem 0.25rem;
	border: 1px solid #80623c;
	background: #251b12;
	color: #f8edcc;
	font: inherit;
	font-size: 0.78rem;
	letter-spacing: 0.08em;
	cursor: pointer;
}

.pause-save-buttons button:hover {
	border-color: #d3ad64;
	background: #3a2a18;
}

.save-status {
	display: block;
	min-height: 2.6em;
	margin-top: 0.8rem;
	color: #d9c38d;
	font-size: 0.72rem;
	line-height: 1.4;
}

.pause-hint {
	display: block;
	margin-top: 0.5rem;
	color: #a99878;
	font-size: 0.75rem;
	letter-spacing: 0.16em;
}
</style>
