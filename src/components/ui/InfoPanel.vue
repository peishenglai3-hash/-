<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useHudStore } from "@/stores/modules/hud";

const hud = useHudStore();

function onContinue() {
	hud.closeInfoPanel();
}

function onKeyDown(event: KeyboardEvent) {
	if (!hud.infoPanel) return;
	if (event.code === "Space" || event.code === "Enter") {
		event.preventDefault();
		event.stopImmediatePropagation();
		onContinue();
	}
}

onMounted(() => window.addEventListener("keydown", onKeyDown, true));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown, true));
</script>

<template>
	<div v-if="hud.infoPanel" class="info-screen">
		<section class="info-card" role="dialog" aria-label="剧情已知信息">
			<div class="info-title">【{{ hud.infoPanel.title }}】</div>
			<ul>
				<li v-for="item in hud.infoPanel.items" :key="item">{{ item }}</li>
			</ul>
			<button type="button" @click="onContinue">
				<kbd>Space</kbd>
				{{ hud.infoPanel.continueLabel || "继续" }}
			</button>
		</section>
	</div>
</template>

<style scoped>
.info-screen {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	background: #000;
	pointer-events: auto;
	z-index: 25;
}

.info-card {
	width: min(760px, 82vw);
	padding: 28px 34px 24px;
	border: 1px solid #9d7d4d;
	background: linear-gradient(145deg, #17130ef5, #080706f8);
	box-shadow: 0 12px 42px #000;
	color: #eadfc9;
}

.info-title {
	margin-bottom: 22px;
	color: #f2d797;
	font-size: 22px;
	letter-spacing: 0.16em;
	text-align: center;
}

.info-card ul {
	margin: 0;
	padding-left: 1.4em;
	font-size: 17px;
	line-height: 2;
}

.info-card li::marker {
	color: #b59058;
}

.info-card button {
	display: block;
	margin: 26px 0 0 auto;
	padding: 6px 10px;
	border: 1px solid #80623c;
	background: #251b12;
	color: #eadfc9;
	font: inherit;
	cursor: pointer;
}

.info-card button:hover {
	border-color: #d5af6d;
	background: #3a2a18;
}

kbd {
	display: inline-grid;
	place-items: center;
	min-width: 52px;
	height: 22px;
	margin-right: 6px;
	padding: 0 5px;
	border: 1px solid #9e7e4e;
	border-radius: 3px;
	background: #f2e5c7;
	color: #332316;
	font: 700 12px/1 Georgia, serif;
}

@media (max-width: 850px) {
	.info-card {
		padding: 22px 24px 20px;
	}

	.info-title {
		font-size: 18px;
	}

	.info-card ul {
		font-size: 14px;
		line-height: 1.8;
	}
}
</style>
