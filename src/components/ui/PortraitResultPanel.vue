<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useDirectorStore } from "@/stores/modules/director";
import { useHudStore } from "@/stores/modules/hud";
import {
	PORTRAIT_AXIS_GUIDE,
	PORTRAIT_CORE_TENDENCY,
	portraitAxisLabel,
} from "@/scenes/Scene06/ch04PortraitPresentation";

const hud = useHudStore();
const director = useDirectorStore();
const returnButton = ref<HTMLButtonElement | null>(null);

const axisRows = computed(() => {
	const portrait = hud.portraitPanel?.portrait;
	if (!portrait) return [];
	return [
		{
			code: "D / C",
			left: "D · 行动决断",
			right: "C · 审慎判断",
			direction: portrait.axes.action,
			net: portrait.nets.DC,
		},
		{
			code: "I / G",
			left: "I · 个人担当",
			right: "G · 组织协同",
			direction: portrait.axes.responsibility,
			net: portrait.nets.IG,
		},
		{
			code: "P / A",
			left: "P · 原则坚持",
			right: "A · 情境调适",
			direction: portrait.axes.principle,
			net: portrait.nets.PA,
		},
	];
});

function axisMarker(net: number): string {
	// 只把后端净值转为视觉位置，不把数值写进界面。
	const normalized = Math.max(-1, Math.min(1, net / 8));
	return `${50 + normalized * 42}%`;
}

function returnToTitle() {
	hud.hidePortraitResult();
	director.goToTitle();
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key !== "Escape" || !hud.portraitPanel) return;
	event.preventDefault();
	returnToTitle();
}

onMounted(() => {
	window.addEventListener("keydown", onKeyDown);
	window.setTimeout(() => returnButton.value?.focus(), 0);
});

onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
	<div v-if="hud.portraitPanel" class="portrait-result" role="dialog" aria-modal="true" aria-label="历史现场画像">
		<div class="portrait-shell">
			<section class="poster-column">
				<div class="eyebrow">HONGHU · FINAL RECORD</div>
				<h1>历史现场画像</h1>
				<div class="poster-frame">
					<img :src="hud.portraitPanel.posterSrc" :alt="`结尾画像：${hud.portraitPanel.portrait.name}`" />
				</div>
			</section>

			<section class="portrait-copy">
				<div class="system-note">
					<strong>第四章理解倾向已记录。</strong>
					<span>本章选择不会改变历史结局，只影响玩家画像。</span>
				</div>

				<div class="section-label">根据全章累计结果，进入最终画像结算</div>
				<div class="axis-guide">
					<div v-for="guide in PORTRAIT_AXIS_GUIDE" :key="guide.code" class="guide-row">
						<span class="guide-code">{{ guide.code }}</span>
						<span><b>{{ guide.title }}</b>{{ guide.text }}</span>
					</div>
				</div>

				<div class="axis-list">
					<div v-for="axis in axisRows" :key="axis.code" class="axis-row">
						<div class="axis-labels">
							<span>{{ axis.left }}</span>
							<small>{{ axis.code }} · {{ portraitAxisLabel(axis.direction) }}</small>
							<span>{{ axis.right }}</span>
						</div>
						<div class="axis-track" aria-hidden="true">
							<i class="axis-mid"></i>
							<i class="axis-marker" :style="{ left: axisMarker(axis.net) }"></i>
						</div>
					</div>
				</div>

				<div class="portrait-name">
					<small>最终画像代码</small>
					<strong>{{ hud.portraitPanel.portrait.code }}</strong>
					<h2>{{ hud.portraitPanel.portrait.name }}</h2>
				</div>
				<p class="core-tendency">{{ hud.portraitPanel.coreTendency }}</p>
				<p class="reference-note">
					【历史参照】{{ hud.portraitPanel.portrait.reference }}是这一画像方向的历史参照人物之一，不表示你与其拥有相同经历或身份，只表示行动倾向上具有象征性的相近方向。
				</p>

				<button ref="returnButton" class="return-title" type="button" @click="returnToTitle">
					按 Esc 返回初始界面
				</button>
			</section>
		</div>
	</div>
</template>

