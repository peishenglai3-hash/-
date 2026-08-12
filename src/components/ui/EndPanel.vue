<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

const onClose = () => hud.hideEndPanel();

function onKeyDown(e: KeyboardEvent) {
	if (hud.endPanel) hud.hideEndPanel();
}

onMounted(() => {
	window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
	window.removeEventListener("keydown", onKeyDown);
});
</script>

<template>
	<div v-if="hud.endPanel" class="end-panel" @click.self="onClose">
		<div class="end-card">
			<strong>序章·名字留在纸上｜完成</strong>
			<span>{{ hud.endPanel.checkpoint }}</span>
			<span>{{ hud.endPanel.profile }}</span>
			<span>{{ hud.endPanel.tags }}</span>
			<span>{{ hud.endPanel.risk }}</span>
			<small>第一章·陈继南家中醒来</small>
			<button class="enter-chapter" @click="onClose">进入第一章</button>
		</div>
	</div>
</template>

<style scoped>
.end-panel {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	background: #000000d9;
	pointer-events: auto;
	z-index: 40;
}

.end-card {
	width: min(560px, 86%);
	padding: 22px 26px;
	border: 1px solid #a98a57;
	background: #17130ff2;
	color: #f6ead0;
	text-align: left;
	box-shadow: 0 10px 40px #000;
}

.end-card strong {
	display: block;
	font-size: 20px;
	letter-spacing: 0.12em;
	color: #f7ead0;
}

.end-card span {
	display: block;
	margin-top: 10px;
	font-size: 12.5px;
	line-height: 1.7;
	color: #e6d5ae;
}

.end-card small {
	display: block;
	margin-top: 14px;
	font-size: 11px;
	letter-spacing: 0.2em;
	color: #c7b897;
}

.enter-chapter {
	display: block;
	width: 100%;
	margin-top: 18px;
	padding: 12px 16px;
	border: 1px solid #a98a57;
	background: #241e17;
	color: #f6ead0;
	font-size: 14px;
	letter-spacing: 0.15em;
	cursor: pointer;
	transition: background 0.15s ease;
}

.enter-chapter:hover {
	background: #3a2f23;
}
</style>
