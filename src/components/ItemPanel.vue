<script setup lang="ts">
import { hud, closeItem } from "@/common/store";

function onClose() {
	closeItem();
}
</script>

<template>
	<div v-if="hud.itemPanel" class="item-panel">
		<img :src="hud.itemPanel.icon" :alt="hud.itemPanel.title" />
		<div>
			<strong>{{ hud.itemPanel.title }}</strong>
			<span>{{ hud.itemPanel.text }}</span>
		</div>
		<button v-if="hud.itemPanel.closable" @click="onClose">
			<kbd>E</kbd> 关闭
		</button>
	</div>
</template>

<style scoped>
.item-panel {
	position: absolute;
	left: 18px;
	top: 56px;
	width: 164px;
	aspect-ratio: 1263 / 2028;
	pointer-events: auto;
	background: url("/assets/ui/keyed/item.png") center / 100% 100% no-repeat;
	color: #211b15;
	z-index: 20;
}

.item-panel img {
	position: absolute;
	left: 12%;
	top: 12%;
	width: 34%;
	aspect-ratio: 1;
	object-fit: contain;
}

.item-panel div {
	position: absolute;
	left: 12%;
	top: 52%;
	width: 76%;
}

.item-panel strong,
.item-panel span {
	display: block;
}

.item-panel strong {
	font-size: 10px;
}

.item-panel span {
	margin-top: 0.3rem;
	color: #3a3026;
	line-height: 1.3;
	font-size: 8px;
}

.item-panel button {
	position: absolute;
	right: 10%;
	bottom: 6%;
	padding: 0.15rem 0.25rem;
	background: transparent;
	border: 0;
	color: #4a3322;
	font-size: 8px;
	font: inherit;
	cursor: pointer;
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

@media (max-width: 850px) {
	.item-panel {
		left: 10px;
		top: 48px;
		width: 140px;
	}
}
</style>
