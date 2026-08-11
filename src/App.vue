<!--
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-11 11:46:35
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-11 16:35:12
 * @FilePath: /honghu_game/src/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
import { GameDirector } from "@/director/GameDirector";
import { setupStartScene } from "@/director/flow/StartScene";
import { TitleScene } from "@/scenes/Title/TitleScene";
import { Scene01 } from "@/scenes/Scene01/Scene01";
import { PrologueScene02 } from "@/scenes/Scene02/PrologueScene02";
import { Ch01Sc01Scene } from "@/scenes/Scene03/Ch01Sc01Scene";
import Phaser from "phaser";

import { onMounted, ref, nextTick } from "vue";
import { hud } from "@/common/store";
import IntroPanel from "./components/IntroPanel.vue";
import TitleLoadPanel from "./components/TitleLoadPanel.vue";
import TitleSettingsPanel from "./components/TitleSettingsPanel.vue";
import TaskCard from "./components/TaskCard.vue";
import InteractionPrompt from "./components/InteractionPrompt.vue";
import DialoguePanel from "./components/DialoguePanel.vue";
import ItemPanel from "./components/ItemPanel.vue";
import ChoicePanel from "./components/ChoicePanel.vue";
import ResultPanel from "./components/ResultPanel.vue";
import SceneFade from "./components/SceneFade.vue";
import PausePanel from "./components/PausePanel.vue";
import FlavorToast from "./components/FlavorToast.vue";
import EndPanel from "./components/EndPanel.vue";
import TransitionOverlay from "./components/TransitionOverlay.vue";

const introPanelRef = ref<InstanceType<typeof IntroPanel> | null>(null);

onMounted(() => {
	// 初始化 Phaser
	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: "game",
		backgroundColor: "#171715",
		width: 1280,
		height: 720,
		dom: { createContainer: true },
		physics: {
			default: "arcade",
			arcade: { gravity: { x: 0, y: 0 }, debug: false },
		},
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: 1280,
			height: 720,
		},
		loader: { baseURL: import.meta.env.BASE_URL },
		scene: [TitleScene, Scene01, PrologueScene02, Ch01Sc01Scene],
	});

	const director = new GameDirector({ game });
	director.init();
	(window as any).game = game;
	window.addEventListener("keydown", (event) => {
		if (event.code !== "KeyP") return;
		const editorPanel = document.querySelector(".dev-zone-editor");
		const target = event.target as HTMLElement | null;
		if (["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "") && !editorPanel?.contains(target)) return;
		event.preventDefault();
		const scene = game.scene.getScenes(true).find((item: any) => item.zoneEditor) as any;
		scene?.zoneEditor.toggle();
	});

	// 开场视频流程：标题界面选择「创建」后再接线（IntroPanel 此时才渲染出模板引用）
	game.events.on("director:new-game", () => {
		hud.introVisible = true;
		nextTick(() => {
			const panel = introPanelRef.value!;
			setupStartScene({
				videoEl: panel.videoEl,
				buttonEl: panel.buttonEl,
				bgm: director.bgm,
				transitionAudio: director.transitionAudio,
			});
		});
	});
});
</script>

<template>
	<div id="game"></div>
	<TitleLoadPanel />
	<TitleSettingsPanel />
	<IntroPanel ref="introPanelRef" />
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
	<TransitionOverlay />
</template>
