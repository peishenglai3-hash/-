import { ref, reactive } from "vue";
import { defineStore } from "pinia";
import { state } from "@/common/state";
import { getTextSpeedMult } from "@/common/save";

// ===== 类型定义 =====

export interface NarrativeEntry {
  entry_id: string;
  kind: string;
  speaker_id?: string;
  speaker_name?: string;
  text: string;
  style: string;
  cps?: number;
  advance?: string;
  avatar_id?: string;
  sfx?: string;
}

export interface TaskCard {
  title: string;
  detail: string;
}

export interface ItemPanel {
  icon: string;
  title: string;
  text: string;
  closable: boolean;
}

export interface ChoiceItem {
  id: string;
  label: string;
  detail: string;
}

export interface ChoicePanel {
  title: string;
  items: ChoiceItem[];
  onChoose: (id: string) => void;
}

export interface EndPanel {
  checkpoint: string;
  profile: string;
  tags: string;
  risk: string;
}

// ===== 内部状态（模块级，非响应式） =====

let _flavorTimer: number | null = null;
let _narrativeTimer: number | null = null;
let _narrativeQueue: NarrativeEntry[] = [];
let _narrativeIndex = 0;
let _narrativeOnComplete: (() => void) | null = null;

// ===== 覆盖层场景类型（全屏流程组件，同一时刻只显示一个） =====

export type SceneOverlay = "Scene1Overlay" | null;

// ===== Pinia Store（Setup Store 风格） =====

