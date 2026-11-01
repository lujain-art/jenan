/* =========================================================
   MICROVERSE ESCAPE — shared HUD helpers
   Extends the base SQ.UI (fx.js) with mission-screen controls,
   Arabic-Indic numerals, confirmation dialogs and safe HTML.
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const UI = SQ.UI;
  const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

  UI.toAr = function (n) {
    return String(n).replace(/\d/g, (d) => AR[+d]);
  };

  UI.escapeHTML = function (str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  };

  UI.initMission = function () {
    this.missionToastEl = document.getElementById('mission-toast');
    this.stageLabels = document.getElementById('stage-labels');
    this.stageOverlay = document.getElementById('stage-overlay');
    this.stageReadout = document.getElementById('stage-readout');
    this.panelStart = document.getElementById('panel-start');
    this.panelEnd = document.getElementById('panel-end');
    this.missionBottom = document.getElementById('mission-bottom');
    this.objectiveText = document.getElementById('objective-text');
    this.progressFill = document.getElementById('progress-fill');
    this.objectiveCount = document.getElementById('objective-count');
    this.missionSteps = document.getElementById('mission-steps');
  };

  UI.missionToast = function (text, type, icon) {
    const el = this.missionToastEl;
    if (!el) return;
    clearTimeout(this._mToastTimer);
    el.className = 'mission-toast' + (type ? ' ' + type : '');
    const iconName = icon || (type === 'bad' ? 'cross' : type === 'ok' ? 'check' : 'bulb');
    el.innerHTML = '<svg class="tiny-icon"><use href="#i-' + iconName + '"/></svg><span></span>';
    el.querySelector('span').textContent = text;
    void el.offsetWidth;
    el.classList.add('show');
    this._mToastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  };

  UI.setObjective = function (text, current, total, suffix) {
    if (this.objectiveText && text != null) this.objectiveText.textContent = text;
    if (this.progressFill) {
      const pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;
      this.progressFill.style.width = pct.toFixed(1) + '%';
    }
    if (this.objectiveCount) {
      this.objectiveCount.textContent = this.toAr(current) + ' من ' + this.toAr(total) + (suffix ? ' ' + suffix : '');
    }
  };

  UI.setSteps = function (total, current) {
    const holder = this.missionSteps;
    if (!holder) return;
    let html = '';
    for (let i = 0; i < total; i++) {
      html += '<span class="mstep' + (i < current ? ' done' : '') + '"></span>';
    }
    holder.innerHTML = html;
  };

  UI.setPanel = function (which, html) {
    const el = which === 'start' ? this.panelStart : this.panelEnd;
    if (!el) return;
    el.innerHTML = html || '';
    el.scrollTop = 0;
  };

  UI.setPanels = function (startHTML, endHTML) {
    this.setPanel('start', startHTML);
    this.setPanel('end', endHTML);
  };

  UI.clearPanels = function () {
    this.setPanel('start', '');
    this.setPanel('end', '');
  };

  UI.setBottom = function (html) {
    if (this.missionBottom) this.missionBottom.innerHTML = html || '';
  };

  UI.setReadout = function (html) {
    const el = this.stageReadout;
    if (!el) return;
    el.innerHTML = html || '';
    el.classList.toggle('show', !!html);
  };

  UI.setHolo = function (html) {
    const layer = this.stageOverlay;
    if (!layer) return;
    let el = layer.querySelector('.holo-caption');
    if (!html) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.className = 'holo-caption';
      layer.appendChild(el);
    }
    el.innerHTML = html;
  };

  UI.clearHolo = function () {
    this.setHolo('');
  };

  UI.setStageOverlay = function (html) {
    if (!this.stageOverlay) return;
    this.stageOverlay.innerHTML = html || '';
  };

  UI.shake = function (el) {
    if (!el) return;
    el.classList.remove('wrong');
    void el.offsetWidth;
    el.classList.add('wrong');
  };

  UI.burstAt = function (el, opts) {
    if (!el || !SQ.FX || !SQ.FX.burst) return;
    const c = SQ.FX.center(el);
    if (c) SQ.FX.burst(c.x, c.y, opts);
  };

  UI.starsHTML = function (count, total) {
    let html = '';
    for (let i = 0; i < total; i++) {
      html += '<svg class="' + (i < count ? 'filled' : '') + '" viewBox="0 0 24 24"><use href="#i-star"/></svg>';
    }
    return html;
  };

  UI.dialogMode = function (on) {
    const app = document.getElementById('app');
    if (app) app.classList.toggle('dialog-mode', !!on);
  };

  UI.confirm = function (opts) {
    const o = Object.assign({
      title: 'تأكيد',
      text: '',
      ok: 'متابعة',
      cancel: 'إلغاء',
      danger: false
    }, opts || {});
    return new Promise((resolve) => {
      const layer = document.createElement('div');
      layer.className = 'overlay confirm-overlay';
      layer.innerHTML = `
        <div class="confirm-card ${o.danger ? 'danger' : ''}">
          <h2>${UI.escapeHTML(o.title)}</h2>
          <p>${UI.escapeHTML(o.text)}</p>
          <div class="confirm-actions">
            <button class="btn ${o.danger ? 'btn-danger' : 'btn-gold'}" data-cf="ok"><span>${UI.escapeHTML(o.ok)}</span></button>
            <button class="pill-btn ghost" data-cf="cancel"><span>${UI.escapeHTML(o.cancel)}</span></button>
          </div>
        </div>`;
      document.getElementById('app').appendChild(layer);
      const done = (val) => {
        layer.remove();
        document.removeEventListener('keydown', onKey);
        resolve(val);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') done(false);
        if (e.key === 'Enter') done(true);
      };
      layer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cf]');
        if (!btn) {
          if (e.target === layer) done(false);
          return;
        }
        done(btn.dataset.cf === 'ok');
      });
      document.addEventListener('keydown', onKey);
      const okBtn = layer.querySelector('[data-cf="ok"]');
      if (okBtn) setTimeout(() => okBtn.focus(), 60);
    });
  };

  UI.setMissionHeader = function (mission) {
    const chip = document.getElementById('mission-chip');
    const title = document.getElementById('mission-title');
    const goal = document.getElementById('mission-goal');
    if (chip) chip.textContent = mission.chip;
    if (title) title.textContent = mission.title;
    if (goal) goal.textContent = mission.goal;
    UI.setSteps(mission.steps || 2, 0);
  };

  UI.teamName = function () {
    const input = document.getElementById('team-input');
    const value = input && input.value.trim();
    return value || (SQ.Progress && SQ.Progress.state.team) || 'فريق المستكشفين';
  };
})();
