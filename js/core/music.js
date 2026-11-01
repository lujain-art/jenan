/* =========================================================
   MICROVERSE ESCAPE — original procedural score
   Six moods + celebration jingles, composed in code.
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const mtof = SQ.mtof;

  /* ---------------- instruments ---------------- */
  const Inst = {
    bell(ctx, dest, t, midi, dur, vol = 0.09, opts = {}) {
      const f = mtof(midi);
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.006);
      out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.12, dur));
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = Math.max(-0.35, Math.min(0.35, (midi - 72) / 42));
        out.connect(pan);
        pan.connect(dest);
      } else {
        out.connect(dest);
      }
      const car = ctx.createOscillator();
      car.type = 'sine';
      car.frequency.value = f;
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.value = f * (opts.ratio || 3.01);
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(f * (opts.index || 1.15), t);
      mg.gain.exponentialRampToValueAtTime(f * 0.02 + 1, t + dur * 0.9);
      mod.connect(mg);
      mg.connect(car.frequency);
      car.connect(out);
      const shimmer = ctx.createOscillator();
      shimmer.type = 'sine';
      shimmer.frequency.value = f * 2.004;
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(vol * 0.22, t);
      sg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6);
      shimmer.connect(sg);
      sg.connect(out);
      car.start(t); mod.start(t); shimmer.start(t);
      const stopT = t + Math.max(0.2, dur) + 0.15;
      car.stop(stopT); mod.stop(stopT); shimmer.stop(stopT);
    },

    marimba(ctx, dest, t, midi, dur, vol = 0.06) {
      const f = mtof(midi);
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(vol, t + 0.005);
      out.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.16, dur));
      out.connect(dest);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = f * 3.98;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(vol * 0.18, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.35);
      osc.connect(out); osc2.connect(g2); g2.connect(out);
      osc.start(t); osc2.start(t);
      osc.stop(t + dur + 0.1); osc2.stop(t + dur * 0.5 + 0.1);
    },

    pad(ctx, dest, t, notes, dur, vol = 0.035, cutoff = 900) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff * 0.55, t);
      filter.frequency.linearRampToValueAtTime(cutoff, t + Math.min(1.4, dur * 0.5));
      filter.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(1.2, dur * 0.35));
      g.gain.setValueAtTime(vol, t + dur * 0.62);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
      filter.connect(g);
      g.connect(dest);
      notes.forEach((midi) => {
        for (let d = -1; d <= 1; d += 2) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = mtof(midi);
          osc.detune.value = d * 7;
          osc.connect(filter);
          osc.start(t);
          osc.stop(t + dur + 0.6);
        }
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.16;
      const lg = ctx.createGain();
      lg.gain.value = 90;
      lfo.connect(lg);
      lg.connect(filter.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.6);
    },

    bass(ctx, dest, t, midi, dur, vol = 0.1) {
      const f = mtof(midi);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.14, dur));
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      lp.connect(g);
      g.connect(dest);
      const o1 = ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = f;
      const o2 = ctx.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = f;
      const g2 = ctx.createGain();
      g2.gain.value = 0.35;
      o1.connect(lp); o2.connect(g2); g2.connect(lp);
      o1.start(t); o2.start(t);
      o1.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
    },

    kick(ctx, dest, t, vol = 0.17) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(132, t);
      osc.frequency.exponentialRampToValueAtTime(44, t + 0.16);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      osc.connect(g);
      g.connect(dest);
      osc.start(t); osc.stop(t + 0.36);
    },

    snare(ctx, dest, t, vol = 0.055) {
      const src = ctx.createBufferSource();
      src.buffer = SQ.Music.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1900;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      src.connect(bp); bp.connect(g); g.connect(dest);
      src.start(t); src.stop(t + 0.2);
      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(190, t);
      body.frequency.exponentialRampToValueAtTime(120, t + 0.1);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(vol * 0.5, t);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      body.connect(bg); bg.connect(dest);
      body.start(t); body.stop(t + 0.12);
    },

    hat(ctx, dest, t, vol = 0.022) {
      const src = ctx.createBufferSource();
      src.buffer = SQ.Music.noise;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 7600;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      src.connect(hp); hp.connect(g); g.connect(dest);
      src.start(t); src.stop(t + 0.06);
    },

    shaker(ctx, dest, t, vol = 0.026) {
      const src = ctx.createBufferSource();
      src.buffer = SQ.Music.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 5200;
      bp.Q.value = 1.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
      src.connect(bp); bp.connect(g); g.connect(dest);
      src.start(t); src.stop(t + 0.1);
    },

    tom(ctx, dest, t, vol = 0.1, f0 = 170) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.52, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.28);
    },

    wood(ctx, dest, t, vol = 0.03, freq = 1250) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + 0.06);
    }
  };

  /* ---------------- score data ---------------- */
  const TRACKS = {
    menu: {
      bpm: 112, bars: 8, swing: 0.05, padVol: 0.03, melodyVol: 0.075, arpVol: 0.035,
      chords: [
        [60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67],
        [60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]
      ],
      arp: [0, 2, 1, 3, 2, 1, 3, 2], arpOct: 12,
      bassRoots: [48, 45, 41, 43, 48, 45, 41, 43],
      bassSteps: [0, 8, 12], bassOffsets: [0, 0, 7],
      drums: { kick: [0, 8, 10], snare: [4, 12], hat: [2, 6, 10, 14], shaker: [3, 7, 11, 15], tom: [] },
      melody: [
        [0, 76, 2, .9], [2, 79, 2, .8], [4, 84, 4, .95], [8, 79, 2, .7], [10, 76, 2, .7], [12, 74, 4, .8],
        [16, 72, 2, .8], [18, 76, 2, .8], [20, 79, 4, .9], [24, 76, 4, .7], [28, 72, 2, .65], [30, 74, 2, .7],
        [32, 69, 2, .8], [34, 72, 2, .8], [36, 77, 4, .9], [40, 81, 4, .95], [44, 79, 2, .7], [46, 77, 2, .7],
        [48, 74, 4, .85], [52, 74, 2, .7], [54, 76, 2, .8], [56, 79, 4, .9], [60, 74, 2, .65], [62, 71, 2, .65],
        [64, 76, 2, .9], [66, 79, 2, .85], [68, 84, 4, 1], [72, 86, 4, .95], [76, 84, 2, .75], [78, 79, 2, .7],
        [80, 76, 2, .8], [82, 72, 2, .7], [84, 76, 4, .85], [88, 79, 4, .85], [92, 76, 2, .7], [94, 72, 2, .7],
        [96, 69, 2, .8], [98, 72, 2, .8], [100, 77, 4, .9], [104, 81, 4, .95], [108, 84, 4, .9],
        [112, 79, 2, .8], [114, 77, 2, .75], [116, 74, 4, .8], [120, 72, 8, .8]
      ]
    },

    story: {
      bpm: 66, bars: 8, swing: 0, padVol: 0.045, melodyVol: 0.075, arpVol: 0,
      chords: [
        [57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64],
        [57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]
      ],
      arp: [], arpOct: 12,
      bassRoots: [45, 41, 38, 40, 45, 41, 38, 40],
      bassSteps: [0], bassOffsets: [0], longBass: true,
      drums: { kick: [0, 12], snare: [], hat: [], shaker: [], tom: [], wood: [8] },
      melody: [
        [0, 81, 6, .8], [10, 84, 4, .6], [24, 79, 8, .75], [40, 76, 6, .7],
        [56, 72, 8, .7], [64, 81, 4, .6], [72, 84, 8, .8], [88, 79, 6, .7],
        [104, 76, 8, .7], [120, 69, 8, .65]
      ]
    },

    mission: {
      bpm: 106, bars: 8, swing: 0.06, padVol: 0.024, melodyVol: 0.07, arpVol: 0.038,
      chords: [
        [53, 57, 60, 65], [50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60],
        [53, 57, 60, 65], [50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60]
      ],
      arp: [0, 1, 2, 3, 2, 1, 0, 2], arpOct: 12,
      bassRoots: [41, 38, 34, 36, 41, 38, 34, 36],
      bassSteps: [0, 6, 8, 12], bassOffsets: [0, 0, 0, 7],
      drums: { kick: [0, 6, 8, 14], snare: [4, 12], hat: [2, 6, 10, 14], shaker: [1, 3, 5, 7, 9, 11, 13, 15], tom: [], wood: [3, 11] },
      melody: [
        [0, 77, 1, .8], [1, 79, 1, .7], [2, 81, 2, .9], [4, 84, 1, .8], [5, 81, 1, .7], [6, 79, 2, .8], [8, 77, 2, .75], [10, 74, 2, .7], [12, 77, 2, .8], [14, 81, 2, .8],
        [16, 79, 1, .8], [17, 77, 1, .7], [18, 74, 2, .8], [20, 77, 2, .8], [22, 81, 2, .8], [24, 79, 4, .9], [28, 74, 4, .7],
        [32, 77, 1, .8], [33, 79, 1, .7], [34, 82, 2, .9], [36, 86, 2, .9], [38, 82, 2, .8], [40, 79, 2, .75], [42, 77, 2, .7], [44, 74, 2, .7], [46, 72, 2, .7],
        [48, 74, 2, .8], [50, 76, 2, .8], [52, 79, 2, .8], [54, 81, 2, .85], [56, 79, 4, .9], [60, 74, 4, .7],
        [64, 77, 1, .85], [65, 79, 1, .7], [66, 81, 2, .9], [68, 84, 2, .9], [70, 86, 2, .9], [72, 84, 2, .8], [74, 81, 2, .75], [76, 79, 2, .7], [78, 77, 2, .7],
        [80, 76, 2, .8], [82, 77, 2, .8], [84, 79, 2, .8], [86, 81, 2, .8], [88, 79, 4, .9], [92, 76, 2, .7], [94, 74, 2, .7],
        [96, 77, 2, .8], [98, 79, 2, .8], [100, 82, 4, .9], [104, 86, 4, .95], [108, 84, 2, .75], [110, 82, 2, .7],
        [112, 81, 2, .8], [114, 79, 2, .75], [116, 77, 4, .85], [120, 74, 4, .75]
      ]
    },

    experiment: {
      bpm: 90, bars: 8, swing: 0.03, padVol: 0.03, melodyVol: 0.065, arpVol: 0.045,
      chords: [
        [50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57],
        [50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]
      ],
      arp: [0, 2, 1, 3, 2, 3, 1, 2], arpOct: 12,
      bassRoots: [38, 35, 31, 33, 38, 35, 31, 33],
      bassSteps: [0, 8], bassOffsets: [0, 7],
      drums: { kick: [0, 8], snare: [], hat: [], shaker: [2, 6, 10, 14], tom: [], wood: [4, 12] },
      melody: [
        [0, 74, 2, .7], [2, 78, 2, .7], [4, 81, 4, .8], [8, 78, 2, .6], [10, 74, 2, .6], [12, 73, 2, .55], [14, 74, 2, .6],
        [16, 71, 2, .65], [18, 74, 2, .65], [20, 78, 4, .8], [24, 74, 2, .6], [26, 71, 2, .55], [28, 69, 4, .65],
        [32, 67, 2, .6], [34, 71, 2, .6], [36, 74, 4, .8], [40, 79, 4, .85], [44, 78, 2, .6], [46, 74, 2, .6],
        [48, 76, 4, .7], [52, 73, 2, .6], [54, 69, 2, .55], [56, 71, 4, .7], [60, 73, 2, .55], [62, 76, 2, .6],
        [64, 78, 2, .65], [66, 81, 2, .7], [68, 86, 4, .9], [72, 81, 4, .75], [76, 78, 2, .6], [78, 74, 2, .6],
        [80, 74, 2, .65], [82, 78, 2, .65], [84, 83, 4, .8], [88, 78, 2, .6], [90, 74, 2, .55], [92, 71, 4, .65],
        [96, 74, 2, .6], [98, 79, 2, .65], [100, 83, 4, .8], [104, 86, 4, .85], [108, 83, 2, .65], [110, 79, 2, .6],
        [112, 78, 2, .6], [114, 76, 2, .6], [116, 73, 4, .7], [120, 74, 4, .7]
      ]
    },

    final: {
      bpm: 112, bars: 8, swing: 0.04, padVol: 0.04, melodyVol: 0.078, arpVol: 0.04,
      chords: [
        [55, 58, 62, 67], [51, 55, 58, 63], [48, 51, 55, 60], [50, 54, 57, 62],
        [55, 58, 62, 67], [51, 55, 58, 63], [48, 51, 55, 60], [50, 54, 57, 62]
      ],
      arp: [0, 1, 2, 3, 2, 3, 1, 2], arpOct: 12,
      bassRoots: [43, 39, 36, 38, 43, 39, 36, 38],
      bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassOffsets: [0, 0, 7, 0, 0, 0, 7, 0],
      drums: { kick: [0, 6, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], shaker: [1, 3, 5, 7, 9, 11, 13, 15], tom: [14], wood: [10] },
      melody: [
        [0, 74, 2, .9], [2, 74, 2, .7], [3, 77, 2, .8], [4, 79, 4, .95], [8, 77, 2, .7], [10, 74, 2, .7], [12, 70, 4, .8],
        [16, 75, 2, .85], [18, 75, 2, .7], [20, 79, 2, .8], [22, 82, 4, .9], [26, 79, 2, .7], [28, 75, 2, .7],
        [32, 72, 2, .8], [34, 75, 2, .75], [36, 79, 4, .9], [40, 84, 4, .95], [44, 82, 2, .7], [46, 79, 2, .7],
        [48, 77, 2, .8], [50, 74, 2, .75], [52, 77, 2, .8], [54, 81, 2, .85], [56, 79, 4, .9], [60, 74, 4, .7],
        [64, 79, 2, .9], [66, 82, 2, .8], [68, 86, 4, 1], [72, 82, 2, .75], [74, 79, 2, .7], [76, 74, 2, .7], [78, 79, 2, .75],
        [80, 75, 2, .8], [82, 79, 2, .8], [84, 82, 4, .9], [88, 86, 4, .95], [92, 82, 2, .7], [94, 79, 2, .7],
        [96, 84, 2, .9], [98, 82, 2, .8], [100, 79, 4, .9], [104, 84, 4, .95], [108, 87, 2, .85], [110, 84, 2, .8],
        [112, 82, 2, .85], [114, 79, 2, .8], [116, 77, 4, .85], [120, 74, 8, .8]
      ]
    },

    victory: {
      bpm: 120, bars: 8, swing: 0.03, padVol: 0.038, melodyVol: 0.085, arpVol: 0.036,
      chords: [
        [50, 54, 57, 62], [43, 47, 50, 55], [47, 50, 54, 59], [45, 49, 52, 57],
        [50, 54, 57, 62], [43, 47, 50, 55], [47, 50, 54, 59], [45, 49, 52, 57]
      ],
      arp: [0, 2, 1, 3, 2, 3, 1, 2], arpOct: 12,
      bassRoots: [38, 31, 35, 33, 38, 31, 35, 33],
      bassSteps: [0, 4, 8, 12], bassOffsets: [0, 7, 0, 7],
      drums: { kick: [0, 8, 10], snare: [4, 12], hat: [2, 6, 10, 14], shaker: [1, 3, 5, 7, 9, 11, 13, 15], tom: [14], wood: [7, 15] },
      melody: [
        [0, 74, 2, .9], [2, 78, 2, .85], [4, 81, 4, 1], [8, 86, 4, .95], [12, 81, 2, .75], [14, 78, 2, .75],
        [16, 79, 2, .85], [18, 83, 2, .8], [20, 86, 4, .95], [24, 83, 2, .7], [26, 79, 2, .7], [28, 74, 4, .8],
        [32, 78, 2, .85], [34, 81, 2, .8], [36, 86, 4, .95], [40, 90, 4, 1], [44, 86, 2, .75], [46, 83, 2, .75],
        [48, 81, 2, .85], [50, 78, 2, .8], [52, 81, 2, .85], [54, 83, 2, .85], [56, 86, 6, 1], [62, 81, 2, .8],
        [64, 86, 2, .95], [66, 90, 2, .9], [68, 93, 4, 1], [72, 90, 2, .8], [74, 86, 2, .75], [76, 81, 2, .75], [78, 86, 2, .8],
        [80, 83, 2, .85], [82, 86, 2, .85], [84, 90, 4, .95], [88, 86, 2, .75], [90, 83, 2, .75], [92, 79, 4, .8],
        [96, 78, 2, .85], [98, 81, 2, .85], [100, 86, 4, .95], [104, 90, 4, 1], [108, 93, 2, .9], [110, 90, 2, .85],
        [112, 86, 2, .9], [114, 83, 2, .85], [116, 78, 4, .85], [120, 74, 4, .8], [124, 78, 2, .8], [126, 83, 2, .85]
      ]
    }
  };

  /* ---------------- track player ---------------- */
  class TrackPlayer {
    constructor(engine, def, name) {
      this.engine = engine;
      this.ctx = engine.ctx;
      this.def = def;
      this.name = name;
      this.stepDur = 60 / def.bpm / 4;
      this.total = def.bars * 16;
      this.step = 0;
      this.stopped = false;
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.0001;
      this.gain.connect(engine.buses.music);
      this.melodyMap = new Map();
      (def.melody || []).forEach(([s, n, d, v]) => {
        if (!this.melodyMap.has(s)) this.melodyMap.set(s, []);
        this.melodyMap.get(s).push({ n, d, v });
      });
      this.nextTime = this.ctx.currentTime + 0.12;
      this._timer = setInterval(() => this._tick(), 25);
      this._tick();
    }

    fadeIn(t, time) {
      const g = this.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.0001, t);
      g.exponentialRampToValueAtTime(1, t + time);
    }

    fadeOut(fade) {
      if (this.stopped) return;
      this.stopped = true;
      clearInterval(this._timer);
      const t = this.ctx.currentTime;
      const g = this.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(0.0002, g.value), t);
      g.exponentialRampToValueAtTime(0.0001, t + fade);
      setTimeout(() => {
        try { this.gain.disconnect(); } catch (e) { /* noop */ }
      }, fade * 1000 + 300);
    }

    _tick() {
      if (this.stopped) return;
      const now = this.ctx.currentTime;
      if (this.nextTime < now - 0.4) this.nextTime = now + 0.05;
      const horizon = now + 0.22;
      let guard = 0;
      while (this.nextTime < horizon && guard++ < 64) {
        this._scheduleStep(this.step, this.nextTime);
        this.step = (this.step + 1) % this.total;
        this.nextTime += this.stepDur;
      }
    }

    _scheduleStep(step, time) {
      const def = this.def;
      const bar = Math.floor(step / 16) % def.bars;
      const s = step % 16;
      const chord = def.chords[bar];
      const barStart = s === 0;
      const swing = def.swing && s % 2 === 1 ? def.swing * this.stepDur : 0;
      const t = time + swing;

      if (barStart) {
        Inst.pad(this.ctx, this.gain, time, chord, this.stepDur * 16 * 1.04, def.padVol, def.name === 'story' ? 620 : 1100);
      }

      if (def.arpVol > 0 && s % 2 === 0) {
        const idx = def.arp[(step / 2) % def.arp.length] ?? 0;
        const midi = chord[idx % chord.length] + (def.arpOct || 12);
        const accent = s % 4 === 0 ? 1 : 0.72;
        Inst.marimba(this.ctx, this.gain, t, midi, this.stepDur * 1.4, def.arpVol * accent);
      }

      const melodyEvents = this.melodyMap.get(step);
      if (melodyEvents) {
        melodyEvents.forEach((ev) => {
          const durSec = Math.max(0.18, this.stepDur * ev.d * 1.05);
          if (def.name === 'experiment') {
            Inst.bell(this.ctx, this.gain, t, ev.n, durSec, def.melodyVol * ev.v, { ratio: 4.02, index: 0.5 });
          } else if (def.name === 'story' || def.name === 'final' || def.name === 'victory') {
            Inst.bell(this.ctx, this.gain, t, ev.n, durSec, def.melodyVol * ev.v, { ratio: 3.01, index: 0.8 });
          } else {
            Inst.bell(this.ctx, this.gain, t, ev.n, durSec, def.melodyVol * ev.v, { ratio: 2.0, index: 1.4 });
          }
        });
      }

      const bi = def.bassSteps.indexOf(s);
      if (bi >= 0) {
        const root = def.bassRoots[bar] + def.bassOffsets[bi];
        const dur = def.longBass ? this.stepDur * 14 : this.stepDur * (s === 0 ? 6 : 2.4);
        Inst.bass(this.ctx, this.gain, t, root, dur, def.name === 'story' ? 0.085 : 0.09);
      }

      const d = def.drums || {};
      if (d.kick && d.kick.includes(s)) Inst.kick(this.ctx, this.gain, t, 0.15);
      if (d.snare && d.snare.includes(s)) Inst.snare(this.ctx, this.gain, t, 0.05);
      if (d.hat && d.hat.includes(s)) Inst.hat(this.ctx, this.gain, t, 0.02);
      if (d.shaker && d.shaker.includes(s)) Inst.shaker(this.ctx, this.gain, t, 0.022);
      if (d.wood && d.wood.includes(s)) Inst.wood(this.ctx, this.gain, t, 0.026, 1180);
      if (d.tom && d.tom.includes(s)) Inst.tom(this.ctx, this.gain, t, 0.075, 150);
    }
  }

  /* ---------------- music director ---------------- */
  class MusicDirector {
    constructor() {
      this.engine = SQ.Audio;
      this.current = null;
      this.name = null;
      this.noise = null;
      this.volume = 1;
    }

    _ensureNoise() {
      if (!this.engine.ctx) return;
      if (!this.noise) this.noise = this.engine.noiseBuffer;
      SQ.Music.noise = this.noise;
    }

    play(name, opts = {}) {
      const eng = this.engine;
      if (!eng.ctx) return;
      if (!TRACKS[name]) return;
      if (this.name === name && this.current && !opts.restart) return;
      this._ensureNoise();
      const now = eng.ctx.currentTime;
      const fade = opts.fade ?? 1.2;
      const old = this.current;
      const player = new TrackPlayer(eng, TRACKS[name], name);
      player.fadeIn(now, Math.max(0.08, fade * 0.85));
      if (old) old.fadeOut(fade);
      this.current = player;
      this.name = name;
    }

    stop(fade = 0.8) {
      if (this.current) this.current.fadeOut(fade);
      this.current = null;
      this.name = null;
    }

    jingle(kind = 'success') {
      const eng = this.engine;
      if (!eng.ctx) return;
      this._ensureNoise();
      const ctx = eng.ctx;
      const dest = eng.buses.music;
      const t = ctx.currentTime + 0.02;
      const out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(dest);
      if (kind === 'success') {
        const notes = [72, 76, 79, 84];
        notes.forEach((n, i) => Inst.bell(ctx, out, t + i * 0.105, n, 0.9, 0.13, { ratio: 2.0, index: 1.2 }));
        Inst.pad(ctx, out, t + 0.32, [60, 64, 67, 72], 1.8, 0.035, 1400);
        Inst.bell(ctx, out, t + 0.42, 88, 1.6, 0.075, { ratio: 4.0, index: 0.5 });
        Inst.kick(ctx, out, t + 0.32, 0.08);
      } else if (kind === 'star') {
        [84, 88, 91, 96, 100].forEach((n, i) => Inst.bell(ctx, out, t + i * 0.065, n, 0.55, 0.09, { ratio: 4.0, index: 0.45 }));
      } else if (kind === 'mystery') {
        [69, 72, 76].forEach((n, i) => Inst.bell(ctx, out, t + i * 0.18, n, 1.4, 0.06, { ratio: 3.0, index: 0.6 }));
      }
      setTimeout(() => { try { out.disconnect(); } catch (e) { /* noop */ } }, 4200);
    }
  }

  SQ.Music = new MusicDirector();
  SQ.TRACKS = TRACKS;
})();
