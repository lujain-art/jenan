/* =========================================================
   MICROVERSE ESCAPE — sound effect library (100% synthesised)
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function panNode(ctx, dest, pan) {
    if (!ctx.createStereoPanner) return dest;
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan || 0, -1, 1);
    p.connect(dest);
    return p;
  }

  function tone(ctx, dest, t, o = {}) {
    const {
      freq = 440, to = null, dur = 0.15, type = 'sine', vol = 0.1,
      attack = 0.004, pan = 0, detune = 0
    } = o;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    const destNode = pan ? panNode(ctx, dest, pan) : dest;
    out.connect(destNode);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur * 0.92);
    if (detune) osc.detune.value = detune;
    osc.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.06);
    return out;
  }

  function noise(ctx, dest, t, o = {}) {
    const {
      dur = 0.2, vol = 0.08, type = 'bandpass', freq = 1200, q = 1,
      to = null, attack = 0.004, pan = 0
    } = o;
    const src = ctx.createBufferSource();
    src.buffer = SQ.Audio.noiseBuffer;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(Math.max(40, freq), t);
    if (to) filt.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur * 0.9);
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.03, dur));
    const destNode = pan ? panNode(ctx, dest, pan) : dest;
    src.connect(filt); filt.connect(g); g.connect(destNode);
    src.start(t, rnd(0, 1.4));
    src.stop(t + dur + 0.05);
  }

  function bellTone(ctx, dest, t, freq, dur, vol, pan) {
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const d = panNode(ctx, dest, pan || 0);
    out.connect(d);
    const car = ctx.createOscillator();
    car.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq * 3.01;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(freq * 0.9, t);
    mg.gain.exponentialRampToValueAtTime(freq * 0.02, t + dur * 0.7);
    mod.connect(mg); mg.connect(car.frequency);
    car.connect(out);
    car.start(t); mod.start(t);
    car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }

  const sounds = {
    hover(ctx, dest, t) {
      tone(ctx, dest, t, { freq: rnd(1500, 1700), dur: 0.035, type: 'sine', vol: 0.02 });
    },

    click(ctx, dest, t) {
      const f = rnd(780, 920);
      tone(ctx, dest, t, { freq: f, dur: 0.055, type: 'triangle', vol: 0.1 });
      tone(ctx, dest, t + 0.012, { freq: f * 1.5, dur: 0.045, type: 'sine', vol: 0.045 });
      noise(ctx, dest, t, { dur: 0.03, vol: 0.025, type: 'highpass', freq: 3000 });
    },

    pickup(ctx, dest, t) {
      tone(ctx, dest, t, { freq: rnd(280, 340), to: rnd(560, 680), dur: 0.13, type: 'triangle', vol: 0.085 });
      noise(ctx, dest, t, { dur: 0.05, vol: 0.025, type: 'bandpass', freq: 2400, q: 1.4 });
    },

    drop(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 150, to: 62, dur: 0.2, type: 'sine', vol: 0.13 });
      noise(ctx, dest, t, { dur: 0.09, vol: 0.05, type: 'lowpass', freq: 500 });
    },

    place(ctx, dest, t) {
      tone(ctx, dest, t, { freq: rnd(720, 840), to: 420, dur: 0.07, type: 'triangle', vol: 0.09, pan: rnd(-.2, .2) });
      noise(ctx, dest, t, { dur: 0.04, vol: 0.03, type: 'bandpass', freq: 1400, q: 2 });
    },

    snap(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 500, to: 900, dur: 0.09, type: 'sine', vol: 0.08 });
      bellTone(ctx, dest, t + 0.02, 1600, 0.25, 0.04, 0);
    },

    wrong(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 240, to: 150, dur: 0.22, type: 'triangle', vol: 0.07 });
      tone(ctx, dest, t + 0.09, { freq: 180, to: 120, dur: 0.25, type: 'sine', vol: 0.06 });
    },

    glass(ctx, dest, t) {
      const base = rnd(1050, 1250);
      bellTone(ctx, dest, t, base, 0.5, 0.04, rnd(-.3, .3));
      bellTone(ctx, dest, t + 0.01, base * 1.62, 0.35, 0.025, rnd(-.3, .3));
      bellTone(ctx, dest, t + 0.02, base * 2.4, 0.22, 0.014, 0);
    },

    cling(ctx, dest, t) {
      bellTone(ctx, dest, t, rnd(980, 1120), 0.42, 0.06, rnd(-.4, .4));
      bellTone(ctx, dest, t + 0.008, rnd(1460, 1580), 0.3, 0.03, rnd(-.4, .4));
      noise(ctx, dest, t, { dur: 0.05, vol: 0.02, type: 'highpass', freq: 4000 });
    },

    attach(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 700, to: 1200, dur: 0.06, type: 'sine', vol: 0.05 });
      bellTone(ctx, dest, t + 0.02, 1800, 0.18, 0.028, 0);
    },

    magnet(ctx, dest, t) {
      const out = tone(ctx, dest, t, { freq: 84, to: 104, dur: 0.6, type: 'triangle', vol: 0.03, attack: 0.02 });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 9;
      const lg = ctx.createGain();
      lg.gain.value = 0.006;
      lfo.connect(lg); lg.connect(out.gain);
      lfo.start(t); lfo.stop(t + 0.6);
      bellTone(ctx, dest, t + 0.05, 900, 0.42, 0.018, 0.2);
      bellTone(ctx, dest, t + 0.13, 1350, 0.42, 0.013, -0.2);
    },

    unmag(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 110, to: 60, dur: 0.4, type: 'triangle', vol: 0.028 });
    },

    sieveShake(ctx, dest, t) {
      [0, 0.085, 0.17].forEach((d, i) => {
        noise(ctx, dest, t + d, { dur: 0.075, vol: 0.035 - i * 0.004, type: 'bandpass', freq: rnd(2200, 3200), q: 1.2 });
      });
      tone(ctx, dest, t, { freq: 420, to: 380, dur: 0.12, type: 'triangle', vol: 0.025 });
    },

    sift(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 0.32, vol: 0.045, type: 'bandpass', freq: 2600, q: 0.7, to: 1600 });
      for (let i = 0; i < 4; i++) {
        noise(ctx, dest, t + 0.05 + i * 0.06, { dur: 0.03, vol: 0.02, type: 'highpass', freq: 4000 });
      }
    },

    sandPour(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 0.6, vol: 0.06, type: 'bandpass', freq: 1500, q: 0.6, to: 900 });
      for (let i = 0; i < 6; i++) {
        noise(ctx, dest, t + 0.04 + i * 0.09, { dur: 0.028, vol: 0.018, type: 'bandpass', freq: rnd(1800, 3000), q: 2 });
      }
    },

    metalDrop(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 170, to: 70, dur: 0.22, type: 'sine', vol: 0.11 });
      for (let i = 0; i < 3; i++) {
        bellTone(ctx, dest, t + 0.03 + i * rnd(0.04, 0.08), rnd(1000, 1600), 0.35, 0.03, rnd(-.4, .4));
      }
    },

    pourWater(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 1.25, vol: 0.055, type: 'bandpass', freq: 700, q: 0.6, to: 1900 });
      for (let i = 0; i < 6; i++) {
        tone(ctx, dest, t + rnd(0.05, 1.1), { freq: rnd(420, 780), to: rnd(800, 1300), dur: 0.09, type: 'sine', vol: 0.022 });
      }
    },

    drip(ctx, dest, t) {
      [0, 0.24, 0.52].forEach((d, i) => {
        tone(ctx, dest, t + d, { freq: rnd(680, 900), to: 1600, dur: 0.12, type: 'sine', vol: 0.045 - i * 0.006 });
      });
    },

    machineStart(ctx, dest, t) {
      const out = tone(ctx, dest, t, { freq: 52, to: 112, dur: 0.9, type: 'sawtooth', vol: 0.05 });
      const lp = ctx.createBiquadFilter();
      // soften the motor
      try { out.disconnect(); lp.type = 'lowpass'; lp.frequency.value = 420; out.connect(lp); lp.connect(dest); } catch (e) { /* noop */ }
      noise(ctx, dest, t, { dur: 0.7, vol: 0.05, type: 'bandpass', freq: 300, q: 0.5, to: 900 });
      tone(ctx, dest, t + 0.8, { freq: 880, dur: 0.12, type: 'sine', vol: 0.05 });
      tone(ctx, dest, t + 0.94, { freq: 1320, dur: 0.2, type: 'sine', vol: 0.045 });
    },

    machineLoopStart(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 340, to: 620, dur: 0.6, type: 'triangle', vol: 0.04 });
      for (let i = 0; i < 4; i++) tone(ctx, dest, t + 0.12 * i, { freq: 600 + i * 180, dur: 0.1, type: 'sine', vol: 0.03 });
    },

    star(ctx, dest, t) {
      [1046, 1318, 1568, 2093, 2637].forEach((f, i) => {
        bellTone(ctx, dest, t + i * 0.06, f, 0.5, 0.045 - i * 0.003, (i % 2 ? 0.25 : -0.25));
      });
    },

    reward(ctx, dest, t) {
      [659, 880, 1318].forEach((f, i) => {
        bellTone(ctx, dest, t + i * 0.085, f, 0.7, 0.05, 0);
      });
      tone(ctx, dest, t + 0.25, { freq: 1760, dur: 0.35, type: 'sine', vol: 0.03 });
    },

    unlock(ctx, dest, t) {
      [523, 659, 784, 1046].forEach((f, i) => bellTone(ctx, dest, t + i * 0.1, f, 0.6, 0.045, 0));
    },

    door(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 1.1, vol: 0.07, type: 'lowpass', freq: 380, q: 0.8, to: 120, attack: 0.2 });
      tone(ctx, dest, t + 0.15, { freq: 160, to: 90, dur: 0.8, type: 'sawtooth', vol: 0.025 });
      noise(ctx, dest, t + 0.55, { dur: 0.5, vol: 0.03, type: 'bandpass', freq: 1200, q: 4, to: 600 });
    },

    pop(ctx, dest, t) {
      tone(ctx, dest, t, { freq: rnd(520, 680), to: 170, dur: 0.1, type: 'sine', vol: 0.11 });
      noise(ctx, dest, t, { dur: 0.03, vol: 0.04, type: 'highpass', freq: 2500 });
    },

    bubble(ctx, dest, t) {
      const out = tone(ctx, dest, t, { freq: rnd(340, 430), to: 900, dur: 0.2, type: 'sine', vol: 0.05 });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 22;
      const lg = ctx.createGain();
      lg.gain.value = 0.01;
      lfo.connect(lg); lg.connect(out.gain);
      lfo.start(t); lfo.stop(t + 0.2);
    },

    glug(ctx, dest, t) {
      [0, 0.13, 0.28, 0.4].forEach((d, i) => {
        tone(ctx, dest, t + d, { freq: 260 + i * 60, to: 520 + i * 90, dur: 0.11, type: 'sine', vol: 0.035 });
      });
    },

    giggle(ctx, dest, t) {
      const base = 950;
      [0, 0.11, 0.2, 0.31, 0.4].forEach((d, i) => {
        const f = base + (i % 2 ? 220 : 0) + rnd(-30, 30);
        tone(ctx, dest, t + d, { freq: f, to: f * 0.82, dur: 0.085, type: 'triangle', vol: 0.035, pan: rnd(-.2, .2) });
      });
      noise(ctx, dest, t + 0.2, { dur: 0.15, vol: 0.012, type: 'highpass', freq: 3500 });
    },

    sneak(ctx, dest, t) {
      [0, 0.19, 0.38].forEach((d, i) => {
        tone(ctx, dest, t + d, { freq: 140 + i * 18, to: 100, dur: 0.09, type: 'triangle', vol: 0.04 });
      });
    },

    footstep(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 95, to: 60, dur: 0.13, type: 'sine', vol: 0.09 });
      noise(ctx, dest, t, { dur: 0.06, vol: 0.025, type: 'lowpass', freq: 380 });
    },

    boing(ctx, dest, t) {
      const out = tone(ctx, dest, t, { freq: 260, to: 620, dur: 0.34, type: 'sine', vol: 0.08 });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 16;
      const lg = ctx.createGain();
      lg.gain.value = 0.02;
      lfo.connect(lg); lg.connect(out.gain);
      lfo.start(t); lfo.stop(t + 0.34);
    },

    whoosh(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 0.5, vol: 0.055, type: 'bandpass', freq: 500, q: 0.7, to: 2600, attack: 0.1 });
      tone(ctx, dest, t + 0.1, { freq: 220, to: 520, dur: 0.35, type: 'sine', vol: 0.02 });
    },

    flash(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 0.6, vol: 0.06, type: 'highpass', freq: 1500, attack: 0.01 });
      [880, 1174, 1480, 1970].forEach((f, i) => bellTone(ctx, dest, t + i * 0.02, f, 0.8, 0.03, rnd(-.4, .4)));
      tone(ctx, dest, t, { freq: 70, to: 40, dur: 0.5, type: 'sine', vol: 0.07 });
    },

    fizz(ctx, dest, t) {
      noise(ctx, dest, t, { dur: 0.75, vol: 0.035, type: 'highpass', freq: 3800, attack: 0.05 });
      for (let i = 0; i < 8; i++) {
        tone(ctx, dest, t + rnd(0.05, 0.7), { freq: rnd(1200, 2400), dur: 0.03, type: 'sine', vol: 0.015 });
      }
    },

    sparkle(ctx, dest, t) {
      for (let i = 0; i < 7; i++) {
        bellTone(ctx, dest, t + i * rnd(0.04, 0.08), rnd(1600, 3200), 0.35, 0.02, rnd(-.5, .5));
      }
    },

    tick(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 1000, dur: 0.035, type: 'triangle', vol: 0.03 });
    },

    heartbeat(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 68, to: 48, dur: 0.2, type: 'sine', vol: 0.14 });
      tone(ctx, dest, t + 0.24, { freq: 62, to: 44, dur: 0.18, type: 'sine', vol: 0.1 });
    },

    waterFill(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 280, to: 620, dur: 0.9, type: 'sine', vol: 0.035 });
      for (let i = 0; i < 5; i++) {
        tone(ctx, dest, t + 0.1 + i * 0.16, { freq: 420 + i * 90, to: 900 + i * 110, dur: 0.1, type: 'sine', vol: 0.024 });
      }
    },

    error(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 330, to: 240, dur: 0.16, type: 'triangle', vol: 0.05 });
    },

    scan(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 380, to: 1300, dur: 0.75, type: 'sine', vol: 0.045 });
      noise(ctx, dest, t, { dur: 0.5, vol: 0.02, type: 'bandpass', freq: 900, q: 6, to: 2400 });
    },

    clink(ctx, dest, t) {
      bellTone(ctx, dest, t, rnd(1800, 2400), 0.25, 0.03, rnd(-.5, .5));
      tone(ctx, dest, t, { freq: 500, dur: 0.04, type: 'triangle', vol: 0.02 });
    },

    lid(ctx, dest, t) {
      tone(ctx, dest, t, { freq: 420, to: 700, dur: 0.08, type: 'triangle', vol: 0.05 });
      noise(ctx, dest, t + 0.02, { dur: 0.12, vol: 0.03, type: 'bandpass', freq: 1400, q: 3, to: 800 });
    },

    celebrate(ctx, dest, t) {
      [72, 76, 79, 84, 88].forEach((n, i) => {
        bellTone(ctx, dest, t + i * 0.09, SQ.mtof(n), 0.7, 0.06, (i % 2 ? .2 : -.2));
      });
      tone(ctx, dest, t + 0.4, { freq: 120, to: 60, dur: 0.3, type: 'sine', vol: 0.08 });
    }
  };

  const cooldowns = { sieveShake: 0.12, sift: 0.12, sandPour: 0.2, hover: 0.07, magnet: 0.5 };

  class SFXManager {
    constructor() {
      this.last = new Map();
      this.enabled = true;
    }

    play(name, opts = {}) {
      const eng = SQ.Audio;
      if (!eng.ready || !this.enabled) return;
      const fn = sounds[name];
      if (!fn) return;
      const now = eng.ctx.currentTime;
      const cool = cooldowns[name] ?? 0.045;
      const last = this.last.get(name) || -99;
      if (now - last < cool) return;
      this.last.set(name, now);
      const t = now + 0.008 + (opts.delay || 0);
      try { fn(eng.ctx, eng.buses.sfx, t, opts); } catch (e) { /* never break the game for a sound */ }
    }

    /** small helper used by tests/tutorial */
    playClick() { this.play('click'); }
  }

  SQ.SFX = new SFXManager();
  SQ.SFX.sounds = sounds;
})();
