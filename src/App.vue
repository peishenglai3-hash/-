<script setup lang="ts">
import { ref } from 'vue';
import IntroPanel from './components/IntroPanel.vue';
import TaskCard from './components/TaskCard.vue';
import InteractionPrompt from './components/InteractionPrompt.vue';
import DialoguePanel from './components/DialoguePanel.vue';
import ItemPanel from './components/ItemPanel.vue';
import ChoicePanel from './components/ChoicePanel.vue';
import ResultPanel from './components/ResultPanel.vue';
import SceneFade from './components/SceneFade.vue';
import PausePanel from './components/PausePanel.vue';
import FlavorToast from './components/FlavorToast.vue';
import EndPanel from './components/EndPanel.vue';
import TransitionOverlay from './components/TransitionOverlay.vue';

// 暴露给外部（Phaser/GameDirector）的视频和按钮引用
const introVideoEl = ref<HTMLVideoElement | null>(null);
const introStartEl = ref<HTMLButtonElement | null>(null);

defineExpose({ introVideoEl, introStartEl });
</script>

<template>
  <IntroPanel ref="introVideoEl" />
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
