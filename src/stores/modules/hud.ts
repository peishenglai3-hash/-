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

// ===== Pinia Store =====

export const useHudStore = defineStore("hud", {
  state: () => ({
    // --- intro video ---
    introVisible: false,

    // --- title sub panels ---
    title: {
      loadOpen: false,
      settingsOpen: false,
    },

    // --- task card ---
    taskCard: null as TaskCard | null,

    // --- interaction prompt ---
    prompt: "",

    // --- dialogue ---
    dialogue: {
      visible: false,
      style: "narration",
      speaker: "",
      avatarSrc: "",
      fullText: "",
      displayedText: "",
      cps: 14,
      typing: false,
      hint: "Space 继续",
    },

    // --- item panel ---
    itemPanel: null as ItemPanel | null,

    // --- choice panel ---
    choicePanel: null as ChoicePanel | null,

    // --- result panel ---
    resultPanelVisible: false,
    resultPanel: null as { image: string; result: [string, string] } | null,

    // --- scene fade ---
    sceneFade: false,

    // --- pause ---
    paused: false,

    // --- flavor toast ---
    flavorToast: "",

    // --- end panel ---
    endPanel: null as EndPanel | null,

    // --- transition overlay ---
    transition: {
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
    },

    // --- global lock ---
    playerLocked: false,
  }),

  actions: {
    // --- 风味气泡 ---
    showFlavor(text: string) {
      this.flavorToast = text;
      if (_flavorTimer) window.clearTimeout(_flavorTimer);
      _flavorTimer = window.setTimeout(() => {
        this.flavorToast = "";
      }, 2600);
    },

    // --- 叙事链 ---
    playNarrative(entries: NarrativeEntry[], onComplete?: () => void) {
      _narrativeQueue = entries;
      _narrativeIndex = 0;
      _narrativeOnComplete = onComplete ?? null;
      this.dialogue.visible = true;
      this.playerLocked = true;
      state.inNarrative = true;
      state.playerLocked = true;
      _renderCurrentEntry(this);
    },

    advanceNarrative() {
      if (!this.dialogue.visible) return;
      if (this.dialogue.typing) {
        // 跳过打字
        if (_narrativeTimer) window.clearInterval(_narrativeTimer);
        _narrativeTimer = null;
        this.dialogue.typing = false;
        this.dialogue.displayedText = this.dialogue.fullText;
        return;
      }
      _narrativeIndex += 1;
      _renderCurrentEntry(this);
    },

    hideDialogue() {
      this.dialogue.visible = false;
      this.dialogue.typing = false;
      if (_narrativeTimer) window.clearInterval(_narrativeTimer);
      _narrativeTimer = null;
      _narrativeQueue = [];
      _narrativeOnComplete = null;
      state.inNarrative = false;
    },

    // --- 物品面板 ---
    showItem(item: { icon: string; title: string; text: string }) {
      this.itemPanel = { ...item, closable: true };
      this.playerLocked = true;
    },

    showItemPassive(item: { icon: string; title: string; text: string }) {
      this.itemPanel = { ...item, closable: false };
    },

    closeItem() {
      this.itemPanel = null;
      this.playerLocked = false;
    },

    hideItem() {
      this.itemPanel = null;
    },

    itemPanelOpen(): boolean {
      return this.itemPanel !== null;
    },

    // --- 选择面板 ---
    showChoices(
      items: ChoiceItem[],
      onChoose: (id: string) => void,
      title: string = "走访结束前，最后确认什么？",
    ) {
      this.choicePanel = { title, items, onChoose };
    },

    hideChoices() {
      this.choicePanel = null;
    },

    // --- 结果面板 ---
    showResult(choice: { image: string; result: [string, string] }) {
      this.resultPanel = choice;
      this.resultPanelVisible = true;
    },

    hideResult() {
      this.resultPanelVisible = false;
      this.resultPanel = null;
    },

    // --- 任务卡片 ---
    showTask(task: TaskCard) {
      state.taskPreviousLock = state.playerLocked;
      state.taskOpen = true;
      state.playerLocked = true;
      this.taskCard = task;
    },

    closeTask() {
      if (!state.taskOpen) return;
      state.taskOpen = false;
      this.taskCard = null;
      state.playerLocked = state.taskPreviousLock;
    },

    hideTask() {
      state.taskOpen = false;
      this.taskCard = null;
    },

    // --- 交互提示 ---
    showPrompt(text: string) {
      this.prompt = text;
    },

    hidePrompt() {
      this.prompt = "";
    },

    // --- 淡入淡出 ---
    fadeToBlack() {
      this.sceneFade = true;
    },

    clearFade() {
      this.sceneFade = false;
    },

    // --- 暂停 ---
    togglePause() {
      this.paused = !this.paused;
    },

    // --- 开场 ---
    hideIntro() {
      this.introVisible = false;
    },

    // --- 结算 ---
    showEndPanel(save: {
      checkpointLabel: string;
      checkpoint: string;
      profile: Record<string, number>;
      choiceTag: string | null;
      fixed: string[];
      risk: { identity: number; execution: number; coordination: number };
    }) {
      this.endPanel = {
        checkpoint: `固定回退点：${save.checkpointLabel}（${save.checkpoint}）`,
        profile: `画像累计 D${save.profile.D} C${save.profile.C} I${save.profile.I} G${save.profile.G} P${save.profile.P} A${save.profile.A}`,
        tags: `选择标签 ${save.choiceTag ?? "—"} ｜ 固定标签 ${save.fixed.join(" · ")}`,
        risk: `行动风险 身份${save.risk.identity} 执行${save.risk.execution} 协同${save.risk.coordination}`,
      };
    },

    hideEndPanel() {
      this.endPanel = null;
    },
  },
});

// ===== 内部函数 =====

function _renderCurrentEntry(store: ReturnType<typeof useHudStore>) {
  const entry = _narrativeQueue[_narrativeIndex];
  if (!entry) {
    _finishNarrative(store);
    return;
  }
  const cps = Math.max(4, Math.round((entry.cps || 14) * getTextSpeedMult()));
  store.dialogue.visible = true;
  store.dialogue.style = entry.style || "narration";
  store.dialogue.speaker = entry.speaker_name || "";
  store.dialogue.avatarSrc = entry.avatar_id || "";
  store.dialogue.fullText = entry.text;
  store.dialogue.displayedText = "";
  store.dialogue.cps = cps;
  store.dialogue.typing = true;
  store.dialogue.hint = "Space 继续";

  // 打字动画
  if (_narrativeTimer) window.clearInterval(_narrativeTimer);
  const chars = [...entry.text];
  let cursor = 0;
  _narrativeTimer = window.setInterval(() => {
    store.dialogue.displayedText = chars.slice(0, ++cursor).join("");
    if (cursor >= chars.length) {
      window.clearInterval(_narrativeTimer!);
      _narrativeTimer = null;
      store.dialogue.typing = false;
    }
  }, Math.max(20, 1000 / cps));
}

function _finishNarrative(store: ReturnType<typeof useHudStore>) {
  store.dialogue.visible = false;
  store.dialogue.typing = false;
  if (_narrativeTimer) window.clearInterval(_narrativeTimer);
  _narrativeTimer = null;
  store.playerLocked = false;
  state.inNarrative = false;
  state.playerLocked = false;
  const done = _narrativeOnComplete;
  _narrativeOnComplete = null;
  _narrativeQueue = [];
  done?.();
}
