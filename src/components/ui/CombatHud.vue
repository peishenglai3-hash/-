<script setup lang="ts">
import { useHudStore } from "@/stores/modules/hud";

const hud = useHudStore();
const assetBase = import.meta.env.BASE_URL || "/";

function barWidth(value: number, max: number): string {
	return `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`;
}
</script>

<template>
	<div v-if="hud.combatHud.visible" class="combat-hud" aria-label="突入战斗状态">
		<section class="combat-status combat-panel">
			<div class="status-heading">
				<span class="status-mark">陈</span>
				<div>
					<strong>陈继南</strong>
					<small>{{ hud.combatHud.status }}</small>
				</div>
			</div>
			<div class="health-track" aria-label="生命值">
				<i :style="{ width: barWidth(hud.combatHud.hp, hud.combatHud.maxHp) }" />
			</div>
			<div class="health-copy">生命 {{ Math.ceil(hud.combatHud.hp) }} / {{ hud.combatHud.maxHp }}</div>
		</section>

		<section class="combat-weapon combat-panel">
			<img
				:src="`${assetBase}assets/ch03/combat/${hud.combatHud.weapon === 'longgun' ? 'long-gun' : 'pistol'}.png`"
				:alt="hud.combatHud.weaponLabel"
			/>
			<div>
				<strong>{{ hud.combatHud.weaponLabel }}</strong>
				<span><b>{{ hud.combatHud.ammo }}</b> / {{ hud.combatHud.reserve }}</span>
			</div>
			<small>Q 切换</small>
		</section>

		<section class="combat-objective combat-panel">
			<div class="objective-label">当前目标</div>
			<strong>{{ hud.combatHud.objective }}</strong>
			<div v-if="hud.combatHud.objective.includes('俘虏')" class="capture-count">
				<span v-for="index in hud.combatHud.captureTotal" :key="index" :class="{ done: index <= hud.combatHud.captured }">◆</span>
				<em>{{ hud.combatHud.captured }} / {{ hud.combatHud.captureTotal }}</em>
			</div>
			<div v-else class="pursuit-track" aria-label="追击进度">
				<i :style="{ width: `${hud.combatHud.pursuitProgress * 100}%` }" />
			</div>
		</section>

		<div class="combat-controls">WASD 移动　鼠标 / SPACE 射击　E 俘虏　Q 换枪</div>
	</div>
</template>

<style scoped>
.combat-hud {
	position: absolute;
	inset: 0;
	z-index: 24;
	color: #f6ead0;
	font-family: Georgia, "Noto Serif SC", serif;
	pointer-events: none;
	text-shadow: 0 2px 3px #000b;
}

.combat-panel {
	position: absolute;
	border: 1px solid #b89458;
	background: linear-gradient(135deg, #17120ee8, #090806dc);
	box-shadow: 0 5px 16px #0008, inset 0 0 0 1px #3c2a19;
}

.combat-status {
	top: 18px;
	left: 18px;
	width: 226px;
	padding: 10px 12px 9px;
}

.status-heading,
.combat-weapon,
.capture-count {
	display: flex;
	align-items: center;
}

.status-heading {
	gap: 8px;
}

.status-mark {
	display: grid;
	place-items: center;
	width: 30px;
	height: 30px;
	border: 1px solid #d6ad68;
	background: #5b1e17;
	color: #ffe4af;
	font-weight: 700;
}

.status-heading strong,
.combat-weapon strong {
	display: block;
	font-size: 13px;
	letter-spacing: 0.12em;
}

.status-heading small {
	display: block;
	margin-top: 2px;
	color: #c9b38e;
	font-size: 10px;
}

.health-track,
.pursuit-track {
	height: 8px;
	margin-top: 9px;
	border: 1px solid #5d4330;
	background: #281c18;
	overflow: hidden;
}

.health-track i,
.pursuit-track i {
	display: block;
	height: 100%;
	background: linear-gradient(90deg, #7d1f17, #d58b36);
	transition: width 0.18s ease;
}

.health-copy {
	margin-top: 4px;
	color: #d9c3a0;
	font-size: 10px;
}

.combat-weapon {
	top: 18px;
	right: 18px;
	gap: 8px;
	min-width: 190px;
	padding: 8px 10px;
}

.combat-weapon img {
	width: 56px;
	height: 28px;
	object-fit: contain;
	image-rendering: pixelated;
}

.combat-weapon span {
	display: block;
	margin-top: 2px;
	color: #d7c19c;
	font-size: 12px;
}

.combat-weapon span b {
	color: #ffe1a1;
	font-size: 19px;
}

.combat-weapon small {
	margin-left: auto;
	align-self: flex-end;
	color: #9e8767;
	font-size: 9px;
}

.combat-objective {
	top: 18px;
	left: 50%;
	width: 300px;
	padding: 9px 14px;
	transform: translateX(-50%);
	text-align: center;
}

.objective-label {
	color: #c99d57;
	font-size: 10px;
	letter-spacing: 0.24em;
}

.combat-objective strong {
	display: block;
	margin-top: 3px;
	font-size: 14px;
	letter-spacing: 0.08em;
}

.capture-count {
	justify-content: center;
	gap: 7px;
	margin-top: 6px;
	color: #705b43;
	font-size: 14px;
}

.capture-count span.done {
	color: #e4ad58;
}

.capture-count em {
	color: #d9c3a0;
	font-size: 11px;
	font-style: normal;
}

.pursuit-track {
	margin: 7px 16px 1px;
}

.pursuit-track i {
	background: linear-gradient(90deg, #8b5424, #f1ca77);
}

.combat-controls {
	position: absolute;
	bottom: 14px;
	left: 50%;
	padding: 5px 10px;
	transform: translateX(-50%);
	border: 1px solid #604a33aa;
	background: #0b0907b8;
	color: #cfbb98;
	font-size: 11px;
	letter-spacing: 0.05em;
}

@media (max-width: 850px) {
	.combat-status { top: 10px; left: 10px; width: 180px; }
	.combat-weapon { top: 10px; right: 10px; min-width: 150px; }
	.combat-objective { top: 10px; width: 240px; }
	.combat-controls { bottom: 8px; font-size: 9px; white-space: nowrap; }
}
</style>
