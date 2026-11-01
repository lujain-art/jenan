/* =========================================================
   MISSION 4 — أزمة التوازن المائي / WATER BALANCE CRISIS
   Run three tonicity experiments on plant + animal cells,
   then deduce the hidden solution in two mystery samples.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = window.CV;
  const T = window.THREE;
  const K = CV.kit;

  const STATES = {
    hypo: { ar: 'منخفض التوتر', en: 'HYPOTONIC', color: 0x5b9dff, water: 'الماء يدخل', plantScale: 1.1, animalScale: 1.2 },
    iso: { ar: 'متساوي التوتر', en: 'ISOTONIC', color: 0x4be3a8, water: 'حركة متعادلة', plantScale: 1, animalScale: 1 },
    hyper: { ar: 'مرتفع التوتر', en: 'HYPERTONIC', color: 0xff9f68, water: 'الماء يخرج', plantScale: 0.78, animalScale: 0.74 }
  };

  CV.registerMission({
    id: 'm4',
    start(api) {
      const stage = api.stage;
      const kit = K.create(api);
      const panelStart = document.getElementById('panel-start');
      const panelEnd = document.getElementById('panel-end');
      const content = CV.CONTENT.osmosis;

      const state = {
        mode: 'known',
        ton: 'hypo',
        recorded: new Set(),
        resolved: new Set(),
        answers: { a: null, b: null },
        mistakes: 0,
        running: false,
        finished: false
      };

      /* ---------- tank ---------- */
      const sceneRoot = new T.Group();
      stage.add(sceneRoot);
      const tank = new T.Mesh(new T.CylinderGeometry(3.25, 3.25, 2.7, 48, 1, true), K.glass(0x6fb8ff, 0.07, { emissiveIntensity: 0.12 }));
      sceneRoot.add(tank);
      const liquid = new T.Mesh(new T.CylinderGeometry(3.12, 3.12, 0.06, 48), K.basic(0x5b9dff, 0.13, { transparent: true, depthWrite: false }));
      liquid.position.y = 1.12;
      sceneRoot.add(liquid);
      const rimTop = new T.Mesh(new T.TorusGeometry(3.24, 0.03, 8, 60), K.basic(0x8fcaff, 0.4));
      rimTop.rotation.x = Math.PI / 2;
      rimTop.position.y = 1.35;
      sceneRoot.add(rimTop);
      const rimBottom = rimTop.clone();
      rimBottom.position.y = -1.35;
      sceneRoot.add(rimBottom);

      /* ---------- plant cell ---------- */
      const plant = new T.Group();
      plant.position.set(-1.05, 0, 0);
      sceneRoot.add(plant);
      const wall = new T.Mesh(new T.BoxGeometry(1.2, 1.55, 0.95), K.basic(0x7cf0c0, 0.16, { wireframe: true }));
      wall.position.y = 0.1;
      plant.add(wall);
      const plantInner = new T.Group();
      plantInner.position.y = 0.1;
      plant.add(plantInner);
      const plantBody = new T.Mesh(new T.BoxGeometry(1.04, 1.38, 0.8), K.glass(0x4be3a8, 0.32, { emissiveIntensity: 0.3 }));
      plantInner.add(plantBody);
      const plantVac = new T.Mesh(new T.SphereGeometry(0.26, 18, 14), K.glass(0x5b9dff, 0.4));
      plantVac.position.set(0.16, 0.06, 0.05);
      plantInner.add(plantVac);
      const plantNucleus = new T.Mesh(new T.SphereGeometry(0.15, 16, 12), K.standard(0xffd166, { emissiveIntensity: 0.5 }));
      plantNucleus.position.set(-0.25, -0.2, 0.1);
      plantInner.add(plantNucleus);
      stage.addLabel(plant, '<span class="l-ar">خلية نباتية</span><span class="l-en">PLANT CELL</span>', { offsetY: 1.15, cls: 'bio' });

      /* ---------- animal cell ---------- */
      const animal = new T.Group();
      animal.position.set(1.1, 0.05, 0);
      sceneRoot.add(animal);
      const animalBody = new T.Mesh(new T.SphereGeometry(0.68, 30, 22), K.glass(0x5b9dff, 0.32, { emissiveIntensity: 0.3 }));
      animal.add(animalBody);
      const animalInner = new T.Mesh(new T.SphereGeometry(0.34, 22, 16), K.glass(0x9fd0ff, 0.22));
      animalInner.position.set(0.1, 0.08, 0.08);
      animal.add(animalInner);
      const animalNucleus = new T.Mesh(new T.SphereGeometry(0.16, 16, 12), K.standard(0xffd166, { emissiveIntensity: 0.5 }));
      animalNucleus.position.set(-0.16, -0.14, 0.12);
      animal.add(animalNucleus);
      stage.addLabel(animal, '<span class="l-ar">خلية حيوانية</span><span class="l-en">ANIMAL CELL</span>', { offsetY: 1.0, cls: 'bio' });

      /* ---------- water motes ---------- */
      const waterMat = K.standard(0x8fcaff, { emissiveIntensity: 0.8, roughness: 0.2 });
      const motes = [];
      for (let i = 0; i < 46; i++) {
        const m = new T.Mesh(new T.SphereGeometry(0.035, 7, 5), waterMat);
        let x, y, z;
        do {
          x = K.rand(-2.9, 2.9);
          y = K.rand(-1.15, 1.15);
          z = K.rand(-1.3, 1.3);
        } while (Math.abs(x + 1.05) < 0.85 && Math.abs(y - 0.1) < 1.05);
        m.position.set(x, y, z);
        m.userData.home = m.position.clone();
        sceneRoot.add(m);
        motes.push(m);
      }

      /* ---------- mystery samples ---------- */
      function buildSample(x, letter, incoming) {
        const g = new T.Group();
        g.position.set(x, -0.25, 1.05);
        g.visible = false;
        const glass = new T.Mesh(new T.CylinderGeometry(0.38, 0.34, 0.9, 24, 1, true), K.glass(0x9fe8ff, 0.16));
        g.add(glass);
        const bottom = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.05, 24), K.basic(0x3a6ea8, 0.5));
        bottom.position.y = -0.46;
        g.add(bottom);
        const fluid = new T.Mesh(new T.CylinderGeometry(0.33, 0.31, 0.62, 24), K.glass(0x5b9dff, 0.16));
        fluid.position.y = -0.12;
        g.add(fluid);
        const cell = new T.Mesh(new T.SphereGeometry(0.14, 16, 12), K.glass(0x7cf0c0, 0.5, { emissiveIntensity: 0.4 }));
        cell.position.y = -0.12;
        g.add(cell);
        const halo = new T.Mesh(new T.TorusGeometry(0.34, 0.02, 8, 32), K.basic(0xffd166, 0.9));
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.47;
        halo.visible = false;
        g.add(halo);
        const pm = K.standard(0xbdf6ff, { emissiveIntensity: 0.9 });
        const flow = [];
        for (let i = 0; i < 9; i++) {
          const p = new T.Mesh(new T.SphereGeometry(0.03, 6, 5), pm);
          g.add(p);
          flow.push({ mesh: p, phase: i / 9, a: i * 2.1 });
        }
        sceneRoot.add(g);
        const label = stage.addLabel(g, '<span class="l-ar">العيّنة ' + letter + '</span>', { offsetY: 0.75, cls: 'water' });
        stage.showLabel(label, false);
        g.userData.flow = flow;
        g.userData.incoming = incoming;
        g.userData.halo = halo;
        g.userData.label = label;
        return g;
      }
      const samples = { a: buildSample(-2.35, 'أ', true), b: buildSample(2.35, 'ب', false) };

      stage.addTicker((dt, t) => {
        Object.keys(samples).forEach((key) => {
          const g = samples[key];
          if (!g.visible) return;
          g.userData.flow.forEach((f) => {
            const ph = (t * 0.32 + f.phase) % 1;
            const r = g.userData.incoming ? 0.55 - ph * 0.34 : 0.16 + ph * 0.4;
            f.mesh.position.set(Math.cos(f.a) * r, -0.1 + Math.sin(ph * Math.PI) * 0.22, Math.sin(f.a) * r * 0.7);
            f.mesh.material.opacity = g.userData.incoming ? 0.35 + ph * 0.6 : 0.9 - ph * 0.55;
          });
        });
      });

      /* ---------- UI ---------- */
      function knownRowsHTML() {
        return ['hypo', 'iso', 'hyper'].map((id) => {
          const s = STATES[id];
          const done = state.recorded.has(id);
          return '<button class="seg-btn-row' + (state.ton === id ? ' is-on' : '') + '" data-ton="' + id + '" type="button">' +
            '<span class="seg-dot" style="background:#' + s.color.toString(16) + '"></span>' +
            '<span>' + s.ar + '</span>' +
            '<i class="' + (done ? 'ok' : 'warn') + '">' + (done ? '✓ سُجّلت' : '') + '</i></button>';
        }).join('');
      }

      function renderStart() {
        if (state.mode === 'known') {
          api.panel('start', kit.panelTitle('water', 'غرفة التجربة', 'اختاروا تركيز المحلول ثم شغّلوا التجربة على الخليتين.') +
            '<div class="seg-list">' + knownRowsHTML() + '</div>' +
            '<button class="mini-btn gold run-wide" data-run type="button"' + (state.running ? ' disabled' : '') + '>' +
            '<svg class="tiny-icon"><use href="#i-water"/></svg> ' + (state.running ? 'جارٍ التسجيل...' : 'ابدأوا التجربة') + '</button>' +
            '<p class="panel-note">راقبوا الماء ثم قارنوا الخلية النباتية بالحيوانية.</p>' +
            '<p class="panel-note">نتائج مسجلة: <b>' + K.ar(state.recorded.size) + ' من ٣</b></p>');
        } else {
          api.panel('start', kit.panelTitle('bulb', 'العيّنات المخفية', 'لاحظوا اتجاه الماء في كل كأس، ثم استنتجوا نوع المحلول.') +
            sampleBoxHTML('a', 'أ') + sampleBoxHTML('b', 'ب'));
        }
      }

      function sampleBoxHTML(key, letter) {
        const resolved = state.resolved.has(key);
        const answer = state.answers[key];
        let segs = '';
        ['hypo', 'iso', 'hyper'].forEach((id) => {
          const s = STATES[id];
          segs += '<button class="' + (answer === id ? 'is-on' : '') + '" data-sample="' + key + '" data-pick-ton="' + id + '" type="button"' +
            (resolved ? ' disabled' : '') + '>' + s.ar + '</button>';
        });
        return '<div class="console-box' + (resolved ? ' solved' : '') + '">' +
          '<div class="console-title">العيّنة ' + letter + ' <small>SAMPLE ' + letter + '</small>' +
          (resolved ? '<span class="tag green">✓ محلول ' + STATES[STATE_FOR[key]].ar + '</span>' : '') + '</div>' +
          '<div class="seg sample-seg">' + segs + '</div>' +
          (!resolved ? '<button class="mini-btn' + (answer ? ' gold' : '') + '" data-check="' + key + '" type="button"' + (answer ? '' : ' disabled') + '>تأكيد العيّنة ' + letter + '</button>' : '') +
          '</div>';
      }

      const STATE_FOR = { a: 'hypo', b: 'hyper' };

      function renderEnd() {
        let html = kit.panelTitle('bulb', 'سجل النتائج', 'حركة الماء وتأثيرها في كل نوع من الخلايا.');
        ['hypo', 'iso', 'hyper'].forEach((id) => {
          const s = STATES[id];
          const k = content.states.find((x) => x.id === id);
          const done = state.recorded.has(id);
          html += '<div class="console-box' + (done ? ' solved' : '') + '">' +
            '<div class="console-title">' + s.ar + ' <small>' + s.en + '</small>' +
            (done ? '<span class="tag green">✓</span>' : '') + '</div>' +
            '<div class="obs-list">' +
            kit.row('الماء', done ? s.water : '—', done ? 'ok' : '') +
            (done ? kit.row('نباتية', k.plant, 'ok') + kit.row('حيوانية', k.animal, k.animal.indexOf('تنفجر') >= 0 ? 'warn' : '') : '') +
            '</div></div>';
        });
        api.panel('end', html);
      }

      function updateReadout() {
        if (state.mode === 'known') {
          api.readout('<span class="readout-pill water">حالات مسجلة <b>' + K.ar(state.recorded.size) + ' من ٣</b></span>');
        } else {
          api.readout('<span class="readout-pill water">عيّنات محلولة <b>' + K.ar(state.resolved.size) + ' من ٢</b></span>');
        }
      }

      function selectTonicity(id) {
        if (state.mode !== 'known' || state.running || !api.alive()) return;
        state.ton = id;
        api.sound('click');
        renderStart();
      }

      function runExperiment() {
        if (state.mode !== 'known' || state.running || !api.alive()) return;
        if (state.recorded.size >= 3) return;
        state.running = true;
        const id = state.ton;
        const s = STATES[id];
        const k = content.states.find((x) => x.id === id);
        renderStart();
        api.sound('waterFill');
        plantInner.scale.setScalar(1);
        animalBody.scale.setScalar(1);
        animalInner.scale.copy(animalBody.scale);
        animalNucleus.scale.copy(animalBody.scale);
        motes.forEach((m) => m.position.copy(m.userData.home));
        stage.tween(1100, (t) => {
          plantInner.scale.setScalar(1 + (s.plantScale - 1) * t);
          animalBody.scale.setScalar(1 + (s.animalScale - 1) * t);
          animalInner.scale.copy(animalBody.scale);
          animalNucleus.scale.copy(animalBody.scale);
        }, SQ.ease.inOut);

        motes.forEach((m, i) => {
          const start = m.position.clone();
          const dir = id === 'hypo' ? 1 : id === 'hyper' ? -1 : 0;
          let target;
          const cx = i % 2 ? -1.05 : 1.1;
          if (dir > 0) {
            target = new T.Vector3(cx + K.rand(-0.5, 0.5), K.rand(-0.55, 0.55), K.rand(-0.3, 0.3));
          } else if (dir < 0) {
            target = start.clone().multiplyScalar(1.35);
            target.x = K.clamp(target.x, -3, 3);
            target.y = K.clamp(target.y, -1.2, 1.2);
            target.z = K.clamp(target.z, -1.3, 1.3);
          } else {
            target = start.clone().add(new T.Vector3(K.rand(-0.12, 0.12), K.rand(-0.12, 0.12), 0));
          }
          stage.tween(1500, (t) => {
            m.position.lerpVectors(start, target, t);
            m.position.y += Math.sin(t * Math.PI) * 0.05;
          }, SQ.ease.inOut);
        });

        api.readout('<span class="readout-pill water">الماء: <b>' + s.water + '</b></span>');
        setTimeout(() => {
          if (!api.alive()) return;
          state.running = false;
          const first = !state.recorded.has(id);
          state.recorded.add(id);
          api.sound('sparkle');
          api.toast('سُجّلت نتيجة ' + s.ar + '.', 'ok', 'check');
          renderStart();
          renderEnd();
          updateReadout();
          api.objective('سجّلوا نتائج الحالات الثلاث', state.recorded.size, 3);
          if (first) {
            if (id === 'hypo') api.say('m4.hypo');
            else if (id === 'iso') api.say('m4.iso');
            else api.say('m4.hyper');
          }
          if (state.recorded.size === 3) {
            state.mode = 'hidden';
            api.steps(1);
            api.objective('استنتجوا نوع المحلول في العيّنتين', 0, 2);
            samples.a.visible = true;
            samples.b.visible = true;
            stage.showLabel(samples.a.userData.label, true);
            stage.showLabel(samples.b.userData.label, true);
            samples.a.scale.setScalar(0.2);
            samples.b.scale.setScalar(0.2);
            stage.tween(500, (t) => {
              samples.a.scale.setScalar(0.2 + 0.8 * t);
              samples.b.scale.setScalar(0.2 + 0.8 * t);
            });
            api.sound('machineStart');
            api.toast('ظهرت عيّنتان مخفيتان. راقبوا اتجاه الماء.', 'ok', 'bulb');
            api.quip('pip', CV.line('m4.hint').text, 3600);
            renderStart();
            updateReadout();
          }
        }, 1700);
      }

      function pickAnswer(key, id) {
        if (state.mode !== 'hidden' || state.resolved.has(key) || !api.alive()) return;
        state.answers[key] = id;
        api.sound('click');
        renderStart();
      }

      function checkSample(key) {
        if (state.mode !== 'hidden' || state.resolved.has(key) || !api.alive()) return;
        const answer = state.answers[key];
        if (!answer) return;
        const box = document.querySelector('[data-check="' + key + '"]');
        if (answer === STATE_FOR[key]) {
          state.resolved.add(key);
          const g = samples[key];
          g.userData.halo.visible = true;
          api.sound('snap');
          api.sound('sparkle');
          const c = stage.screenOf(g.position.clone());
          if (c.visible && SQ.FX) SQ.FX.burst(c.x, c.y, { count: 20, colors: ['#8fcaff', '#ffd166', '#ffffff'], speed: 3 });
          api.toast('استنتاج صحيح للعيّنة ' + (key === 'a' ? 'أ' : 'ب') + '.', 'ok', 'check');
          renderStart();
          renderEnd();
          updateReadout();
          api.objective('استنتجوا نوع المحلول في العيّنتين', state.resolved.size, 2);
          if (state.resolved.size === 2) finish();
          else api.quip('nova', 'عيّنة واحدة بقيت. قارنوا اتجاه الماء فيها.', 2600);
        } else {
          state.mistakes++;
          state.answers[key] = null;
          api.sound('wrong');
          if (box) SQ.UI.shake(box);
          api.quip('orbit', 'الاتجاه الذي شاهدتموه لا يطابق هذا النوع. أعيدوا الملاحظة.', 3000);
          renderStart();
        }
      }

      async function finish() {
        if (state.finished) return;
        state.finished = true;
        api.steps(2);
        api.objective('عاد التوازن المائي إلى الخلية', 5, 5);
        SQ.FX.confetti(80);
        api.sound('celebrate');
        await api.say('m4.done');
        if (!api.alive()) return;
        const stars = state.mistakes <= 1 ? 3 : state.mistakes <= 3 ? 2 : 1;
        api.complete(stars, {
          title: 'انتهت أزمة التوازن المائي',
          text: 'سجّلتم الحالات الثلاث واستنتجم نوع المحلول في العيّنتين المخفيتين.',
          learn: 'الماء يتحرك من المحلول الأقل تركيزًا بالمذاب إلى الأعلى تركيزًا. الخلية النباتية يقوّيها الجدار فلا تنفجر، أما الخلية الحيوانية فقد تنتفخ وتنفجر في المحلول منخفض التوتر.'
        });
      }

      /* ---------- bindings ---------- */
      kit.onClick(panelStart, '[data-ton]', (node) => selectTonicity(node.dataset.ton));
      kit.onClick(panelStart, '[data-run]', () => runExperiment());
      kit.onClick(panelStart, '[data-pick-ton]', (node) => pickAnswer(node.dataset.sample, node.dataset.pickTon));
      kit.onClick(panelStart, '[data-check]', (node) => checkSample(node.dataset.check));

      /* ---------- boot ---------- */
      api.panels('', '');
      renderStart();
      renderEnd();
      updateReadout();
      api.steps(0);
      api.objective('سجّلوا نتائج الحالات الثلاث', 0, 3);
      api.say('m4.intro');

      return {
        hint() { if (!state.finished) api.say('m4.hint'); },
        destroy() {
          kit.destroy();
          stage.clearLabels();
        }
      };
    }
  });
})();
