/* =========================================================
   MICROVERSE ESCAPE — shared mission toolkit
   Materials, labels, delegated events, card dragging and
   small helpers used by the six 3D missions.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = (window.CV = window.CV || {});
  const T = window.THREE;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];
  const ar = (n) => SQ.UI.toAr(n);

  function standard(color, opts) {
    return new T.MeshStandardMaterial(Object.assign({
      color: color,
      emissive: color,
      emissiveIntensity: 0.16,
      roughness: 0.38,
      metalness: 0.16
    }, opts || {}));
  }

  function glass(color, opacity, opts) {
    return new T.MeshPhysicalMaterial(Object.assign({
      color: color,
      emissive: color,
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: opacity == null ? 0.3 : opacity,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.7,
      side: T.DoubleSide,
      depthWrite: false
    }, opts || {}));
  }

  function basic(color, opacity, opts) {
    return new T.MeshBasicMaterial(Object.assign({
      color: color,
      transparent: opacity != null,
      opacity: opacity == null ? 1 : opacity
    }, opts || {}));
  }

  function sphere(r, color, opts) {
    const m = new T.Mesh(new T.SphereGeometry(r, opts && opts.seg ? opts.seg : 20, opts && opts.seg ? opts.seg : 14), standard(color, opts));
    return m;
  }

  function labelHTML(arabic, english) {
    return '<span class="l-ar">' + arabic + '</span><span class="l-en">' + english + '</span>';
  }

  function panelTitle(icon, title, sub) {
    return '<div class="panel-title"><svg class="tiny-icon"><use href="#i-' + icon + '"/></svg>' +
      '<span>' + title + '</span></div>' + (sub ? '<p class="panel-sub">' + sub + '</p>' : '');
  }

  function obsRow(label, value, state) {
    return '<div class="obs-row"><span>' + label + '</span><i class="' + (state || '') + '">' + value + '</i></div>';
  }

  function create(api) {
    const stage = api.stage;
    const offs = [];
    const title = panelTitle;
    const row = obsRow;

    function on(el, type, fn, opts) {
      if (!el) return () => {};
      el.addEventListener(type, fn, opts);
      const off = () => el.removeEventListener(type, fn, opts);
      offs.push(off);
      return off;
    }

    function onClick(root, selector, fn) {
      return on(root, 'click', (e) => {
        const node = e.target.closest(selector);
        if (node && root.contains(node)) {
          e.preventDefault();
          fn(node, e);
        }
      });
    }

    function label(target, arText, enText, opts) {
      return stage.addLabel(target, labelHTML(arText, enText), Object.assign({ offsetY: 0.55 }, opts || {}));
    }

    function flashAt(world, color) {
      const g = stage.spark(color || 0xffffff, 0.5);
      g.position.copy(world);
      stage.add(g);
      let t0 = performance.now();
      const stop = stage.addTicker(() => {
        const k = Math.min(1, (performance.now() - t0) / 650);
        g.material.opacity = 0.9 * (1 - k);
        g.scale.setScalar(0.5 + k * 1.6);
        if (k >= 1) { stage.remove(g); stop(); }
      });
    }

    function burstAtObject(obj, color) {
      if (!obj) return;
      const p = new T.Vector3();
      obj.getWorldPosition(p);
      const s = stage.screenOf(p);
      if (s.visible && SQ.FX && SQ.FX.burst) {
        SQ.FX.burst(s.x, s.y, { count: 20, colors: ['#' + color.toString(16), '#ffd166', '#ffffff'], speed: 3.2 });
      }
    }

    function dragger(opts) {
      const root = typeof opts.root === 'function' ? opts.root() : opts.root;
      let drag = null;
      const onDown = (e) => {
        if (e.button !== 0) return;
        const el = e.target.closest(opts.selector);
        if (!el || (root && !root.contains(el))) return;
        drag = { el: el, value: el.dataset[opts.attr], x: e.clientX, y: e.clientY, id: e.pointerId, active: false, ghost: null };
      };
      const onMove = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.active) {
          if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
          drag.active = true;
          const ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.innerHTML = opts.ghost ? opts.ghost(drag.value, drag.el) : drag.el.innerHTML;
          document.body.appendChild(ghost);
          drag.ghost = ghost;
          document.body.classList.add('is-dragging-object');
        }
        drag.ghost.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%,-50%)';
      };
      const onUp = (e) => {
        if (!drag) return;
        const d = drag;
        drag = null;
        if (!d.active) return;
        if (d.ghost) d.ghost.remove();
        document.body.classList.remove('is-dragging-object');
        const hit = stage.pickAt(e.clientX, e.clientY);
        opts.onDrop(hit, d.value, d.el, e);
      };
      document.addEventListener('pointerdown', onDown);
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
      const off = () => {
        document.removeEventListener('pointerdown', onDown);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      };
      offs.push(off);
      return off;
    }

    function destroy() {
      while (offs.length) {
        try { offs.pop()(); } catch (e) { /* noop */ }
      }
    }

    return {
      api: api,
      stage: stage,
      on: on,
      onClick: onClick,
      label: label,
      panelTitle: title,
      row: row,
      flashAt: flashAt,
      burstAtObject: burstAtObject,
      dragger: dragger,
      destroy: destroy
    };
  }

  CV.kit = {
    wait: wait,
    clamp: clamp,
    rand: rand,
    pickOne: pickOne,
    ar: ar,
    standard: standard,
    glass: glass,
    basic: basic,
    sphere: sphere,
    labelHTML: labelHTML,
    panelTitle: panelTitle,
    obsRow: obsRow,
    create: create
  };
})();
