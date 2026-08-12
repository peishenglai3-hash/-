<script setup lang="ts">
import { ref } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { ambience } from "@/common/ambience";

const hud = useHudStore();

const emit = defineEmits<{
	start: [];
	done: [];
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const started = ref(false);

function onInteract() {
	if (!started.value) startIntro();
	else endIntro();
}

function startIntro() {
	started.value = true;
	ambience.unlock();
	videoEl.value?.play().catch(() => {});
	emit("start");
}

function endIntro() {
	hud.hideOverlay();
	emit("done");
}
</script>

<template>
	<div class="intro-panel">
		<video
			ref="videoEl"
			src="/assets/video/intro.mp4"
			playsinline
			preload="auto"
			@click="onInteract"
			@ended="endIntro"
		/>
		<div class="intro-caption">
			<div>红色源代码·洪湖篇</div>
			<small>序章｜名字留在纸上</small>
		</div>
		<button @click="onInteract">
			{{ started ? "跳过开场视频" : "开始进入序章" }}
		</button>
	</div>
</template>

<style scoped>
.intro-panel {
	position: absolute;
	inset: 0;
	pointer-events: auto;
	display: grid;
	place-items: center;
	background: #10100edc;
	z-index: 30;
}

.intro-panel video {
	width: min(100vw, 177.7778vh);
	height: min(56.25vw, 100vh);
	object-fit: cover;
	opacity: 0.9;
}

.intro-caption {
	position: absolute;
	top: 17%;
	left: 8%;
	color: #f0e4c5;
	font-size: clamp(1.2rem, 2.4vw, 2.4rem);
	letter-spacing: 0.18em;
	text-shadow: 0 2px 12px #000;
}

.intro-caption small {
	display: block;
	margin-top: 0.7rem;
	font-size: 0.45em;
	letter-spacing: 0.35em;
	opacity: 0.8;
}

.intro-panel button {
	position: absolute;
	bottom: 12%;
	padding: 0.7rem 2rem;
	border: 1px solid #d3ad64;
	background: #3b2718d9;
	color: #f8edcc;
	letter-spacing: 0.15em;
	font: inherit;
	cursor: pointer;
}
</style>