export const useHudStore = defineStore("hud", () => {
  // --- overlay scene (intro video / future full-screen flows) ---
  const overlay = ref<SceneOverlay>(null);

  // --- title sub panels ---
  const title = reactive({ loadOpen: false, settingsOpen: false });

  // --- task card ---
  const taskCard = ref<TaskCard | null>(null);

  // --- interaction prompt ---
  const prompt = ref("");

  // --- dialogue ---
  const dialogue = reactive({
    visible: false,
    style: "narration" as string,
    speaker: "",
    avatarSrc: "",
    fullText: "",
    displayedText: "",
    cps: 14,
    typing: false,
    hint: "Space 继续",
  });

  // --- item panel ---
  const itemPanel = ref<ItemPanel | null>(null);

  // --- choice panel ---
  const choicePanel = ref<ChoicePanel | null>(null);

  // --- result panel ---
  const resultPanelVisible = ref(false);
  const resultPanel = ref<{ image: string; result: [string, string] } | null>(null);

  // --- scene fade ---
  const sceneFade = ref(false);

  // --- pause ---
  const paused = ref(false);

  // --- flavor toast ---
  const flavorToast = ref("");

  // --- end panel ---
  const endPanel = ref<EndPanel | null>(null);

  // --- transition overlay ---
  const transition = reactive({
    active: false,
    subtitleVisible: true,
    subtitleStyle: "cue" as string,
    kindText: "",
    text: "",
    dateVisible: false,
    dateText: "",
    revealShown: false,
    revealFadeIn: false,
    revealSrc: "",
  });

  // --- global lock ---
  const playerLocked = ref(false);

  // ===== 内部函数 =====

  function _renderCurrentEntry() {
    const entry = _narrativeQueue[_narrativeIndex];
    if (!entry) {
      _finishNarrative();
      return;
    }
    const cps = Math.max(4, Math.round((entry.cps || 14) * getTextSpeedMult()));
    dialogue.visible = true;
    dialogue.style = entry.style || "narration";
    dialogue.speaker = entry.speaker_name || "";
    dialogue.avatarSrc = entry.avatar_id || "";
    dialogue.fullText = entry.text;
    dialogue.displayedText = "";
    dialogue.cps = cps;
    dialogue.typing = true;
    dialogue.hint = "Space 继续";

    // 打字动画
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    const chars = [...entry.text];
    let cursor = 0;
    _narrativeTimer = window.setInterval(() => {
      dialogue.displayedText = chars.slice(0, ++cursor).join("");
      if (cursor >= chars.length) {
        window.clearInterval(_narrativeTimer!);
        _narrativeTimer = null;
        dialogue.typing = false;
      }
    }, Math.max(20, 1000 / cps));
  }

  function _finishNarrative() {
    dialogue.visible = false;
    dialogue.typing = false;
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    _narrativeTimer = null;
    playerLocked.value = false;
    state.inNarrative = false;
    state.playerLocked = false;
    const done = _narrativeOnComplete;
    _narrativeOnComplete = null;
    _narrativeQueue = [];
    done?.();
  }

  // ===== Actions =====

  // --- 风味气泡 ---
  function showFlavor(text: string) {
    flavorToast.value = text;
    if (_flavorTimer) window.clearTimeout(_flavorTimer);
    _flavorTimer = window.setTimeout(() => {
      flavorToast.value = "";
    }, 2600);
  }

  // --- 叙事链 ---
  function playNarrative(entries: NarrativeEntry[], onComplete?: () => void) {
    _narrativeQueue = entries;
    _narrativeIndex = 0;
    _narrativeOnComplete = onComplete ?? null;
    dialogue.visible = true;
    playerLocked.value = true;
    state.inNarrative = true;
    state.playerLocked = true;
    _renderCurrentEntry();
  }

  function advanceNarrative() {
    if (!dialogue.visible) return;
    if (dialogue.typing) {
      // 跳过打字
      if (_narrativeTimer) window.clearInterval(_narrativeTimer);
      _narrativeTimer = null;
      dialogue.typing = false;
      dialogue.displayedText = dialogue.fullText;
      return;
    }
    _narrativeIndex += 1;
    _renderCurrentEntry();
  }

  function hideDialogue() {
    dialogue.visible = false;
    dialogue.typing = false;
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    _narrativeTimer = null;
    _narrativeQueue = [];
    _narrativeOnComplete = null;
    state.inNarrative = false;
  }

  // --- 物品面板 ---
  function showItem(item: { icon: string; title: string; text: string }) {
    itemPanel.value = { ...item, closable: true };
    playerLocked.value = true;
  }

  function showItemPassive(item: { icon: string; title: string; text: string }) {
    itemPanel.value = { ...item, closable: false };
  }

  function closeItem() {
    itemPanel.value = null;
    playerLocked.value = false;
  }

  function hideItem() {
    itemPanel.value = null;
  }

  function itemPanelOpen(): boolean {
    return itemPanel.value !== null;
  }

  // --- 选择面板 ---
  function showChoices(
    items: ChoiceItem[],
    onChoose: (id: string) => void,
    titleStr: string = "走访结束前，最后确认什么？",
  ) {
    choicePanel.value = { title: titleStr, items, onChoose };
  }

  function hideChoices() {
    choicePanel.value = null;
  }

  // --- 结果面板 ---
  function showResult(choice: { image: string; result: [string, string] }) {
    resultPanel.value = choice;
    resultPanelVisible.value = true;
  }

  function hideResult() {
    resultPanelVisible.value = false;
    resultPanel.value = null;
  }

  // --- 任务卡片 ---
  function showTask(task: TaskCard) {
    state.taskPreviousLock = state.playerLocked;
    state.taskOpen = true;
    state.playerLocked = true;
    taskCard.value = task;
  }

  function closeTask() {
    if (!state.taskOpen) return;
    state.taskOpen = false;
    taskCard.value = null;
    state.playerLocked = state.taskPreviousLock;
  }

  function hideTask() {
    state.taskOpen = false;
    taskCard.value = null;
  }

  // --- 交互提示 ---
  function showPrompt(text: string) {
    prompt.value = text;
  }

  function hidePrompt() {
    prompt.value = "";
  }

  // --- 淡入淡出 ---
  function fadeToBlack() {
    sceneFade.value = true;
  }

  function clearFade() {
    sceneFade.value = false;
  }

  // --- 暂停 ---
  function togglePause() {
    paused.value = !paused.value;
  }

  // --- overlay scene ---
  function showOverlay(scene: Exclude<SceneOverlay, null>) {
    overlay.value = scene;
  }

  function hideOverlay() {
    overlay.value = null;
  }

  function hideIntro() {
    overlay.value = null;
  }

  // --- 结算 ---
  function showEndPanel(save: {
    checkpointLabel: string;
    checkpoint: string;
    profile: Record<string, number>;
    choiceTag: string | null;
    fixed: string[];
    risk: { identity: number; execution: number; coordination: number };
  }) {
    endPanel.value = {
      checkpoint: `固定回退点：${save.checkpointLabel}（${save.checkpoint}）`,
      profile: `画像累计 D${save.profile.D} C${save.profile.C} I${save.profile.I} G${save.profile.G} P${save.profile.P} A${save.profile.A}`,
      tags: `选择标签 ${save.choiceTag ?? "—"} ｜ 固定标签 ${save.fixed.join(" · ")}`,
      risk: `行动风险 身份${save.risk.identity} 执行${save.risk.execution} 协同${save.risk.coordination}`,
    };
  }

  function hideEndPanel() {
    endPanel.value = null;
  }

  return {
    overlay,
    title,
    taskCard,
    prompt,
    dialogue,
    itemPanel,
    choicePanel,
    resultPanelVisible,
    resultPanel,
    sceneFade,
    paused,
    flavorToast,
    endPanel,
    transition,
    playerLocked,
    // actions
    showFlavor,
    playNarrative,
    advanceNarrative,
    hideDialogue,
    showItem,
    showItemPassive,
    closeItem,
    hideItem,
    itemPanelOpen,
    showChoices,
    hideChoices,
    showResult,
    hideResult,
    showTask,
    closeTask,
    hideTask,
    showPrompt,
    hidePrompt,
    fadeToBlack,
    clearFade,
    togglePause,
    showOverlay,
    hideOverlay,
    hideIntro,
    showEndPanel,
    hideEndPanel,
  };
});
