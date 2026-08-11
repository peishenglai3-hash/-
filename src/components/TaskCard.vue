<script setup lang="ts">
import { hud } from '@/common/store';

function onClose() {
  hud.taskCard = null;
}
</script>

<template>
  <div v-if="hud.taskCard" class="task-card">
    <strong>{{ hud.taskCard.title }}</strong>
    <span>{{ hud.taskCard.detail }}</span>
    <span class="task-dismiss"><kbd>E</kbd><em>关闭任务</em></span>
  </div>
</template>

<style scoped>
.task-card {
  position: absolute;
  top: 16px;
  right: 18px;
  width: 280px;
  padding: 10px 12px;
  text-align: left;
  border: 1px solid #a98a57;
  border-radius: 8px;
  background: #17130fe8;
  color: #f6ead0;
  box-shadow: 0 4px 14px #0009;
  z-index: 22;
}

.task-card strong,
.task-card span {
  display: block;
}

.task-card strong {
  color: #f7ead0;
  font-size: 14px;
  letter-spacing: .06em;
  line-height: 1.2;
}

.task-card > span {
  margin-top: 4px;
  padding-right: 56px;
  font-size: 12px;
  line-height: 1.35;
}

.task-dismiss {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin: 0 !important;
  color: #ead6ad;
  font-size: 9px !important;
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
  font: 700 12px/1 Georgia, serif;
  box-shadow: inset 0 -1px #b79764;
}

.task-dismiss em {
  font-style: normal;
}

@media (max-width: 850px) {
  .task-card {
    top: 10px;
    right: 10px;
    width: min(42vw, 250px);
  }
}
</style>
