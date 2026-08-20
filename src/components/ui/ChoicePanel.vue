<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

function onChoose(id: string) {
	hud.choicePanel?.onChoose(id);
}
</script>

<template>
	<div
		v-if="hud.choicePanel"
		class="choice-panel"
		role="dialog"
		aria-modal="true"
		aria-labelledby="choice-panel-title"
	>
		<div id="choice-panel-title" class="choice-title">{{ hud.choicePanel.title }}</div>
		<button
			v-for="choice in hud.choicePanel.items"
			:key="choice.id"
			type="button"
			class="choice"
			:class="{ 'choice--disabled': choice.disabled }"
			:disabled="choice.disabled"
			@click="onChoose(choice.id)"
		>
			<b>[{{ choice.id.slice(-1) }}]</b>
			<span>
				<strong>{{ choice.label }}</strong>
			</span>
		</button>
	</div>
</template>

<style scoped>
.choice-panel {
	position: absolute;
	left: 50%;
	bottom: 5%;
	transform: translateX(-50%);
	width: min(72vw, 740px);
	padding: 1rem;
	pointer-events: auto;
	background: #1b1915f5;
	border: 2px solid #c49a5e;
	box-shadow: 0 10px 40px #000d;
	z-index: 24;
	max-height: min(78vh, 560px);
	overflow: auto;
}

.choice-title {
	text-align: center;
	color: #f8e9c2;
	font-size: 1.35rem;
	margin-bottom: 0.8rem;
}

.choice {
	width: 100%;
	display: flex;
	gap: 0.8rem;
	margin: 0.45rem 0;
	padding: 0.75rem 1rem;
	text-align: left;
	background: #31261b;
	border: 1px solid #7f6848;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.choice:hover {
	background: #58452b;
	border-color: #d3ad64;
}

.choice:focus-visible {
	outline: 2px solid #f4d17e;
	outline-offset: 2px;
	background: #58452b;
}

.choice:disabled {
	opacity: 0.48;
	cursor: not-allowed;
}

.choice:disabled:hover {
	background: #31261b;
	border-color: #7f6848;
}

.choice b {
	color: #e5c27f;
	font-size: 1.25rem;
}

.choice strong {
	display: block;
}
</style>
