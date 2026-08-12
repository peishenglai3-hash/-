<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();
</script>

<template>
	<div class="flavor-toast" :class="{ show: !!hud.flavorToast }">
		{{ hud.flavorToast }}
	</div>
</template>

<style scoped>
.flavor-toast {
	position: absolute;
	left: 18px;
	bottom: 16px;
	max-width: 360px;
	padding: 0.4rem 0.8rem;
	border: 1px solid #a98a57;
	border-radius: 6px;
	background: #17130fe8;
	color: #f6ead0;
	font-size: 12px;
	letter-spacing: 0.05em;
	line-height: 1.5;
	opacity: 0;
	transform: translateY(6px);
	transition:
		opacity 0.25s ease,
		transform 0.25s ease;
	z-index: 21;
	pointer-events: none;
}

.flavor-toast.show {
	opacity: 1;
	transform: translateY(0);
}
</style>
