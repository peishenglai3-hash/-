<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";

const hud = useHudStore();
</script>

<template>
	<div v-if="hud.taskCards.length" class="task-layer">
		<TransitionGroup name="task-list">
			<article
				v-for="(task, index) in hud.visibleTaskCards"
				:key="task.id"
				class="task-card"
				:class="{ center: task.id === hud.taskCenterId }"
				:style="{ '--task-index': index, zIndex: 28 - index }"
			>
				<strong>{{ task.title }}</strong>
				<span class="task-detail">{{ task.detail }}</span>
				<span
					v-if="task.id === hud.taskCenterId || (!hud.taskCenter && index === 0)"
					class="task-dismiss"
				>
					<kbd>E</kbd>
					<em>{{ hud.taskCenter ? "确认任务" : "关闭任务" }}</em>
				</span>
			</article>
		</TransitionGroup>

		<div
			v-if="hud.taskCards.length > 3 && !hud.taskCenter"
			class="task-overflow-controls"
		>
			<button
				class="task-overflow-button"
				type="button"
				title="显示更新的任务"
				:disabled="hud.taskWindowStart === 0"
				@click="hud.showNewerTasks"
			>
				<span aria-hidden="true">↑</span>
			</button>
			<small>{{ hud.taskWindowStart + 1 }}/{{ hud.taskWindowCount }}</small>
			<button
				class="task-overflow-button"
				type="button"
				title="显示更旧的任务"
				:disabled="hud.taskWindowStart >= hud.taskWindowCount - 1"
				@click="hud.showOlderTasks"
			>
				<span aria-hidden="true">↓</span>
			</button>
		</div>
	</div>
</template>

<style scoped>
.task-layer {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 22;
}

.task-card {
	--task-index: 0;
	position: absolute;
	top: calc(16px + var(--task-index) * 94px);
	right: 48px;
	width: 280px;
	height: 84px;
	padding: 10px 12px;
	overflow: hidden;
	text-align: left;
	border: 1px solid #a98a57;
	border-radius: 8px;
	background: linear-gradient(135deg, #211a13f2, #100d0af0);
	color: #f6ead0;
	box-shadow: 0 4px 14px #0009;
	transition:
		top 0.42s cubic-bezier(0.22, 1, 0.36, 1),
		right 0.42s cubic-bezier(0.22, 1, 0.36, 1),
		transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
		width 0.42s ease,
		height 0.42s ease,
		padding 0.42s ease,
		border-color 0.42s ease,
		box-shadow 0.42s ease,
		opacity 0.28s ease;
}

.task-card strong,
.task-card span {
	display: block;
}

.task-card strong {
	color: #f7ead0;
	font-size: 14px;
	letter-spacing: 0.06em;
	line-height: 1.2;
}

.task-detail {
	display: -webkit-box !important;
	margin-top: 4px;
	padding-right: 58px;
	overflow: hidden;
	font-size: 12px;
	line-height: 1.35;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.task-dismiss {
	position: absolute;
	right: 10px;
	bottom: 10px;
	display: inline-flex !important;
	align-items: center;
	gap: 3px;
	color: #ead6ad;
	font-size: 9px;
}

kbd {
	display: inline-grid;
	place-items: center;
	min-width: 20px;
	height: 18px;
	padding: 0 4px;
	border: 1px solid #5a422a;
	border-radius: 4px;
	background: #f4e6c7;
	color: #332316;
	font: 700 12px/1 Georgia, serif;
	box-shadow: inset 0 -1px #b79764;
}

.task-dismiss em {
	font-style: normal;
}

.task-card.center {
	top: 44%;
	right: 50%;
	width: 380px;
	height: auto;
	min-height: 116px;
	padding: 18px 22px;
	transform: translate(50%, -50%);
	border: 2px solid #daa520;
	border-radius: 12px;
	box-shadow: 0 0 28px #daa52066, 0 8px 32px #000c;
	animation: task-pulse 2s ease-in-out infinite;
}

.task-card.center strong {
	font-size: 17px;
	text-align: center;
}

.task-card.center .task-detail {
	display: block !important;
	padding-right: 0;
	font-size: 13px;
	text-align: center;
}

.task-list-enter-from:not(.center) {
	top: -100px;
	opacity: 0;
}

.task-list-leave-to:not(.center) {
	transform: translateX(36px);
	opacity: 0;
}

.task-list-leave-active {
	pointer-events: none;
}

.task-overflow-controls {
	position: absolute;
	top: 16px;
	right: 10px;
	display: grid;
	grid-template-rows: 1fr auto 1fr;
	gap: 5px;
	width: 28px;
	height: 272px;
	pointer-events: auto;
	color: #f4ddb0;
}

.task-overflow-button {
	display: grid;
	place-items: center;
	width: 28px;
	padding: 0;
	border: 1px solid #a98a57;
	border-radius: 6px;
	background: linear-gradient(#2e251b, #15110d);
	color: #f4ddb0;
	box-shadow: 0 4px 14px #0009;
	cursor: pointer;
}

.task-overflow-button:hover:not(:disabled) {
	border-color: #e0b864;
	background: linear-gradient(#443522, #21180f);
}

.task-overflow-button:disabled {
	opacity: 0.35;
	cursor: default;
}

.task-overflow-button span {
	font-size: 22px;
	line-height: 1;
}

.task-overflow-controls small {
	justify-self: center;
	font-size: 9px;
	writing-mode: vertical-rl;
}

@keyframes task-pulse {
	0%,
	100% {
		box-shadow: 0 0 28px #daa52066, 0 8px 32px #000c;
	}
	50% {
		box-shadow: 0 0 42px #daa52099, 0 8px 40px #000c;
	}
}

@media (max-width: 850px) {
	.task-card {
		top: calc(10px + var(--task-index) * 86px);
		right: 42px;
		width: min(42vw, 250px);
		height: 76px;
	}

	.task-card.center {
		top: 44%;
		right: 50%;
		width: min(74vw, 380px);
		height: auto;
	}

	.task-overflow-controls {
		top: 10px;
		right: 8px;
		height: 248px;
	}
}
</style>
