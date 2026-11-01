/* =========================================================
   MICROVERSE ESCAPE — application controller
   Title → cinematic intro → shrink dive → sector map →
   six 3D missions → six escape keys → portal escape → certificate.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ = window.SQ || {};
  const CV = window.CV = window.CV || {};
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const SCREENS = {
    title: 'screen-title',
    intro: 'screen-intro',
    dive: 'screen-dive',
    map: 'screen-map',
    mission: 'screen-mission',
    victory: 'screen-victory'
  };

  class App {
    constructor() {
      this.currentScreen = 'title';
      this.currentMissionId = null;
      this.controller = null;
      this.stage = null;
      this.token = 0;
      this.introToken = 0;
      this.diveToken = 0;
      this.starting = false;
      this.paused = false;
      this.completing = false;
      this._diveStage = null;
      this._bound = false;
    }

    init() {
      try {
        if (!window.THREE) throw new Error('مكتبة الرسوم ثلاثية الأبعاد غير محمّلة (three.min.js).');
        SQ.UI.init();
        SQ.UI.initMission();
        SQ.FX.init();
        SQ.Characters.mount();
        SQ.Characters.show('nova');
        SQ.Characters.show('pip');
        SQ.Characters.hide('orbit');
        this.bindUI();
        this.bindSettings();
        this.bindAudio();
        this.renderMap();
        this.updateChrome();
        SQ.Progress.onChange(() => this.updateChrome());
        this.go('title');
        const fatal = document.getElementById('fatal');
        if (fatal) fatal.hidden = true;
      } catch (err) {
        this.fatal(err);
      }
    }

    /* ---------------- navigation ---------------- */
    go(scene) {
      const id = SCREENS[scene];
      if (!id) return;
      this.currentScreen = scene;
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('is-active', s.id === id));
      const app = document.getElementById('app');
      if (app) app.dataset.scene = scene;
      if (scene === 'victory') {
        app.classList.add('final-dim');
      } else {
        app.classList.remove('final-dim');
      }
    }

    async say(lineId, opts) {
      const line = CV.line(lineId);
      if (!line || !line.text) return null;
      SQ.UI.dialogMode(true);
      try {
        return await SQ.Dialogue.say(line.who, line.text, opts || {});
      } catch (err) {
        return null;
      } finally {
        SQ.UI.dialogMode(false);
      }
    }

    /* ---------------- title + intro ---------------- */
    async startAdventure() {
      if (this.starting) return;
      this.starting = true;
      try {
        await SQ.Audio.unlock();
        if (!SQ.Audio.ready) SQ.UI.toast('تعذّر تشغيل الصوت — يمكنكم اللعب بصمت.', { icon: 'muted', time: 4200 });
        await SQ.Voice.init();
        this.updateVoiceNote();
        SQ.SFX.play('machineStart');
        this.runIntro();
      } catch (err) {
        this.runIntro();
      } finally {
        this.starting = false;
      }
    }

    async runIntro() {
      const token = ++this.introToken;
      const app = document.getElementById('app');
      const screen = document.getElementById('screen-intro');
      const card = document.getElementById('intro-titlecard');
      const cta = document.getElementById('intro-cta');
      this.go('intro');
      if (cta) cta.hidden = true;
      if (card) card.classList.remove('show');
      if (screen) screen.classList.remove('lit');
      app.classList.add('intro-hide-cast');
      SQ.Characters.hide('orbit');
      SQ.Music.play('story', { fade: 1.4 });
      await wait(620);
      if (token !== this.introToken) return;
      if (screen) screen.classList.add('lit');
      if (card) card.classList.add('show');
      await wait(1500);
      if (token !== this.introToken) return;
      if (card) card.classList.remove('show');
      app.classList.remove('intro-hide-cast');

      await this.say('intro.n1', { minMs: 1600 });
      if (token !== this.introToken) return;
      await this.say('intro.nova1');
      if (token !== this.introToken) return;
      await this.say('intro.pip1');
      if (token !== this.introToken) return;

      this.glitch();
      await wait(500);
      if (token !== this.introToken) return;
      SQ.Characters.show('orbit');
      SQ.Characters.setState('orbit', 'surprised', 2600);
      await this.say('intro.orbit1');
      if (token !== this.introToken) return;
      await this.say('intro.nova2');
      if (token !== this.introToken) return;
      await this.say('intro.pip2');
      if (token !== this.introToken) return;
      await this.say('intro.n2');
      if (token !== this.introToken) return;
      this.showIntroCTA();
    }

    showIntroCTA() {
      const cta = document.getElementById('intro-cta');
      if (cta) cta.hidden = false;
    }

    skipIntro() {
      this.introToken++;
      SQ.Dialogue.cancelAll();
      SQ.UI.dialogMode(false);
      const app = document.getElementById('app');
      app.classList.remove('intro-hide-cast');
      const screen = document.getElementById('screen-intro');
      if (screen) screen.classList.add('lit');
      const card = document.getElementById('intro-titlecard');
      if (card) card.classList.remove('show');
      SQ.Characters.hideAllSpeech();
      this.showIntroCTA();
    }

    glitch() {
      const flash = document.getElementById('intro-flash');
      if (!flash) return;
      flash.classList.remove('fire', 'fire-red');
      void flash.offsetWidth;
      flash.classList.add('fire-red');
      SQ.SFX.play('error');
      setTimeout(() => flash.classList.remove('fire-red'), 900);
    }

    enterGame() {
      if (this.currentScreen !== 'intro') return;
      this.introToken++;
      SQ.Dialogue.cancelAll();
      SQ.UI.dialogMode(false);
      const screen = document.getElementById('screen-intro');
      if (screen) screen.classList.remove('lit');
      this.go('dive');
      this.runDive();
    }

    /* ---------------- cinematic dive ---------------- */
    runDive() {
      const token = ++this.diveToken;
      const holder = document.getElementById('intro3d');
      const title = document.getElementById('dive-title');
      if (holder) holder.innerHTML = '';
      if (title) title.classList.remove('show');
      setTimeout(() => { if (token === this.diveToken && title) title.classList.add('show'); }, 450);
      let stage = null;
      try {
        stage = new SQ.Stage(holder, {
          fov: 48, zoom: 15.5, minZoom: 2.4, maxZoom: 22,
          cameraY: 0, lookY: 0, autoSpin: 0.035
        }).init();
        this._diveStage = stage;
        this.buildDive(stage);
        stage.zoom = 15.5;
        stage.tween(6200, (t) => { stage.zoom = 15.5 - 12.4 * t; }, (t) => t * t * (3 - 2 * t));
      } catch (err) {
        if (holder) holder.innerHTML = '<div class="dive-fallback">الدخول إلى الخلية...</div>';
      }
      this._diveTimer = setTimeout(() => {
        if (token !== this.diveToken) return;
        this.finishDive();
      }, 6500);
    }

    buildDive(stage) {
      const cell = new THREE.Group();
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 48, 32),
        new THREE.MeshPhysicalMaterial({
          color: 0x4fe6ff, transparent: true, opacity: 0.16, roughness: 0.15,
          metalness: 0.1, side: THREE.DoubleSide, emissive: 0x0a4a66, emissiveIntensity: 0.6
        })
      );
      cell.add(shell);
      const wire = new THREE.Mesh(
        new THREE.SphereGeometry(2.52, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0x7be7ff, wireframe: true, transparent: true, opacity: 0.1 })
      );
      cell.add(wire);
      const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 32, 20),
        new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xd08400, emissiveIntensity: 0.8, roughness: 0.4 })
      );
      cell.add(nucleus);

      const bits = [];
      const colors = [0x4be3a8, 0xff9f68, 0x8b6bff, 0x5b9dff, 0x7be7ff];
      for (let i = 0; i < 16; i++) {
        const geo = i % 3 === 0 ? new THREE.SphereGeometry(0.12, 10, 8) : new THREE.CapsuleGeometry(0.07, 0.24, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length], emissive: colors[i % colors.length], emissiveIntensity: 0.4, roughness: 0.5 });
        const m = new THREE.Mesh(geo, mat);
        const r = 1.1 + Math.random() * 1.2;
        const a = Math.random() * Math.PI * 2;
        const b = Math.acos(2 * Math.random() - 1);
        m.position.set(r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a));
        m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        cell.add(m);
        bits.push(m);
      }
      const glow = stage.glow(0x4fe6ff, 6.5, 0.32);
      cell.add(glow);
      stage.add(cell);
      stage.addTicker((dt, t) => {
        wire.rotation.y += dt * 0.05;
        cell.rotation.z = Math.sin(t * 0.2) * 0.05;
        bits.forEach((m, i) => {
          m.rotation.x += dt * (0.2 + i * 0.01);
          m.rotation.z += dt * (0.15 + i * 0.008);
        });
        nucleus.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04);
      });
    }

    finishDive() {
      this.diveToken++;
      clearTimeout(this._diveTimer);
      SQ.UI.flash('rgba(190,255,245,.8)');
      SQ.SFX.play('sparkle');
      setTimeout(() => {
        if (this._diveStage) {
          this._diveStage.destroy();
          this._diveStage = null;
        }
        const holder = document.getElementById('intro3d');
        if (holder) holder.innerHTML = '';
        this.showMap(true);
      }, 520);
    }

    skipDive() {
      if (this.currentScreen !== 'dive') return;
      this.diveToken++;
      clearTimeout(this._diveTimer);
      if (this._diveStage) {
        this._diveStage.destroy();
        this._diveStage = null;
      }
      const holder = document.getElementById('intro3d');
      if (holder) holder.innerHTML = '';
      this.showMap(false);
    }

    /* ---------------- map ---------------- */
    showMap(first) {
      this.leaveMission();
      this.go('map');
      SQ.Music.play('menu', { fade: 0.9 });
      this.renderMap();
      this.updateChrome();
      if (first) {
        setTimeout(() => {
          if (this.currentScreen === 'map') this.say('map.ready');
        }, 700);
      }
    }

    renderMap() {
      const holder = document.getElementById('map-nodes');
      if (!holder) return;
      const order = SQ.MISSION_ORDER;
      let current = null;
      order.forEach((id) => {
        if (!current && SQ.Progress.isUnlocked(id) && !SQ.Progress.isDone(id)) current = id;
      });
      holder.innerHTML = order.map((id) => {
        const meta = CV.MISSIONS_META[id];
        const done = SQ.Progress.isDone(id);
        const unlocked = SQ.Progress.isUnlocked(id);
        const cls = ['mission-node'];
        if (done) cls.push('is-done');
        if (!unlocked) cls.push('is-locked');
        else if (id === current) cls.push('is-current');
        return `
          <button class="${cls.join(' ')}" style="left:${meta.pos.x}%;top:${meta.pos.y}%"
            data-mission="${id}" aria-label="${meta.title}" ${unlocked ? '' : 'aria-disabled="true"'}>
            <span class="node-star"><svg><use href="#i-star"/></svg></span>
            <span class="node-key" title="${meta.key}"><svg><use href="#i-key"/></svg></span>
            <div class="node-top">
              <span class="node-index">${SQ.UI.toAr(meta.n)}</span>
              <span class="node-art"><svg><use href="#i-${meta.icon}"/></svg></span>
            </div>
            <span class="node-tag">${meta.chip}</span>
            <b>${meta.title}</b>
            <small>${meta.short}</small>
            <span class="node-play">
              <svg><use href="#i-${done ? 'replay' : 'play'}"/></svg>
              <span>${done ? 'إعادة' : 'ابدأ'}</span>
            </span>
            ${unlocked ? '' : '<span class="node-lock"><svg><use href="#i-lock"/></svg></span>'}
          </button>`;
      }).join('');
    }

    updateChrome() {
      const p = SQ.Progress;
      const done = p.completedCount;
      SQ.UI.setWorldLight(Math.min(6, done));
      const count = document.getElementById('map-star-count');
      if (count) count.textContent = SQ.UI.toAr(done) + ' من ٦';
      const lights = document.getElementById('lights-label');
      if (lights) {
        const text = done === 0 ? 'بوابة الهروب: مغلقة تمامًا'
          : done <= 2 ? 'بوابة الهروب: طاقة ضعيفة'
          : done <= 4 ? 'بوابة الهروب: أنظمة تعمل'
          : done === 5 ? 'بوابة الهروب: على وشك الاكتمال'
          : 'بوابة الهروب: مفتوحة';
        lights.textContent = text;
        const world = document.getElementById('world');
        if (world) world.dataset.keys = String(done);
      }
      const dots = document.getElementById('map-progress-dots');
      if (dots) {
        dots.innerHTML = SQ.MISSION_ORDER.map((id) =>
          '<i class="' + (p.isDone(id) ? 'done' : '') + '"></i>').join('');
      }
      const certBtn = document.getElementById('cert-map-btn');
      if (certBtn) certBtn.hidden = !p.allDone;
      const input = document.getElementById('team-input');
      if (input && !input.value && p.state.team) input.value = p.state.team;
      this.refreshAudioUI();
      this.renderMap();
    }

    /* ---------------- missions ---------------- */
    async startMission(id) {
      const meta = CV.MISSIONS_META[id];
      if (!meta || !CV.Missions[id]) return;
      if (!SQ.Progress.isUnlocked(id)) {
        SQ.Dialogue.quip('pip', CV.line('map.locked').text);
        SQ.UI.toast('أكملوا المهمة السابقة أولًا.', 'bad', 'lock');
        return;
      }
      this.leaveMission();
      const token = ++this.token;
      this.currentMissionId = id;
      this.completing = false;
      SQ.Progress.markStarted(id);
      this.go('mission');
      SQ.UI.setMissionHeader(meta);
      SQ.UI.clearPanels();
      SQ.UI.setBottom('');
      SQ.UI.setReadout('');
      SQ.UI.clearHolo();
      SQ.UI.setStageOverlay('');
      SQ.UI.setObjective(meta.goal, 0, meta.total);
      SQ.UI.setSteps(meta.steps, 0);
      SQ.Characters.show('nova');
      SQ.Characters.show('pip');
      SQ.Characters.show('orbit');
      SQ.Characters.hideAllSpeech();
      SQ.UI.dialogMode(false);
      SQ.Music.play(meta.track || 'mission', { fade: 0.9 });

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (token !== this.token) return;
      try {
        this.stage = new SQ.Stage('stage3d', { zoom: 9.6 }).init();
      } catch (err) {
        this.fatal(err);
        return;
      }
      const api = this.makeApi(id, token, meta);
      try {
        this.controller = CV.Missions[id].start(api);
      } catch (err) {
        console.error('mission start failed', err);
        SQ.UI.missionToast('تعذّر بدء المهمة. حاولوا إعادة تشغيلها.', 'bad', 'cross');
      }
    }

    makeApi(id, token, meta) {
      const app = this;
      const alive = () => token === app.token;
      return {
        id: id,
        meta: meta,
        stage: this.stage,
        alive: alive,
        say: (lineId, opts) => (alive() ? app.say(lineId, opts) : Promise.resolve(null)),
        quip: (who, text, ms) => {
          if (!alive()) return;
          SQ.Dialogue.quip(who, text, ms);
        },
        toast: (text, type, icon) => {
          if (alive()) SQ.UI.missionToast(text, type, icon);
        },
        objective: (text, current, total) => {
          if (alive()) SQ.UI.setObjective(text, current, total == null ? meta.total : total);
        },
        steps: (n) => { if (alive()) SQ.UI.setSteps(meta.steps, n); },
        panel: (which, html) => { if (alive()) SQ.UI.setPanel(which, html); },
        panels: (a, b) => { if (alive()) SQ.UI.setPanels(a, b); },
        bottom: (html) => { if (alive()) SQ.UI.setBottom(html); },
        readout: (html) => { if (alive()) SQ.UI.setReadout(html); },
        holo: (html) => { if (alive()) SQ.UI.setHolo(html); },
        sound: (name, opts) => { if (alive()) SQ.SFX.play(name, opts); },
        fx: SQ.FX,
        complete: (stars, info) => {
          if (alive()) app.showComplete(stars, info || {});
        }
      };
    }

    leaveMission() {
      this.token++;
      if (this.controller) {
        try { this.controller.destroy(); } catch (e) { /* noop */ }
        this.controller = null;
      }
      if (this.stage) {
        try { this.stage.destroy(); } catch (e) { /* noop */ }
        this.stage = null;
      }
      SQ.Dialogue.cancelAll();
      SQ.UI.dialogMode(false);
      SQ.UI.clearPanels();
      SQ.UI.setBottom('');
      SQ.UI.setReadout('');
      SQ.UI.clearHolo();
      SQ.UI.setStageOverlay('');
      SQ.Characters.hideAllSpeech();
      const pause = document.getElementById('overlay-pause');
      if (pause) pause.hidden = true;
      this.paused = false;
      this.currentMissionId = this.controller ? this.currentMissionId : this.currentMissionId;
    }

    leaveToMap() {
      this.completing = false;
      const overlay = document.getElementById('overlay-complete');
      if (overlay) overlay.hidden = true;
      this.currentMissionId = null;
      this.showMap(false);
    }

    showComplete(stars, info) {
      if (this.completing) return;
      this.completing = true;
      const id = this.currentMissionId;
      if (!id) return;
      SQ.Progress.complete(id, stars);
      SQ.Music.jingle('success');
      SQ.SFX.play('celebrate');
      SQ.FX.confetti(90);
      SQ.Characters.setState('nova', 'happy', 2600);
      SQ.Characters.setState('pip', 'jump', 2200);
      SQ.Characters.setState('orbit', 'happy', 2600);
      SQ.UI.setObjective('اكتملت المهمة', 1, 1);

      const overlay = document.getElementById('overlay-complete');
      const chip = document.getElementById('complete-chip');
      const title = document.getElementById('complete-title');
      const text = document.getElementById('complete-text');
      const learn = document.getElementById('complete-learn');
      const btn = document.getElementById('complete-next');
      const starEl = document.getElementById('complete-star');
      const starLabel = document.getElementById('complete-stars-label');
      const earned = Math.max(1, Math.min(3, Math.round(stars) || 1));
      if (chip) chip.textContent = CV.MISSIONS_META[id].chip + ' • اكتملت';
      if (title) title.textContent = info.title || 'أحسنتم!';
      if (text) text.textContent = info.text || 'فتحتم قفلًا جديدًا واقتربتم من بوابة الهروب.';
      if (learn) learn.textContent = info.learn || '';
      if (starEl) {
        starEl.querySelectorAll('.cstar').forEach((svg, i) => {
          svg.classList.toggle('earned', i < earned);
          svg.style.animation = 'none';
          void svg.offsetWidth;
          svg.style.animation = '';
        });
      }
      if (starLabel) starLabel.textContent = 'النجوم: ' + SQ.UI.toAr(earned) + ' من ٣';
      if (btn) {
        const next = SQ.Progress.nextOf(id);
        btn.innerHTML = next
          ? '<span>المهمة التالية</span><svg class="btn-icon"><use href="#i-play"/></svg>'
          : '<span>إلى النصر</span><svg class="btn-icon"><use href="#i-star"/></svg>';
      }
      const keyEl = document.getElementById('complete-key');
      if (keyEl) {
        const meta = CV.MISSIONS_META[id];
        keyEl.innerHTML = '<svg><use href="#i-key"/></svg><span>' + (meta.key || 'مفتاح الهروب') + '</span>';
        keyEl.classList.remove('earned');
        void keyEl.offsetWidth;
        keyEl.classList.add('earned');
      }
      if (overlay) overlay.hidden = false;
      const center = starEl ? SQ.FX.center(starEl) : null;
      if (center) SQ.FX.starBurst(center.x, center.y);
    }

    nextMission() {
      const id = this.currentMissionId;
      const overlay = document.getElementById('overlay-complete');
      if (overlay) overlay.hidden = true;
      this.completing = false;
      if (!id) return;
      const next = SQ.Progress.nextOf(id);
      if (!next || SQ.Progress.allDone) {
        this.victory();
        return;
      }
      this.startMission(next);
    }

    victory() {
      this.leaveMission();
      this.currentMissionId = null;
      this.go('victory');
      SQ.Music.play('victory', { fade: 1 });
      SQ.Music.jingle('star');
      SQ.SFX.play('celebrate');
      SQ.FX.confetti(160);
      this.updateChrome();
      const team = SQ.Progress.state.team || 'فريق المستكشفين';
      const teamEl = document.getElementById('victory-team');
      if (teamEl) teamEl.textContent = 'الفريق: ' + team;
      const stars = document.getElementById('victory-stars');
      if (stars) {
        stars.innerHTML = '';
        for (let i = 0; i < 6; i++) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('class', 'v-star');
          svg.innerHTML = '<use href="#i-star"/>';
          svg.style.animationDelay = (0.15 + i * 0.12) + 's';
          stars.appendChild(svg);
        }
      }
      const starTotal = document.getElementById('victory-star-total');
      if (starTotal) starTotal.textContent = 'النجوم الذهبية: ' + SQ.UI.toAr(SQ.Progress.starsTotal) + ' من ١٨';
      const keysEl = document.getElementById('victory-keys');
      if (keysEl) keysEl.textContent = 'مفاتيح الهروب: ' + SQ.UI.toAr(SQ.Progress.completedCount) + ' من ٦';
      SQ.Characters.show('nova');
      SQ.Characters.show('pip');
      SQ.Characters.show('orbit');
      SQ.Characters.setState('nova', 'happy');
      SQ.Characters.setState('pip', 'jump');
      SQ.Characters.setState('orbit', 'excited');
      setTimeout(() => {
        if (this.currentScreen === 'victory') this.say('victory.narr');
      }, 900);
      setTimeout(() => SQ.FX.confetti(80), 1400);
    }

    /* ---------------- certificate ---------------- */
    showCertificate() {
      const p = SQ.Progress;
      const team = p.state.team || 'فريق المستكشفين';
      const cert = document.getElementById('overlay-certificate');
      const set = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      set('cert-team', team);
      set('cert-missions', SQ.UI.toAr(p.completedCount) + ' من ٦');
      set('cert-keys', SQ.UI.toAr(p.completedCount) + ' من ٦');
      set('cert-stars', SQ.UI.toAr(p.starsTotal));
      let dateText = '—';
      if (p.state.date) {
        const d = new Date(p.state.date);
        if (!isNaN(d.getTime())) {
          try {
            dateText = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
          } catch (e) {
            dateText = d.toLocaleDateString('ar');
          }
        }
      }
      set('cert-date', dateText);
      set('cert-code', p.state.code || 'MV-0000');
      if (cert) cert.hidden = false;
      SQ.SFX.play('sparkle');
    }

    closeCertificate() {
      const cert = document.getElementById('overlay-certificate');
      if (cert) cert.hidden = true;
    }

    /* ---------------- teacher + pause ---------------- */
    openTeacher() {
      this.closeSettings();
      const menu = document.getElementById('teacher-menu');
      const back = document.getElementById('teacher-backdrop');
      if (menu) {
        menu.classList.add('open');
        menu.setAttribute('aria-hidden', 'false');
      }
      if (back) back.hidden = false;
    }

    closeTeacher() {
      const menu = document.getElementById('teacher-menu');
      const back = document.getElementById('teacher-backdrop');
      if (menu) {
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
      }
      if (back) back.hidden = true;
    }

    pauseGame() {
      if (!this.currentMissionId) {
        SQ.UI.toast('ابدأوا مهمة أولًا لتشغيل الإيقاف المؤقت.', { icon: 'bulb' });
        return;
      }
      this.closeTeacher();
      this.paused = true;
      this._pausedTrack = CV.MISSIONS_META[this.currentMissionId].track || 'mission';
      SQ.Music.stop(0.25);
      SQ.Dialogue.cancelAll();
      if (this.stage) this.stage.pause();
      const overlay = document.getElementById('overlay-pause');
      if (overlay) overlay.hidden = false;
    }

    resumeGame() {
      this.paused = false;
      const overlay = document.getElementById('overlay-pause');
      if (overlay) overlay.hidden = true;
      if (this.stage) this.stage.resume();
      SQ.Music.play(this._pausedTrack || 'mission', { fade: 0.8 });
    }

    restartMission() {
      const id = this.currentMissionId;
      const overlay = document.getElementById('overlay-pause');
      if (overlay) overlay.hidden = true;
      this.closeTeacher();
      if (!id) return;
      this.startMission(id);
    }

    skipDialogue() {
      this.closeTeacher();
      SQ.Dialogue.cancelAll();
      SQ.UI.dialogMode(false);
      SQ.Characters.hideAllSpeech();
      SQ.UI.hideSubtitle();
    }

    /* ---------------- settings / audio ---------------- */
    bindSettings() {
      document.querySelectorAll('input[data-audio]').forEach((input) => {
        input.addEventListener('input', () => {
          const key = input.dataset.audio;
          SQ.Audio.setSetting(key, Number(input.value));
          this.refreshAudioUI();
        });
      });
      document.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          SQ.Audio.toggle(btn.dataset.toggle);
          SQ.SFX.play('click');
          this.refreshAudioUI();
        });
      });
      const backdrop = document.getElementById('settings-backdrop');
      if (backdrop) backdrop.addEventListener('click', () => this.closeSettings());
      const tback = document.getElementById('teacher-backdrop');
      if (tback) tback.addEventListener('click', () => this.closeTeacher());
      const team = document.getElementById('team-input');
      if (team) {
        team.addEventListener('input', () => SQ.Progress.setTeam(team.value));
        team.addEventListener('blur', () => SQ.Progress.setTeam(team.value));
      }
    }

    bindAudio() {
      SQ.Audio.onChange(() => this.refreshAudioUI());
      SQ.Voice.onStatus((text, warn) => {
        const note = document.getElementById('audio-note');
        if (!note) return;
        note.textContent = text;
        note.classList.toggle('warn', !!warn);
      });
      this.refreshAudioUI();
    }

    refreshAudioUI() {
      const s = SQ.Audio.settings;
      ['master', 'music', 'sfx', 'voice'].forEach((key) => {
        const input = document.getElementById('vol-' + key);
        const out = document.getElementById('out-' + key);
        if (input) {
          input.value = s[key];
          input.style.setProperty('--pct', s[key] + '%');
        }
        if (out) out.textContent = SQ.UI.toAr(s[key]) + '٪';
      });
      document.querySelectorAll('[data-toggle]').forEach((btn) => {
        const on = !!s[btn.dataset.toggle];
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      const mute = document.getElementById('mute-btn');
      if (mute) {
        mute.classList.toggle('is-off', !!s.muted);
        mute.setAttribute('aria-pressed', s.muted ? 'true' : 'false');
        const use = mute.querySelector('use');
        if (use) use.setAttribute('href', s.muted ? '#i-muted' : '#i-volume');
        mute.setAttribute('aria-label', s.muted ? 'تشغيل الصوت' : 'كتم الصوت');
        mute.setAttribute('title', s.muted ? 'تشغيل الصوت' : 'كتم الصوت');
      }
    }

    updateVoiceNote() {
      const note = document.getElementById('audio-note');
      if (!note) return;
      note.textContent = SQ.Voice.statusText;
      note.classList.toggle('warn', !!SQ.Voice.statusWarn);
    }

    openSettings() {
      this.closeTeacher();
      const s = document.getElementById('settings');
      const back = document.getElementById('settings-backdrop');
      if (s) {
        s.classList.add('open');
        s.setAttribute('aria-hidden', 'false');
      }
      if (back) back.hidden = false;
      this.refreshAudioUI();
    }

    closeSettings() {
      const s = document.getElementById('settings');
      const back = document.getElementById('settings-backdrop');
      if (s) {
        s.classList.remove('open');
        s.setAttribute('aria-hidden', 'true');
      }
      if (back) back.hidden = true;
    }

    testAudio() {
      SQ.Audio.unlock().then(() => {
        SQ.SFX.play('celebrate');
        SQ.Music.jingle('star');
        const line = CV.line('intro.nova1');
        SQ.Characters.say('nova', line.text, 3000);
        SQ.Voice.speak('nova', line.text);
      });
    }

    /* ---------------- global bindings ---------------- */
    bindUI() {
      if (this._bound) return;
      this._bound = true;
      document.addEventListener('click', (e) => {
        const node = e.target.closest('[data-mission]');
        if (node) {
          this.startMission(node.dataset.mission);
          SQ.SFX.play('click');
          return;
        }
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        e.preventDefault();
        this.handleAction(actionEl.dataset.action);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!document.getElementById('overlay-certificate').hidden) {
            this.closeCertificate();
          } else if (document.getElementById('settings').classList.contains('open')) {
            this.closeSettings();
          } else if (document.getElementById('teacher-menu').classList.contains('open')) {
            this.closeTeacher();
          } else if (!document.getElementById('overlay-pause').hidden) {
            this.resumeGame();
          }
        }
      });
      window.addEventListener('resize', () => {
        if (this.stage) this.stage.resize();
      });
      window.addEventListener('error', (e) => {
        console.error('MICROVERSE runtime error:', e.error || e.message);
      });
      window.addEventListener('unhandledrejection', (e) => {
        console.error('MICROVERSE promise rejection:', e.reason);
      });
    }

    handleAction(action) {
      SQ.SFX.play('click');
      switch (action) {
        case 'start-adventure': this.startAdventure(); break;
        case 'skip-intro': this.skipIntro(); break;
        case 'enter-game': this.enterGame(); break;
        case 'skip-dive': this.skipDive(); break;
        case 'replay-intro':
          if (this.currentScreen === 'map') {
            this.introToken++;
            this.runIntro();
          }
          break;
        case 'show-certificate': this.showCertificate(); break;
        case 'close-certificate': this.closeCertificate(); break;
        case 'print-certificate': this.printCertificate(); break;
        case 'next-mission': this.nextMission(); break;
        case 'to-map': this.leaveToMap(); this.closeTeacher(); break;
        case 'hint': this.showHint(); break;
        case 'open-teacher': this.openTeacher(); break;
        case 'close-teacher': this.closeTeacher(); break;
        case 'pause': this.pauseGame(); break;
        case 'resume': this.resumeGame(); break;
        case 'restart-mission': this.restartMission(); break;
        case 'skip-dialogue': this.skipDialogue(); break;
        case 'fullscreen': this.toggleFullscreen(); break;
        case 'open-settings': this.openSettings(); break;
        case 'close-settings': this.closeSettings(); break;
        case 'reset-progress': this.resetProgress(); break;
        case 'toggle-mute': SQ.Audio.toggle('muted'); this.refreshAudioUI(); break;
        case 'test-audio': this.testAudio(); break;
        case 'victory-map':
          this.closeCertificate();
          this.showMap(false);
          break;
        case 'replay-game':
          SQ.UI.confirm({
            title: 'لعب من جديد؟',
            text: 'ستبدأون من المقدمة الافتتاحية، وستُحفظ نتائج الفريق الحالية حتى تعيدوا الضبط من أدوات المعلم.',
            ok: 'ابدأوا من جديد'
          }).then((ok) => {
            if (!ok) return;
            this.leaveMission();
            this.currentMissionId = null;
            this.introToken++;
            SQ.Music.stop(0.5);
            this.go('title');
          });
          break;
        default: break;
      }
    }

    showHint() {
      if (!this.currentMissionId || !CV.Missions[this.currentMissionId]) {
        SQ.UI.toast('ابدأوا مهمة أولًا.', { icon: 'bulb' });
        return;
      }
      const id = this.currentMissionId;
      if (this.controller && this.controller.hint) {
        this.controller.hint();
      } else {
        this.say(id + '.hint');
      }
      SQ.SFX.play('scan');
    }

    async resetProgress() {
      const ok = await SQ.UI.confirm({
        title: 'إعادة ضبط التقدّم؟',
        text: 'ستُحذف النجوم واسم الفريق ونتائج المهمات من هذا الجهاز. لا يمكن التراجع عن هذه الخطوة.',
        ok: 'نعم، أعيدوا الضبط',
        cancel: 'إلغاء',
        danger: true
      });
      if (!ok) return;
      this.leaveMission();
      this.currentMissionId = null;
      this.completing = false;
      const overlay = document.getElementById('overlay-complete');
      if (overlay) overlay.hidden = true;
      this.closeTeacher();
      this.closeSettings();
      this.closeCertificate();
      SQ.Progress.reset();
      SQ.Music.stop(0.6);
      const team = document.getElementById('team-input');
      if (team) team.value = '';
      this.introToken++;
      this.go('title');
      SQ.UI.toast('تمت إعادة ضبط التقدّم.', { icon: 'check' });
    }

    toggleFullscreen() {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    printCertificate() {
      window.print();
    }

    fatal(err) {
      console.error(err);
      const fatal = document.getElementById('fatal');
      const msg = document.getElementById('fatal-msg');
      if (fatal) fatal.hidden = false;
      if (msg) {
        msg.textContent = (err && err.message ? err.message : 'حدث خطأ غير متوقع.') +
          ' — تأكدوا من أن المتصفح يدعم WebGL، ثم أعيدوا تحميل الصفحة.';
      }
    }
  }

  CV.App = new App();
})();
