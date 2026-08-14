import { computed, ref, reactive } from "vue";
import { defineStore } from "pinia";
import { useGameStateStore } from "@/stores/modules/gameState";
import { useGameSaveStore } from "@/stores";

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

export interface TaskCardEntry extends TaskCard {
  id: number;
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
  title: string;
  hint: string;
  buttonLabel: string;
  next: "title" | null;
  checkpoint: string;
  profile: string;
  tags: string;
  risk: string;
}

export interface DevPlayerMotionConfig {
  movement_multiplier?: number;
  animation_multiplier?: number;
}

// ===== 内部状态（模块级，非响应式） =====

let _flavorTimer: number | null = null;
let _narrativeTimer: number | null = null;
let _narrativeQueue: NarrativeEntry[] = [];
let _narrativeIndex = 0;
let _narrativeOnComplete: (() => void) | null = null;
let _taskId = 0;
let _testTaskIndex = 0;
const DEV_PLAYER_TUNING_DEFAULT = 1;
const DEV_PLAYER_TUNING_MIN = 0.25;
const DEV_PLAYER_TUNING_MAX = 3;

function clampDevPlayerTuning(value: number): number {
  return Math.min(DEV_PLAYER_TUNING_MAX, Math.max(DEV_PLAYER_TUNING_MIN, value));
}

function normalizedDevPlayerTuning(value: unknown, fallback = DEV_PLAYER_TUNING_DEFAULT): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clampDevPlayerTuning(numeric) : fallback;
}

// ===== 覆盖层场景类型（全屏流程组件，同一时刻只显示一个） =====

export type SceneOverlay = "Scene1Overlay" | "Scene2Overlay" | "Scene3Overlay" | null;

// ===== Pinia Store（Setup Store 风格） =====

export const useHudStore = defineStore("hud", () => {
  const gameState = useGameStateStore();
  const gameSave = useGameSaveStore();

  // --- overlay scene (intro video / future full-screen flows) ---
  const overlay = ref<SceneOverlay>(null);

  // --- title sub panels ---
  const title = reactive({ loadOpen: false, settingsOpen: false });

  // --- developer player tuning ---
  const devPlayerTuning = reactive({
    movementMultiplier: DEV_PLAYER_TUNING_DEFAULT,
    animationMultiplier: DEV_PLAYER_TUNING_DEFAULT,
  });

  // --- task card ---
  const taskCards = ref<TaskCardEntry[]>([]);
  const taskCenterId = ref<number | null>(null);
  const taskWindowStart = ref(0);
  const taskCenter = computed(() => taskCenterId.value !== null);
  const visibleTaskCards = computed(() =>
    taskCards.value.slice(taskWindowStart.value, taskWindowStart.value + 3),
  );
  const taskWindowCount = computed(() => Math.max(1, taskCards.value.length - 2));

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

  function resetDevPlayerTuning() {
    devPlayerTuning.movementMultiplier = DEV_PLAYER_TUNING_DEFAULT;
    devPlayerTuning.animationMultiplier = DEV_PLAYER_TUNING_DEFAULT;
  }

  function applyDevPlayerMotionFromJson(config?: DevPlayerMotionConfig) {
    devPlayerTuning.movementMultiplier = normalizedDevPlayerTuning(config?.movement_multiplier);
    devPlayerTuning.animationMultiplier = normalizedDevPlayerTuning(config?.animation_multiplier);
  }

  function devPlayerMotionJson(): DevPlayerMotionConfig {
    return {
      movement_multiplier: normalizedDevPlayerTuning(devPlayerTuning.movementMultiplier),
      animation_multiplier: normalizedDevPlayerTuning(devPlayerTuning.animationMultiplier),
    };
  }

  // ===== 内部函数 =====

  function _renderCurrentEntry() {
    const entry = _narrativeQueue[_narrativeIndex];
    if (!entry) {
      _finishNarrative();
      return;
    }
    const cps = Math.max(4, Math.round((entry.cps || 14) * gameSave.getTextSpeedMult()));
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
    gameState.state.inNarrative = false;
    gameState.state.playerLocked = false;
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
    gameState.state.inNarrative = true;
    gameState.state.playerLocked = true;
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
    gameState.state.inNarrative = false;
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

  // --- 任务卡片（两段式：居中强制确认 → 右上角待办） ---
  function showTask(task: TaskCard, centerWhenEmpty = true) {
    const shouldCenter = centerWhenEmpty && taskCards.value.length === 0;
    const entry = { ...task, id: ++_taskId };
    taskCards.value.unshift(entry);
    taskWindowStart.value = 0;
    gameState.state.taskOpen = true;
    if (shouldCenter) {
      gameState.state.taskPreviousLock = gameState.state.playerLocked;
      gameState.state.playerLocked = true;
      taskCenterId.value = entry.id;
    }
  }

  function closeTask() {
    if (!gameState.state.taskOpen) return;
    // 第一段：居中 → 缩到右上角
    if (taskCenterId.value !== null) {
      taskCenterId.value = null;
      gameState.state.playerLocked = ["explore", "leave_walk"].includes(gameState.state.mode)
        ? false
        : gameState.state.taskPreviousLock;
      return;
    }
    // 第二段：右上角 → 彻底关闭
    taskCards.value.splice(taskWindowStart.value, 1);
    taskWindowStart.value = Math.min(
      taskWindowStart.value,
      Math.max(0, taskCards.value.length - 3),
    );
    gameState.state.taskOpen = taskCards.value.length > 0;
  }

  function hideTask() {
    gameState.state.taskOpen = false;
    taskCards.value = [];
    taskCenterId.value = null;
    taskWindowStart.value = 0;
  }

  function taskNeedsConfirmation(): boolean {
    return taskCenterId.value !== null;
  }

  function showNewerTasks() {
    taskWindowStart.value = Math.max(0, taskWindowStart.value - 1);
  }

  function showOlderTasks() {
    taskWindowStart.value = Math.min(
      Math.max(0, taskCards.value.length - 3),
      taskWindowStart.value + 1,
    );
  }

  function addTestTask() {
    _testTaskIndex += 1;
    showTask({
      title: `测试任务 ${_testTaskIndex}`,
      detail: "仅用于查看任务堆叠与切换效果，不会写入 JSON。",
    }, false);
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
  function showEndPanel(
    save: {
      checkpointLabel: string;
      checkpoint: string;
      profile: Record<string, number>;
      choiceTag: string | null;
      fixed: string[];
      risk: { identity: number; execution: number; coordination: number };
    },
    endMeta?: {
      title?: string;
      hint?: string;
      buttonLabel?: string;
      next?: "title" | null;
    },
  ) {
    endPanel.value = {
      title: endMeta?.title ?? "序章·名字留在纸上｜完成",
      hint: endMeta?.hint ?? "第一章·陈继南家中醒来",
      buttonLabel: endMeta?.buttonLabel ?? "进入第一章",
      next: endMeta?.next ?? null,
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
    taskCards,
    devPlayerTuning,
    taskCenter,
    taskCenterId,
    taskWindowStart,
    taskWindowCount,
    visibleTaskCards,
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
    resetDevPlayerTuning,
    applyDevPlayerMotionFromJson,
    devPlayerMotionJson,
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
    taskNeedsConfirmation,
    showNewerTasks,
    showOlderTasks,
    addTestTask,
    showPrompt,
    hidePrompt,
    fadeToBlack,
    clearFade,
    togglePause,
    showOverlay,
    hideOverlay,
    hideIntro,
    showEndPanel,
    hideEndPanel
  };
});
