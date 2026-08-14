<script setup lang="ts">
import { reactive } from "vue";

const local = reactive({
	dateText: "",
	visible: false,
});

// 章末段落字幕：SC01 章节完成时由 showTitleCard 驱动（黑底+居中日期）
const showTitleCard = (lines: string[]) => {
	local.dateText = lines.join("\n");
	local.visible = true;
};

const hideTitleCard = () => {
	local.visible = false;
};

// 通过 window 暴露，供 Phaser 场景（无 Vue 引用）在剧情回调中调用
if (typeof window !== "undefined") {
	(window as any).showTitleCard = showTitleCard;
	(window as any).hideTitleCard = hideTitleCard;
}
</script>

<template>
	<div v-if="local.visible" class="chapter-title-card">
		<div class="chapter-title-date">{{ local.dateText }}</div>
	</div>
</template>

<style scoped>
.chapter-title-card {
	position: absolute;
	inset: 0;
	background: #000;
	z-index: 35;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: auto;
}

.chapter-title-date {
	color: #e5d5b6;
	font-size: clamp(19px, 2.6vw, 34px);
	line-height: 1.55;
	letter-spacing: 0.14em;
	text-align: center;
	text-shadow: 0 2px 16px #000;
	white-space: pre-line;
}
</style>
