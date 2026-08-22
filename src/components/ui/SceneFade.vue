<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();
</script>

<template>
	<div class="scene-fade" :class="{ active: hud.sceneFade }" />
</template>

<style scoped>
.scene-fade {
	position: absolute;
	inset: 0;
	background: #000;
	opacity: 0;
	pointer-events: none;
	transition: opacity 1s ease;
	z-index: 15;
}

.scene-fade.active {
	opacity: 1;
}
</style>
