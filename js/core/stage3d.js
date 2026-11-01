/* =========================================================
   MICROVERSE ESCAPE — 3D stage engine on top of Three.js (r147 UMD)
   Orbit drag, wheel zoom, raycast picking, projected HTML
   labels, tweens and shared sci-fi helpers.
   ========================================================= */
(function () {
  'use strict';
  const SQ = (window.SQ = window.SQ || {});
  const T = window.THREE;

  let glowTexture = null;
  function getGlowTexture() {
    if (glowTexture) return glowTexture;
    const size = 128;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.22, 'rgba(255,255,255,.72)');
    g.addColorStop(0.55, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    glowTexture = new THREE.CanvasTexture(cv);
    glowTexture.needsUpdate = true;
    return glowTexture;
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  class Stage {
    constructor(container, opts) {
      this.container = typeof container === 'string' ? document.getElementById(container) : container;
      this.opts = Object.assign({
        fov: 42,
        zoom: 9.4,
        minZoom: 5.4,
        maxZoom: 14.5,
        cameraY: 2.3,
        lookY: 0.35,
        autoSpin: 0.000
      }, opts || {});
      this.labels = [];
      this.pickables = [];
      this.tickers = [];
      this.tweens = [];
      this.pickHandler = null;
      this.hoverHandler = null;
      this.dragHandler = null;
      this.yaw = 0;
      this.pitch = 0;
      this.zoom = this.opts.zoom;
      this._dragging = false;
      this._objectDrag = false;
      this._downPos = null;
      this._moved = 0;
      this._hoverPending = null;
      this._running = false;
      this._onDown = this._onDown.bind(this);
      this._onMove = this._onMove.bind(this);
      this._onUp = this._onUp.bind(this);
      this._onWheel = this._onWheel.bind(this);
      this._loop = this._loop.bind(this);
    }

    init() {
      if (!T) throw new Error('Three.js غير محمّل');
      if (!this.container) throw new Error('حاوية المشهد ثلاثي الأبعاد غير موجودة');
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(1.8, window.devicePixelRatio || 1));
      if ('outputEncoding' in this.renderer) this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.domElement.setAttribute('aria-label', 'مشهد ثلاثي الأبعاد تفاعلي');
      this.renderer.domElement.setAttribute('role', 'img');
      this.container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x061020, 0.024);
      this.root = new THREE.Group();
      this.scene.add(this.root);
      this.camera = new THREE.PerspectiveCamera(this.opts.fov, 1, 0.1, 90);
      this.camera.position.set(0, this.opts.cameraY, this.zoom);
      this.camera.lookAt(0, this.opts.lookY, 0);

      const hemi = new THREE.HemisphereLight(0xa8e4ff, 0x0a1428, 1.05);
      this.scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(5, 9, 7);
      this.scene.add(key);
      const rim = new THREE.DirectionalLight(0x4fe6ff, 0.85);
      rim.position.set(-7, 4, -6);
      this.scene.add(rim);
      const gold = new THREE.PointLight(0xffc46b, 1.25, 26);
      gold.position.set(0, 4.2, 2.5);
      this.scene.add(gold);

      // ambient starfield for depth
      const count = 230;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = 9 + Math.random() * 7;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
        pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.starMat = new THREE.PointsMaterial({
        color: 0x8fd8ff, size: 0.05, transparent: true, opacity: 0.65,
        depthWrite: false, blending: THREE.AdditiveBlending
      });
      this.scene.add(new THREE.Points(geo, this.starMat));

      this.raycaster = new THREE.Raycaster();
      this.pointerNDC = new THREE.Vector2();

      const c = this.renderer.domElement;
      c.addEventListener('pointerdown', this._onDown);
      c.addEventListener('pointermove', this._onMove);
      c.addEventListener('pointerup', this._onUp);
      c.addEventListener('pointercancel', this._onUp);
      c.addEventListener('pointerleave', () => { if (!this._dragging) this._setCursor(''); });
      c.addEventListener('wheel', this._onWheel, { passive: false });

      this.resize();
      if (window.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.resize());
        this.ro.observe(this.container);
      }
      window.addEventListener('resize', this._onResize = () => this.resize());
      this._running = true;
      this._lastT = performance.now();
      requestAnimationFrame(this._loop);
      return this;
    }

    resize() {
      if (!this.renderer) return;
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.W = w;
      this.H = h;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    add(obj) {
      this.root.add(obj);
      return obj;
    }

    pickable(obj, data) {
      obj.userData.cvData = data;
      obj.traverse((child) => {
        if (child.isMesh) {
          child.userData.cvData = data;
          if (this.pickables.indexOf(child) < 0) this.pickables.push(child);
        }
      });
      return obj;
    }

    unpickable(obj) {
      obj.traverse((child) => {
        if (child.isMesh) {
          const i = this.pickables.indexOf(child);
          if (i >= 0) this.pickables.splice(i, 1);
        }
      });
      return obj;
    }

    remove(obj) {
      this.unpickable(obj);
      if (obj.parent) obj.parent.remove(obj);
      disposeTree(obj);
    }

    _setCursor(cursor) {
      if (this.renderer && this.renderer.domElement.style.cursor !== cursor) {
        this.renderer.domElement.style.cursor = cursor;
      }
    }

    pickAt(clientX, clientY) {
      if (!this.renderer) return null;
      const r = this.renderer.domElement.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      this.pointerNDC.x = ((clientX - r.left) / r.width) * 2 - 1;
      this.pointerNDC.y = -((clientY - r.top) / r.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickables, false);
      if (!hits.length) return null;
      const hit = hits[0];
      return {
        object: hit.object,
        point: hit.point,
        distance: hit.distance,
        data: hit.object.userData.cvData
      };
    }

    _hit(e) {
      const hit = this.pickAt(e.clientX, e.clientY);
      if (hit) hit.event = e;
      return hit;
    }

    _onDown(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (!this._running) return;
      this._downPos = { x: e.clientX, y: e.clientY, t: performance.now() };
      this._moved = 0;
      const hit = this._hit(e);
      if (this.dragHandler && hit && this.dragHandler.onDown && this.dragHandler.onDown(hit, e)) {
        this._objectDrag = true;
        this._dragging = true;
        this._setCursor('grabbing');
        try { this.renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        return;
      }
      this._dragging = true;
      this._setCursor('grabbing');
      this._orbitStart = { yaw: this.yaw, pitch: this.pitch };
      try { this.renderer.domElement.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    }

    _onMove(e) {
      if (!this._running) return;
      if (this._downPos) {
        this._moved = Math.max(this._moved, Math.hypot(e.clientX - this._downPos.x, e.clientY - this._downPos.y));
      }
      if (this._objectDrag) {
        if (this.dragHandler && this.dragHandler.onMove) this.dragHandler.onMove(e);
        return;
      }
      if (this._dragging) {
        const dx = e.clientX - this._downPos.x;
        const dy = e.clientY - this._downPos.y;
        this.yaw = this._orbitStart.yaw - dx * 0.0062;
        this.pitch = Math.max(-0.52, Math.min(0.6, this._orbitStart.pitch + dy * 0.0042));
        return;
      }
      // hover probe (throttled to one per frame)
      if (this._hoverPending) return;
      this._hoverPending = requestAnimationFrame(() => {
        this._hoverPending = null;
        const hit = this._hit(e);
        if (hit && (this.pickHandler || this.dragHandler)) this._setCursor('pointer');
        else this._setCursor('');
        if (this.hoverHandler) this.hoverHandler(hit, e);
      });
    }

    _onUp(e) {
      if (!this._running) return;
      const wasObject = this._objectDrag;
      this._objectDrag = false;
      this._dragging = false;
      this._downPos = null;
      if (wasObject) {
        this._setCursor('');
        if (this.dragHandler && this.dragHandler.onUp) this.dragHandler.onUp(e);
        return;
      }
      this._setCursor('');
      if (this._moved < 9 && this.pickHandler) {
        const hit = this._hit(e);
        if (hit) this.pickHandler(hit, e);
      }
    }

    _onWheel(e) {
      if (!this._running) return;
      e.preventDefault();
      this.setZoom(this.zoom + (e.deltaY > 0 ? 0.7 : -0.7), true);
    }

    setZoom(z, animate) {
      const target = Math.max(this.opts.minZoom, Math.min(this.opts.maxZoom, z));
      if (!animate) {
        this.zoom = target;
        return;
      }
      const from = this.zoom;
      this.tween(220, (t) => {
        this.zoom = from + (target - from) * t;
      }, easeOut);
    }

    pause() {
      this.paused = true;
    }

    resume() {
      this.paused = false;
      this._lastT = performance.now();
    }

    focus(yaw, pitch, zoom, ms) {
      const y0 = this.yaw, p0 = this.pitch, z0 = this.zoom;
      this.tween(ms || 700, (t) => {
        this.yaw = y0 + (yaw - y0) * t;
        this.pitch = p0 + (pitch - p0) * t;
        this.zoom = z0 + (zoom - z0) * t;
      }, easeInOut);
    }

    tween(ms, fn, ease) {
      const tw = { t0: performance.now(), ms, fn, ease: ease || easeOut, dead: false };
      this.tweens.push(tw);
      return () => { tw.dead = true; };
    }

    addTicker(fn) {
      this.tickers.push(fn);
      return () => {
        const i = this.tickers.indexOf(fn);
        if (i >= 0) this.tickers.splice(i, 1);
      };
    }

    glow(color, size, opacity) {
      const mat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: color,
        transparent: true,
        opacity: opacity == null ? 0.75 : opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(size, size, 1);
      return sp;
    }

    spark(color, size) {
      const mat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(size, size, 1);
      return sp;
    }

    tube(points, color, radius, opacity) {
      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), radius || 0.035, 6, false);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.4,
        metalness: 0.1,
        transparent: opacity != null && opacity < 1,
        opacity: opacity == null ? 1 : opacity
      });
      return new THREE.Mesh(geo, mat);
    }

    ring(radius, color, tube, opacity) {
      const geo = new THREE.TorusGeometry(radius, tube || 0.02, 8, 72);
      const mat = new THREE.MeshBasicMaterial({
        color: color, transparent: true, opacity: opacity == null ? 0.5 : opacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      return new THREE.Mesh(geo, mat);
    }

    addLabel(target, html, opts) {
      const o = Object.assign({ offsetY: 0, cls: '' }, opts || {});
      const el = document.createElement('div');
      el.className = 'stage-label ' + o.cls;
      el.innerHTML = html;
      const layer = document.getElementById('stage-labels');
      if (layer) layer.appendChild(el);
      const label = { el, target, offsetY: o.offsetY, visible: true, vec: new THREE.Vector3() };
      this.labels.push(label);
      return label;
    }

    removeLabel(label) {
      if (!label) return;
      if (label.el && label.el.parentNode) label.el.remove();
      const i = this.labels.indexOf(label);
      if (i >= 0) this.labels.splice(i, 1);
    }

    clearLabels() {
      this.labels.forEach((l) => { if (l.el) l.el.remove(); });
      this.labels = [];
    }

    showLabel(label, on) {
      if (label && label.el) label.el.style.display = on ? '' : 'none';
    }

    _updateLabels() {
      if (!this.labels.length) return;
      const rect = this.container.getBoundingClientRect();
      this.labels.forEach((l) => {
        if (!l.el || l.el.style.display === 'none') return;
        const v = l.vec;
        if (l.target && l.target.isObject3D) l.target.getWorldPosition(v);
        else if (l.target && l.target.isVector3) v.copy(l.target);
        v.y += l.offsetY || 0;
        v.project(this.camera);
        const visible = v.z < 1 && v.z > -1;
        const x = (v.x * 0.5 + 0.5) * rect.width;
        const y = (-v.y * 0.5 + 0.5) * rect.height;
        l.el.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        l.el.style.opacity = visible ? '1' : '0';
      });
    }

    screenOf(world) {
      const v = world.clone();
      v.project(this.camera);
      const rect = this.container.getBoundingClientRect();
      return {
        x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-v.y * 0.5 + 0.5) * rect.height,
        visible: v.z < 1 && v.z > -1
      };
    }

    _loop(now) {
      if (!this._running) return;
      const dt = Math.min(0.05, (now - this._lastT) / 1000);
      this._lastT = now;

      if (!this._dragging && this.opts.autoSpin) this.yaw += this.opts.autoSpin * dt;
      this.root.rotation.y = this.yaw;
      this.root.rotation.x = this.pitch;
      this.camera.position.y = this.opts.cameraY;
      this.camera.position.z = this.zoom;
      this.camera.lookAt(0, this.opts.lookY, 0);

      if (!this.paused) {
        for (let i = this.tweens.length - 1; i >= 0; i--) {
          const tw = this.tweens[i];
          if (tw.dead) {
            this.tweens.splice(i, 1);
            continue;
          }
          const t = Math.min(1, (now - tw.t0) / tw.ms);
          try { tw.fn(tw.ease(t), t); } catch (e) { /* noop */ }
          if (t >= 1) this.tweens.splice(i, 1);
        }

        this.tickers.slice().forEach((fn) => {
          try { fn(dt, now / 1000); } catch (e) { /* never break the loop */ }
        });
      }

      this.renderer.render(this.scene, this.camera);
      this._updateLabels();
      requestAnimationFrame(this._loop);
    }

    destroy() {
      this._running = false;
      this.clearLabels();
      if (this.ro) this.ro.disconnect();
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      if (this.renderer) {
        const c = this.renderer.domElement;
        c.removeEventListener('pointerdown', this._onDown);
        c.removeEventListener('pointermove', this._onMove);
        c.removeEventListener('pointerup', this._onUp);
        c.removeEventListener('pointercancel', this._onUp);
        c.removeEventListener('wheel', this._onWheel);
        this.renderer.dispose();
        if (c.parentNode) c.parentNode.removeChild(c);
      }
      if (this.scene) disposeTree(this.scene);
      this.pickables = [];
      this.tickers = [];
      this.tweens = [];
      this.pickHandler = null;
      this.dragHandler = null;
      this.hoverHandler = null;
    }
  }

  function disposeTree(root) {
    root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          Object.keys(m).forEach((k) => {
            const v = m[k];
            if (v && v.isTexture && v !== glowTexture) v.dispose();
          });
          m.dispose();
        });
      }
    });
  }

  SQ.Stage = Stage;
  SQ.getGlowTexture = getGlowTexture;
  SQ.ease = { out: easeOut, inOut: easeInOut };
})();
