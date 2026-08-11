<script setup lang="ts">
import { hud } from '@/common/store';

function onChoose(id: string) {
  hud.choicePanel?.onChoose(id);
}
</script>

<template>
  <div v-if="hud.choicePanel" class="choice-panel">
    <div class="choice-title">{{ hud.choicePanel.title }}</div>
    <button
      v-for="choice in hud.choicePanel.items"
      :key="choice.id"
      class="choice"
      @click="onChoose(choice.id)"
    >
      <b>[{{ choice.id.slice(-1) }}]</b>
      <span>
        <strong>{{ choice.label }}</strong>
        <small>{{ choice.detail }}</small>
      </span>
    </button>
  </div>
</template>

<style scoped>
.choice-panel {
  position: absolute;
  left: 50%;
  bottom: 5%;
  transform: translateX(-50%);
  width: min(72vw, 740px);
  padding: 1rem;
  pointer-events: auto;
  background: #1b1915f5;
  border: 2px solid #c49a5e;
  box-shadow: 0 10px 40px #000d;
  z-index: 24;
}

.choice-title {
  text-align: center;
  color: #f8e9c2;
  font-size: 1.35rem;
  margin-bottom: .8rem;
}

.choice {
  width: 100%;
  display: flex;
  gap: .8rem;
  margin: .45rem 0;
  padding: .75rem 1rem;
  text-align: left;
  background: #31261b;
  border: 1px solid #7f6848;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.choice:hover {
  background: #58452b;
  border-color: #d3ad64;
}

.choice b { color: #e5c27f; font-size: 1.25rem; }

.choice strong,
.choice small { display: block; }

.choice small {
  margin-top: .25rem;
  color: #d8c9a8;
}
</style>
