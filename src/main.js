import Phaser from 'phaser';
import './style.css';
import { Scene01 } from './Scene01.js';
import { PrologueScene02 } from './PrologueScene02.js';
import { state } from './state.js';
import { ambience } from './ambience.js';
import { TransitionAudioController } from './transition-audio.js';
import { SceneTransitionController } from './scene-transition.js';
import { TRANSITION_A, TRANSITION_B } from './transition-content.js';
import { CHOICES, PROFILE_DELTAS, SCENE_EXIT, validateNarrative } from './content01.js';
import {
  hideIntro, showEndPanel, clearFade, hideTask, hideItem,
  hideDialogue, hideChoices, hideResult, showPrompt
} from './ui.js';
import { installDevEditorToggle } from './zone-editor.js';

validateNarrative();

const dom = {
  intro: document.querySelector('#intro-panel'),
  video: document.querySelector('#intro-video'),
  start: document.querySelector('#start-button'),
  transition: document.querySelector('#scene-transition'),
  subtitle: document.querySelector('#transition-subtitle'),
  date: document.querySelector('#transition-date'),
  reveal: document.querySelector('#transition-reveal'),
  revealImage: document.querySelector('#transition-reveal-image')
};

const transitionAudio = new TransitionAudioController();

const bgm = new Audio('/assets/audio/prologue_bgm.wav');
bgm.loop = true;
bgm.volume = 0.35;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#171715',
  width: 1280,
  height: 720,
  dom: { createContainer: true },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
  scene: [Scene01, PrologueScene02]
});

installDevEditorToggle(game);

let introStarted = false;
function startIntro() {
  if (introStarted) return;
  introStarted = true;
  transitionAudio.prime();
  ambience.unlock();
  dom.start.textContent = '跳过开场视频';
  dom.video.play().catch(() => {});
  dom.video.onended = endIntro;
  dom.start.onclick = endIntro;
}

function endIntro() {
  hideIntro();
  bgm.play().catch(() => {});
  window.scene01Game?.beginExplore();
}

let controller = null;
function runTransition(config, onComplete) {
  controller?.cancel();
  controller = new SceneTransitionController({
    root: dom.transition,
    subtitle: dom.subtitle,
    date: dom.date,
    reveal: dom.reveal,
    revealImage: dom.revealImage,
    audio: transitionAudio,
    entries: config.entries,
    cues: config.cues,
    revealEntryId: config.revealEntryId,
    revealImageSrc: config.revealImage,
    onComplete
  });
  controller.start();
}

function clearStoryUi() {
  hideTask();
  hideItem();
  hideDialogue();
  hideChoices();
  hideResult();
  showPrompt('');
}

function enterScene02() {
  controller?.cancel();
  hideIntro();
  clearStoryUi();
  dom.transition.classList.remove('active');
  dom.transition.classList.add('hidden');
  dom.reveal.classList.remove('visible');
  dom.reveal.classList.add('hidden');
  clearFade();
  game.scene.stop('Scene01');
  state.mode = 'intro';
  state.playerLocked = true;
  state.taskOpen = false;
  state.paused = false;
  state.audioReviewed = false;
  state.questionWritten = false;
  state.sleepStarted = false;
  state.narrativeQueue = [];
  state.narrativeIndex = 0;
  state.inNarrative = false;
  ambience.unlock();
  ambience.startRoom();
  game.scene.start('PrologueScene02');
}

function randomizePrologueChoice() {
  const choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
  state.choice = choice;
  for (const axis of Object.keys(state.profile)) state.profile[axis] = 0;
  for (const [axis, delta] of Object.entries(PROFILE_DELTAS[choice.id] ?? {})) state.profile[axis] = delta;
  for (const candidate of CHOICES) state.flags.delete(candidate.flag);
  state.flags.add(choice.flag);
  return choice;
}

game.events.on('prologue:scene01-complete', () => {
  runTransition(TRANSITION_A, () => {
    enterScene02();
  });
});

game.events.on('prologue:sleep-complete', () => {
  runTransition(TRANSITION_B, () => {
    finishPrologue();
  });
});

function finishPrologue() {
  const save = {
    checkpoint: SCENE_EXIT.nextSceneCanonical,
    checkpointLabel: '1927年，陈继南家中醒来',
    profile: state.profile,
    choice: state.choice?.id ?? null,
    choiceTag: state.choice?.flag ?? null,
    echo: state.choice?.echo_summary ?? null,
    tags: [...state.flags],
    fixed: ['PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT'],
    risk: { identity: 0, execution: 0, coordination: 0 },
    exit: SCENE_EXIT
  };
  try {
    window.localStorage.setItem('redcode.prologue.flags', JSON.stringify([...state.flags]));
    window.localStorage.setItem('redcode.prologue.save', JSON.stringify(save));
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent('prologue:scene-exit', { detail: structuredClone(save) }));
  controller?.cancel();
  hideIntro();
  dom.transition.classList.remove('hidden');
  dom.transition.classList.add('active');
  dom.subtitle.classList.add('hidden');
  dom.date.classList.add('hidden');
  dom.revealImage.src = TRANSITION_B.revealImage;
  dom.reveal.classList.remove('hidden');
  dom.reveal.classList.add('visible');
  game.scene.stop('Scene01');
  game.scene.stop('PrologueScene02');
  window.honghuActiveScene = SCENE_EXIT.nextSceneCanonical;
  showEndPanel(save);
}

window.addEventListener('honghu:dev-next-chapter', (event) => {
  const sceneKey = event.detail?.sceneKey ?? game.scene.getScenes(true).find((scene) => scene.zoneEditor)?.scene.key;
  if (sceneKey === 'Scene01') {
    randomizePrologueChoice();
    state.flags.add('FLAG_PRO_Q01_COMPLETED');
    for (const flag of ['FLAG_PRO02_AUDIO_REVIEWED', 'FLAG_PRO02_QUESTION_WRITTEN', 'PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT']) state.flags.delete(flag);
    enterScene02();
    return;
  }

  if (!state.choice) randomizePrologueChoice();
  for (const flag of ['FLAG_PRO_Q01_COMPLETED', 'FLAG_PRO02_AUDIO_REVIEWED', 'FLAG_PRO02_QUESTION_WRITTEN', 'PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT']) state.flags.add(flag);
  state.audioReviewed = true;
  state.questionWritten = true;
  state.playerLocked = true;
  state.mode = 'transition';
  clearStoryUi();
  runTransition(TRANSITION_B, finishPrologue);
});
dom.start.addEventListener('click', startIntro);
dom.video.addEventListener('click', startIntro);

if (new URLSearchParams(window.location.search).get('scene') === '02') {
  game.events.once(Phaser.Core.Events.READY, () => {
    enterScene02();
  });
}

window.prologueState = state;
window.prologueBgm = bgm;
export { game, state };
