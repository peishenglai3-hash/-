import { createApp } from 'vue';
import Phaser from 'phaser';
import App from './App.vue';
import '@/css/base.css';
import { Scene01 } from '@/scenes/Scene01/Scene01';
import { PrologueScene02 } from '@/scenes/Scene02/PrologueScene02';
import { state } from '@/common/state';
import { validateNarrative } from '@/scenes/Scene01/content';
import { GameDirector } from '@/director/GameDirector';
import type { DirectorDom } from '@/director/GameDirector';

validateNarrative();

// 1. 初始化 Vue — 接管 #app 区域
const app = createApp(App);
app.mount('#app');

// 2. Vue 渲染后，通过 id 获取 DOM 引用（用于 GameDirector）
//    注意：这些元素由 Vue IntroPanel 渲染，但 GameDirector 需要原始 DOM 引用
function getDom(): DirectorDom {
  return {
    intro: document.querySelector('.intro-panel'),
    video: document.querySelector('#intro-video') as HTMLVideoElement | null,
    start: document.querySelector('#start-button') as HTMLButtonElement | null,
    transition: document.querySelector('.scene-transition'),
    subtitle: document.querySelector('.transition-subtitle'),
    date: document.querySelector('.transition-date'),
    reveal: document.querySelector('.transition-reveal'),
    revealImage: document.querySelector('[data-transition-reveal-image]') as HTMLImageElement | null,
  };
}

// 3. 初始化 Phaser
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#171715',
  width: 1280,
  height: 720,
  dom: { createContainer: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
  loader: { baseURL: import.meta.env.BASE_URL },
  scene: [Scene01, PrologueScene02]
});

const dom = getDom();
const director = new GameDirector({ game, dom });
director.init();

(window as any).prologueState = state;
(window as any).prologueBgm = director.bgm;
export { game, state };
