/* =========================================================
   MISSION 3 — مركز التحكم بالنقل / TRANSPORT CONTROL
   Run three transport stations, observe how molecules move,
   then match each station to its mechanism.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = window.CV;
  const T = window.THREE;
  const K = CV.kit;

  const ORDER = ['facilitated', 'simple', 'active'];
  const LETTER = ['أ', 'ب', 'ج'];

  const OBS = {
    facilitated: 'مرّت الجزيئات عبر قناة بروتينية من الجانب الأعلى تركيزًا إلى الأقل، دون استهلاك طاقة.',
    simple: 'عبرت الجزيئات الصغيرة مباشرة بين الدهون من الأعلى تركيزًا إلى الأقل، دون بروتين أو طاقة.',
    active: 'انتقلت الجزيئات عكس تدرّج التركيز عبر مضخة، وانخفض مخزون ATP.'
  };

  const MECH = {
    simple: { ar: 'الانتشار البسيط', en: 'SIMPLE DIFFUSION', hint: 'من الأعلى إلى الأقل، دون طاقة أو بروتين.' },
    facilitated: { ar: 'الانتشار المُيسّر', en: 'FACILITATED DIFFUSION', hint: 'عبر بروتين ناقل، من الأعلى إلى الأقل، دون طاقة.' },
    active: { ar: 'النقل النشط', en: 'ACTIVE TRANSPORT', hint: 'عكس تدرّج التركيز، باستهلاك ATP.' }
  };

  CV.registerMission({
    id: 'm3',
    start(api) {
      const stage = api.stage;
      const kit = K.create(api);
      const panelStart = document.getElementById('panel-start');
      const panelEnd = document.getElementById('panel-end');

      const state = {
        mode: 'run',
        selected: null,
        run: {},
        matched: new Set(),
        mistakes: 0,
        speed: 1,
        heatSaid: false,
        finished: false,
        running: false
      };

      const stations = {};
      const chipsOrder = ['active', 'facilitated', 'simple'];

      /* ---------- build station ---------- */
      function buildStation(x, letter, index) {
        const g = new T.Group();
        g.position.set(x, 0, 0);
        const color = 0x4fe6ff;
        const base = new T.Mesh(new T.CylinderGeometry(0.56, 0.66, 0.14, 30), K.standard(0x132a4a, { emissiveIntensity: 0.05, roughness: 0.6 }));
        base.position.y = -1.28;
        g.add(base);
        const floorRing = new T.Mesh(new T.TorusGeometry(0.54, 0.028, 8, 40), K.basic(0x4fe6ff, 0.6));
        floorRing.rotation.x = Math.PI / 2;
        floorRing.position.y = -1.2;
        g.add(floorRing);
        const pillar = new T.Mesh(new T.CylinderGeometry(0.075, 0.11, 1.75, 12), K.standard(0x27476f, { emissiveIntensity: 0.12, roughness: 0.5 }));
        pillar.position.y = -0.25;
        g.add(pillar);
        const cage = new T.Mesh(new T.IcosahedronGeometry(0.54, 0), K.basic(0x4fe6ff, 0.22, { wireframe: true }));
        cage.position.y = 0.72;
        g.add(cage);
        const core = new T.Mesh(new T.SphereGeometry(0.16, 18, 12), K.standard(0x9fe8ff, { emissiveIntensity: 0.8, roughness: 0.2 }));
        core.position.y = 0.72;
        g.add(core);
        const halo = new T.Mesh(new T.TorusGeometry(0.64, 0.022, 8, 44), K.basic(0xffd166, 0.85));
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.72;
        halo.visible = false;
        g.add(halo);

        const particles = [];
        const pmat = K.standard(0xbdf6ff, { emissiveIntensity: 0.75, roughness: 0.25 });
        for (let i = 0; i < 10; i++) {
          const p = new T.Mesh(new T.SphereGeometry(0.045, 8, 6), pmat);
          g.add(p);
          particles.push({ mesh: p, phase: i / 10, off: K.rand(-0.05, 0.05) });
        }
        if (ORDER[index] === 'facilitated') {
          const ring = new T.Mesh(new T.TorusGeometry(0.19, 0.045, 10, 28), K.standard(0xffd166, { emissiveIntensity: 0.55, roughness: 0.3 }));
          ring.position.set(0, 0.72, 0);
          g.add(ring);
        }
        if (ORDER[index] === 'active') {
          for (let i = 0; i < 3; i++) {
            const arrow = new T.Mesh(new T.ConeGeometry(0.06, 0.16, 8), K.standard(0x8b6bff, { emissiveIntensity: 0.6 }));
            arrow.position.set(-0.2 + i * 0.2, 0.45, 0.1);
            arrow.rotation.z = Math.PI / 2;
            g.add(arrow);
          }
        }

        stage.add(g);
        stage.pickable(g, { kind: 'station', id: ORDER[index] });
        const label = stage.addLabel(g, '<span class="l-ar">المحطة ' + letter + '</span>', { offsetY: 0.95 });
        const data = { group: g, core: core, halo: halo, particles: particles, label: label, index: index };
        g.userData.animate = (t) => {
          core.rotation.y += 0.01;
          cage.rotation.y -= 0.006;
          halo.rotation.z += 0.01;
          const mech = ORDER[index];
          particles.forEach((p, i) => {
            const ph = (t * 0.32 * state.speed + p.phase) % 1;
            if (mech === 'simple') {
              p.mesh.position.set(-0.36 + ph * 0.72, 0.72 + Math.sin(t * 2 + i) * 0.06 + p.off, 0.02);
            } else if (mech === 'facilitated') {
              p.mesh.position.set(Math.sin(ph * Math.PI * 2) * 0.08, 0.72 + Math.cos(ph * Math.PI * 2) * 0.18, 0.4 - ph * 0.8);
            } else {
              p.mesh.position.set(0.34 - ph * 0.68, 0.72 + Math.sin(t * 1.4 + i) * 0.1, 0.02);
            }
          });
        };
        return data;
      }

      const row = new T.Group();
      stage.add(row);
      [-1.95, 0, 1.95].forEach((x, i) => {
        const st = buildStation(x, LETTER[i], i);
        st.group.position.x = x;
        stations[ORDER[i]] = st;
      });

      const hub = new T.Mesh(new T.CylinderGeometry(2.75, 2.95, 0.1, 48), K.standard(0x0a1a30, { emissiveIntensity: 0.02, roughness: 0.8 }));
      hub.position.y = -1.4;
      stage.add(hub);
      const hubRing = new T.Mesh(new T.TorusGeometry(2.7, 0.015, 6, 80), K.basic(0x4fe6ff, 0.35));
      hubRing.rotation.x = Math.PI / 2;
      hubRing.position.y = -1.36;
      stage.add(hubRing);

      stage.addLabel(new T.Vector3(0, 1.9, 0), '<span class="l-ar">مركز التحكم بالنقل</span><span class="l-en">TRANSPORT CONTROL</span>', { cls: 'bio' });
      stage.addTicker((dt, t) => {
        Object.keys(stations).forEach((id) => {
          const st = stations[id];
          if (st.group.userData.animate) st.group.userData.animate(t);
        });
        hubRing.rotation.z += dt * 0.1;
      });

      stage.hoverHandler = (hit) => {
        const id = hit && hit.data && hit.data.kind === 'station' ? hit.data.id : null;
        stage._setCursor(id ? 'pointer' : '');
      };

      /* ---------- UI ---------- */
      function mechChipHTML(id) {
        const m = MECH[id];
        const used = state.matched.has(id);
        return '<button class="fn-chip' + (used ? ' is-used' : '') + '" data-mech="' + id + '" type="button">' +
          '<span><span class="fn-name">' + m.ar + '</span>' +
          '<span class="fn-en">' + m.en + '</span>' +
          '<span class="fn-en" style="letter-spacing:0;text-transform:none;color:#93b8d6">' + m.hint + '</span></span></button>';
      }

      function stationRowHTML(id, i) {
        const ran = !!state.run[id];
        return '<div class="obs-row"><span>المحطة ' + LETTER[i] + '</span><i class="' +
          (ran ? 'ok' : 'warn') + '">' + (ran ? 'تم التشغيل' : 'بانتظار التشغيل') + '</i></div>';
      }

      function heatHTML() {
        return '<div class="console-box"><div class="console-title">درجة الحرارة <small>HEAT</small>' +
          '<span class="tag blue">حركة الجزيئات</span></div>' +
          '<div class="slider-row"><svg class="tiny-icon"><use href="#i-sun"/></svg>' +
          '<input type="range" min="10" max="100" step="5" value="' + Math.round(state.speed * 40) + '" data-heat aria-label="درجة الحرارة">' +
          '<output>' + Math.round(state.speed * 40) + '٪</output></div></div>';
      }

      function stationDetailHTML(id) {
        const i = ORDER.indexOf(id);
        const ran = state.run[id];
        return '<div class="console-box"><div class="console-title">المحطة ' + LETTER[i] +
          ' <small>STATION ' + LETTER[i] + '</small></div>' +
          '<p class="panel-note">' + (ran ? OBS[id] : 'شغّلوا المحطة لمراقبة اتجاه حركة الجزيئات.') + '</p>' +
          (!ran ? '<button class="mini-btn gold" data-run="' + id + '" type="button"><svg class="tiny-icon"><use href="#i-play"/></svg> تشغيل المحطة</button>' : '') +
          '</div>';
      }

      function renderStart() {
        if (state.mode === 'run') {
          let html = kit.panelTitle('pump', 'محطات النقل', 'اختاروا محطة وشغّلوها لمراقبة حركة الجزيئات.');
          html += '<div class="obs-list">' + ORDER.map((id, i) => stationRowHTML(id, i)).join('') + '</div>';
          if (state.selected) html += stationDetailHTML(state.selected);
          html += heatHTML();
          html += '<p class="panel-note">المحطات التي تعمل: <b>' + K.ar(Object.keys(state.run).length) + ' من ٣</b></p>';
          api.panel('start', html);
        } else {
          api.panel('start', kit.panelTitle('target', 'ربط الآليات', 'اختاروا الآلية ثم اضغطوا على المحطة التي شاهدتموها.') +
            '<div class="chip-list">' + chipsOrder.map(mechChipHTML).join('') + '</div>' +
            '<p class="panel-note">الآليات المربوطة: <b>' + K.ar(state.matched.size) + ' من ٣</b></p>');
        }
      }

      function renderEnd() {
        const list = CV.CONTENT.transport;
        let html = kit.panelTitle('bulb', 'آليات النقل', 'ثلاث آليات تعبر بها المواد الغشاء البلازمي.');
        list.forEach((m) => {
          html += '<div class="console-box"><div class="console-title">' + m.ar +
            ' <small>' + m.en + '</small></div>' +
            '<p class="panel-note">' + m.fn + '</p>' +
            '<div class="obs-row"><span>طاقة</span><i class="' + (m.needsEnergy ? 'warn' : 'ok') + '">' +
            (m.needsEnergy ? 'تحتاج ATP' : 'لا تحتاج طاقة') + '</i></div>' +
            '<div class="obs-row"><span>بروتين ناقل</span><i class="' + (m.needsProtein ? 'warn' : 'ok') + '">' +
            (m.needsProtein ? 'مطلوب' : 'غير مطلوب') + '</i></div></div>';
        });
        api.panel('end', html);
      }

      function updateReadout(atp) {
        if (state.mode === 'run') {
          api.readout('<span class="readout-pill cell">محطات تعمل <b>' + K.ar(Object.keys(state.run).length) + ' من ٣</b></span>' +
            (atp != null ? '<span class="readout-pill atp">ATP <b>' + K.ar(atp) + '٪</b></span>' : ''));
        } else {
          api.readout('<span class="readout-pill">آليات مربوطة <b>' + K.ar(state.matched.size) + ' من ٣</b></span>');
        }
      }

      function setSelected(id) {
        if (state.mode !== 'run' || !api.alive()) return;
        state.selected = id;
        api.sound('click');
        renderStart();
      }

      function runStation(id) {
        if (state.mode !== 'run' || !state.selected || state.run[id] || state.running || !api.alive()) return;
        state.running = true;
        state.run[id] = true;
        api.sound('machineStart');
        api.sound('waterFill');
        renderStart();
        api.toast('المحطة ' + LETTER[ORDER.indexOf(id)] + ' قيد التشغيل...', '', 'gear');
        if (id === 'active') updateReadout(38);

        setTimeout(() => {
          if (!api.alive()) return;
          state.running = false;
          api.sound('sparkle');
          api.toast('اكتمل التشغيل. راقبوا ما حدث.', 'ok', 'check');
          const done = Object.keys(state.run).length;
          api.objective('شغّلوا المحطات الثلاث', done, 3);
          renderStart();
          updateReadout();
          if (done === 3) {
            state.mode = 'match';
            state.selected = null;
            api.steps(2);
            api.objective('اربطوا كل محطة بآليتها', 0, 3);
            api.toast('المحطات الثلاث تعمل. اربطوا كل محطة بآليتها.', 'ok', 'target');
            renderStart();
            updateReadout();
            api.quip('pip', 'المحطات الثلاث تعمل. اربطوا كل محطة بما شاهدتموه، لا بما تتوقعونه.', 3400);
          }
        }, 2400);
      }

      function selectMech(id) {
        if (state.mode !== 'match' || state.matched.has(id) || !api.alive()) return;
        state.selectedMech = state.selectedMech === id ? null : id;
        api.sound('click');
        renderStart();
      }

      function tryMatch(stationId) {
        if (state.mode === 'run') {
          setSelected(stationId);
          return;
        }
        if (!state.selectedMech) {
          api.toast('اختاروا آلية نقل من اللوحة أولًا.', '', 'hand');
          return;
        }
        const chip = document.querySelector('.fn-chip[data-mech="' + state.selectedMech + '"]');
        if (state.selectedMech === stationId) {
          state.matched.add(stationId);
          state.selectedMech = null;
          stations[stationId].halo.visible = true;
          api.sound('snap');
          api.sound('sparkle');
          api.toast('ربط صحيح: ' + MECH[stationId].ar, 'ok', 'check');
          const center = stage.screenOf(stations[stationId].core.getWorldPosition(new T.Vector3()));
          if (center.visible && SQ.FX) SQ.FX.burst(center.x, center.y, { count: 22, colors: ['#ffd166', '#4fe6ff', '#fff'], speed: 3.4 });
          renderStart();
          updateReadout();
          api.objective('اربطوا كل محطة بآليتها', state.matched.size, 3);
          if (state.matched.size === 3) finish();
          else {
            const remaining = ORDER.filter((id) => !state.matched.has(id));
            api.quip('nova', 'المحطة ' + LETTER[ORDER.indexOf(remaining[0])] + ' ما زالت بلا آلية. راجعوا ما شاهدتموه.', 2800);
          }
        } else {
          state.mistakes++;
          state.selectedMech = null;
          api.sound('wrong');
          if (chip) SQ.UI.shake(chip);
          api.quip('orbit', 'الآلية لا تطابق ما شاهدتم في هذه المحطة. أعيدوا قراءة الملاحظة.', 3000);
          api.toast('ربط غير صحيح. أعيدوا النظر في الملاحظة.', 'bad', 'cross');
          renderStart();
        }
      }

      async function finish() {
        if (state.finished) return;
        state.finished = true;
        api.steps(3);
        api.objective('اكتمل مركز التحكم بالنقل', 6, 6);
        SQ.FX.confetti(80);
        api.sound('celebrate');
        await api.say('m3.done');
        if (!api.alive()) return;
        const stars = state.mistakes <= 1 ? 3 : state.mistakes <= 3 ? 2 : 1;
        api.complete(stars, {
          title: 'مركز التحكم يعمل بكامل طاقته',
          text: 'شغّلتم المحطات الثلاث وربطتم كل واحدة بآلية النقل الصحيحة.',
          learn: 'الانتشار البسيط لا يحتاج طاقة ولا بروتينًا. الانتشار المُيسّر يحتاج بروتينًا ناقلًا دون طاقة. النقل النشط يحتاج بروتينًا ناقلًا وطاقة ATP لأنه يسير عكس تدرّج التركيز.'
        });
      }

      /* ---------- bindings ---------- */
      stage.pickHandler = (hit) => {
        if (!hit || !hit.data || hit.data.kind !== 'station' || state.finished) return;
        tryMatch(hit.data.id);
      };

      kit.onClick(panelStart, '[data-mech]', (node) => selectMech(node.dataset.mech));
      kit.onClick(panelStart, '[data-run]', (node) => runStation(node.dataset.run));
      kit.on(panelStart, 'input', (e) => {
        const input = e.target.closest('[data-heat]');
        if (!input) return;
        state.speed = Math.max(0.25, Number(input.value) / 40);
        const out = input.parentElement.querySelector('output');
        if (out) out.textContent = SQ.UI.toAr(Math.round(Number(input.value))) + '٪';
        if (!state.heatSaid && Number(input.value) >= 70) {
          state.heatSaid = true;
          api.say('m3.heat');
        }
      });

      /* ---------- boot ---------- */
      api.panels('', '');
      renderStart();
      renderEnd();
      updateReadout();
      api.steps(0);
      api.objective('شغّلوا المحطات الثلاث', 0, 3);
      api.say('m3.intro');
      setTimeout(() => {
        if (api.alive() && state.mode === 'run' && !state.selected) api.toast('اختاروا محطة من المشهد أو من القائمة.', '', 'target');
      }, 5200);

      return {
        hint() { if (!state.finished) api.say('m3.hint'); },
        destroy() {
          kit.destroy();
          stage.clearLabels();
        }
      };
    }
  });
})();
