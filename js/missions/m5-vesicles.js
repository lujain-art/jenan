/* =========================================================
   MISSION 5 — مهمة الحويصلات / VESICLE OPERATION
   Perform endocytosis (phagocytosis + pinocytosis) and
   exocytosis while managing the cell's ATP budget.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = window.CV;
  const T = window.THREE;
  const K = CV.kit;

  const COST = 2;
  const MAX_ATP = 6;

  CV.registerMission({
    id: 'm5',
    start(api) {
      const stage = api.stage;
      const kit = K.create(api);
      const panelStart = document.getElementById('panel-start');
      const panelEnd = document.getElementById('panel-end');

      const state = {
        atp: 4,
        actions: new Set(),
        selected: null,
        mistakes: 0,
        busy: false,
        finished: false,
        said: {}
      };

      /* ---------- membrane ---------- */
      const root = new T.Group();
      stage.add(root);
      const plane = new T.Mesh(new T.PlaneGeometry(6.8, 3.8), K.basic(0x4fe6ff, 0.05, {
        side: T.DoubleSide, transparent: true, depthWrite: false
      }));
      plane.rotation.x = -Math.PI / 2;
      root.add(plane);
      stage.pickable(plane, { kind: 'membrane' });

      const headGeo = new T.SphereGeometry(0.07, 8, 6);
      const headMatA = K.standard(0x7be7ff, { emissiveIntensity: 0.45, roughness: 0.3 });
      const headMatB = K.standard(0x5b9dff, { emissiveIntensity: 0.35, roughness: 0.35 });
      for (let ix = 0; ix < 17; ix++) {
        for (let iz = 0; iz < 9; iz++) {
          const x = -3.2 + ix * 0.4;
          const z = -1.6 + iz * 0.4;
          const head = new T.Mesh(headGeo, (ix + iz) % 2 ? headMatA : headMatB);
          head.position.set(x, (ix + iz) % 2 ? 0.035 : -0.035, z);
          root.add(head);
        }
      }

      stage.addLabel(new T.Vector3(0, 1.55, 0.9), '<span class="l-ar">خارج الخلية</span><span class="l-en">OUTSIDE</span>', { cls: 'hot' });
      stage.addLabel(new T.Vector3(0, -0.85, 0.9), '<span class="l-ar">داخل الخلية</span><span class="l-en">INSIDE</span>', { cls: 'water' });
      stage.addLabel(new T.Vector3(-3.0, 0.25, -0.6), '<span class="l-ar">الغشاء البلازمي</span>', { cls: 'bio' });

      /* ---------- loads ---------- */
      const loads = {};
      function registerLoad(id, group, data) {
        stage.pickable(group, data);
        root.add(group);
        loads[id] = { group: group, data: data, done: false };
        return loads[id];
      }

      const food = new T.Group();
      food.position.set(-1.5, 0.95, 0.35);
      const foodMesh = new T.Mesh(new T.IcosahedronGeometry(0.3, 1), K.standard(0xff9f68, { emissiveIntensity: 0.35, roughness: 0.45 }));
      food.add(foodMesh);
      const foodGlow = stage.spark(0xffb27a, 0.9);
      foodGlow.material.opacity = 0.35;
      food.add(foodGlow);
      food.userData.baseY = food.position.y;
      food.userData.phase = 0.4;
      registerLoad('phago', food, { kind: 'load', id: 'phago' });

      const drop = new T.Group();
      drop.position.set(0.15, 1.08, 0.6);
      const dropMesh = new T.Mesh(new T.SphereGeometry(0.27, 20, 14), K.glass(0x6fd8ff, 0.4, { emissiveIntensity: 0.3 }));
      drop.add(dropMesh);
      for (let i = 0; i < 6; i++) {
        const dot = new T.Mesh(new T.SphereGeometry(0.035, 6, 5), K.standard(0xbfeeff, { emissiveIntensity: 0.6 }));
        const a = i * 1.7;
        dot.position.set(Math.cos(a) * 0.13, Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.1);
        drop.add(dot);
      }
      drop.userData.baseY = drop.position.y;
      drop.userData.phase = 2.1;
      registerLoad('pino', drop, { kind: 'load', id: 'pino' });

      const waste = new T.Group();
      waste.position.set(1.5, -0.62, 0.4);
      const wasteMesh = new T.Mesh(new T.SphereGeometry(0.26, 18, 14), K.glass(0xffd166, 0.36, { emissiveIntensity: 0.4 }));
      waste.add(wasteMesh);
      const wasteCore = new T.Mesh(new T.IcosahedronGeometry(0.11, 0), K.standard(0xffe6a6, { emissiveIntensity: 0.6 }));
      waste.add(wasteCore);
      waste.userData.baseY = waste.position.y;
      waste.userData.phase = 4.0;
      registerLoad('exo', waste, { kind: 'load', id: 'exo' });

      /* ---------- mitochondrion ---------- */
      const mito = new T.Group();
      mito.position.set(-2.45, -0.72, 0.35);
      const mitoBody = new T.Mesh(new T.CapsuleGeometry(0.22, 0.52, 6, 16), K.standard(0xffb86b, { emissiveIntensity: 0.35, roughness: 0.4 }));
      mitoBody.rotation.z = 0.5;
      mito.add(mitoBody);
      for (let i = 0; i < 4; i++) {
        const ridge = new T.Mesh(new T.TorusGeometry(0.22, 0.018, 6, 20), K.basic(0xffe2b0, 0.5));
        ridge.rotation.x = Math.PI / 2;
        ridge.position.set(-0.2 + i * 0.14, 0, 0);
        ridge.rotation.y = 0.5;
        mito.add(ridge);
      }
      const mitoGlow = stage.spark(0xffc46b, 1.2);
      mitoGlow.material.opacity = 0.28;
      mito.add(mitoGlow);
      stage.pickable(mito, { kind: 'mito' });
      root.add(mito);
      stage.addLabel(mito, '<span class="l-ar">ميتوكوندريا</span><span class="l-en">ATP</span>', { offsetY: 0.55, cls: 'hot' });

      const ringMat = K.basic(0x7be7ff, 0.75);

      stage.addTicker((dt, t) => {
        Object.keys(loads).forEach((id) => {
          const l = loads[id];
          if (!l || l.done) return;
          l.group.position.y = l.group.userData.baseY + Math.sin(t * 1.4 + l.group.userData.phase) * 0.05;
          l.group.rotation.y += dt * 0.35;
        });
        mitoGlow.material.opacity = 0.2 + Math.sin(t * 2.2) * 0.1;
        mitoBody.scale.setScalar(1 + Math.sin(t * 1.8) * 0.03);
      });

      stage.hoverHandler = (hit) => {
        const d = hit && hit.data;
        if (d && (d.kind === 'load' || d.kind === 'mito')) stage._setCursor('pointer');
        else if (d && d.kind === 'membrane' && state.selected) stage._setCursor('pointer');
        else stage._setCursor('');
      };

      /* ---------- UI ---------- */
      const LOAD_META = {
        phago: { ar: 'جسيم غذائي كبير', en: 'PHAGOCYTOSIS', desc: 'ينثني الغشاء ويحيط بالجسيم الكبير لتكوين حويصلة غذائية تدخل السيتوبلازم.' },
        pino: { ar: 'قطرة سائل', en: 'PINOCYTOSIS', desc: 'ينثني الغشاء ويحيط بالسائل والمواد المذابة لتكوين حويصلة صغيرة.' },
        exo: { ar: 'حويصلة فضلات', en: 'EXOCYTOSIS', desc: 'تنتقل الحويصلة إلى الغشاء وتندمج معه، فتخرج محتوياتها خارج الخلية.' }
      };

      function taskRows() {
        return ['phago', 'pino', 'exo'].map((id) => {
          const done = state.actions.has(id);
          const label = id === 'exo' ? 'إخراج الفضلات' : id === 'phago' ? 'إدخال جسيم كبير' : 'إدخال سائل';
          return '<div class="obs-row"><span>' + label + '</span><i class="' + (done ? 'ok' : 'warn') + '">' +
            (done ? '✓ اكتمل' : 'بانتظار التنفيذ') + '</i></div>';
        }).join('');
      }

      function renderStart() {
        const pct = (state.atp / MAX_ATP) * 100;
        let html = kit.panelTitle('vesicle', 'ميزانية ATP', 'كل حركة حويصلية تستهلك طاقة. راقبوا المخزون قبل كل خطوة.');
        html += '<div class="stat-grid">' +
          '<div class="stat-box"><span>ATP المتاح</span><b class="gold">' + K.ar(state.atp) + ' من ' + K.ar(MAX_ATP) + '</b></div>' +
          '<div class="stat-box"><span>العمليات</span><b class="cell">' + K.ar(state.actions.size) + ' من ٣</b></div></div>' +
          '<div class="meter-row"><div class="meter-label"><span>مخزون الطاقة</span><b>' + K.ar(Math.round(pct)) + '٪</b></div>' +
          '<div class="meter gold"><i style="width:' + pct + '%"></i></div></div>' +
          '<div class="obs-list">' + taskRows() + '</div>' +
          '<button class="mini-btn' + (state.atp < COST ? ' gold' : ' ghost') + '" data-recharge type="button"' + (state.busy ? ' disabled' : '') + '>' +
          '<svg class="tiny-icon"><use href="#i-pump"/></svg> شحن ATP من الميتوكوندريا</button>';
        if (state.selected) {
          const m = LOAD_META[state.selected];
          html += '<div class="console-box"><div class="console-title">' + m.ar + ' <small>' + m.en + '</small></div>' +
            '<p class="panel-note">' + m.desc + '</p>' +
            '<p class="panel-note">اضغطوا الآن على الغشاء البلازمي لتنفيذ العملية.</p></div>';
        }
        api.panel('start', html);
      }

      function renderEnd() {
        const v = CV.CONTENT.vesicles;
        api.panel('end', kit.panelTitle('bulb', 'الإدخال والإخراج الخلوي', 'حركة المواد عبر الغشاء بواسطة الحويصلات.') +
          '<div class="console-box"><div class="console-title">' + v.endocytosis.ar + ' <small>' + v.endocytosis.en + '</small></div>' +
          '<p class="panel-note">' + v.endocytosis.fn + '</p>' +
          '<p class="panel-note">' + v.endocytosis.types + '</p></div>' +
          '<div class="console-box"><div class="console-title">' + v.exocytosis.ar + ' <small>' + v.exocytosis.en + '</small></div>' +
          '<p class="panel-note">' + v.exocytosis.fn + '</p></div>' +
          '<p class="panel-note">العملية تحتاج <b>ATP</b>، لذلك توقّف إنتاج الطاقة يوقف الحويصلات.</p>');
      }

      function updateReadout() {
        api.readout('<span class="readout-pill atp">ATP <b>' + K.ar(state.atp) + ' من ' + K.ar(MAX_ATP) + '</b></span>' +
          '<span class="readout-pill cell">حويصلات <b>' + K.ar(state.actions.size) + ' من ٣</b></span>');
      }

      function selectLoad(id) {
        if (state.busy || state.finished || state.actions.has(id) || !api.alive()) return;
        state.selected = id;
        Object.keys(loads).forEach((key) => {
          const g = loads[key].group;
          g.scale.setScalar(key === id ? 1.16 : 1);
        });
        api.sound('pickup');
        renderStart();
        api.toast('اخترتم ' + LOAD_META[id].ar + '. اضغطوا على الغشاء.', '', 'hand');
      }

      function recharge() {
        if (state.busy || state.finished || !api.alive()) return;
        if (state.atp >= MAX_ATP) {
          api.toast('مخزون ATP ممتلئ بالفعل.', '', 'check');
          return;
        }
        state.busy = true;
        api.sound('machineStart');
        renderStart();
        api.toast('الميتوكوندريا تنتج ATP...', '', 'gear');
        for (let i = 0; i < 8; i++) {
          const mote = stage.spark(0xffd166, 0.22);
          mote.position.copy(mito.position);
          root.add(mote);
          const target = new T.Vector3(0.6 + K.rand(-0.6, 0.6), K.rand(-0.4, 0.4), 0.8);
          const start = mote.position.clone();
          stage.tween(700 + i * 60, (t) => {
            mote.position.lerpVectors(start, target, t);
            mote.material.opacity = 0.9 * (1 - t);
          });
          setTimeout(() => { if (mote.parent) root.remove(mote); }, 900 + i * 60);
        }
        setTimeout(() => {
          if (!api.alive()) return;
          state.busy = false;
          state.atp = Math.min(MAX_ATP, state.atp + 4);
          api.sound('sparkle');
          api.toast('تم شحن ATP: ' + K.ar(state.atp) + ' من ' + K.ar(MAX_ATP), 'ok', 'check');
          renderStart();
          updateReadout();
        }, 1500);
      }

      function perform(onMembrane) {
        if (state.busy || state.finished || !state.selected || !api.alive()) return;
        const id = state.selected;
        const load = loads[id];
        if (state.atp < COST) {
          state.mistakes++;
          api.sound('wrong');
          api.quip('orbit', CV.line('m5.atp').text, 3200);
          api.toast('لا يوجد ATP كافٍ. اشحنوا الطاقة من الميتوكوندريا.', 'bad', 'muted');
          return;
        }
        state.busy = true;
        state.atp -= COST;
        updateReadout();
        renderStart();
        state.selected = null;
        Object.keys(loads).forEach((key) => loads[key].group.scale.setScalar(1));

        const px = onMembrane.x;
        const pz = onMembrane.z;
        const ring = new T.Mesh(new T.TorusGeometry(0.36, 0.028, 8, 32), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(px, 0.06, pz);
        ring.scale.setScalar(0.15);
        root.add(ring);
        api.sound('waterFill');

        if (id === 'exo') {
          const start = load.group.position.clone();
          const target = new T.Vector3(px, 0.32, pz);
          stage.tween(950, (t) => {
            load.group.position.lerpVectors(start, target, t);
            ring.scale.setScalar(0.15 + t * 0.9);
          }, SQ.ease.inOut);
          setTimeout(() => {
            if (!api.alive()) return;
            load.done = true;
            root.remove(load.group);
            root.remove(ring);
            for (let i = 0; i < 10; i++) {
              const p = stage.spark(0xffe6a6, 0.16);
              p.position.set(px + K.rand(-0.25, 0.25), 0.35, pz + K.rand(-0.25, 0.25));
              root.add(p);
              const s = p.position.clone();
              stage.tween(650, (t) => {
                p.position.set(s.x, s.y + t * 0.7, s.z);
                p.material.opacity = 1 - t;
              });
              setTimeout(() => { if (p.parent) root.remove(p); }, 720);
            }
            finishAction(id, 'أُخرجت الفضلات خارج الخلية', 'exo');
          }, 980);
        } else {
          const start = load.group.position.clone();
          const target = new T.Vector3(px, -0.62, pz);
          stage.tween(950, (t) => {
            load.group.position.lerpVectors(start, target, t);
            load.group.position.y -= Math.sin(t * Math.PI) * 0.18;
            ring.scale.setScalar(0.15 + Math.sin(t * Math.PI) * 0.85);
          }, SQ.ease.inOut);
          setTimeout(() => {
            if (!api.alive()) return;
            root.remove(ring);
            const shell = new T.Mesh(new T.SphereGeometry(id === 'phago' ? 0.36 : 0.3, 18, 14), K.glass(0x7be7ff, 0.22, { emissiveIntensity: 0.3 }));
            shell.position.copy(load.group.position);
            root.add(shell);
            load.done = true;
            stage.unpickable(load.group);
            api.sound('drop');
            finishAction(id, id === 'phago' ? 'تشكّلت حويصلة غذائية داخل الخلية' : 'دخل السائل داخل حويصلة صغيرة', id);
          }, 980);
        }
      }

      function finishAction(id, text, lineKey) {
        state.actions.add(id);
        state.busy = false;
        api.sound('sparkle');
        api.toast(text + '.', 'ok', 'check');
        renderStart();
        updateReadout();
        api.objective('نفّذوا عمليات الحويصلات', state.actions.size, 3);
        if (!state.said[lineKey]) {
          state.said[lineKey] = true;
          const line = lineKey === 'phago' ? 'm5.phago' : lineKey === 'pino' ? 'm5.pino' : lineKey === 'exo' ? 'm5.exo' : null;
          if (line) api.quip('nova', CV.line(line).text, 3200);
        }
        if (state.actions.size === 3) {
          api.steps(2);
          finish();
        }
      }

      async function finish() {
        if (state.finished) return;
        state.finished = true;
        api.objective('اكتملت مهمة الحويصلات', 3, 3);
        SQ.FX.confetti(80);
        api.sound('celebrate');
        await api.say('m5.done');
        if (!api.alive()) return;
        const stars = state.mistakes <= 1 ? 3 : state.mistakes <= 3 ? 2 : 1;
        api.complete(stars, {
          title: 'تعمل الحويصلات بانتظام',
          text: 'أدخلتم المواد بالبلعمة والشرب الخلوي، وأخرجتم الفضلات بالإخراج الخلوي، مع إدارة مخزون ATP.',
          learn: 'الإدخال الخلوي يكوّن حويصلة من الغشاء حول المادة ويدخلها إلى السيتوبلازم. الإخراج الخلوي يندمج فيه الغشاء مع الحويصلة فتخرج المحتويات. العمليتان تحتاجان ATP.'
        });
      }

      /* ---------- picking ---------- */
      stage.pickHandler = (hit) => {
        if (!hit || !api.alive() || state.finished) return;
        const d = hit.data;
        if (!d) return;
        if (d.kind === 'mito') {
          recharge();
        } else if (d.kind === 'load') {
          selectLoad(d.id);
        } else if (d.kind === 'membrane') {
          if (state.selected) perform(hit.point);
          else api.toast('اختاروا جسمًا أو حويصلة أولًا، ثم اضغطوا على الغشاء.', '', 'hand');
        }
      };

      kit.onClick(panelStart, '[data-recharge]', recharge);

      /* ---------- boot ---------- */
      api.panels('', '');
      renderStart();
      renderEnd();
      updateReadout();
      api.steps(0);
      api.objective('نفّذوا عمليات الحويصلات', 0, 3);
      api.say('m5.intro');
      setTimeout(() => {
        if (api.alive() && !state.selected && !state.actions.size) api.toast('اختاروا جسمًا خارج الخلية ثم اضغطوا على الغشاء.', '', 'target');
      }, 5200);

      return {
        hint() { if (!state.finished) api.say('m5.hint'); },
        destroy() {
          kit.destroy();
          stage.clearLabels();
        }
      };
    }
  });
})();
