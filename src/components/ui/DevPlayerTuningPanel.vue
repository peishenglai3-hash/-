<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";

const hud = useHudStore();

function asPercent(value: number): string {
	return Math.round(value * 100) + "%";
}
</script>

<template>
	<aside
		v-if="hud.devEditorVisible"
		class="dev-player-tuning"
		aria-label="&#x89D2;&#x8272;&#x901F;&#x5EA6;&#x8C03;&#x8BD5;"
		@pointerdown.stop
	>
		<header>
			<span>PLAYER MOTION</span>
			<strong>&#x5B9E;&#x65F6;&#x8C03;&#x901F;</strong>
		</header>

		<label>
			<span class="slider-label">
				<span>&#x89D2;&#x8272;&#x79FB;&#x52A8;&#x901F;&#x5EA6;</span>
				<output>{{ asPercent(hud.devPlayerTuning.movementMultiplier) }}</output>
			</span>
			<input
				v-model.number="hud.devPlayerTuning.movementMultiplier"
				data-dev-tuning="movement"
				type="range"
				min="0.25"
				max="3"
				step="0.05"
			/>
		</label>

		<label>
			<span class="slider-label">
				<span>&#x884C;&#x8D70;&#x52A8;&#x753B;&#x901F;&#x5EA6;</span>
				<output>{{ asPercent(hud.devPlayerTuning.animationMultiplier) }}</output>
			</span>
			<input
				v-model.number="hud.devPlayerTuning.animationMultiplier"
				data-dev-tuning="animation"
				type="range"
				min="0.25"
				max="3"
				step="0.05"
			/>
		</label>

		<div class="scale-marks" aria-hidden="true">
			<span>25%</span>
			<span>100%</span>
			<span>300%</span>
		</div>

		<button type="button" data-action="reset-player-tuning" @click="hud.resetDevPlayerTuning">
			&#x6062;&#x590D; 100%
		</button>
		<p>&#x4EC5;&#x5F71;&#x54CD;&#x5F53;&#x524D;&#x8FD0;&#x884C;&#xFF0C;&#x4E0D;&#x5199;&#x5165; JSON &#x6216;&#x5B58;&#x6863;&#x3002;</p>
	</aside>
</template>

<style scoped>
.dev-player-tuning {
	position: fixed;
	top: 14px;
	left: 332px;
	z-index: 102;
	width: 288px;
	padding: 13px;
	border: 1px solid #55e7ff;
	background: linear-gradient(135deg, rgb(10 35 39 / 96%), rgb(8 10 11 / 98%));
	color: #effdff;
	font: 12px/1.35 Consolas, "Courier New", monospace;
	box-shadow: 6px 6px 0 rgb(85 231 255 / 20%);
	pointer-events: auto;
}

header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 14px;
	padding-bottom: 8px;
	border-bottom: 1px dashed rgb(85 231 255 / 42%);
	color: #55e7ff;
	letter-spacing: 0.13em;
}

header strong {
	color: #ffdf32;
	font-size: 10px;
	font-weight: 400;
	letter-spacing: 0.08em;
}

label {
	display: grid;
	gap: 7px;
	margin-top: 12px;
}

.slider-label {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

output {
	min-width: 48px;
	color: #ffdf32;
	font-weight: 700;
	text-align: right;
}

input[type="range"] {
	width: 100%;
	height: 18px;
	margin: 0;
	accent-color: #55e7ff;
	cursor: ew-resize;
}

.scale-marks {
	display: flex;
	justify-content: space-between;
	margin-top: 3px;
	color: #6f8b8e;
	font-size: 9px;
}

button {
	width: 100%;
	margin-top: 13px;
	padding: 7px 10px;
	border: 1px solid #ffdf32;
	border-radius: 0;
	background: #514811;
	color: #fff8b2;
	font: inherit;
	cursor: pointer;
}

button:hover,
button:focus-visible {
	background: #6b5f12;
	outline: 1px solid #ffdf32;
	outline-offset: 2px;
}

p {
	margin: 8px 0 0;
	color: #78999d;
	font-size: 9px;
}

@media (max-width: 720px) {
	.dev-player-tuning {
		top: auto;
		bottom: 14px;
		left: 14px;
		width: min(288px, calc(100vw - 28px));
	}
}
</style>
