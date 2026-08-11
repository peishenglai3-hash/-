<script setup lang="ts">
import { reactive } from "vue";
import { hud } from "@/common/store";
import { getSettings, updateSettings } from "@/common/save";

const form = reactive(getSettings());

function onBgm(value: number) {
	form.bgmVolume = value;
	updateSettings({ bgmVolume: value });
}

function onSfx(value: number) {
	form.sfxVolume = value;
	updateSettings({ sfxVolume: value });
}

function onSpeed(value: number) {
	form.textSpeed = value;
	updateSettings({ textSpeed: value });
}

function close() {
	hud.title.settingsOpen = false;
}
</script>

<template>
	<div v-if="hud.title.settingsOpen" class="title-settings-panel">
		<h2>设 置</h2>

		<label class="row">
			<span>音乐音量</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				:value="form.bgmVolume"
				@input="
					onBgm(Number(($event.target as HTMLInputElement).value))
				"
			/>
			<em>{{ Math.round(form.bgmVolume * 100) }}%</em>
		</label>

		<label class="row">
			<span>音效音量</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.05"
				:value="form.sfxVolume"
				@input="
					onSfx(Number(($event.target as HTMLInputElement).value))
				"
			/>
			<em>{{ Math.round(form.sfxVolume * 100) }}%</em>
		</label>

		<div class="row">
			<span>文字速度</span>
			<button
				v-for="opt in [
					{ v: 0.75, label: '慢' },
					{ v: 1, label: '标准' },
					{ v: 1.5, label: '快' },
				]"
				:key="opt.v"
				:class="{ active: form.textSpeed === opt.v }"
				class="speed"
				@click="onSpeed(opt.v)"
			>
				{{ opt.label }}
			</button>
		</div>

		<button class="back" @click="close">返 回</button>
	</div>
</template>

<style scoped>
.title-settings-panel {
	position: absolute;
	inset: 0;
	z-index: 40;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1.3rem;
	background: #10100ee6;
	pointer-events: auto;
	color: #f8edcc;
}

.title-settings-panel h2 {
	letter-spacing: 0.3em;
	font-size: 1.6rem;
	color: #e8c37a;
	text-shadow: 0 2px 8px #000;
}

.row {
	display: flex;
	align-items: center;
	gap: 1rem;
	width: min(480px, 84vw);
}

.row > span {
	width: 5.5em;
	letter-spacing: 0.15em;
}

.row input[type="range"] {
	flex: 1;
	accent-color: #d3ad64;
}

.row em {
	width: 3em;
	font-style: normal;
	opacity: 0.8;
}

.speed {
	padding: 0.3rem 1.1rem;
	border: 1px solid #d3ad64;
	background: #3b2718d9;
	color: #f8edcc;
	cursor: pointer;
	font: inherit;
}

.speed.active {
	background: #7a5527;
	color: #fff6dd;
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
