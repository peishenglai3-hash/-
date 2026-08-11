import type { GameDirector } from '../GameDirector';
import { ambience } from '@/common/ambience';
import { hideIntro } from '@/common/ui';

export function setupStartScene(director: GameDirector): void {
  let introStarted = false;

  const startIntro = () => {
    if (introStarted) return;
    introStarted = true;
    director.transitionAudio.prime();
    ambience.unlock();
    director.dom.start!.textContent = '跳过开场视频';
    director.dom.video!.play().catch(() => {});
    director.dom.video!.onended = endIntro;
    director.dom.start!.onclick = endIntro;
  };

  const endIntro = () => {
    hideIntro();
    director.bgm.play().catch(() => {});
    (window as any).scene01Game?.beginExplore();
  };

  director.dom.start!.addEventListener('click', startIntro);
  director.dom.video!.addEventListener('click', startIntro);
}
