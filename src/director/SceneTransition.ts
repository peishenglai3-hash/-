import type { TransitionEntry, TransitionCue } from "@/types/director";
import { hud } from "@/common/store";
import { nextTick } from "vue";

interface SceneTransitionOptions {
	audio: {
		playCue: (id: string) => void;
		start: () => void;
		stop: () => void;
	} | null;
	entries: TransitionEntry[];
	cues: TransitionCue[];
	revealEntryId: string | null;
	revealImageSrc: string | null;
	onComplete: (() => void) | null;
}

export class SceneTransitionController {
	audio: SceneTransitionOptions["audio"];
	entries: TransitionEntry[];
	cues: TransitionCue[];
	revealEntryId: string | null;
	revealImageSrc: string | null;
	onComplete: (() => void) | null;
	timers = new Set<number>();
	index = 0;
	active = false;

	constructor({
		audio,
		entries,
		cues,
		revealEntryId,
		revealImageSrc,
		onComplete,
	}: SceneTransitionOptions) {
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
		hud.transition.subtitleStyle = entry.style || "cue";
		hud.transition.kindText =
			entry.kind === "cue"
				? "环境声"
				: entry.style === "date"
					? ""
					: entry.style === "thought"
						? "心理描写"
						: entry.style === "dialogue"
							? entry.speaker_name || "家人"
							: "旁白";
		hud.transition.text = entry.text;
		hud.transition.subtitleVisible = true;
		hud.transition.dateVisible = false;
		if (entry.style === "date") {
			hud.transition.subtitleVisible = false;
			hud.transition.dateText = entry.text;
			hud.transition.dateVisible = true;
		}
	}

	async _showReveal() {
		if (this.revealImageSrc) hud.transition.revealSrc = this.revealImageSrc;
		hud.transition.revealShown = true;
		await nextTick();
		hud.transition.revealFadeIn = true;
	}

	_next() {
		if (!this.active) return;
		const entry = this.entries[this.index++];
		if (!entry) {
			hud.transition.active = false;
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
		hud.transition.active = true;
		hud.transition.revealShown = false;
		hud.transition.revealFadeIn = false;
		hud.transition.kindText = "";
		hud.transition.text = "";
		hud.transition.subtitleVisible = true;
		hud.transition.dateVisible = false;
		this.audio?.start();
		this._next();
	}

	cancel() {
		this._clearTimers();
		this.audio?.stop();
		this.active = false;
	}
}