<style scoped>
.portrait-result {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	padding: clamp(12px, 2.5vw, 30px);
	background:
		radial-gradient(circle at 18% 12%, #463a2a55, transparent 38%),
		#0b0d0d;
	color: #eee4cf;
	pointer-events: auto;
	z-index: 60;
}

.portrait-shell {
	display: grid;
	grid-template-columns: minmax(360px, 1.13fr) minmax(360px, 0.87fr);
	gap: clamp(18px, 3vw, 42px);
	width: min(1180px, 96vw);
	height: min(670px, 94vh);
	min-height: 0;
	padding: clamp(18px, 2.4vw, 34px);
	border: 1px solid #a88d5e;
	background: linear-gradient(135deg, #181716f5, #111313f5);
	box-shadow: 0 24px 70px #000b;
}

.poster-column,
.portrait-copy {
	min-width: 0;
	min-height: 0;
}

.poster-column {
	display: grid;
	grid-template-rows: auto auto minmax(0, 1fr);
}

.eyebrow,
.section-label,
.portrait-name small {
	color: #b6a47f;
	font-size: 10px;
	letter-spacing: 0.18em;
	text-transform: uppercase;
}

h1 {
	margin: 6px 0 16px;
	font-size: clamp(24px, 3vw, 38px);
	font-weight: 500;
	letter-spacing: 0.12em;
}

.poster-frame {
	display: grid;
	place-items: center;
	min-height: 0;
	padding: 10px;
	border: 1px solid #6f614b;
	background: #050606;
	overflow: hidden;
}

.poster-frame img {
	max-width: 100%;
	max-height: 100%;
	width: 100%;
	height: 100%;
	object-fit: contain;
	image-rendering: auto;
}

.portrait-copy {
	display: flex;
	flex-direction: column;
	overflow: auto;
	padding-right: 4px;
}

.system-note {
	display: grid;
	gap: 6px;
	padding-bottom: 14px;
	border-bottom: 1px solid #635844;
	line-height: 1.6;
}

.system-note strong {
	font-size: 16px;
	letter-spacing: 0.08em;
	color: #f2dfae;
}

.system-note span,
.guide-row,
.reference-note,
.core-tendency {
	font-size: 12px;
	line-height: 1.7;
	color: #d0c3aa;
}

.section-label {
	margin-top: 16px;
}

.axis-guide {
	display: grid;
	gap: 5px;
	margin-top: 9px;
	padding: 9px 10px;
	background: #20201c;
	border-left: 2px solid #a98a57;
}

.guide-row {
	display: grid;
	grid-template-columns: 46px 1fr;
	gap: 8px;
	font-size: 10px;
	line-height: 1.45;
}

.guide-row b {
	margin-right: 5px;
	color: #e6d4aa;
	font-weight: 500;
}

.guide-code {
	color: #f0d79e;
	font-family: monospace;
	font-size: 11px;
}

.axis-list {
	display: grid;
	gap: 10px;
	margin-top: 14px;
}

.axis-row {
	display: grid;
	gap: 5px;
}

.axis-labels {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	gap: 8px;
	align-items: center;
	font-size: 10px;
	color: #d9cbaa;
}

.axis-labels span:last-child {
	text-align: right;
}

.axis-labels small {
	color: #ad9a78;
	font-size: 9px;
	white-space: nowrap;
}

.axis-track {
	position: relative;
	height: 5px;
	border-radius: 4px;
	background: linear-gradient(90deg, #9a6f4f, #c8b383 50%, #54787a);
	opacity: 0.9;
}

.axis-mid {
	position: absolute;
	top: -3px;
	left: 50%;
	width: 1px;
	height: 11px;
	background: #f4ead2;
}

.axis-marker {
	position: absolute;
	top: -4px;
	width: 13px;
	height: 13px;
	transform: translateX(-50%);
	border: 2px solid #0b0d0d;
	border-radius: 50%;
	background: #f4db9b;
	box-shadow: 0 0 0 1px #f4db9b;
}

.portrait-name {
	margin-top: 15px;
	padding-top: 11px;
	border-top: 1px solid #635844;
}

.portrait-name strong {
	display: block;
	margin-top: 4px;
	color: #f3d799;
	font-family: monospace;
	font-size: 18px;
	letter-spacing: 0.18em;
}

.portrait-name h2 {
	margin: 5px 0 0;
	font-size: clamp(20px, 2.2vw, 27px);
	font-weight: 500;
	letter-spacing: 0.1em;
	color: #f2ead8;
}

.core-tendency {
	margin: 9px 0 0;
	color: #eee0c1;
}

.reference-note {
	margin: 8px 0 0;
	font-size: 10px;
	color: #aa9e89;
}

.return-title {
	margin-top: auto;
	padding: 10px 14px;
	border: 1px solid #a98a57;
	background: #241e17;
	color: #f6ead0;
	font-size: 12px;
	letter-spacing: 0.12em;
	cursor: pointer;
}

.return-title:hover,
.return-title:focus-visible {
	background: #3a2f23;
	outline: 2px solid #e7cf96;
	outline-offset: 2px;
}

@media (max-width: 820px) {
	.portrait-result {
		padding: 8px;
	}

	.portrait-shell {
		grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
		gap: 14px;
		padding: 14px;
	}

	.poster-frame {
		padding: 5px;
	}

	h1 {
		font-size: 24px;
	}
}

@media (max-width: 620px) {
	.portrait-shell {
		display: block;
		height: 94vh;
		overflow: auto;
	}

	.poster-column {
		display: block;
	}

	.poster-frame {
		height: 34vh;
	}

	.portrait-copy {
		overflow: visible;
		margin-top: 14px;
	}
}
</style>
