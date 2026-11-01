/* =========================================================
   MICROVERSE ESCAPE — particles, dust, confetti, toasts, subtitles
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  const FX = {
    canvas: null,
    ctx: null,
    dustCanvas: null,
    dctx: null,
    W: 0,
    H: 0,
    dpr: 1,
    particles: [],
    dust: [],
    started: false,

    init() {
      if (this.started) return;
      this.started = true;
      this.canvas = document.getElementById('fx');
      this.dustCanvas = document.getElementById('dust');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.dctx = this.dustCanvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this._makeAmbientBubbles();
      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
    },

    resize() {
      if (!this.canvas) return;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = window.innerWidth;
      this.H = window.innerHeight;
      [this.canvas, this.dustCanvas].forEach((c) => {
        c.width = Math.floor(this.W * this.dpr);
        c.height = Math.floor(this.H * this.dpr);
      });
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.dctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (!this.dust.length) this._makeDust();
    },

    _makeDust() {
      this.dust = [];
      const count = this.W < 800 ? 26 : 46;
      for (let i = 0; i < count; i++) {
        this.dust.push({
          x: rnd(0, this.W),
          y: rnd(0, this.H),
          r: rnd(0.8, 2.6),
          vx: rnd(-0.08, 0.08),
          vy: rnd(-0.22, -0.05),
          a: rnd(0.08, 0.4),
          tw: rnd(0, Math.PI * 2),
          ts: rnd(0.005, 0.02)
        });
      }
    },

    _makeAmbientBubbles() {
      const holder = document.getElementById('ambient-bubbles');
      if (!holder) return;
      const count = window.innerWidth < 900 ? 7 : 12;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        const size = rnd(6, 20);
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        s.style.left = rnd(2, 96) + '%';
        s.style.animationDuration = rnd(13, 26) + 's';
        s.style.animationDelay = -rnd(0, 22) + 's';
        s.style.opacity = rnd(0.25, 0.7);
        holder.appendChild(s);
      }
    },

    _loop(t) {
      const ctx = this.ctx;
      const dctx = this.dctx;
      if (!ctx) return;
      const dt = 1;
      ctx.clearRect(0, 0, this.W, this.H);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= p.decay;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.alpha = Math.min(1, p.life / p.fade);
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'star') {
          ctx.beginPath();
          for (let k = 0; k < 5; k++) {
            const a1 = (k * 2 * Math.PI) / 5 - Math.PI / 2;
            const a2 = a1 + Math.PI / 5;
            ctx.lineTo(Math.cos(a1) * p.size, Math.sin(a1) * p.size);
            ctx.lineTo(Math.cos(a2) * p.size * 0.45, Math.sin(a2) * p.size * 0.45);
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      dctx.clearRect(0, 0, this.W, this.H);
      for (const d of this.dust) {
        d.x += d.vx;
        d.y += d.vy;
        d.tw += d.ts;
        if (d.y < -10) { d.y = this.H + 10; d.x = rnd(0, this.W); }
        if (d.x < -10) d.x = this.W + 10;
        if (d.x > this.W + 10) d.x = -10;
        const a = d.a * (0.55 + Math.sin(d.tw) * 0.45);
        dctx.beginPath();
        dctx.fillStyle = `rgba(166, 225, 255, ${a.toFixed(3)})`;
        dctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        dctx.fill();
      }
      requestAnimationFrame(this._loop);
    },

    burst(x, y, opts = {}) {
      if (!this.ctx) return;
      const {
        count = 18,
        colors = ['#ffd166', '#4fe6ff', '#ffffff', '#9df5c8'],
        speed = 3.4,
        spread = [0, Math.PI * 2],
        gravity = 0.05,
        size = [2, 5],
        shape = 'circle',
        life = [0.5, 1.1],
        drag = 0.97
      } = opts;
      const max = 340;
      const n = Math.min(count, max - this.particles.length);
      for (let i = 0; i < n; i++) {
        const angle = rnd(spread[0], spread[1]);
        const sp = rnd(speed * 0.35, speed);
        const lf = rnd(life[0], life[1]);
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * sp,
          vy: Math.sin(angle) * sp,
          gravity,
          drag,
          life: lf,
          decay: 1 / 60 / lf,
          fade: lf * 0.55,
          size: rnd(size[0], size[1]),
          color: pick(colors),
          shape,
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-0.2, 0.2),
          alpha: 1
        });
      }
    },

    sparkle(x, y, strength = 1) {
      this.burst(x, y, {
        count: Math.round(14 * strength),
        colors: ['#ffe6a6', '#ffd166', '#fff6d8', '#8ff2ff'],
        speed: 3.2 * strength,
        gravity: 0.02,
        size: [1.5, 3.6],
        life: [0.4, 0.9],
        shape: 'star'
      });
    },

    starBurst(x, y) {
      this.burst(x, y, {
        count: 34,
        colors: ['#ffd166', '#ffe9a8', '#fff8dc', '#4fe6ff'],
        speed: 5.2,
        gravity: 0.06,
        size: [3, 7],
        life: [0.7, 1.4],
        shape: 'star'
      });
    },

    confetti(count = 90) {
      if (!this.ctx) return;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: rnd(0, this.W),
          y: rnd(-this.H * 0.4, -10),
          vx: rnd(-1.2, 1.2),
          vy: rnd(1.2, 3.6),
          gravity: 0.045,
          drag: 0.997,
          life: rnd(3.6, 6),
          decay: 1 / 60 / 5,
          fade: 5.5,
          size: rnd(4, 10),
          color: pick(['#ffd166', '#4fe6ff', '#ff7aa8', '#9df5c8', '#b79bff', '#fff']),
          shape: 'rect',
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-0.15, 0.15),
          alpha: 1
        });
      }
    },

    center(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  };

  /* ---------------- UI helpers ---------------- */
  const UI = {
    subtitleEl: null,
    subTimer: null,

    init() {
      this.subtitleEl = document.getElementById('subtitle');
    },

    toast(text, opts = {}) {
      const layer = document.getElementById('toast-layer');
      if (!layer) return;
      const el = document.createElement('div');
      el.className = 'toast';
      const icon = opts.icon || 'star';
      el.innerHTML = `<svg class="tiny-icon"><use href="#i-${icon}"/></svg><span></span>`;
      el.querySelector('span').textContent = text;
      layer.appendChild(el);
      setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 320);
      }, opts.time || 2800);
    },

    showSubtitle(text, holdMs = 0) {
      if (!this.subtitleEl) return;
      clearTimeout(this.subTimer);
      this.subtitleEl.querySelector('span').textContent = text;
      this.subtitleEl.classList.add('show');
      if (holdMs) {
        this.subTimer = setTimeout(() => this.hideSubtitle(), holdMs);
      }
    },

    hideSubtitle() {
      clearTimeout(this.subTimer);
      if (this.subtitleEl) this.subtitleEl.classList.remove('show');
    },

    flash(color) {
      const el = document.getElementById('screen-flash');
      if (!el) return;
      if (color) el.style.background = color;
      el.classList.remove('fire');
      void el.offsetWidth;
      el.classList.add('fire');
    },

    setWorldLight(progress) {
      const app = document.getElementById('app');
      if (app) app.dataset.progress = String(progress);
    }
  };

  SQ.FX = FX;
  SQ.UI = UI;
})();
