class Ambience {
	ctx: AudioContext | null = null;
	master: GainNode | null = null;
	roomOn = false;
	tapeOn = false;
	cricketTimer: number | null = null;
	crackleTimer: number | null = null;
	fan: {
		source: AudioBufferSourceNode;
		filter: BiquadFilterNode;
		gain: GainNode;
	} | null = null;
	hum: OscillatorNode | null = null;
	tape: {
		source: AudioBufferSourceNode;
		filter: BiquadFilterNode;
		gain: GainNode;
	} | null = null;
	tapeWind: {
		source: AudioBufferSourceNode;
		filter: BiquadFilterNode;
		gain: GainNode;
	} | null = null;
	private _noise: AudioBuffer | null = null;

	unlock() {
		if (!this.ctx) {
			const Ctx =
				(window as any).AudioContext ||
				(window as any).webkitAudioContext;
			if (!Ctx) return;
			const ctx = new Ctx();
			this.ctx = ctx;
			const master = ctx.createGain();
			this.master = master;
			master.gain.value = 0.9;
			master.connect(ctx.destination);
		}
		if (this.ctx!.state === "suspended") this.ctx!.resume();
	}

	noiseBuffer(): AudioBuffer {
		if (this._noise) return this._noise;
		const length = this.ctx!.sampleRate * 2;
		const buffer = this.ctx!.createBuffer(1, length, this.ctx!.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
		this._noise = buffer;
		return buffer;
	}

	loopNoise(
		filterType: BiquadFilterType,
		frequency: number,
		gainValue: number,
		q = 1,
	) {
		const source = this.ctx!.createBufferSource();
		source.buffer = this.noiseBuffer();
		source.loop = true;
		const filter = this.ctx!.createBiquadFilter();
		filter.type = filterType;
		filter.frequency.value = frequency;
		filter.Q.value = q;
		const gain = this.ctx!.createGain();
		gain.gain.value = gainValue;
		source.connect(filter).connect(gain).connect(this.master!);
		source.start();
		return { source, filter, gain };
	}

	startRoom() {
		if (!this.ctx || this.roomOn) return;
		this.roomOn = true;
		this.fan = this.loopNoise("lowpass", 170, 0.055, 0.8);
		const ctx = this.ctx;
		const hum = ctx.createOscillator();
		hum.type = "sine";
		hum.frequency.value = 49;
		const humGain = ctx.createGain();
		humGain.gain.value = 0.012;
		hum.connect(humGain).connect(this.master!);
		hum.start();
		this.hum = hum;
		const wobble = ctx.createOscillator();
		wobble.frequency.value = 0.31;
		const wobbleGain = ctx.createGain();
		wobbleGain.gain.value = 0.012;
		wobble.connect(wobbleGain).connect(this.fan!.gain.gain);
		wobble.start();
		this.cricketTimer = window.setInterval(() => {
			if (Math.random() < 0.62) this.chirp();
		}, 900);
	}

	chirp() {
		const t = this.ctx!.currentTime + Math.random() * 0.25;
		const pulses = 3 + Math.floor(Math.random() * 3);
		for (let p = 0; p < pulses; p += 1) {
			const osc = this.ctx!.createOscillator();
			const gain = this.ctx!.createGain();
			osc.type = "sine";
			osc.frequency.value = 4100 + Math.random() * 400;
			const t0 = t + p * 0.065;
			gain.gain.setValueAtTime(0.0001, t0);
			gain.gain.linearRampToValueAtTime(0.008, t0 + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
			osc.connect(gain).connect(this.master!);
			osc.start(t0);
			osc.stop(t0 + 0.07);
		}
	}

	startTape() {
		if (!this.ctx || this.tapeOn) return;
		this.tapeOn = true;
		this.tape = this.loopNoise("bandpass", 1100, 0.02, 0.6);
		this.tapeWind = this.loopNoise("bandpass", 320, 0.014, 1.4);
		const ctx = this.ctx;
		const drift = ctx.createOscillator();
		drift.frequency.value = 0.17;
		const driftGain = ctx.createGain();
		driftGain.gain.value = 140;
		drift.connect(driftGain).connect(this.tapeWind!.filter.frequency);
		drift.start();
		this.crackleTimer = window.setInterval(() => {
			if (Math.random() > 0.5) return;
			const t = ctx.currentTime;
			const source = ctx.createBufferSource();
			source.buffer = this.noiseBuffer();
			const gain = ctx.createGain();
			gain.gain.setValueAtTime(0.02 + Math.random() * 0.02, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
			const filter = ctx.createBiquadFilter();
			filter.type = "highpass";
			filter.frequency.value = 1800;
			source.connect(filter).connect(gain).connect(this.master!);
			source.start(t);
			source.stop(t + 0.05);
		}, 420);
	}

	stopTape() {
		if (!this.tapeOn) return;
		this.tapeOn = false;
		const t = this.ctx!.currentTime;
		for (const node of [this.tape, this.tapeWind]) {
			node!.gain.gain.setTargetAtTime(0.0001, t, 0.4);
			node!.source.stop(t + 2);
		}
		window.clearInterval(this.crackleTimer!);
		this.crackleTimer = null;
	}

	footsteps() {
		if (!this.ctx) return;
		const t0 = this.ctx.currentTime + 0.05;
		for (let i = 0; i < 5; i += 1) {
			const t = t0 + i * 0.44;
			const volume = 0.11 * (1 - i / 5.5);
			const osc = this.ctx.createOscillator();
			osc.type = "sine";
			osc.frequency.setValueAtTime(72, t);
			osc.frequency.exponentialRampToValueAtTime(46, t + 0.12);
			const gain = this.ctx.createGain();
			gain.gain.setValueAtTime(0.0001, t);
			gain.gain.linearRampToValueAtTime(volume, t + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
			osc.connect(gain).connect(this.master!);
			osc.start(t);
			osc.stop(t + 0.2);
		}
	}

	sleepFade() {
		if (!this.ctx || !this.roomOn) return;
		const t = this.ctx.currentTime;
		this.fan!.gain.gain.setTargetAtTime(0.02, t, 1.2);
		if (this.cricketTimer) {
			window.clearInterval(this.cricketTimer);
			this.cricketTimer = null;
		}
	}

	play(name: string) {
		if (!this.ctx) return;
		if (name === "tape") this.startTape();
		else if (name === "stopTape") this.stopTape();
		else if (name === "footsteps") this.footsteps();
		else if (name === "sleepFade") this.sleepFade();
	}

	// 设置面板音效音量（0..1），映射到 master gain（默认 0.9）
	setVolume(volume: number) {
		if (this.master)
			this.master.gain.value = 0.9 * Math.max(0, Math.min(1, volume));
	}
}

export const ambience = new Ambience();
