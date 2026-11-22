// Solara Bay v13 — synthesised audio: engine hum, siren wail, radio blips
// and UI clicks, all built with Web Audio oscillators. No audio files, no
// network. Audio starts suspended until the first user gesture.
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  startEngine() {
    this.ensure();
    if (!this.ctx || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.05;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 420;
    this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
  }

  setEngineSpeed(kmh) {
    if (!this.engineOsc) return;
    this.engineOsc.frequency.setTargetAtTime(45 + kmh * 0.9, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(0.03 + Math.min(0.06, kmh / 2200), this.ctx.currentTime, 0.1);
  }

  stopEngine() {
    if (this.engineOsc) { try { this.engineOsc.stop(); } catch { /* already stopped */ } this.engineOsc = null; }
  }

  startSiren() {
    this.ensure();
    if (!this.ctx || this.sirenOsc) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 720;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.55;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(this.sirenOsc.frequency);
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.045;
    this.sirenOsc.connect(this.sirenGain).connect(this.master);
    this.sirenOsc.start(); lfo.start();
    this.sirenLfo = lfo;
  }

  stopSiren() {
    if (this.sirenOsc) { try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch { /* stopped */ } this.sirenOsc = null; }
  }

  blip(freq = 880, dur = 0.07) {
    this.ensure();
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }
}
