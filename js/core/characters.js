/* =========================================================
   MICROVERSE ESCAPE — cast: NOVA, PIP, ORBIT
   Animated WebP character sprites + expression controller + dialogue
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const BASE = 'assets/characters/';

  const CAST = {
    nova: { name: 'نوفا', role: 'قائدة الفريق', states: ['idle', 'talk', 'happy', 'sad', 'surprised', 'wave'] },
    pip: { name: 'بيب', role: 'رفيق مضيء', states: ['idle', 'talk', 'happy', 'sad', 'surprised'] },
    orbit: { name: 'أوربت', role: 'محلّل الأنظمة', states: ['idle', 'talk', 'happy', 'sad', 'surprised'] }
  };

  /* Legacy animation names used by the app → sprite state */
  const ALIAS = {
    'talk-hands': 'talk',
    excited: 'happy',
    jump: 'happy',
    spin: 'happy',
    defeated: 'sad',
    sneak: 'surprised',
    warn: 'surprised'
  };

  const stateFile = (who, state) => BASE + who + '-' +
    (CAST[who].states.indexOf(state) >= 0 ? state : 'idle') + '.webp';

  class CharacterManager {
    constructor() {
      this.els = {};
      this.imgs = {};
      this.state = {};
      this.talking = {};
      this.speechTimers = {};
      this.stateTimers = {};
      this.shown = { nova: true, pip: true, orbit: false };
    }

    mount() {
      const holder = document.getElementById('characters');
      if (!holder) return;
      holder.innerHTML = Object.keys(CAST).map((id) => `
        <div class="character char-${id}" id="char-${id}" data-char="${id}">
          <div class="speech" role="status">
            <b class="speech-name">${CAST[id].name}</b>
            <span class="speech-text"></span>
          </div>
          <img class="char-img" alt="${CAST[id].name}" decoding="async" src="${stateFile(id, 'idle')}">
        </div>`).join('');
      Object.keys(CAST).forEach((id) => {
        this.els[id] = document.getElementById('char-' + id);
        this.imgs[id] = this.els[id].querySelector('.char-img');
        this.state[id] = 'idle';
        CAST[id].states.forEach((s) => {
          const pre = new Image();
          pre.src = stateFile(id, s);
        });
      });
      this.els.orbit.classList.remove('is-present');
    }

    paint(who) {
      const el = this.els[who];
      if (!el) return;
      const want = this.talking[who] ? 'talk' : (this.state[who] || 'idle');
      const img = this.imgs[who];
      const src = stateFile(who, want);
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
    }

    setState(who, state, duration) {
      const el = this.els[who];
      if (!el) return;
      clearTimeout(this.stateTimers[who]);
      const next = state ? (ALIAS[state] || state) : 'idle';
      this.state[who] = next;
      this.paint(who);
      if (state && duration) {
        this.stateTimers[who] = setTimeout(() => {
          this.state[who] = 'idle';
          this.paint(who);
        }, duration);
      }
    }

    clearState(who) {
      const el = this.els[who];
      if (!el) return;
      clearTimeout(this.stateTimers[who]);
      this.state[who] = 'idle';
      this.paint(who);
    }

    setTalking(who, on) {
      if (!this.els[who]) return;
      this.talking[who] = !!on;
      this.paint(who);
    }

    show(who) {
      const el = this.els[who];
      if (!el) return;
      el.classList.add('is-present');
      this.shown[who] = true;
    }

    hide(who) {
      const el = this.els[who];
      if (!el) return;
      el.classList.remove('is-present');
      this.shown[who] = false;
      this.hideSpeech(who);
    }

    say(who, text, duration) {
      const el = this.els[who];
      if (!el) return;
      const bubble = el.querySelector('.speech');
      bubble.querySelector('.speech-text').textContent = text;
      bubble.classList.add('show');
      this.setTalking(who, true);
      clearTimeout(this.speechTimers[who]);
      const ms = duration || Math.min(9000, Math.max(2400, text.length * 68));
      this.speechTimers[who] = setTimeout(() => {
        this.hideSpeech(who);
      }, ms);
    }

    hideSpeech(who) {
      const el = this.els[who];
      if (!el) return;
      clearTimeout(this.speechTimers[who]);
      el.querySelector('.speech').classList.remove('show');
      this.setTalking(who, false);
    }

    hideAllSpeech() {
      Object.keys(this.els).forEach((id) => {
        clearTimeout(this.speechTimers[id]);
        this.els[id].querySelector('.speech').classList.remove('show');
        this.clearState(id);
        this.talking[id] = false;
        this.paint(id);
      });
    }
  }

  /* ---------------- dialogue director ---------------- */
  class DialogueManager {
    constructor() {
      this.token = 0;
      this.cancelResolvers = new Set();
      this.duckCount = 0;
      this.active = false;
    }

    beginDuck() {
      this.duckCount++;
      if (this.duckCount === 1) SQ.Audio.duckMusic(0.34, 0.5);
    }

    endDuck() {
      this.duckCount = Math.max(0, this.duckCount - 1);
      if (this.duckCount === 0) SQ.Audio.unduckMusic(0.8);
    }

    nameTag(who, text) {
      const meta = CAST[who];
      return meta ? meta.name + ' · ' + text : text;
    }

    async say(who, text, opts = {}) {
      if (!text) return;
      const token = ++this.token;
      const narrator = who === 'narrator';
      const characters = SQ.Characters;
      const onMission = document.getElementById('app')?.dataset.scene === 'mission';
      const started = performance.now();
      this.active = true;
      this.beginDuck();
      if (narrator || onMission) {
        SQ.UI.showSubtitle(onMission && !narrator ? this.nameTag(who, text) : text);
      }
      if (!narrator) {
        characters.show(who);
        const lineMs = Math.min(16000, Math.max(2400, SQ.Voice.lineDuration(who, text) + 700, text.length * 68));
        characters.say(who, text, lineMs);
      }
      const cancelled = new Promise((resolve) => this.cancelResolvers.add(resolve));
      const voicePromise = SQ.Voice.speak(narrator ? 'nova' : who, text, opts).catch(() => null);
      const result = await Promise.race([voicePromise, cancelled]);
      if (token !== this.token) {
        this.endDuck();
        return null;
      }
      const elapsed = performance.now() - started;
      const minMs = opts.minMs ?? 1250;
      if (elapsed < minMs) await wait(minMs - elapsed);
      if (token !== this.token) {
        this.endDuck();
        return null;
      }
      if (!narrator) characters.hideSpeech(who);
      if (narrator || onMission) SQ.UI.hideSubtitle();
      this.endDuck();
      this.active = false;
      await wait(140);
      return result;
    }

    /** short reaction line: bubble + voice, never cutting off main dialogue */
    quip(who, text, ms = 3200) {
      SQ.Characters.show(who);
      const hold = Math.min(9000, Math.max(ms, SQ.Voice.lineDuration(who, text) + 500));
      SQ.Characters.say(who, text, hold);
      if (!this.active) {
        if (document.getElementById('app')?.dataset.scene === 'mission') {
          SQ.UI.showSubtitle(this.nameTag(who, text), hold);
        }
        this.beginDuck();
        SQ.Voice.speak(who, text)
          .catch(() => null)
          .then(() => this.endDuck());
      }
      return wait(Math.min(ms, 1200));
    }

    cancelAll() {
      this.token++;
      this.cancelResolvers.forEach((resolve) => resolve(null));
      this.cancelResolvers.clear();
      this.duckCount = 0;
      SQ.Audio.unduckMusic(0.4);
      SQ.Voice.stop();
      SQ.Characters.hideAllSpeech();
      SQ.UI.hideSubtitle();
      this.active = false;
    }
  }

  SQ.Characters = new CharacterManager();
  SQ.Dialogue = new DialogueManager();
  SQ.CAST = CAST;
})();
