import Phaser from 'phaser';
import '@/css/base.css';
import '@/css/hud.css';
import '@/css/transition.css';
import { Scene01 } from '@/scenes/Scene01/Scene01';
import { PrologueScene02 } from '@/scenes/Scene02/PrologueScene02';
import { state } from '@/common/state';
import { validateNarrative } from '@/scenes/Scene01/content';
import { GameDirector } from '@/director/GameDirector';
import type { DirectorDom } from '@/director/GameDirector';

validateNarrative();

const dom: DirectorDom = {
  intro: document.querySelector('#intro-panel'),
  video: document.querySelector('#intro-video'),
  start: document.querySelector('#start-button'),
  transition: document.querySelector('#scene-transition'),
  subtitle: document.querySelector('#transition-subtitle'),
  date: document.querySelector('#transition-date'),
  reveal: document.querySelector('#transition-reveal'),
  revealImage: document.querySelector('#transition-reveal-image')
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#171715',
  width: 1280,
  height: 720,
  dom: { createContainer: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
  scene: [Scene01, PrologueScene02]
});

const director = new GameDirector({ game, dom });
director.init();

(window as any).prologueState = state;
(window as any).prologueBgm = director.bgm;
export { game, state };
