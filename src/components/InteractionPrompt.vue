<script setup lang="ts">
import { hud } from "@/common/store";
</script>

<template>
	<div v-if="hud.prompt" class="interaction-prompt">{{ hud.prompt }}</div>
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
	z-index: 10;
}
</style>
