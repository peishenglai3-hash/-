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
import { Scene01 } from "@/scenes/Scene01/Scene01";
import { PrologueScene02 } from "@/scenes/Scene02/PrologueScene02";
import Phaser from "phaser";

import { onMounted, ref } from "vue";
import IntroPanel from "./components/IntroPanel.vue";
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
    scene: [Scene01, PrologueScene02],
  });

  const director = new GameDirector({ game });
  director.init();

  // 开场视频流程：使用 IntroPanel 暴露的模板引用
  const panel = introPanelRef.value!;
  setupStartScene({
    videoEl: panel.videoEl,
    buttonEl: panel.buttonEl,
    bgm: director.bgm,
    transitionAudio: director.transitionAudio,
  });

  // (window as any).prologueBgm = director.bgm;
});
</script>

<template>
  <div id="game"></div>
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
