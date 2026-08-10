/**
 * Small, non-blocking Web Audio cue player for the prologue handoffs.
 *
 * It intentionally creates only environmental texture. Dialogue, dog calls
 * and low voices remain silent cues in the content contract so no synthetic
 * voice is mistaken for the authored performance.
 */
export class TransitionAudioController {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambient = new Map();
    this.muted = false;
  }

  prime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { this.muted = true; return false; }
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.context.destination);
      }
      const result = this.context.resume?.();
      if (result?.catch) result.catch(() => { this.muted = true; });
      return true;
    } catch {
      this.muted = true;
      return false;
    }
  }

  start() { return this.prime(); }

  _output() {
    if (this.muted || !this.context || !this.master) return null;
    return this.master;
  }

  _noise(duration = 1.2, level = 0.02, filter = 1200) {
    const output = this._output();
    if (!output) return;
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * 0.35;
    const source = ctx.createBufferSource();
    const band = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    band.type = 'lowpass';
    band.frequency.value = filter;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.connect(band).connect(gain).connect(output);
    source.start();
    source.stop(ctx.currentTime + duration + 0.05);
  }

  _tone(frequency, duration, level = 0.03, type = 'sine', endFrequency = frequency) {
    const output = this._output();
    if (!output) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(output);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.05);
  }

  _ambientFan() {
    if (this.ambient.has('fan')) return;
    const output = this._output();
    if (!output) return;
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 42;
    gain.gain.value = 0.035;
    oscillator.connect(gain).connect(output);
    oscillator.start();
    this.ambient.set('fan', { oscillator, gain });
  }

  _ambientInsects() {
    if (this.ambient.has('insects')) return;
    const output = this._output();
    if (!output) return;
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0.018;
    gain.connect(output);
    const timer = window.setInterval(() => {
      const oscillator = ctx.createOscillator();
      const chirp = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(2400 + Math.random() * 600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.09);
      chirp.gain.setValueAtTime(0.0001, ctx.currentTime);
      chirp.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.015);
      chirp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      oscillator.connect(chirp).connect(gain);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.11);
    }, 780);
    this.ambient.set('insects', { gain, timer });
  }

  _fadeAmbient(key, duration = 1.2) {
    const item = this.ambient.get(key);
    if (!item?.gain?.gain || !this.context) return;
    item.gain.gain.cancelScheduledValues(this.context.currentTime);
    item.gain.gain.setValueAtTime(Math.max(0.0001, item.gain.gain.value), this.context.currentTime);
    item.gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
  }

  playCue(cueId) {
    if (!this._output()) return;
    switch (cueId) {
      case 'fan_low': this._ambientFan(); break;
      case 'recorder_noise': this._noise(3.4, 0.015, 2500); break;
      case 'pen_slide': this._noise(0.24, 0.035, 1800); this._tone(180, 0.16, 0.018, 'triangle', 100); break;
      case 'insects_near': this._ambientInsects(); this._fadeAmbient('fan', 1.6); break;
      case 'plastic_to_ceramic': this._tone(330, 0.2, 0.025, 'triangle', 150); this._noise(0.18, 0.012, 1000); break;
      case 'chopsticks_bowl': this._tone(870, 0.1, 0.03, 'square', 650); break;
      case 'door_creak': this._tone(110, 0.65, 0.025, 'sawtooth', 72); break;
      case 'footsteps_light':
        for (let i = 0; i < 4; i += 1) window.setTimeout(() => this._tone(72, 0.14, Math.max(0.012, 0.028 - i * 0.005), 'sine', 46), i * 430);
        break;
      case 'car_engine': this._tone(58, 1.9, 0.032, 'sawtooth', 46); this._noise(1.7, 0.012, 420); break;
      case 'insects_recede': this._ambientInsects(); window.setTimeout(() => this._fadeAmbient('insects', 1.8), 1500); break;
      case 'fan_emerge': this._ambientFan(); break;
      default: break;
    }
  }

  stop() {
    if (!this.context) return;
    for (const [key, item] of this.ambient) {
      if (item.timer) window.clearInterval(item.timer);
      if (item.gain?.gain) item.gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + 0.25);
      if (item.oscillator) {
        try { item.oscillator.stop(this.context.currentTime + 0.3); } catch { /* already stopped */ }
      }
      this.ambient.delete(key);
    }
  }
}
