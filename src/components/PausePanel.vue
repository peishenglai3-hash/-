<script setup lang="ts">
import { hud } from '@/common/store';
</script>

<template>
  <div v-if="hud.paused" class="pause-panel">
    <div>已暂停<small>按 ESC 继续</small></div>
  </div>
</template>

<style scoped>
.pause-panel {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: #000000b0;
  z-index: 26;
  color: #f5e8c3;
  font-size: clamp(1.4rem, 3vw, 2.6rem);
  letter-spacing: .3em;
  text-align: center;
}

.pause-panel small {
  display: block;
  margin-top: .9rem;
  font-size: .42em;
  letter-spacing: .2em;
  opacity: .7;
}
</style>
