import type { TransitionEntry, TransitionCue } from '@/types/director';

interface SceneTransitionOptions {
  root: HTMLElement;
  subtitle: HTMLElement;
  date: HTMLElement;
  reveal: HTMLElement;
  revealImage: HTMLImageElement;
  audio: { playCue: (id: string) => void; start: () => void; stop: () => void } | null;
  entries: TransitionEntry[];
  cues: TransitionCue[];
  revealEntryId: string | null;
  revealImageSrc: string | null;
  onComplete: (() => void) | null;
}

export class SceneTransitionController {
  root: HTMLElement;
  subtitle: HTMLElement;
  date: HTMLElement;
  reveal: HTMLElement;
  revealImage: HTMLImageElement;
  audio: SceneTransitionOptions['audio'];
  entries: TransitionEntry[];
  cues: TransitionCue[];
  revealEntryId: string | null;
  revealImageSrc: string | null;
  onComplete: (() => void) | null;
  timers = new Set<number>();
  index = 0;
  active = false;

  constructor({ root, subtitle, date, reveal, revealImage, audio, entries, cues, revealEntryId, revealImageSrc, onComplete }: SceneTransitionOptions) {
    this.root = root;
    this.subtitle = subtitle;
    this.date = date;
    this.reveal = reveal;
    this.revealImage = revealImage;
    this.audio = audio;
    this.entries = entries;
    this.cues = cues;
    this.revealEntryId = revealEntryId;
    this.revealImageSrc = revealImageSrc;
    this.onComplete = onComplete;
  }

  _timer(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
  }

  _clearTimers() {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
  }

  _cue(entryId: string) {
    for (const cue of this.cues) {
      if (cue.at_entry === entryId) this.audio?.playCue(cue.cue_id);
    }
  }

  _render(entry: TransitionEntry) {
    this.subtitle.className = `transition-subtitle ${entry.style || 'cue'}`;
    this.subtitle.querySelector('[data-transition-kind]')!.textContent =
      entry.kind === 'cue' ? '环境声' :
      entry.style === 'date' ? '' :
      entry.style === 'thought' ? '心理描写' :
      entry.style === 'dialogue' ? entry.speaker_name || '家人' : '旁白';
    this.subtitle.querySelector('[data-transition-text]')!.textContent = entry.text;
    this.subtitle.classList.remove('hidden');
    this.date.classList.add('hidden');
    if (entry.style === 'date') {
      this.subtitle.classList.add('hidden');
      this.date.textContent = entry.text;
      this.date.classList.remove('hidden');
    }
  }

  _showReveal() {
    if (this.revealImageSrc) this.revealImage.src = this.revealImageSrc;
    this.reveal.classList.remove('hidden');
    requestAnimationFrame(() => this.reveal.classList.add('visible'));
  }

  _next() {
    if (!this.active) return;
    const entry = this.entries[this.index++];
    if (!entry) {
      this.audio?.stop();
      this.active = false;
      this.onComplete?.();
      return;
    }
    this._cue(entry.entry_id);
    if (this.revealEntryId && entry.entry_id === this.revealEntryId) {
      this._showReveal();
      this._timer(() => {
        this._render(entry);
        this._timer(() => this._next(), entry.duration_ms);
      }, 820);
      return;
    }
    this._render(entry);
    this._timer(() => this._next(), entry.duration_ms);
  }

  start() {
    this.cancel();
    this.active = true;
    this.index = 0;
    this.root.classList.remove('hidden');
    this.root.classList.add('active');
    this.reveal.classList.remove('visible');
    this.reveal.classList.add('hidden');
    this.subtitle.querySelector('[data-transition-kind]')!.textContent = '';
    this.subtitle.querySelector('[data-transition-text]')!.textContent = '';
    this.date.classList.add('hidden');
    this.audio?.start();
    this._next();
  }

  cancel() {
    this._clearTimers();
    this.audio?.stop();
    this.active = false;
  }
}
