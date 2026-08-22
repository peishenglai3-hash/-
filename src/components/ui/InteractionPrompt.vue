<script setup lang="ts">
import { computed } from "vue";
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

const promptHasTrailingKey = computed(() => /\s*[·•]\s*E\s*$/.test(hud.prompt));
const promptLabel = computed(() => hud.prompt.replace(/\s*[·•]\s*E\s*$/, ""));
</script>

<template>
	<div v-if="hud.prompt" class="interaction-prompt" role="status" aria-live="polite">
		<kbd v-if="promptHasTrailingKey">E</kbd>
		<span>{{ promptLabel }}</span>
	</div>
</template>

<style scoped>
.interaction-prompt {
	position: absolute;
	left: 50%;
	bottom: 11%;
	transform: translateX(-50%);
	padding: 0.45rem 1rem;
	border: 1px solid #e2c98d;
	background: #201a12dc;
	color: #fff0c7;
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	box-shadow: 0 4px 16px #0008;
	z-index: 10;
}

.interaction-prompt kbd {
	display: inline-grid;
	place-items: center;
	min-width: 1.45rem;
	height: 1.35rem;
	border: 1px solid #d7b76f;
	border-radius: 3px;
	background: #f2e4c4;
	color: #342417;
	font: 700 0.8rem/1 Georgia, serif;
}
</style>
