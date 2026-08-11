import { state } from '@/common/state';
import { ambience } from '@/common/ambience';
import type { SaveData } from '@/common/state';

const dom = {
  task: document.querySelector('#task-card')!,
  prompt: document.querySelector('#interaction-prompt')!,
  dialogue: document.querySelector('#dialogue-panel')!,
  avatar: document.querySelector('#dialogue-avatar') as HTMLImageElement,
  avatarWrap: document.querySelector('#dialogue-avatar-wrap')!,
  speaker: document.querySelector('#dialogue-speaker')!,
  text: document.querySelector('#dialogue-text')!,
  hint: document.querySelector('#dialogue-hint')!,
  item: document.querySelector('#item-panel')!,
  choices: document.querySelector('#choice-panel')!,
  result: document.querySelector('#result-panel')!,
  fade: document.querySelector('#scene-fade')!,
  intro: document.querySelector('#intro-panel')!,
  video: document.querySelector('#intro-video') as HTMLVideoElement,
  start: document.querySelector('#start-button')!,
  pause: document.querySelector('#pause-panel')!,
  flavor: document.querySelector('#flavor-toast')!,
  end: document.querySelector('#end-panel')!,
  endCheckpoint: document.querySelector('#end-checkpoint')!,
  endProfile: document.querySelector('#end-profile')!,
  endTags: document.querySelector('#end-tags')!,
  endRisk: document.querySelector('#end-risk')!
};

let flavorTimer: number | null = null;

export function showFlavor(text: string) {
  dom.flavor.textContent = text;
  dom.flavor.classList.add('show');
  if (flavorTimer) window.clearTimeout(flavorTimer);
  flavorTimer = window.setTimeout(() => dom.flavor.classList.remove('show'), 2600);
}

export function showTask(task: { title: string; detail: string }) {
  state.taskPreviousLock = state.playerLocked;
  state.taskOpen = true;
  state.playerLocked = true;
  dom.task.innerHTML = `<strong>${task.title}</strong><span>${task.detail}</span><span class="task-dismiss"><kbd>E</kbd><em>关闭任务</em></span>`;
  dom.task.classList.remove('hidden');
}

export function closeTask() {
  if (!state.taskOpen) return;
  state.taskOpen = false;
  dom.task.classList.add('hidden');
  state.playerLocked = state.taskPreviousLock;
}

export function hideTask() {
  state.taskOpen = false;
  dom.task.classList.add('hidden');
}

export function showPrompt(text: string) {
  dom.prompt.textContent = text;
  dom.prompt.classList.toggle('hidden', !text);
}

export function hideDialogue() {
  dom.dialogue.classList.add('hidden');
  if (state.typingTimer) window.clearInterval(state.typingTimer);
  state.typingTimer = null;
  state.typing = false;
  state.inNarrative = false;
}

export function playNarrative(entries: any[], onComplete?: () => void) {
  state.narrativeQueue = entries;
  state.narrativeIndex = 0;
  state.onNarrativeComplete = onComplete ?? null;
  state.playerLocked = true;
  state.inNarrative = true;
  renderNarrativeEntry();
}

function renderNarrativeEntry() {
  const entry = state.narrativeQueue[state.narrativeIndex];
  if (!entry) {
    hideDialogue();
    state.playerLocked = false;
    const done = state.onNarrativeComplete;
    state.onNarrativeComplete = null;
    done?.();
    return;
  }
  dom.dialogue.className = `dialogue-panel ${entry.style}`;
  dom.dialogue.classList.remove('hidden');
  dom.avatarWrap.classList.toggle('hidden', !entry.avatar_id);
  dom.avatar.classList.toggle('hidden', !entry.avatar_id);
  if (entry.avatar_id) dom.avatar.src = `/assets/characters/${entry.avatar_id}/avatar.png`;
  dom.speaker.textContent = entry.speaker_name || '';
  dom.text.textContent = '';
  dom.hint.textContent = 'Space 继续';
  if (entry.sfx) ambience.play(entry.sfx);
  state.typing = true;
  const chars = [...entry.text] as string[];
  let cursor = 0;
  state.typingTimer = window.setInterval(() => {
    dom.text.textContent = chars.slice(0, ++cursor).join('');
    if (cursor >= chars.length) {
      window.clearInterval(state.typingTimer!);
      state.typingTimer = null;
      state.typing = false;
    }
  }, Math.max(20, 1000 / (entry.cps || 14)));
}

