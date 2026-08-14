<!--
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-11 11:46:35
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 11:59:42
 * @FilePath: /honghu_game/src/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import { useDirectorStore } from "@/stores/modules/director";
import Scene1Overlay from "@/components/biz/Scene1Overlay.vue";
import Scene2Overlay from "@/components/biz/Scene2Overlay.vue";
import Scene3Overlay from "@/components/biz/Scene3Overlay.vue";
import TitleLoadPanel from "@/components/ui/TitleLoadPanel.vue";
import TitleSettingsPanel from "@/components/ui/TitleSettingsPanel.vue";
import TaskCard from "@/components/ui/TaskCard.vue";
import DevPlayerTuningPanel from "@/components/ui/DevPlayerTuningPanel.vue";
import InteractionPrompt from "@/components/ui/InteractionPrompt.vue";
import DialoguePanel from "@/components/ui/DialoguePanel.vue";
import ItemPanel from "@/components/ui/ItemPanel.vue";
import ChoicePanel from "@/components/ui/ChoicePanel.vue";
import ResultPanel from "@/components/ui/ResultPanel.vue";
import SceneFade from "@/components/ui/SceneFade.vue";
import PausePanel from "@/components/ui/PausePanel.vue";
import FlavorToast from "@/components/ui/FlavorToast.vue";
import EndPanel from "@/components/ui/EndPanel.vue";
import { useGameStateStore } from "@/stores/modules/gameState";

const hud = useHudStore();
const directorStore = useDirectorStore();
const gameEl = ref<HTMLElement | null>(null);

onMounted(() => {
	directorStore.init(gameEl.value!);

	const game = directorStore.game!;
	window.addEventListener("honghu:dev-add-task", () => hud.addTestTask());
	window.addEventListener("honghu:dev-editor-toggle", ((event: CustomEvent<{ enabled: boolean }>) => {
		hud.setDevEditorVisible(event.detail.enabled);
	}) as EventListener);

	// P 键切换区域编辑器
	window.addEventListener("keydown", (event) => {
		if (event.code !== "KeyP") return;
		const editorPanel = document.querySelector(".dev-zone-editor");
		const target = event.target as HTMLElement | null;
		const tuningPanel = document.querySelector(".dev-player-tuning");
		if (
			["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "") &&
			!editorPanel?.contains(target) &&
			!tuningPanel?.contains(target)
		) return;
		event.preventDefault();
		const scene = game.scene.getScenes(true).find((item: any) => item.zoneEditor) as any;
		scene?.zoneEditor.toggle();
	});
});

// 开场视频开始播放：解锁 Web Audio
function onStart() {
	directorStore.transitionAudio.prime();
}

// 开场视频结束（或被跳过）：起 BGM 并放开场景探索
function onDone() {
	directorStore.bgm.play().catch(() => {});
	(window as any).scene01Game?.beginExplore();
}
</script>

<template>
	<div id="game" ref="gameEl"></div>
	<TitleLoadPanel />
	<TitleSettingsPanel />
	<Scene1Overlay v-if="hud.overlay === 'Scene1Overlay'" @start="onStart" @done="onDone" />
	<Scene2Overlay v-if="hud.overlay === 'Scene2Overlay'" />
	<DevPlayerTuningPanel />
	<Scene3Overlay v-if="hud.overlay === 'Scene3Overlay'" />
	<TaskCard />
	<InteractionPrompt />
	<DialoguePanel />
	<ItemPanel />
	<ChoicePanel />
	<ResultPanel />
	<SceneFade />
	<PausePanel />
	<FlavorToast />
	<EndPanel />
</template>
