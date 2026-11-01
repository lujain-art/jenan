/* =========================================================
   MISSION 2 — بوابة الغشاء البلازمي / MEMBRANE GATE
   Seal five phospholipid gaps, then route six substances
   through the direct passage or a transport protein.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = window.CV;
  const T = window.THREE;
  const K = CV.kit;

  const GAP_X = [-1.55, -0.95, -0.35, 0.55, 1.2];
  const GATE_DIRECT = -2.28;
  const GATE_PROTEIN = 2.28;
  const ROW = 0.64;

  function stageGlow(color, size, opacity) {
    const mat = new T.SpriteMaterial({
      map: SQ.getGlowTexture(), color: color, transparent: true,
      opacity: opacity, blending: T.AdditiveBlending, depthWrite: false
    });
    const sp = new T.Sprite(mat);
    sp.scale.set(size, size, 1);
    return sp;
  }

  CV.registerMission({
    id: 'm2',
    start(api) {
      const stage = api.stage;
      const kit = K.create(api);
      const substances = CV.CONTENT.substances;
      const panelStart = document.getElementById('panel-start');
      const panelEnd = document.getElementById('panel-end');

      let sealed = new Set();
      let routed = new Set();
      let selectedSub = null;
      let mode = 'seal';
      let mistakes = 0;
      let finished = false;
      let animated = false;
      let directSaid = false;
      let proteinSaid = false;

      const membraneRoot = new T.Group();
      stage.add(membraneRoot);
      const gaps = [];
      const lipidAnimations = [];
      const gateMeshes = { direct: null, protein: null };

      const lipidGeo = new T.SphereGeometry(0.075, 10, 8);
      const tailGeo = new T.CylinderGeometry(0.012, 0.012, 0.52, 5);
      const headTopMat = K.standard(0x7be7ff, { emissiveIntensity: 0.55, roughness: 0.24 });
      const headBottomMat = K.standard(0x5b9dff, { emissiveIntensity: 0.42, roughness: 0.28 });
      const tailMat = K.basic(0x2f6f9e, 0.6);

      function addLipidColumn(x, parent, animate) {
        const group = new T.Group();
        [ROW, -ROW].forEach((y) => {
          const head = new T.Mesh(lipidGeo, y > 0 ? headTopMat : headBottomMat);
          head.position.set(0, y, 0);
          group.add(head);
          for (const tilt of [-0.055, 0.055]) {
            const tail = new T.Mesh(tailGeo, tailMat);
            tail.position.set(0, y > 0 ? y - 0.32 : y + 0.32, 0);
            tail.rotation.x = tilt;
            group.add(tail);
          }
        });
        group.position.x = x;
        parent.add(group);
        if (animate) {
          group.scale.setScalar(0.01);
          stage.tween(320, (t) => group.scale.setScalar(t), (t) => 1 - Math.pow(1 - t, 3));
        }
        return group;
      }

      /* ---------- phospholipid bilayer ---------- */
      const bilayer = new T.Group();
      membraneRoot.add(bilayer);
      for (let i = 0; i < 28; i++) {
        const x = -3.38 + i * 0.26;
        if (Math.abs(x - GATE_DIRECT) < 0.38 || Math.abs(x - GATE_PROTEIN) < 0.38) continue;
        if (GAP_X.some((gx) => Math.abs(x - gx) < 0.13)) continue;
        addLipidColumn(x, bilayer, false);
      }

      GAP_X.forEach((x, i) => {
        const g = new T.Group();
        g.position.set(x, 0, 0.02);
        const ring = new T.Mesh(new T.TorusGeometry(0.21, 0.024, 8, 28), K.basic(0xff6b6b, 0.85));
        g.add(ring);
        const glow = stageGlow(0xff6b6b, 0.85, 0.42);
        g.add(glow);
        g.userData.animate = (t) => ring.scale.setScalar(1 + Math.sin(t * 5 + i) * 0.14);
        g.userData.gapId = i;
        stage.pickable(g, { kind: 'gap', id: i });
        bilayer.add(g);
        gaps.push(g);
        const lab = stage.addLabel(g, '<span class="l-ar">فجوة</span>', { offsetY: 0.5, cls: 'hot' });
        g.userData.label = lab;
      });

      /* ---------- gates ---------- */
      function gateway(route) {
        const x = route === 'direct' ? GATE_DIRECT : GATE_PROTEIN;
        const g = new T.Group();
        g.position.set(x, 0, 0);
        if (route === 'protein') {
          const mat = K.standard(0x8b6bff, { emissiveIntensity: 0.5, roughness: 0.28, metalness: 0.3 });
          const left = new T.Mesh(new T.CapsuleGeometry(0.13, 1.85, 4, 12), mat);
          left.position.set(-0.17, 0, 0);
          const right = left.clone();
          right.position.x = 0.17;
          const ring = new T.Mesh(new T.TorusGeometry(0.3, 0.032, 8, 32), K.basic(0x9fd0ff, 0.6));
          ring.position.z = 0.08;
          g.add(left, right, ring);
        } else {
          const arch = new T.Mesh(new T.TorusGeometry(0.34, 0.018, 8, 32), K.basic(0x4fe6ff, 0.78));
          const veil = new T.Mesh(new T.PlaneGeometry(0.62, 1.3), K.basic(0x4fe6ff, 0.055, {
            side: T.DoubleSide, depthWrite: false, transparent: true
          }));
          g.add(arch, veil);
        }
        const hit = new T.Mesh(
          new T.PlaneGeometry(route === 'protein' ? 0.74 : 0.8, route === 'protein' ? 2.1 : 1.5),
          K.basic(0xffffff, 0.001, { side: T.DoubleSide, depthWrite: false, transparent: true })
        );
        g.add(hit);
        stage.pickable(g, { kind: 'gate', route: route });
        bilayer.add(g);
        const label = route === 'direct' ? 'عبور مباشر' : 'بروتين ناقل';
        stage.addLabel(g, '<span class="l-ar">' + label + '</span>', { offsetY: 1.25, cls: route === 'direct' ? 'bio' : 'hot' });
        gateMeshes[route] = g;
        return g;
      }
      gateway('direct');
      gateway('protein');

      /* ---------- scene dressing ---------- */
      stage.addLabel(new T.Vector3(0, 1.55, 0), '<span class="l-ar">الغشاء البلازمي</span><span class="l-en">PLASMA MEMBRANE</span>', { cls: 'bio' });
      stage.addLabel(new T.Vector3(0, 0.95, 0.65), '<span class="l-ar">خارج الخلية</span>', {});
      stage.addLabel(new T.Vector3(0, -0.95, 0.65), '<span class="l-ar">داخل الخلية</span>', {});
      const aura = stage.glow(0x4fe6ff, 6.5, 0.08);
      membraneRoot.add(aura);
      for (let i = 0; i < 20; i++) {
        const s = stage.spark(i % 2 ? 0x8fd8ff : 0x7cf0c0, K.rand(0.05, 0.13));
        s.position.set(K.rand(-3.4, 3.4), K.rand(-1.6, 1.6), K.rand(-1.1, 1.1));
        s.material.opacity = K.rand(0.12, 0.4);
        membraneRoot.add(s);
      }

      stage.addTicker((dt, t) => {
        gaps.forEach((g) => { if (g && g.userData.animate) g.userData.animate(t); });
      });

      /* ---------- UI ---------- */
      function sealRowsHTML() {
        return GAP_X.map((x, i) =>
          '<div class="obs-row"><span>فجوة ' + K.ar(i + 1) + '</span><i class="' + (sealed.has(i) ? 'ok' : 'bad') + '">' +
          (sealed.has(i) ? 'مغلقة' : 'تسرّب') + '</i></div>').join('');
      }

      function renderStart() {
        if (mode === 'seal') {
          api.panel('start', kit.panelTitle('membrane', 'إغلاق فجوات الغشاء', 'اضغطوا على كل فجوة حمراء لتُغلق بالدهون الفوسفورية.') +
            '<div class="obs-list">' + sealRowsHTML() + '</div>' +
            '<p class="panel-note">الفجوات المغلقة: <b>' + K.ar(sealed.size) + ' من ٥</b></p>');
        } else {
          let chips = '';
          substances.forEach((s) => {
            chips += '<button class="p-card' + (routed.has(s.id) ? ' is-done' : '') + (selectedSub === s.id ? ' is-selected' : '') +
              '" data-sub="' + s.id + '" type="button">' +
              '<span class="p-dot" style="color:#' + s.color.toString(16) + ';background:#' + s.color.toString(16) + '"></span>' +
              '<b>' + s.ar + '</b><span>' + s.en + '</span></button>';
          });
          api.panel('start', kit.panelTitle('pump', 'توجيه المواد', 'اختاروا مادة ثم اضغطوا على المسار الصحيح في الغشاء.') +
            '<div class="queue">' + chips + '</div>' +
            '<p class="panel-note">عبرت الغشاء: <b>' + K.ar(routed.size) + ' من ٦</b></p>');
        }
      }

      function renderEnd() {
        const m = CV.CONTENT.membrane;
        let html = kit.panelTitle('bulb', m.title, m.fn) +
          '<div class="console-box"><div class="console-title">التركيب <small>STRUCTURE</small></div>' +
          '<p class="panel-note">' + m.structure + '</p></div>' +
          '<div class="console-box"><div class="console-title">البوابتان <small>GATES</small></div>' +
          '<div class="obs-row"><span>طبقة دهنية</span><i class="ok">المواد الصغيرة مباشرة</i></div>' +
          '<div class="obs-row"><span>بروتين ناقل</span><i class="warn">المواد الأكبر حجمًا</i></div></div>';
        if (selectedSub) {
          const s = substances.find((x) => x.id === selectedSub);
          html += '<p class="panel-note">المادة المحددة: <b>' + s.ar + '</b> — ' + s.en + '</p>';
        }
        api.panel('end', html);
      }

      function updateReadout() {
        const cur = mode === 'seal' ? sealed.size : routed.size;
        const total = mode === 'seal' ? 5 : 6;
        api.readout('<span class="readout-pill cell">' + (mode === 'seal' ? 'فجوات مغلقة' : 'مواد عبرت') +
          ' <b>' + K.ar(cur) + ' من ' + K.ar(total) + '</b></span>');
      }

      function sealGap(index, node) {
        if (sealed.has(index)) return;
        sealed.add(index);
        const g = gaps[index];
        if (g.userData.label) stage.removeLabel(g.userData.label);
        stage.remove(g);
        gaps[index] = null;
        addLipidColumn(GAP_X[index], bilayer, true);
        api.sound('snap');
        api.sound('sparkle');
        kit.flashAt(new T.Vector3(GAP_X[index], 0, 0.2), 0x7cf0c0);
        api.toast('أُغلقت الفجوة ' + K.ar(index + 1) + '.', 'ok', 'check');
        if (sealed.size === 1) api.say('m2.seal');
        renderStart();
        updateReadout();
        api.objective('أغلقوا فجوات الغشاء', sealed.size, 5);
        if (sealed.size === GAP_X.length) {
          mode = 'route';
          api.objective('وجّهوا المواد عبر مسارها', 0, 6);
          api.steps(1);
          api.toast('الغشاء مغلق! وجّهوا المواد الآن.', 'ok', 'check');
          api.sound('machineStart');
          renderStart();
          api.say('m2.substance');
        }
      }

      function selectSubstance(id) {
        if (mode !== 'route' || routed.has(id) || !api.alive()) return;
        selectedSub = id;
        api.sound('pickup');
        renderStart();
        renderEnd();
        const s = substances.find((x) => x.id === id);
        api.toast('حددتم ' + s.ar + '. اختاروا المسار في الغشاء.', '', 'hand');
      }

      function routeThrough(route) {
        if (mode !== 'route' || !selectedSub || finished) return;
        const s = substances.find((x) => x.id === selectedSub);
        const gate = gateMeshes[route];
        const gx = route === 'direct' ? GATE_DIRECT : GATE_PROTEIN;
        const particle = new T.Mesh(new T.SphereGeometry(0.1, 14, 10), K.standard(s.color, { emissiveIntensity: 0.9, roughness: 0.2 }));
        particle.position.set(gx, 0.1, 1.15);
        const glow = stageGlow(s.color, 0.55, 0.5);
        particle.add(glow);
        membraneRoot.add(particle);

        if (s.route === route) {
          routed.add(s.id);
          selectedSub = null;
          api.sound('drop');
          stage.tween(850, (t) => {
            particle.position.z = 1.15 - t * 2.3;
            particle.position.y = 0.1 - Math.sin(t * Math.PI) * 0.12;
            particle.scale.setScalar(1 - t * 0.25);
          }, (t) => t);
          setTimeout(() => {
            if (!api.alive()) return;
            membraneRoot.remove(particle);
            api.sound('sparkle');
            api.toast('مسار صحيح: ' + s.ar, 'ok', 'check');
            renderStart();
            updateReadout();
            api.objective('وجّهوا المواد عبر مسارها', routed.size, 6);
            if (routed.size === substances.length) finish();
          }, 900);
          if (route === 'direct' && !directSaid) {
            directSaid = true;
            api.quip('nova', CV.line('m2.direct').text, 2800);
          } else if (route === 'protein' && !proteinSaid) {
            proteinSaid = true;
            api.quip('pip', CV.line('m2.protein').text, 2800);
          }
        } else {
          mistakes++;
          selectedSub = null;
          api.sound('wrong');
          api.quip('orbit', CV.line('m2.wrong').text, 3000);
          api.toast('هذا المسار لا يناسب حجم هذه المادة.', 'bad', 'cross');
          kit.flashAt(new T.Vector3(gx, 0, 0.3), 0xff6b6b);
          stage.tween(520, (t) => {
            particle.position.z = 1.15 - t * 0.9;
            particle.position.x = gx + Math.sin(t * Math.PI) * 0.12;
          }, (t) => t);
          setTimeout(() => {
            if (particle.parent) membraneRoot.remove(particle);
            renderStart();
            renderEnd();
          }, 560);
        }
      }

      async function finish() {
        if (finished) return;
        finished = true;
        api.steps(2);
        api.objective('الغشاء يعمل بانتقائية', 6, 6);
        SQ.FX.confetti(80);
        api.sound('celebrate');
        await api.say('m2.done');
        if (!api.alive()) return;
        const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
        api.complete(stars, {
          title: 'استعاد الغشاء البلازمي سلامته',
          text: 'أغلقتم الفجوات الخمس ووجّهتم المواد الست عبر مساراتها الصحيحة.',
          learn: 'الغشاء البلازمي طبقتان من الدهون الفوسفورية. الجزيئات الصغيرة مثل O₂ وCO₂ تعبر مباشرة، أما الغلوكوز والحمض الأميني وأيون الصوديوم فتحتاج بروتينات ناقلة.'
        });
      }

      /* ---------- picking ---------- */
      stage.pickHandler = (hit) => {
        if (!hit || !hit.data || !api.alive() || finished) return;
        if (mode === 'seal' && hit.data.kind === 'gap') {
          sealGap(hit.data.id);
        } else if (mode === 'route' && hit.data.kind === 'gate') {
          routeThrough(hit.data.route);
        }
      };
      stage.hoverHandler = (hit) => {
        const d = hit && hit.data;
        if (d && d.kind === 'gap') document.body.classList.add('is-hovering-hot');
        else document.body.classList.remove('is-hovering-hot');
      };

      kit.onClick(panelStart, '[data-sub]', (node) => selectSubstance(node.dataset.sub));

      /* ---------- boot ---------- */
      api.panels('', '');
      renderStart();
      renderEnd();
      updateReadout();
      api.steps(0);
      api.objective('أغلقوا فجوات الغشاء', 0, 5);
      api.say('m2.intro');
      setTimeout(() => {
        if (api.alive() && mode === 'seal' && !sealed.size) api.toast('اضغطوا على حلقات الفجوات الحمراء.', '', 'target');
      }, 5000);

      return {
        hint() { if (!finished) api.say('m2.hint'); },
        destroy() {
          kit.destroy();
          document.body.classList.remove('is-hovering-hot');
          stage.clearLabels();
        }
      };
    }
  });
})();
