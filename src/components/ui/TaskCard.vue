<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";
const hud = useHudStore();

function onClose() {
	hud.taskCard = null;
}
</script>

<template>
	<div v-if="hud.taskCard" class="task-card" :class="{ center: hud.taskCenter }">
		<strong>{{ hud.taskCard.title }}</strong>
		<span>{{ hud.taskCard.detail }}</span>
		<span class="task-dismiss"><kbd>E</kbd><em>{{ hud.taskCenter ? '确认任务' : '关闭任务' }}</em></span>
	</div>
</template>

<style scoped>
.task-card {
	position: absolute;
	top: 16px;
	right: 18px;
	width: 280px;
	padding: 10px 12px;
	text-align: left;
	border: 1px solid #a98a57;
	border-radius: 8px;
	background: #17130fe8;
	color: #f6ead0;
	box-shadow: 0 4px 14px #0009;
	z-index: 22;
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

.task-card > span {
	margin-top: 4px;
	padding-right: 56px;
	font-size: 12px;
	line-height: 1.35;
}

.task-dismiss {
	position: absolute;
	right: 10px;
	bottom: 10px;
	display: inline-flex;
	align-items: center;
	gap: 3px;
	margin: 0 !important;
	color: #ead6ad;
	font-size: 9px !important;
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
	font:
		700 12px/1 Georgia,
		serif;
	box-shadow: inset 0 -1px #b79764;
}

.task-dismiss em {
	font-style: normal;
}

/* 两段式：居中强制确认 → transition 缩至右上角 */
.task-card {
	transition: top 0.4s ease, right 0.4s ease, transform 0.4s ease,
		width 0.4s ease, padding 0.4s ease, border-color 0.4s ease,
		box-shadow 0.4s ease;
}

.task-card.center {
	top: 44%;
	right: 50%;
	transform: translate(50%, -50%);
	width: 380px;
	padding: 18px 22px;
	border: 2px solid #daa520;
	border-radius: 12px;
	box-shadow: 0 0 28px #daa52066, 0 8px 32px #000c;
	z-index: 30;
	animation: task-pulse 2s ease-in-out infinite;
}

.task-card.center strong {
	font-size: 17px;
	text-align: center;
}

.task-card.center > span {
	font-size: 13px;
	text-align: center;
	padding-right: 0;
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
		top: 10px;
		right: 10px;
		width: min(42vw, 250px);
	}
}
</style>
