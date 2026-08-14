<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

const assetBase = import.meta.env.BASE_URL || "/";
</script>

<template>
	<div
		v-if="hud.dialogue.visible"
		class="dialogue-panel"
		:class="hud.dialogue.style"
	>
		<div class="dialogue-left">
			<div
				class="dialogue-avatar-wrap"
				:class="{ hidden: !hud.dialogue.avatarSrc }"
			>
				<img
					v-if="hud.dialogue.avatarSrc"
					:src="`${assetBase}assets/characters/${hud.dialogue.avatarSrc}/avatar.png`"
					alt=""
				/>
			</div>
		</div>
		<div class="dialogue-speaker">{{ hud.dialogue.speaker }}</div>
		<div class="dialogue-copy">
			<div class="dialogue-text">{{ hud.dialogue.displayedText }}</div>
			<div class="dialogue-hint">{{ hud.dialogue.hint }}</div>
		</div>
	</div>
</template>

<style scoped>
.dialogue-panel {
	position: absolute;
	left: 50%;
	bottom: 20px;
	transform: translateX(-50%);
	width: 400px;
	aspect-ratio: 2629 / 1398;
	pointer-events: auto;
	background: url("/assets/ui/keyed/dialogue.png") center / 100% 100%
		no-repeat;
	z-index: 20;
}

.dialogue-panel.dialogue {
	color: #8f2b1e;
}
.dialogue-panel.narration {
	color: #111;
}
.dialogue-panel.thought {
	color: #2e8b57;
}

.dialogue-left {
	position: absolute;
	left: 5.5%;
	top: 22.5%;
	width: 26%;
	height: 55%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4%;
}

.dialogue-left .dialogue-avatar-wrap {
	position: static;
	width: 100%;
	height: auto;
	flex: 1;
	min-height: 0;
	display: grid;
	place-items: center;
}

.dialogue-left .dialogue-avatar-wrap.hidden {
	visibility: hidden;
}

.dialogue-left .dialogue-avatar-wrap img {
	max-width: 92%;
	max-height: 92%;
	object-fit: contain;
}

.dialogue-speaker {
	position: absolute;
	left: 5%;
	bottom: 9%;
	/* writing-mode: vertical-rl; */
	/* text-orientation: upright; */
	height: 10%;
	width: 27%;
	text-align: center;
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.28em;
}

.narration .dialogue-speaker {
	color: #7a5c33;
}
.thought .dialogue-speaker {
	color: #2e8b57;
}
.dialogue .dialogue-speaker {
	color: #8f2b1e;
}

.dialogue-panel .dialogue-copy {
	position: absolute;
	left: 34.5%;
	top: 23%;
	width: 60.5%;
	height: 63%;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.dialogue-panel .dialogue-text {
	flex: 1;
	font-size: 15px;
	line-height: 1.8;
	letter-spacing: 0.04em;
	text-align: justify;
	text-shadow: 0 1px 0 #fff7;
}

.dialogue-panel.dialogue .dialogue-text {
	text-shadow: 0 1px 0 #fff9;
}

.dialogue-panel .dialogue-hint {
	align-self: flex-end;
	margin-top: 0.35rem;
	margin-right: 26px;
	margin-bottom: 2px;
	font-size: 12px;
	opacity: 0.7;
}

.narration .dialogue-text {
	text-shadow: 0 1px 0 #fff9;
}
.thought .dialogue-text {
	text-shadow: 0 1px 0 #d9ffe6;
}

@media (max-width: 850px) {
	.dialogue-panel {
		width: min(82%, 480px);
		bottom: 8px;
	}

	.dialogue-text {
		font-size: clamp(12px, 1.8vw, 15px);
	}
	.dialogue-speaker {
		font-size: 11px;
	}
}
</style>
