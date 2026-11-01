/* =========================================================
   MICROVERSE ESCAPE — character voices
   1) bundled Arabic neural voice clips (works offline)
   2) Arabic system speech when available (real pronunciation)
   3) expressive cartoon chatter synthesised locally as fallback
   Every line is also shown as a captioned speech bubble.
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const PROFILES = {
    nova: { pitch: 1.08, rate: 1.0, base: 212, formant: 900, vol: 0.05, name: 'نوفا' },
    pip: { pitch: 1.85, rate: 1.07, base: 356, formant: 1520, vol: 0.045, name: 'بيب' },
    orbit: { pitch: 1.2, rate: 1.02, base: 176, formant: 1180, vol: 0.05, name: 'أوربت' }
  };

  class VoiceSystem {
    constructor() {
      this.engine = SQ.Audio;
      this.supported = !!window.speechSynthesis && !!window.SpeechSynthesisUtterance;
      this.voices = [];
      this.mode = 'pending';
      this.activeUtterance = null;
      this.activeTimer = null;
      this.startTimer = null;
      this.failures = 0;
      this._nodes = [];
      this._token = 0;
      this._listeners = new Set();
      this._statusText = 'جارٍ فحص أصوات الشخصيات...';
      this._statusWarn = false;
      this.clips = (window.CV_VOICE_CLIPS && typeof window.CV_VOICE_CLIPS === 'object') ? window.CV_VOICE_CLIPS : null;
      this.activeClip = null;
      this._clipCache = new Map();
      this._clipFinish = null;
      this._clipTimer = null;
      if (this.engine && typeof this.engine.onChange === 'function') {
        this.engine.onChange(() => {
          if (this.activeClip) this.activeClip.volume = this._clipVolume();
        });
      }
    }

    async init() {
      this._refreshVoices();
      if (this._clipTotal()) {
        this.mode = 'clips';
        this._preloadClips();
        this._setStatus('أصوات الشخصيات جاهزة داخل اللعبة: نوفا وبيب وأوربت لكل منهم صوته الخاص — تعمل دون إنترنت.', false);
        return this.mode;
      }
      if (!this.supported) {
        this.mode = 'cartoon';
        this._setStatus('هذا المتصفح لا يوفّر أصوات نظام، لذلك نستخدم أصوات شخصيات كرتونية مرحة مع حوارات مكتوبة.', true);
        return this.mode;
      }
      if (!this.voices.length) {
        await new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          try {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
              this._refreshVoices();
              if (this.voices.length) finish();
            }, { once: true });
          } catch (e) { /* older engines */ }
          setTimeout(finish, 1400);
        });
        this._refreshVoices();
      }
      this.mode = this.voices.length ? 'tts' : 'cartoon';
      if (this.mode === 'tts') {
        const v = this._pick('nova');
        this._setStatus(`أصوات الشخصيات جاهزة بالعربية عبر صوت النظام${v ? ' (' + v.name.replace(/Microsoft|Desktop|Online|Natural/gi, '').trim() + ')' : ''}.`, false);
      } else {
        this._setStatus('لم نجد صوتًا عربيًا مثبتًا على هذا الجهاز، لذلك استخدمنا أصواتًا كرتونية مرحة، وكل حوار مكتوب في فقاعة على الشاشة.', true);
      }
      return this.mode;
    }

    _refreshVoices() {
      try {
        const all = window.speechSynthesis.getVoices() || [];
        this.voices = all.filter((v) => /^ar([-_]|$)/i.test(v.lang || ''));
      } catch (e) {
        this.voices = [];
      }
    }

    _pick(who) {
      if (!this.voices.length) return null;
      const female = /salma|hoda|zariyah|amina|laila|layla|female|hala|reem|سلمى|هدى/i;
      const male = /naayf|hamed|omar|maged|shakir|male|khalid|faisal|نايف|حامد/i;
      if (who === 'pip') {
        return this.voices.find((v) => female.test(v.name)) || this.voices[0];
      }
      if (who === 'orbit') {
        return this.voices.find((v) => male.test(v.name)) || this.voices[this.voices.length - 1];
      }
      return this.voices.find((v) => female.test(v.name)) || this.voices.find((v) => /ar-SA/i.test(v.lang)) || this.voices[0];
    }

    _setStatus(text, warn) {
      this._statusText = text;
      this._statusWarn = !!warn;
      this._listeners.forEach((fn) => {
        try { fn(text, warn, this.mode); } catch (e) { /* noop */ }
      });
    }

    onStatus(fn) {
      this._listeners.add(fn);
      fn(this._statusText, this._statusWarn, this.mode);
      return () => this._listeners.delete(fn);
    }

    get statusText() { return this._statusText; }
    get statusWarn() { return this._statusWarn; }

    /** speak one line, resolve when the voice finishes */
    async speak(who, text, opts = {}) {
      const profile = PROFILES[who] || PROFILES.nova;
      const muted = this.engine.settings.muted;
      this.stop();
      const token = this._token;

      if (muted) {
        const d = this.clipDuration(who, text) || this._readTime(text);
        await this._sleep(d);
        return { mode: 'silent', duration: d / 1000 };
      }

      const clip = this._clipFor(who, text);
      if (clip) {
        const spoken = await this._speakClip(clip, text);
        if (spoken) return spoken;
        if (token !== this._token) return null;
      }

      if (this.supported) {
        if (!this.voices.length) this._refreshVoices();
        if (this.voices.length) {
          const result = await this._speakTTS(who, text, profile, opts);
          if (result) return result;
          if (token !== this._token) return null;
        }
      }
      const duration = this._chatter(who, text, profile, opts);
      await this._sleep(duration * 1000);
      return { mode: 'cartoon', duration };
    }

    _clipFor(who, text) {
      const bank = this.clips && this.clips[who];
      const entry = bank && bank[text];
      return (entry && entry.f) ? entry : null;
    }

    _clipTotal() {
      if (!this.clips) return 0;
      return Object.keys(this.clips).reduce((sum, who) => sum + Object.keys(this.clips[who] || {}).length, 0);
    }

    /** clip length in ms, used to keep captions on screen for the whole line */
    clipDuration(who, text) {
      const entry = this._clipFor(who, text);
      return entry && entry.d ? Math.round(entry.d * 1000) : 0;
    }

    lineDuration(who, text) {
      return this.clipDuration(who, text) || this._readTime(text);
    }

    _clipVolume() {
      return clamp(this.engine.voiceLevel() * 1.1, 0, 1);
    }

    _audioFor(src) {
      let audio = this._clipCache.get(src);
      if (!audio) {
        audio = new Audio();
        audio.preload = 'auto';
        audio.src = src;
        this._clipCache.set(src, audio);
        try { audio.load(); } catch (e) { /* noop */ }
      }
      return audio;
    }

    _preloadClips() {
      if (!this.clips) return;
      Object.keys(this.clips).forEach((who) => {
        Object.keys(this.clips[who] || {}).forEach((text) => {
          const entry = this.clips[who][text];
          if (entry && entry.f) {
            try { this._audioFor(entry.f); } catch (e) { /* noop */ }
          }
        });
      });
    }

    _speakClip(entry, text) {
      const token = this._token;
      return new Promise((resolve) => {
        let settled = false;
        let audio;
        try {
          audio = this._audioFor(entry.f);
        } catch (e) {
          resolve(null);
          return;
        }
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(this._clipTimer);
          audio.onended = null;
          audio.onerror = null;
          if (this.activeClip === audio) this.activeClip = null;
          if (this._clipFinish === finish) this._clipFinish = null;
          const duration = Number.isFinite(audio.duration) ? audio.duration : (entry.d || 0);
          resolve(ok ? { mode: 'clip', duration } : null);
        };
        this._clipFinish = finish;
        this._clipTimer = setTimeout(() => finish(false), (entry.d ? entry.d * 1000 : this._readTime(text)) + 4000);
        audio.onended = () => finish(true);
        audio.onerror = () => {
          this.failures += 1;
          finish(false);
        };
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = this._clipVolume();
        } catch (e) { /* not ready yet */ }
        this.activeClip = audio;
        try {
          const playback = audio.play();
          if (playback && typeof playback.catch === 'function') {
            playback.catch(() => finish(false));
          }
        } catch (e) {
          finish(false);
          return;
        }
        if (token !== this._token) finish(false);
      });
    }

    _speakTTS(who, text, profile, opts) {
      const token = this._token;
      return new Promise((resolve) => {
        let settled = false;
        let started = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(this.activeTimer);
          clearTimeout(this.startTimer);
          this.activeUtterance = null;
          resolve(ok ? { mode: 'tts', duration: this._readTime(text) / 1000 } : null);
        };
        try {
          const u = new SpeechSynthesisUtterance(text);
          const voice = this._pick(who);
          if (voice) {
            u.voice = voice;
            u.lang = voice.lang || 'ar-SA';
          } else {
            u.lang = 'ar-SA';
          }
          u.pitch = clamp(profile.pitch * (opts.pitch || 1), 0, 2);
          u.rate = clamp(profile.rate * (opts.rate || 1), 0.5, 2);
          u.volume = clamp(this.engine.voiceLevel() * 1.4, 0, 1);
          u.onstart = () => {
            started = true;
            clearTimeout(this.startTimer);
          };
          u.onend = () => {
            this.failures = 0;
            finish(true);
          };
          u.onerror = () => {
            this.failures += 1;
            finish(false);
          };
          this.activeUtterance = u;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
          this.startTimer = setTimeout(() => {
            if (!started && !settled) {
              try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
              this.failures += 1;
              finish(false);
            }
          }, 1600);
          this.activeTimer = setTimeout(() => {
            if (!settled) {
              try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
              finish(started);
            }
          }, this._readTime(text) + 5000);
          if (token !== this._token) finish(false);
        } catch (e) {
          finish(false);
        }
      });
    }

    _readTime(text) {
      return clamp(1300 + text.length * 58, 1500, 7200);
    }

    _chatter(who, text, profile, opts) {
      const eng = this.engine;
      const duration = clamp(this._readTime(text) / 1000 * 0.72, 0.9, 4.3);
      if (!eng.ready) return duration;
      const ctx = eng.ctx;
      const dest = eng.buses.voice;
      const start = ctx.currentTime + 0.03;
      const syllables = Math.min(17, Math.max(3, Math.round(text.length / 4.6)));
      const step = duration / syllables;

      const mkSyllable = (t, freq, len, vol, vowel) => {
        const osc = ctx.createOscillator();
        osc.type = who === 'pip' ? 'sine' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(freq * (0.92 + Math.random() * 0.2), t + len);
        const form = ctx.createBiquadFilter();
        form.type = 'bandpass';
        form.frequency.value = profile.formant * (vowel ? 1.25 : 0.9);
        form.Q.value = 2.2;
        const form2 = ctx.createBiquadFilter();
        form2.type = 'bandpass';
        form2.frequency.value = profile.formant * 2.1;
        form2.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = rnd(-0.16, 0.16);
          form.connect(g); form2.connect(g); g.connect(pan); pan.connect(dest);
        } else {
          form.connect(g); form2.connect(g); g.connect(dest);
        }
        osc.connect(form); osc.connect(form2);
        osc.start(t);
        osc.stop(t + len + 0.02);
        this._nodes.push(osc);
        // consonant tick
        if (Math.random() < 0.55) {
          const n = ctx.createBufferSource();
          n.buffer = eng.noiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = rnd(1600, 3400);
          const ng = ctx.createGain();
          ng.gain.setValueAtTime(vol * 0.35, t);
          ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
          n.connect(bp); bp.connect(ng); ng.connect(dest);
          n.start(t, rnd(0, 1)); n.stop(t + 0.045);
          this._nodes.push(n);
        }
      };

      for (let i = 0; i < syllables; i++) {
        const t = start + i * step + rnd(0, step * 0.16);
        const contour = 0.94 + Math.sin((i / syllables) * Math.PI) * 0.18;
        const wobble = who === 'orbit' ? (i % 2 === 0 ? 1.1 : 0.94) : 1;
        const f = profile.base * contour * wobble * (0.97 + Math.random() * 0.07);
        const len = clamp(step * rnd(0.5, 0.8), 0.055, 0.16);
        mkSyllable(t, f, len, profile.vol * (0.8 + Math.random() * 0.4), i % 2 === 0);
      }

      if (who === 'orbit') {
        const t = start + duration - 0.3;
        [0, 0.08, 0.16, 0.25].forEach((d, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          const f = 980 + (i % 2) * 180;
          osc.frequency.setValueAtTime(f, t + d);
          osc.frequency.exponentialRampToValueAtTime(f * 0.78, t + d + 0.07);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t + d);
          g.gain.exponentialRampToValueAtTime(profile.vol * 0.9, t + d + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
          osc.connect(g); g.connect(dest);
          osc.start(t + d); osc.stop(t + d + 0.1);
          this._nodes.push(osc);
        });
      } else if (who === 'pip') {
        const t = start + 0.02;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.exponentialRampToValueAtTime(980, t + 0.16);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(profile.vol * 1.1, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + 0.22);
        this._nodes.push(osc);
      }

      setTimeout(() => {
        this._nodes = this._nodes.filter((n) => {
          try { return n.playbackState !== 3 && n.buffer !== null; } catch (e) { return false; }
        });
      }, (duration + 1) * 1000);

      return duration;
    }

    _sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    stop() {
      this._token++;
      clearTimeout(this.activeTimer);
      clearTimeout(this.startTimer);
      clearTimeout(this._clipTimer);
      if (this.supported) {
        try { window.speechSynthesis.cancel(); } catch (e) { /* noop */ }
      }
      this.activeUtterance = null;
      if (this.activeClip) {
        try {
          this.activeClip.pause();
          this.activeClip.currentTime = 0;
        } catch (e) { /* noop */ }
        this.activeClip = null;
      }
      const finishClip = this._clipFinish;
      this._clipFinish = null;
      if (finishClip) finishClip(false);
      this._nodes.forEach((n) => {
        try { n.stop(); } catch (e) { /* noop */ }
      });
      this._nodes = [];
    }
  }

  SQ.Voice = new VoiceSystem();
  SQ.VOICE_PROFILES = PROFILES;
})();
