import { reactive } from 'vue';
import { state } from '@/common/state';

// ===== HUD Store — Phaser Scene 写数据，Vue 组件自动渲染 =====

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

let _flavorTimer: number | null = null;
let _narrativeTimer: number | null = null;

export const hud = reactive({
  // --- intro video ---
  introVisible: true,

  // --- task card ---
  taskCard: null as TaskCard | null,

  // --- interaction prompt ---
  prompt: '',

  // --- dialogue ---
  dialogue: {
    visible: false,
    style: 'narration',
    speaker: '',
    avatarSrc: '',
    fullText: '',
    displayedText: '',
    cps: 14,
    typing: false,
    hint: 'Space 继续',
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
  flavorToast: '',

  // --- end panel ---
  endPanel: null as EndPanel | null,

  // --- global lock (allows Vue components to also set) ---
  playerLocked: false,
});

// ===== 内部状态（非 reactive，避免不必要的渲染） =====
let _narrativeQueue: NarrativeEntry[] = [];
let _narrativeIndex = 0;
let _narrativeOnComplete: (() => void) | null = null;

// ===== 导出函数：Phaser Scene 调用的命令式 API =====

// --- 风味气泡 ---
export function showFlavor(text: string) {
  hud.flavorToast = text;
  if (_flavorTimer) window.clearTimeout(_flavorTimer);
  _flavorTimer = window.setTimeout(() => { hud.flavorToast = ''; }, 2600);
}

// --- 叙事链 ---
export function playNarrative(entries: NarrativeEntry[], onComplete?: () => void) {
  _narrativeQueue = entries;
  _narrativeIndex = 0;
  _narrativeOnComplete = onComplete ?? null;
  hud.dialogue.visible = true;
  hud.playerLocked = true;
  state.inNarrative = true;
  state.playerLocked = true;
  _renderCurrentEntry();
}

function _renderCurrentEntry() {
  const entry = _narrativeQueue[_narrativeIndex];
  if (!entry) {
    _finishNarrative();
    return;
  }
  hud.dialogue.visible = true;
  hud.dialogue.style = entry.style || 'narration';
  hud.dialogue.speaker = entry.speaker_name || '';
  hud.dialogue.avatarSrc = entry.avatar_id || '';
  hud.dialogue.fullText = entry.text;
  hud.dialogue.displayedText = '';
  hud.dialogue.cps = entry.cps || 14;
  hud.dialogue.typing = true;
  hud.dialogue.hint = 'Space 继续';

  // 打字动画
  if (_narrativeTimer) window.clearInterval(_narrativeTimer);
  const chars = [...entry.text];
  let cursor = 0;
  _narrativeTimer = window.setInterval(() => {
    hud.dialogue.displayedText = chars.slice(0, ++cursor).join('');
    if (cursor >= chars.length) {
      window.clearInterval(_narrativeTimer!);
      _narrativeTimer = null;
      hud.dialogue.typing = false;
    }
  }, Math.max(20, 1000 / (entry.cps || 14)));
}

function _finishNarrative() {
  hud.dialogue.visible = false;
  hud.dialogue.typing = false;
  if (_narrativeTimer) window.clearInterval(_narrativeTimer);
  _narrativeTimer = null;
  hud.playerLocked = false;
  state.inNarrative = false;
  state.playerLocked = false;
  const done = _narrativeOnComplete;
  _narrativeOnComplete = null;
  _narrativeQueue = [];
  done?.();
}

export function advanceNarrative() {
  if (!hud.dialogue.visible) return;
  if (hud.dialogue.typing) {
    // 跳过打字
    if (_narrativeTimer) window.clearInterval(_narrativeTimer);
    _narrativeTimer = null;
    hud.dialogue.typing = false;
    hud.dialogue.displayedText = hud.dialogue.fullText;
    return;
  }
  _narrativeIndex += 1;
  _renderCurrentEntry();
}

export function hideDialogue() {
  hud.dialogue.visible = false;
  hud.dialogue.typing = false;
  if (_narrativeTimer) window.clearInterval(_narrativeTimer);
  _narrativeTimer = null;
  _narrativeQueue = [];
  _narrativeOnComplete = null;
  state.inNarrative = false;
}

// --- 物品面板 ---
export function showItem(item: { icon: string; title: string; text: string }) {
  hud.itemPanel = { ...item, closable: true };
  hud.playerLocked = true;
}

export function showItemPassive(item: { icon: string; title: string; text: string }) {
  hud.itemPanel = { ...item, closable: false };
}

export function closeItem() {
  hud.itemPanel = null;
  hud.playerLocked = false;
}

export function hideItem() {
  hud.itemPanel = null;
}

export function itemPanelOpen(): boolean {
  return hud.itemPanel !== null;
}

// --- 选择面板 ---
export function showChoices(items: ChoiceItem[], onChoose: (id: string) => void) {
  hud.choicePanel = { title: '走访结束前，最后确认什么？', items, onChoose };
}

export function hideChoices() {
  hud.choicePanel = null;
}

// --- 结果面板 ---
export function showResult(choice: { image: string; result: [string, string] }) {
  hud.resultPanel = choice;
  hud.resultPanelVisible = true;
}

export function hideResult() {
  hud.resultPanelVisible = false;
  hud.resultPanel = null;
}

// --- 任务卡片 ---
export function showTask(task: TaskCard) {
  state.taskPreviousLock = state.playerLocked;
  state.taskOpen = true;
  state.playerLocked = true;
  hud.taskCard = task;
}

export function closeTask() {
  if (!state.taskOpen) return;
  state.taskOpen = false;
  hud.taskCard = null;
  state.playerLocked = state.taskPreviousLock;
}

export function hideTask() {
  state.taskOpen = false;
  hud.taskCard = null;
}

// --- 交互提示 ---
export function showPrompt(text: string) {
  hud.prompt = text;
}

// --- 淡入淡出 ---
export function fadeToBlack() {
  hud.sceneFade = true;
}

export function clearFade() {
  hud.sceneFade = false;
}

// --- 暂停 ---
export function togglePause() {
  hud.paused = !hud.paused;
}

// --- 开场 ---
export function hideIntro() {
  hud.introVisible = false;
}

// --- 结算 ---
export function showEndPanel(save: { checkpointLabel: string; checkpoint: string; profile: Record<string, number>; choiceTag: string | null; fixed: string[]; risk: { identity: number; execution: number; coordination: number } }) {
  hud.endPanel = {
    checkpoint: `固定回退点：${save.checkpointLabel}（${save.checkpoint}）`,
    profile: `画像累计 D${save.profile.D} C${save.profile.C} I${save.profile.I} G${save.profile.G} P${save.profile.P} A${save.profile.A}`,
    tags: `选择标签 ${save.choiceTag ?? '—'} ｜ 固定标签 ${save.fixed.join(' · ')}`,
    risk: `行动风险 身份${save.risk.identity} 执行${save.risk.execution} 协同${save.risk.coordination}`,
  };
}
