import { ambience } from '@/common/ambience';
import { hideIntro } from '@/common/ui';

export interface StartSceneOptions {
  videoEl: HTMLVideoElement | null;
  buttonEl: HTMLButtonElement | null;
  bgm: HTMLAudioElement;
  transitionAudio: { prime: () => void };
}

export function setupStartScene({ videoEl, buttonEl, bgm, transitionAudio }: StartSceneOptions): void {
  let introStarted = false;

  const startIntro = () => {
    if (introStarted) return;
    introStarted = true;
    transitionAudio.prime();
    ambience.unlock();
    buttonEl!.textContent = '跳过开场视频';
    videoEl!.play().catch(() => {});
    videoEl!.onended = endIntro;
    buttonEl!.onclick = endIntro;
  };

  const endIntro = () => {
    hideIntro();
    bgm.play().catch(() => {});
    (window as any).scene01Game?.beginExplore();
  };

  buttonEl!.addEventListener('click', startIntro);
  videoEl!.addEventListener('click', startIntro);
}
