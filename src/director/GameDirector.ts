import type Phaser from 'phaser';
import type { TransitionConfig } from '@/types/director';
import { TransitionAudioController } from './TransitionAudio';
import { SceneTransitionController } from './SceneTransition';
import { SCENE_EXIT } from '@/scenes/Scene01/content';
import { state, type SaveData } from '@/common/state';
import { assetPath } from '@/common/paths';
import { showEndPanel } from '@/common/ui';
import { setupStartScene } from './flow/StartScene';
import { setupScene01ToScene02 } from './flow/Scene01ToScene02';
import { setupScene02ToSettlement } from './flow/Scene02ToSettlement';
import { setupDebugRoute } from './flow/DebugRoute';

export interface DirectorDom {
  intro: HTMLElement | null;
  video: HTMLVideoElement | null;
  start: HTMLButtonElement | null;
  transition: HTMLElement | null;
  subtitle: HTMLElement | null;
  date: HTMLElement | null;
  reveal: HTMLElement | null;
  revealImage: HTMLImageElement | null;
}

export interface DirectorOptions {
  game: Phaser.Game;
  dom: DirectorDom;
}

export class GameDirector {
  game: Phaser.Game;
  dom: DirectorDom;
  transitionAudio: TransitionAudioController;
  bgm: HTMLAudioElement;
  controller: SceneTransitionController | null = null;

  constructor({ game, dom }: DirectorOptions) {
    this.game = game;
    this.dom = dom;
    this.transitionAudio = new TransitionAudioController();
    this.bgm = new Audio(assetPath('/assets/audio/prologue_bgm.wav'));
    this.bgm.loop = true;
    this.bgm.volume = 0.35;
  }

  init(): void {
    setupStartScene(this);
    setupDebugRoute(this);
    setupScene01ToScene02(this);
    setupScene02ToSettlement(this);
  }

  /* ===== 通用 ===== */

  runTransition(config: TransitionConfig, onComplete: () => void): void {
    this.controller?.cancel();
    this.controller = new SceneTransitionController({
      root: this.dom.transition!,
      subtitle: this.dom.subtitle!,
      date: this.dom.date!,
      reveal: this.dom.reveal!,
      revealImage: this.dom.revealImage!,
      audio: this.transitionAudio,
      entries: config.entries,
      cues: config.cues,
      revealEntryId: config.revealEntryId,
      revealImageSrc: config.revealImage,
      onComplete
    });
    this.controller.start();
  }

  /* ===== 序章结算 ===== */

  finishPrologue(): void {
    const save: SaveData = {
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
}
