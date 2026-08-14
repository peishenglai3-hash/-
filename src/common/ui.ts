// ui.ts — HUD 控制接口，所有函数转发到 Pinia store
// Phaser Scene 继续通过此模块控制 HUD，无需关心底层是 Vue 还是原生 DOM

import { useHudStore, type DevPlayerMotionConfig } from "@/stores/modules/hud";

// 延迟获取 store 实例，避免模块初始化时调用（此时 Pinia 尚未安装）
function store() {
  return useHudStore();
}

// 通过 Proxy 透明代理 hud 对象，兼容场景侧直接读写
export const hud = new Proxy({} as ReturnType<typeof useHudStore>, {
  get(_t, prop) {
    return Reflect.get(store(), prop);
  },
  set(_t, prop, value) {
    return Reflect.set(store(), prop, value);
  },
  has(_t, prop) {
    return Reflect.has(store(), prop);
  },
});

// 命名导出函数 — 委托到 store actions
export function showFlavor(text: string) { store().showFlavor(text); }
export function playNarrative(entries: any[], onComplete?: () => void) { store().playNarrative(entries as any, onComplete); }
export function advanceNarrative() { store().advanceNarrative(); }
export function hideDialogue() { store().hideDialogue(); }
export function showItem(item: { icon: string; title: string; text: string }) { store().showItem(item); }
export function showItemPassive(item: { icon: string; title: string; text: string }) { store().showItemPassive(item); }
export function closeItem() { store().closeItem(); }
export function hideItem() { store().hideItem(); }
export function itemPanelOpen() { return store().itemPanelOpen(); }
export function showChoices(items: any[], onChoose: (id: string) => void, title?: string) { store().showChoices(items as any, onChoose, title); }
export function hideChoices() { store().hideChoices(); }
export function showResult(choice: { image: string; result: [string, string] }) { store().showResult(choice); }
export function hideResult() { store().hideResult(); }
export function showTask(task: any) { store().showTask(task); }
export function closeTask() { store().closeTask(); }
export function hideTask() { store().hideTask(); }
export function taskNeedsConfirmation() { return store().taskNeedsConfirmation(); }
export function getPlayerMovementMultiplier() { return store().devPlayerTuning.movementMultiplier; }
export function getPlayerAnimationMultiplier() { return store().devPlayerTuning.animationMultiplier; }
export function setPlayerMovementMultiplier(value: number) { store().devPlayerTuning.movementMultiplier = value; }
export function setPlayerAnimationMultiplier(value: number) { store().devPlayerTuning.animationMultiplier = value; }
export function resetDevPlayerTuning() { store().resetDevPlayerTuning(); }
export function getDevPlayerMotionJson() { return store().devPlayerMotionJson(); }
export function applyDevPlayerMotionFromJson(motion?: DevPlayerMotionConfig) { store().applyDevPlayerMotionFromJson(motion); }
export function showPrompt(text: string) { store().showPrompt(text); }
export function hidePrompt() { store().hidePrompt(); }
export function fadeToBlack() { store().fadeToBlack(); }
export function clearFade() { store().clearFade(); }
export function togglePause() { store().togglePause(); }
export function hideIntro() { store().hideIntro(); }
export function showEndPanel(save: any, endMeta?: any) { store().showEndPanel(save, endMeta); }
export function hideEndPanel() { store().hideEndPanel(); }
