/* =========================================================
   MICROVERSE ESCAPE — audio engine
   All music / effects are synthesised locally with Web Audio.
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const STORE_KEY = 'sq-audio-v1';
  const DEFAULTS = { master: 90, music: 55, sfx: 85, voice: 95, musicOn: true, muted: false };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return {
        master: clampVol(parsed.master, DEFAULTS.master),
        music: clampVol(parsed.music, DEFAULTS.music),
        sfx: clampVol(parsed.sfx, DEFAULTS.sfx),
        voice: clampVol(parsed.voice, DEFAULTS.voice),
        musicOn: parsed.musicOn !== false,
        muted: parsed.muted === true
      };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }
  function clampVol(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : fallback;
  }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.buses = {};
      this.settings = loadSettings();
      this.unlocked = false;
      this.duckFactor = 1;
      this._listeners = new Set();
      this._supported = !!(window.AudioContext || window.webkitAudioContext);
    }

    init() {
      if (this.ctx) return this.ctx;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      const ctx = (this.ctx = new Ctx({ latencyHint: 'interactive' }));

      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -15;
      this.comp.knee.value = 22;
      this.comp.ratio.value = 3.6;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.28;

      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.comp);
      this.comp.connect(ctx.destination);

      const mkBus = (gain) => {
        const g = ctx.createGain();
        g.gain.value = gain;
        g.connect(this.master);
        return g;
      };
      this.buses.music = mkBus(0);
      this.buses.sfx = mkBus(0);
      this.buses.voice = mkBus(0);

      // shared hall reverb (generated impulse — no external files)
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = this._makeImpulse(2.4, 2.7);
      this.reverbGain = ctx.createGain();
      this.reverbGain.gain.value = 0.55;
      this.reverb.connect(this.reverbGain);
      this.reverbGain.connect(this.master);

      const sendToReverb = (bus, amount) => {
        const s = ctx.createGain();
        s.gain.value = amount;
        bus.connect(s);
        s.connect(this.reverb);
      };
      sendToReverb(this.buses.music, 0.3);
      sendToReverb(this.buses.sfx, 0.12);

      this.noiseBuffer = this._makeNoise(2.2);
      this.applyGains(0.05);
      return ctx;
    }

    _makeImpulse(seconds, decay) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const buf = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        }
      }
      return buf;
    }

    _makeNoise(seconds) {
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      const len = Math.floor(rate * seconds);
      const buf = ctx.createBuffer(1, len, rate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    async unlock() {
      if (!this._supported) return false;
      this.init();
      try {
        if (this.ctx.state !== 'running') await this.ctx.resume();
      } catch (e) { /* user gesture required */ }
      this.unlocked = this.ctx.state === 'running';
      if (this.unlocked) {
        // silent tick unlocks audio on stricter browsers
        const src = this.ctx.createBufferSource();
        src.buffer = this.ctx.createBuffer(1, 1, 22050);
        src.connect(this.ctx.destination);
        src.start(0);
        this.applyGains(0.35);
      }
      this._notify();
      return this.unlocked;
    }

    get ready() {
      return !!(this.ctx && this.unlocked && this.ctx.state === 'running');
    }

    now() { return this.ctx ? this.ctx.currentTime : 0; }

    masterLevel() {
      if (this.settings.muted) return 0;
      return Math.pow(this.settings.master / 100, 1.35);
    }

    applyGains(smooth = 0.12, duckFactor) {
      if (!this.ctx) return;
      if (typeof duckFactor === 'number') this.duckFactor = duckFactor;
      const t = this.ctx.currentTime;
      const ramp = (param, val) => {
        param.cancelScheduledValues(t);
        param.setTargetAtTime(val, t, Math.max(0.01, smooth / 3));
      };
      ramp(this.master.gain, this.masterLevel());
      ramp(this.buses.music.gain, (this.settings.musicOn ? Math.pow(this.settings.music / 100, 1.25) * 0.5 : 0) * this.duckFactor);
      ramp(this.buses.sfx.gain, Math.pow(this.settings.sfx / 100, 1.2) * 0.85);
      ramp(this.buses.voice.gain, Math.pow(this.settings.voice / 100, 1.2) * 0.9);
      this._notify();
    }

    setSetting(key, value, smooth) {
      if (!(key in this.settings)) return;
      this.settings[key] = value;
      this.applyGains(typeof smooth === 'number' ? smooth : 0.12);
      this._persist();
    }

    toggle(key) {
      if (typeof this.settings[key] !== 'boolean') return;
      this.settings[key] = !this.settings[key];
      this.applyGains();
      this._persist();
      return this.settings[key];
    }

    duckMusic(factor = 0.32, smooth = 0.5) {
      this.applyGains(smooth, factor);
    }
    unduckMusic(smooth = 0.7) {
      this.applyGains(smooth, 1);
    }

    /** absolute level for speechSynthesis volume */
    voiceLevel() {
      if (this.settings.muted) return 0;
      return Math.max(0, Math.min(1, Math.pow(this.settings.voice / 100, 1.1) * (this.settings.master / 100)));
    }

    _persist() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(this.settings)); } catch (e) { /* ignore */ }
    }

    onChange(fn) {
      this._listeners.add(fn);
      return () => this._listeners.delete(fn);
    }
    _notify() {
      this._listeners.forEach((fn) => {
        try { fn(this.settings); } catch (e) { /* ignore */ }
      });
    }
  }

  SQ.Audio = new AudioEngine();
  SQ.mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
})();
