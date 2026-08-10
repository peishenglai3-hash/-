import Phaser from 'phaser';
import './style.css';
import { Scene01 } from './Scene01.js';
import { PrologueScene02 } from './PrologueScene02.js';
import { state } from './state.js';
import { ambience } from './ambience.js';
import { TransitionAudioController } from './transition-audio.js';
import { SceneTransitionController } from './scene-transition.js';
import { TRANSITION_A, TRANSITION_B } from './transition-content.js';
import { SCENE_EXIT, validateNarrative } from './content01.js';
import { hideIntro, showEndPanel, clearFade } from './ui.js';

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

game.events.on('prologue:scene01-complete', () => {
  runTransition(TRANSITION_A, () => {
    dom.transition.classList.remove('active');
    clearFade();
    game.scene.stop('Scene01');
    state.mode = 'intro';
    state.playerLocked = true;
    state.taskOpen = false;
    state.paused = false;
    state.narrativeQueue = [];
    state.narrativeIndex = 0;
    state.inNarrative = false;
    ambience.unlock();
    ambience.startRoom();
    game.scene.start('PrologueScene02');
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
  showEndPanel(save);
}

dom.start.addEventListener('click', startIntro);
dom.video.addEventListener('click', startIntro);

if (new URLSearchParams(window.location.search).get('scene') === '02') {
  game.events.once(Phaser.Core.Events.READY, () => {
    hideIntro();
    game.scene.stop('Scene01');
    state.mode = 'intro';
    ambience.unlock();
    ambience.startRoom();
    game.scene.start('PrologueScene02');
  });
}

window.prologueState = state;
window.prologueBgm = bgm;
export { game, state };
