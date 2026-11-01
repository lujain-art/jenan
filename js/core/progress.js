/* =========================================================
   MICROVERSE ESCAPE — local progress, stars and team identity
   Everything is stored in localStorage; no backend, no login.
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const KEY = 'microverse-progress-v1';
  const ORDER = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];

  function blank() {
    return {
      team: '',
      stars: {},
      done: {},
      started: {},
      last: null,
      date: '',
      code: '',
      introSeen: false
    };
  }

  class Progress {
    constructor() {
      this.listeners = new Set();
      this.state = blank();
      this.load();
    }

    load() {
      let raw = null;
      try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
      if (!raw) return this.state;
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return this.state;
        const s = blank();
        s.team = typeof parsed.team === 'string' ? parsed.team.slice(0, 26) : '';
        s.date = typeof parsed.date === 'string' ? parsed.date : '';
        s.code = typeof parsed.code === 'string' ? parsed.code : '';
        s.last = ORDER.indexOf(parsed.last) >= 0 ? parsed.last : null;
        s.introSeen = !!parsed.introSeen;
        ORDER.forEach((id) => {
          const stars = parsed.stars && Number(parsed.stars[id]);
          if (stars >= 1) s.stars[id] = Math.min(3, Math.round(stars));
          if (parsed.done && parsed.done[id]) s.done[id] = true;
        });
        this.state = s;
      } catch (e) {
        this.state = blank();
      }
      return this.state;
    }

    save() {
      try { window.localStorage.setItem(KEY, JSON.stringify(this.state)); } catch (e) { /* private mode */ }
      this.listeners.forEach((fn) => {
        try { fn(this.state); } catch (e) { /* noop */ }
      });
    }

    onChange(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    _notify() {
      this.listeners.forEach((fn) => {
        try { fn(this.state); } catch (e) { /* noop */ }
      });
    }

    get starsTotal() {
      return ORDER.reduce((sum, id) => sum + (this.state.stars[id] || 0), 0);
    }

    get completedCount() {
      return ORDER.filter((id) => this.state.done[id]).length;
    }

    get allDone() {
      return this.completedCount === ORDER.length;
    }

    missionStars(id) { return this.state.stars[id] || 0; }
    isDone(id) { return !!this.state.done[id]; }
    wasStarted(id) { return !!this.state.started[id]; }

    isUnlocked(id) {
      const i = ORDER.indexOf(id);
      if (i <= 0) return true;
      return !!this.state.done[ORDER[i - 1]];
    }

    nextOf(id) {
      const i = ORDER.indexOf(id);
      return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
    }

    setTeam(name) {
      const clean = String(name || '').trim().slice(0, 26);
      if (clean === this.state.team) return;
      this.state.team = clean;
      this.save();
    }

    markStarted(id) {
      if (!this.state.started[id]) {
        this.state.started[id] = true;
        this.state.last = id;
        this.save();
      }
    }

    complete(id, stars) {
      const gained = Math.max(1, Math.min(3, Math.round(stars || 1)));
      this.state.stars[id] = Math.max(this.state.stars[id] || 0, gained);
      this.state.done[id] = true;
      this.state.last = id;
      if (!this.state.date && this.allDone) {
        this.state.date = new Date().toISOString();
        this.state.code = 'MV-' + this._codeFrom(this.state.team + this.state.date);
      }
      if (!this.state.code) this.state.code = 'MV-' + this._codeFrom(this.state.team || 'microverse');
      this.save();
    }

    _codeFrom(seed) {
      let h = 0;
      const str = String(seed || 'microverse');
      for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
      const n = Math.abs(h) % 9000 + 1000;
      return String(n);
    }

    markIntroSeen() {
      if (this.state.introSeen) return;
      this.state.introSeen = true;
      this.save();
    }

    reset() {
      this.state = blank();
      try { window.localStorage.removeItem(KEY); } catch (e) { /* noop */ }
      this._notify();
    }
  }

  SQ.Progress = new Progress();
  SQ.MISSION_ORDER = ORDER;
})();
