<script setup lang="ts">
import { hud } from "@/common/store";
</script>

<template>
	<div v-if="hud.resultPanelVisible && hud.resultPanel" class="result-panel">
		<img :src="hud.resultPanel.image" :alt="''" />
		<div class="result-copy">
			<span>…{{ hud.resultPanel.result[0] }}</span>
			<span>{{ hud.resultPanel.result[1] }}</span>
			<small>Space 继续</small>
		</div>
	</div>
</template>

<style scoped>
.result-panel {
	position: absolute;
	inset: 0;
	pointer-events: auto;
	display: grid;
	place-items: center;
	background: #10100ff4;
	z-index: 28;
}

.result-panel > img {
	width: min(100vw, 177.7778vh);
	height: min(56.25vw, 100vh);
	object-fit: cover;
	opacity: 0.92;
}

.result-copy {
	position: absolute;
	left: 12%;
	right: 12%;
	top: 12%;
	display: grid;
	gap: 1.25rem;
	color: #c7edf0;
	font-size: clamp(1rem, 2vw, 1.65rem);
	line-height: 1.7;
	text-shadow: 0 2px 8px #000;
}

.result-copy small {
	position: fixed;
	bottom: 9%;
	left: 0;
	right: 0;
	text-align: center;
	color: #f0e2bd;
}
</style>
