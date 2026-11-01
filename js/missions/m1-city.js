/* =========================================================
   MISSION 1 — مدينة العضيات / CITY OF ORGANELLES
   Scan the seven organelles, then match every function card
   to the right structure (click or drag).
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = window.CV;
  const T = window.THREE;
  const K = CV.kit;

  const MATCH_TEXT = {
    chloroplast: 'تحوّل الطاقة الضوئية إلى طاقة كيميائية وتُنتج الغذاء.',
    peroxisome: 'تُزيل السموم من الخلية بإنزيماتها داخل غشاء واحد.',
    centrosome: 'تُكوّن الخيوط المغزلية وتساعد على انقسام الخلية.',
    cytoskeleton: 'شبكة ألياف بروتينية تدعم الخلية وتثبّت العضيات.',
    cilia: 'تراكيب دقيقة تحرّك الخلية أو تحرّك المواد حولها.',
    flagella: 'تراكيب طويلة تساعد الخلية على الحركة في السوائل.',
    vacuoles: 'تخزّن الماء والغذاء والفضلات وتحافظ على ضغط الامتلاء.'
  };

  const POS = {
    chloroplast: { x: -1.28, y: 0.78, z: 0.12 },
    peroxisome: { x: -0.42, y: 1.38, z: 0.55 },
    centrosome: { x: 0.62, y: 1.32, z: -0.35 },
    cytoskeleton: { x: -1.55, y: -0.32, z: 0.1 },
    cilia: { x: 1.62, y: 0.22, z: 0.42 },
    flagella: { x: 1.2, y: -1.12, z: 0.5 },
    vacuoles: { x: -0.28, y: -0.98, z: 0.18 }
  };

  function buildChloroplast() {
    const g = new T.Group();
    const body = new T.Mesh(new T.SphereGeometry(0.46, 28, 20), K.glass(0x4be3a8, 0.46, { emissiveIntensity: 0.4 }));
    body.scale.set(1.5, 0.9, 1.05);
    g.add(body);
    const outline = new T.Mesh(new T.SphereGeometry(0.465, 18, 12), K.basic(0x9dffd8, 0.16, { wireframe: true }));
    outline.scale.copy(body.scale);
    g.add(outline);
    for (let s = 0; s < 3; s++) {
      const stack = new T.Group();
      stack.position.set(-0.36 + s * 0.34, 0.02, 0.04);
      for (let d = 0; d < 3; d++) {
        const disc = new T.Mesh(new T.CylinderGeometry(0.115, 0.115, 0.05, 16), K.standard(0x1f9e6d, { emissiveIntensity: 0.75, roughness: 0.45 }));
        disc.position.y = (d - 1) * 0.1;
        stack.add(disc);
      }
      g.add(stack);
    }
    return g;
  }

  function buildPeroxisome() {
    const g = new T.Group();
    const body = new T.Mesh(new T.SphereGeometry(0.28, 22, 16), K.glass(0xff9f68, 0.72, { emissiveIntensity: 0.45 }));
    g.add(body);
    const core = new T.Mesh(new T.IcosahedronGeometry(0.11, 0), K.standard(0xffd6a0, { emissiveIntensity: 0.9, roughness: 0.3 }));
    g.add(core);
    for (let i = 0; i < 7; i++) {
      const dot = new T.Mesh(new T.SphereGeometry(0.032, 8, 6), K.standard(0xfff0dc, { emissiveIntensity: 0.8 }));
      const a = (i / 7) * Math.PI * 2;
      const b = Math.acos(1 - (i + 0.5) / 3.5);
      dot.position.set(0.17 * Math.sin(b) * Math.cos(a), 0.17 * Math.cos(b), 0.17 * Math.sin(b) * Math.sin(a));
      g.add(dot);
    }
    return g;
  }

  function buildCentrosome() {
    const g = new T.Group();
    const mat = K.standard(0x8b6bff, { emissiveIntensity: 0.5, roughness: 0.28, metalness: 0.3 });
    const c1 = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.48, 14, 1, true), mat);
    const c2 = new T.Mesh(new T.CylinderGeometry(0.075, 0.075, 0.48, 14, 1, true), mat);
    c2.rotation.z = Math.PI / 2;
    c2.position.x = 0.18;
    g.add(c1, c2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const q = new T.Vector3(Math.cos(a) * 0.72, Math.sin(a) * 0.72, (i % 2 ? 0.16 : -0.16));
      const tube = new T.Mesh(
        new T.CylinderGeometry(0.008, 0.008, 0.72, 5),
        K.basic(0xb9a8ff, 0.55)
      );
      tube.position.copy(q.clone().multiplyScalar(0.5));
      tube.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.clone().normalize());
      g.add(tube);
    }
    return g;
  }

  function buildCytoskeleton() {
    const g = new T.Group();
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2;
      const b = Math.acos(2 * rnd() - 1);
      const r = 0.34 + rnd() * 0.46;
      pts.push(new T.Vector3(r * Math.sin(b) * Math.cos(a), r * Math.cos(b) * 0.8, r * Math.sin(b) * Math.sin(a)));
    }
    for (let i = 0; i < pts.length; i++) {
      const j = (i * 5 + 3) % pts.length;
      if (i === j) continue;
      const mid = pts[i].clone().add(pts[j]).multiplyScalar(0.5);
      mid.x += (rnd() - 0.5) * 0.2;
      mid.y += (rnd() - 0.5) * 0.2;
      const curve = new T.CatmullRomCurve3([pts[i], mid, pts[j]]);
      const geo = new T.TubeGeometry(curve, 14, 0.012, 5, false);
      g.add(new T.Mesh(geo, K.standard(0x4fe6ff, { emissiveIntensity: 0.55, transparent: true, opacity: 0.8 })));
    }
    pts.forEach((p, i) => {
      if (i % 3) return;
      const node = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), K.basic(0xbdf6ff, 0.85));
      node.position.copy(p);
      g.add(node);
    });
    return g;
  }

  function buildCilia() {
    const g = new T.Group();
    const base = new T.Mesh(new T.SphereGeometry(0.17, 18, 12), K.standard(0x7be7ff, { emissiveIntensity: 0.5 }));
    g.add(base);
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const arm = new T.Group();
      const a = (i / 8) * Math.PI * 2;
      arm.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0);
      arm.rotation.z = a - Math.PI / 2;
      const stalk = new T.Mesh(new T.CapsuleGeometry(0.024, 0.3, 4, 7), K.standard(0x7be7ff, { emissiveIntensity: 0.55 }));
      stalk.position.y = 0.19;
      arm.add(stalk);
      g.add(arm);
      arms.push({ arm: arm, phase: i * 0.7 });
    }
    g.userData.animate = (t) => {
      arms.forEach((a) => {
        a.arm.rotation.x = Math.sin(t * 3.4 + a.phase) * 0.32;
      });
      base.rotation.z += 0.004;
    };
    return g;
  }

  function buildFlagella() {
    const g = new T.Group();
    const base = new T.Mesh(new T.SphereGeometry(0.14, 16, 12), K.standard(0xffd166, { emissiveIntensity: 0.5 }));
    g.add(base);
    const chain = [];
    let parent = g;
    for (let i = 0; i < 4; i++) {
      const joint = new T.Group();
      joint.position.y = i === 0 ? 0.08 : 0.34;
      const seg = new T.Mesh(new T.CapsuleGeometry(0.022, 0.32, 4, 7), K.standard(0xffd166, { emissiveIntensity: 0.5 }));
      seg.position.y = 0.17;
      joint.add(seg);
      parent.add(joint);
      chain.push(joint);
      parent = joint;
    }
    g.userData.animate = (t) => {
      chain.forEach((j, i) => {
        j.rotation.x = Math.sin(t * 2.2 - i * 0.6) * 0.22;
        j.rotation.z = Math.cos(t * 1.7 - i * 0.5) * 0.12;
      });
    };
    return g;
  }

  function buildVacuoles() {
    const g = new T.Group();
    const big = new T.Mesh(new T.SphereGeometry(0.5, 26, 18), K.glass(0x5b9dff, 0.34, { emissiveIntensity: 0.34 }));
    g.add(big);
    const inner = new T.Mesh(new T.SphereGeometry(0.33, 20, 14), K.glass(0x9fd0ff, 0.2, { emissiveIntensity: 0.2 }));
    g.add(inner);
    const small = new T.Mesh(new T.SphereGeometry(0.2, 16, 12), K.glass(0x5b9dff, 0.42, { emissiveIntensity: 0.35 }));
    small.position.set(0.55, -0.2, 0.1);
    g.add(small);
    for (let i = 0; i < 4; i++) {
      const dot = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), K.basic(0xcfe8ff, 0.6));
      const a = i * 1.7;
      dot.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.2, Math.sin(a * 1.3) * 0.2);
      g.add(dot);
    }
    return g;
  }

  const BUILDERS = {
    chloroplast: buildChloroplast,
    peroxisome: buildPeroxisome,
    centrosome: buildCentrosome,
    cytoskeleton: buildCytoskeleton,
    cilia: buildCilia,
    flagella: buildFlagella,
    vacuoles: buildVacuoles
  };

  CV.registerMission({
    id: 'm1',
    start(api) {
      const stage = api.stage;
      const kit = K.create(api);
      const data = CV.CONTENT.organelles;
      const byId = {};
      data.forEach((d) => { byId[d.id] = d; });

      let scanned = new Set();
      let matched = new Set();
      let mistakes = 0;
      let selectedChip = null;
      let selectedId = null;
      let hovered = null;
      let mode = 'scan';
      let finished = false;

      const groups = {};
      const labels = {};
      const glows = {};
      const halos = {};
      const panelStart = document.getElementById('panel-start');
      const panelEnd = document.getElementById('panel-end');

      /* ---------- cell shell ---------- */
      const cell = new T.Group();
      stage.add(cell);
      const shell = new T.Mesh(new T.SphereGeometry(2.42, 44, 30), K.glass(0x4fe6ff, 0.055, { emissiveIntensity: 0.25 }));
      cell.add(shell);
      const wire = new T.Mesh(new T.IcosahedronGeometry(2.44, 1), K.basic(0x7be7ff, 0.07, { wireframe: true }));
      cell.add(wire);
      const dust = [];
      for (let i = 0; i < 24; i++) {
        const s = stage.spark(0x9fe8ff, K.rand(0.04, 0.12));
        s.position.set(K.rand(-2, 2), K.rand(-1.7, 1.7), K.rand(-1.2, 1.2));
        s.material.opacity = K.rand(0.15, 0.5);
        cell.add(s);
        dust.push(s);
      }

      /* ---------- organelles ---------- */
      data.forEach((item) => {
        const g = BUILDERS[item.id]();
        const p = POS[item.id];
        g.position.set(p.x, p.y, p.z);
        g.userData.baseY = p.y;
        g.userData.phase = Math.random() * Math.PI * 2;
        cell.add(g);
        groups[item.id] = g;
        stage.pickable(g, { kind: 'organelle', id: item.id });
        labels[item.id] = kit.label(g, item.ar, item.en, { offsetY: item.id === 'cytoskeleton' ? 0.85 : 0.55 });
        const glow = stage.glow(item.color, 1.05, 0.26);
        g.add(glow);
        glows[item.id] = glow;
        const halo = stage.ring(0.54, 0xffd166, 0.028, 0.9);
        halo.rotation.x = Math.PI / 2;
        halo.visible = false;
        g.add(halo);
        halos[item.id] = halo;
      });

      stage.addTicker((dt, t) => {
        cell.rotation.y = Math.sin(t * 0.12) * 0.08;
        wire.rotation.y -= dt * 0.03;
        dust.forEach((d, i) => {
          d.position.y += Math.sin(t * 0.5 + i) * dt * 0.05;
        });
        data.forEach((item) => {
          const g = groups[item.id];
          if (!g) return;
          g.position.y = g.userData.baseY + Math.sin(t * 0.7 + g.userData.phase) * 0.045;
          if (g.userData.animate) g.userData.animate(t);
          const glow = glows[item.id];
          if (glow && !matched.has(item.id)) {
            const k = 0.24 + Math.sin(t * 2.2 + g.userData.phase) * 0.12;
            glow.material.opacity = k;
            glow.scale.setScalar(1 + Math.sin(t * 2.2 + g.userData.phase) * 0.06);
          }
          if (halos[item.id].visible) halos[item.id].rotation.z += dt * 0.8;
        });
      });

      stage.hoverHandler = (hit) => {
        const id = hit && hit.data && hit.data.kind === 'organelle' ? hit.data.id : null;
        if (id === hovered) return;
        if (hovered && groups[hovered]) groups[hovered].scale.setScalar(1);
        hovered = id;
        if (id && !matched.has(id)) groups[id].scale.setScalar(1.09);
      };

      stage.pickHandler = (hit) => {
        if (!hit || !hit.data || hit.data.kind !== 'organelle') return;
        onOrganelle(hit.data.id);
      };

      /* ---------- panel rendering ---------- */
      function matchChipHTML(item, used) {
        return '<button class="fn-chip' + (used ? ' is-used' : '') + (selectedChip === item.id ? ' is-selected' : '') +
          '" data-chip="' + item.id + '" type="button">' +
          '<span><span class="fn-name">' + MATCH_TEXT[item.id] + '</span>' +
          '<span class="fn-en">FUNCTION CARD</span></span></button>';
      }

      function organellePickerHTML() {
        return '<div class="picker-grid">' + data.map((d) =>
          '<button class="mini-btn' + (selectedId === d.id ? ' gold' : '') + '" data-pick="' + d.id + '" type="button">' +
          d.ar + '</button>').join('') + '</div>';
      }

      function renderStart() {
        if (mode === 'scan') {
          let rows = '';
          data.forEach((d) => {
            const done = scanned.has(d.id);
            rows += '<div class="obs-row"><span>' + d.ar + '</span><i class="' + (done ? 'ok' : 'warn') + '">' +
              (done ? '✓ تم المسح' : 'بانتظار المسح') + '</i></div>';
          });
          api.panel('start', kit.panelTitle('scan', 'مسح التراكيب', 'اضغطوا على كل تركيب مضيء داخل الخلية لتفحصوه.') +
            '<div class="obs-list">' + rows + '</div>' +
            '<p class="panel-note">اكتمل المسح: <b>' + K.ar(scanned.size) + ' من ٧</b></p>');
        } else {
          const order = ['chloroplast', 'peroxisome', 'centrosome', 'cytoskeleton', 'cilia', 'flagella', 'vacuoles'];
          api.panel('start', kit.panelTitle('hand', 'بطاقات الوظائف', 'اختاروا بطاقة ثم اضغطوا على التركيب المطابق، أو اسحبوا البطاقة إليه.') +
            '<div class="chip-list">' + order.map((id) => matchChipHTML(byId[id], matched.has(id))).join('') + '</div>' +
            '<p class="panel-note">المطابقات الصحيحة: <b>' + K.ar(matched.size) + ' من ٧</b></p>');
        }
      }

      function renderEnd() {
        const id = selectedId;
        let html = kit.panelTitle('bulb', 'بطاقة التركيب', 'كل تركيب: اسم عربي، مصطلح إنجليزي، ووظيفة.');
        if (id) {
          const d = byId[id];
          const solved = matched.has(id);
          html += '<div class="scan-card">' +
            '<span class="scan-en">' + d.en + '</span>' +
            '<h4>' + d.ar + '</h4>' +
            '<p>' + d.detail + '</p>' +
            '<span class="scan-tag">' + d.tag + '</span>' +
            (solved ? '<span class="tag green">✓ تمت مطابقة وظيفته</span>' : '') +
            '</div>';
        } else {
          html += '<div class="scan-empty"><svg><use href="#i-cell"/></svg><span>اختاروا تركيبًا لعرض بياناته العلمية هنا.</span></div>';
        }
        if (mode === 'match') {
          html += '<p class="panel-note">أو اختاروا التركيب مباشرة:</p>' + organellePickerHTML();
        }
        api.panel('end', html);
      }

      function updateReadout() {
        api.readout('<span class="readout-pill cell">' +
          (mode === 'scan' ? 'تراكيب ممسوحة' : 'مطابقات صحيحة') +
          ' <b>' + K.ar(mode === 'scan' ? scanned.size : matched.size) + ' من ٧</b></span>');
      }

      /* ---------- interaction ---------- */
      function showScan(id) {
        selectedId = id;
        const d = byId[id];
        const lab = labels[id];
        if (lab) lab.el.classList.add('bio');
        renderEnd();
      }

      async function scanOrganelle(id) {
        if (scanned.has(id)) {
          showScan(id);
          return;
        }
        scanned.add(id);
        showScan(id);
        updateReadout();
        api.steps(0);
        api.objective('امسحوا التراكيب السبعة', scanned.size, 7);
        api.sound('scan');
        kit.burstAtObject(groups[id], byId[id].color);
        renderStart();
        if (scanned.size === data.length) {
          mode = 'match';
          const picked = ['chloroplast', 'peroxisome', 'centrosome', 'cytoskeleton', 'cilia', 'flagella', 'vacuoles'];
          for (let i = picked.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            const tmp = picked[i]; picked[i] = picked[j]; picked[j] = tmp;
          }
          api.steps(1);
          api.objective('اربطوا كل وظيفة بتركيبها', 0, 7);
          api.toast('اكتمل المسح! اربطوا بطاقات الوظائف الآن.', 'ok', 'check');
          api.sound('sparkle');
          renderStart();
          renderEnd();
          api.say('m1.goal');
        } else {
          api.say('m1.' + id);
        }
      }

      function onOrganelle(id) {
        if (!api.alive() || finished) return;
        if (mode === 'scan') {
          scanOrganelle(id);
          return;
        }
        if (matched.has(id)) {
          showScan(id);
          api.toast('هذا التركيب طُوبق بالفعل.', '', 'check');
          return;
        }
        if (selectedChip) {
          attempt(id);
        } else {
          showScan(id);
          api.toast('اختاروا بطاقة الوظيفة المطابقة ثم اضغطوا على التركيب.', '', 'hand');
        }
      }

      function selectChip(id) {
        if (!api.alive() || mode !== 'match' || matched.has(id)) return;
        selectedChip = id;
        api.sound('click');
        renderStart();
        if (selectedId && selectedId !== id) {
          api.toast('اضغطوا على التركيب الذي تؤدي وظيفته هذه البطاقة.', '', 'target');
        }
      }

      function attempt(id) {
        if (!selectedChip || matched.has(id) || matched.has(selectedChip)) return;
        const chip = document.querySelector('.fn-chip[data-chip="' + selectedChip + '"]');
        if (selectedChip === id) {
          matched.add(id);
          const color = byId[id].color;
          halos[id].visible = true;
          halos[id].material.color.set(0xffd166);
          glows[id].material.opacity = 0.5;
          const chipId = selectedChip;
          selectedChip = null;
          api.sound('snap');
          api.sound('sparkle');
          kit.burstAtObject(groups[id], color);
          api.toast('مطابقة صحيحة: ' + byId[id].ar, 'ok', 'check');
          renderStart();
          renderEnd();
          updateReadout();
          api.objective('اربطوا كل وظيفة بتركيبها', matched.size, 7);
          if (matched.size === data.length) finish();
          void chipId;
        } else {
          mistakes++;
          selectedChip = null;
          api.sound('wrong');
          if (chip) SQ.UI.shake(chip);
          const g = groups[id];
          const wp = new T.Vector3();
          g.getWorldPosition(wp);
          kit.flashAt(wp, 0xff6b6b);
          api.quip('orbit', CV.line('m1.wrong').text, 3000);
          api.toast('ليست الوظيفة الصحيحة لهذا التركيب.', 'bad', 'cross');
          renderStart();
        }
      }

      async function finish() {
        if (finished) return;
        finished = true;
        api.steps(2);
        api.objective('اكتملت قاعدة بيانات العضيات', 7, 7);
        stage.clearLabels();
        SQ.FX.confetti(80);
        api.sound('celebrate');
        await api.say('m1.done');
        if (!api.alive()) return;
        const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
        api.complete(stars, {
          title: 'عادت مدينة العضيات إلى العمل',
          text: 'ربطتم وظائف التراكيب السبعة دون أي خلط بينها. قاعدة بيانات العضيات مكتملة.',
          learn: 'البلاستيدات الخضراء تصنع الغذاء، البيروكسيسوم يُزيل السموم، الجسم المركزي ينظّم الانقسام، الهيكل الخلوي يدعم الخلية، الأهداب والأسواط تحرّكها، والفجوات تخزّن الماء والغذاء والفضلات.'
        });
      }

      /* ---------- bindings ---------- */
      kit.onClick(panelStart, '[data-chip]', (node) => selectChip(node.dataset.chip));
      kit.onClick(panelEnd, '[data-pick]', (node) => {
        if (!api.alive() || finished) return;
        if (mode === 'scan') scanOrganelle(node.dataset.pick);
        else {
          selectedId = node.dataset.pick;
          renderEnd();
          if (selectedChip) attempt(node.dataset.pick);
          else api.toast('اختاروا بطاقة الوظيفة لهذا التركيب.', '', 'hand');
        }
      });

      kit.dragger({
        root: () => panelStart,
        selector: '.fn-chip',
        attr: 'chip',
        ghost: (id) => {
          const d = byId[id];
          return '<span class="dg-dot" style="background:#' + d.color.toString(16) + '"></span><span>' + MATCH_TEXT[id] + '</span>';
        },
        onDrop: (hit, id) => {
          if (!hit || !hit.data || hit.data.kind !== 'organelle') {
            api.toast('أفلتوا البطاقة فوق تركيب داخل الخلية.', 'bad', 'target');
            return;
          }
          selectedChip = id;
          renderStart();
          attempt(hit.data.id);
        }
      });

      /* ---------- intro ---------- */
      api.panels('', '');
      renderStart();
      renderEnd();
      updateReadout();
      api.steps(0);
      api.objective('امسحوا التراكيب السبعة', 0, 7);
      api.say('m1.intro');
      setTimeout(() => {
        if (api.alive() && mode === 'scan' && !scanned.size) api.toast('اضغطوا على أي تركيب مضيء لبدء المسح.', '', 'scan');
      }, 5200);

      return {
        hint() {
          if (finished) return;
          if (mode === 'scan') {
            api.say('m1.hint');
          } else {
            api.toast('اختاروا بطاقة، ثم اضغطوا على التركيب — أو اسحبوا البطاقة إليه.', '', 'hand');
            api.say('m1.hint');
          }
        },
        destroy() {
          kit.destroy();
          stage.clearLabels();
        }
      };
    }
  });
})();