export function advanceNarrative() {
  if (!state.inNarrative) return;
  if (state.typing) {
    const entry = state.narrativeQueue[state.narrativeIndex];
    if (state.typingTimer) window.clearInterval(state.typingTimer);
    state.typingTimer = null;
    state.typing = false;
    dom.text.textContent = entry.text;
    return;
  }
  state.narrativeIndex += 1;
  renderNarrativeEntry();
}

export function showItem({ icon, title, text }: { icon: string; title: string; text: string }) {
  dom.item.innerHTML = `<img src="${icon}" alt="${title}"/><div><strong>${title}</strong><span>${text}</span></div><button><kbd>E</kbd> 关闭</button>`;
  dom.item.classList.remove('hidden');
  state.playerLocked = true;
  dom.item.querySelector('button')!.onclick = closeItem;
}

export function closeItem() {
  dom.item.classList.add('hidden');
  state.playerLocked = false;
}

export function showItemPassive({ icon, title, text }: { icon: string; title: string; text: string }) {
  dom.item.innerHTML = `<img src="${icon}" alt="${title}"/><div><strong>${title}</strong><span>${text}</span></div>`;
  dom.item.classList.remove('hidden');
}

export function hideItem() {
  dom.item.classList.add('hidden');
}

export function itemPanelOpen() {
  return !dom.item.classList.contains('hidden');
}

export function showChoices(choices: { id: string; label: string; detail: string }[], onChoose: (id: string) => void) {
  dom.choices.innerHTML = `<div class="choice-title">走访结束前，最后确认什么？</div>${choices.map((choice) => `<button class="choice" data-choice="${choice.id}"><b>[${choice.id.slice(-1)}]</b><span><strong>${choice.label}</strong><small>${choice.detail}</small></span></button>`).join('')}`;
  dom.choices.classList.remove('hidden');
  dom.choices.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => onChoose((button as HTMLElement).dataset.choice!)));
}

export function hideChoices() {
  dom.choices.classList.add('hidden');
}

export function showResult(choice: { label: string; image: string; result: [string, string] }) {
  dom.result.innerHTML = `<img src="${choice.image}" alt="${choice.label}"/><div class="result-copy"><span>…${choice.result[0]}</span><span>${choice.result[1]}</span><small>Space 继续</small></div>`;
  dom.result.classList.remove('hidden');
}

export function hideResult() {
  dom.result.classList.add('hidden');
}

export function togglePause() {
  if (!state.paused && state.mode !== 'explore') return;
  state.paused = !state.paused;
  dom.pause.classList.toggle('hidden', !state.paused);
}

export function fadeToBlack() {
  dom.fade.classList.add('active');
}

export function clearFade() {
  dom.fade.classList.remove('active');
}

export function hideIntro() {
  dom.intro.classList.add('hidden');
  dom.video.pause();
}

export function showEndPanel(save: SaveData) {
  dom.endCheckpoint.textContent = `固定回退点：${save.checkpointLabel}（${save.checkpoint}）`;
  dom.endProfile.textContent = `画像累计 D${save.profile.D} C${save.profile.C} I${save.profile.I} G${save.profile.G} P${save.profile.P} A${save.profile.A}`;
  dom.endTags.textContent = `选择标签 ${save.choiceTag ?? '—'} ｜ 固定标签 ${save.fixed.join(' · ')}`;
  dom.endRisk.textContent = `行动风险 身份${save.risk.identity} 执行${save.risk.execution} 协同${save.risk.coordination}`;
  dom.end.classList.remove('hidden');
}

export { dom };
