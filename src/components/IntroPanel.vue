<script setup lang="ts">
import { hud } from '@/common/store';
</script>

<template>
  <div v-if="hud.introVisible" class="intro-panel">
    <video
      id="intro-video"
      src="/assets/video/intro.mp4"
      playsinline
      preload="auto"
    />
    <div class="intro-caption">
      <div>红色源代码·洪湖篇</div>
      <small>序章｜名字留在纸上</small>
    </div>
    <button id="start-button">开始进入序章</button>
  </div>
</template>

<style scoped>
.intro-panel {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  display: grid;
  place-items: center;
  background: #10100edc;
  z-index: 30;
}

.intro-panel video {
  width: min(100vw, 177.7778vh);
  height: min(56.25vw, 100vh);
  object-fit: cover;
  opacity: .9;
}

.intro-caption {
  position: absolute;
  top: 17%;
  left: 8%;
  color: #f0e4c5;
  font-size: clamp(1.2rem, 2.4vw, 2.4rem);
  letter-spacing: .18em;
  text-shadow: 0 2px 12px #000;
}

.intro-caption small {
  display: block;
  margin-top: .7rem;
  font-size: .45em;
  letter-spacing: .35em;
  opacity: .8;
}

.intro-panel button {
  position: absolute;
  bottom: 12%;
  padding: .7rem 2rem;
  border: 1px solid #d3ad64;
  background: #3b2718d9;
  color: #f8edcc;
  letter-spacing: .15em;
  font: inherit;
  cursor: pointer;
}
</style>
