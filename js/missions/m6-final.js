/* =========================================================
   MISSION 6 — الهروب الأخير / THE LAST ESCAPE
   One connected final scenario: inspect the damaged portal,
   analyse four simultaneous failures, activate the right
   process for each, observe the recovery, then route all six
   escape keys into their sockets and leave the cell.
   ========================================================= */
(function () {
  'use strict';
  const SQ = window.SQ;
  const CV = window.CV;
  const T = window.THREE;
  const K = CV.kit;

  /* ---------- the four systems that failed together ---------- */
  const SYSTEMS = [
    {
      id: 'light', ar: 'مصباح البلاستيدات', en: 'CHLOROPLAST LAMP', icon: 'sun',
      scan: 'البلاستيدات خضراء وسليمة، لكن أغشيتها الداخلية لا تلتقط أي فوتون.',
      symptom: 'الخلية تموت جوعًا رغم توفر الماء وثاني أكسيد الكربون والكلوروفيل.',
      causes: [
        { t: 'لا يوجد ضوء لتلتقطه صبغة الكلوروفيل', ok: true },
        { t: 'نقص الأكسجين داخل النواة', ok: false },
        { t: 'الريبوسومات توقفت عن بناء البروتين', ok: false }
      ],
      fix: 'تشغيل مصدر الضوء', line: 'm6.fix1',
      observe: 'البناء الضوئي عاد: ضوء + CO₂ + ماء ← غذاء + أكسجين.'
    },
    {
      id: 'leak', ar: 'تسرّب الغشاء', en: 'MEMBRANE LEAK', icon: 'membrane',
      scan: 'الطبقة الثنائية الدهنية مثقوبة، والمواد تعبر في الاتجاهين بلا تنظيم.',
      symptom: 'مواد تخرج بلا حساب وأخرى تدخل رغم وجود بروتينات ناقلة كافية.',
      causes: [
        { t: 'فجوة في الغشاء تفقد الخلية انتقائيتها', ok: true },
        { t: 'الميتوكوندريا توقفت عن إنتاج ATP', ok: false },
        { t: 'النواة فقدت النوية', ok: false }
      ],
      fix: 'لصق الغشاء الفوسفوري', line: 'm6.fix2',
      observe: 'الغشاء استعاد انتقائيته: ما يدخل وما يخرج تحت السيطرة.'
    },
    {
      id: 'pump', ar: 'مضخة ATP', en: 'ATP PUMP', icon: 'pump',
      scan: 'البروتين الناقل ساكن، والأيونات متراكمة على الجانب منخفض التركيز.',
      symptom: 'الأيونات لا تنتقل من التركيز الأقل إلى التركيز الأعلى.',
      causes: [
        { t: 'النقل النشط بلا ATP يشغّل المضخة', ok: true },
        { t: 'الانتشار البسيط يعمل بكامل طاقته', ok: false },
        { t: 'الغشاء أصبح منفذًا لكل شيء', ok: false }
      ],
      fix: 'إعادة تشغيل المضخة', line: 'm6.fix3',
      observe: 'المضخة تدور: المواد تعبر عكس تدرّج التركيز بطاقة ATP.'
    },
    {
      id: 'osmosis', ar: 'توازن الماء', en: 'WATER BALANCE', icon: 'water',
      scan: 'الخزان الخارجي تركيزه متغيّر، والماء يهاجر في اتجاه واحد باستمرار.',
      symptom: 'الخلية تنتفخ بلا توقف، فالماء يدخل أكثر مما يخرج.',
      causes: [
        { t: 'المحلول خارج الخلية أقل تركيزًا من سيتوبلازمها', ok: true },
        { t: 'المحلول خارج الخلية أعلى تركيزًا', ok: false },
        { t: 'المحلول خارج الخلية متساوي التوتر', ok: false }
      ],
      fix: 'تثبيت التوازن', line: 'm6.fix4',
      observe: 'محلول متساوي التوتر: الماء يدخل ويخرج بالكمية نفسها.'
    }
  ];

  /* ---------- the six escape sockets, one per mission ---------- */
  const SOCKETS = [
    { id: 's1', key: 'مفتاح العضيات', hint: 'سبعة تراكيب، لكل تركيب وظيفة', icon: 'cell' },
    { id: 's2', key: 'مفتاح الغشاء', hint: 'حدود ذكية تنظّم مرور المواد', icon: 'membrane' },
    { id: 's3', key: 'مفتاح النقل', hint: 'بسيط • مُيسّر • نشط يحتاج ATP', icon: 'pump' },
    { id: 's4', key: 'مفتاح الماء', hint: 'الماء ينتقل نحو المحلول الأعلى تركيزًا', icon: 'water' },
    { id: 's5', key: 'مفتاح الحويصلات', hint: 'إدخال خلوي وإخراج خلوي', icon: 'vesicle' },
    { id: 's6', key: 'مفتاح الهروب', hint: 'بوابة تُشغّلها الأنظمة الأربعة', icon: 'target' }
  ];

  const PHASES = [
    { key: 'inspect', label: 'افحصوا البوابة والأعطال' },
    { key: 'analyze', label: 'حلّلوا سبب كل عطل' },
    { key: 'repair', label: 'نشّطوا النظام الصحيح وراقبوا' },
    { key: 'route', label: 'وجّهوا المفاتيح الستة إلى مقابسها' }
  ];

  const shuffled = (arr) => arr.map((v, i) => [Math.random(), i, v])
    .sort((a, b) => a[0] - b[0]).map((t) => t[2]);

  CV.registerMission({
    id: 'm6',
    start(api) {
      const stage = api.stage;
      const kit = K.create(api);
      const panelStart = document.getElementById('panel-start');
      const missionBottom = document.getElementById('mission-bottom');

      const state = {
        phase: 0,
        scanned: new Set(),
        diagnosed: new Set(),
        fixed: new Set(),
        seated: {},
        selectedKey: null,
        openFault: null,
        mistakes: 0,
        busy: false,
        finished: false,
        osmoValue: 85,
        tray: shuffled(SOCKETS.map((s) => s.id))
      };

      const markers = {};
      const labels = {};
      const sockets = {};

      /* ================= the cell shell ================= */
      const cell = new T.Group();
      stage.add(cell);
      const shell = new T.Mesh(new T.SphereGeometry(4.6, 40, 28), K.glass(0x4fe6ff, 0.05, { emissiveIntensity: 0.18 }));
      cell.add(shell);
      const wire = new T.Mesh(new T.IcosahedronGeometry(4.62, 1), K.basic(0x7be7ff, 0.06, { wireframe: true }));
      cell.add(wire);

      /* ================= the damaged escape portal ================= */
      const portal = new T.Group();
      cell.add(portal);
      const rim = new T.Mesh(new T.TorusGeometry(1.62, 0.09, 12, 60), K.standard(0x3d7fae, { emissiveIntensity: 0.3 }));
      portal.add(rim);
      const innerRim = new T.Mesh(new T.TorusGeometry(1.16, 0.04, 10, 48), K.standard(0x8fcaff, { emissiveIntensity: 0.22 }));
      portal.add(innerRim);

      const coreMat = K.basic(0x78f5ff, 0.1, { depthWrite: false, blending: T.AdditiveBlending });
      const core = new T.Mesh(new T.CircleGeometry(1.12, 48), coreMat);
      portal.add(core);

      const arcs = [];
      for (let i = 0; i < 6; i++) {
        const arc = new T.Mesh(new T.TorusGeometry(1.62, 0.13, 10, 26, Math.PI / 3.6),
          K.basic(0x78f5ff, 0.08, { transparent: true, depthWrite: false }));
        arc.rotation.z = Math.PI / 2 - (i + 0.5) * (Math.PI / 3) + Math.PI / 7.2;
        portal.add(arc);
        arcs.push(arc);
      }

      const lockMat = K.standard(0xff6b6b, { emissiveIntensity: 0.7, roughness: 0.3 });
      const lockBody = new T.Mesh(new T.BoxGeometry(0.5, 0.42, 0.2), lockMat);
      lockBody.position.z = 0.05;
      portal.add(lockBody);
      const lockShackle = new T.Mesh(new T.TorusGeometry(0.19, 0.055, 8, 22, Math.PI), K.standard(0xff8f8f, { emissiveIntensity: 0.6 }));
      lockShackle.position.set(0, 0.2, 0.05);
      portal.add(lockShackle);

      const portalGlow = stage.glow(0x78f5ff, 5.2, 0.06);
      portal.add(portalGlow);

      const portalHit = new T.Mesh(new T.CircleGeometry(1.5, 24), K.basic(0xffffff, 0, { visible: false }));
      portalHit.position.z = 0.2;
      portal.add(portalHit);
      stage.pickable(portalHit, { kind: 'portal' });
      const portalLabel = stage.addLabel(portal,
        '<span class="l-ar">بوابة الخروج</span><span class="l-en">ESCAPE PORTAL</span>', { offsetY: 2.1, cls: 'hot' });

      /* sockets around the rim */
      SOCKETS.forEach((s, i) => {
        const ang = Math.PI / 2 + Math.PI - i * (Math.PI / 3);
        const g = new T.Group();
        g.position.set(Math.cos(ang) * 1.62, Math.sin(ang) * 1.62, 0.12);
        const ring = new T.Mesh(new T.TorusGeometry(0.19, 0.05, 8, 22), K.standard(0x9fbfe0, { emissiveIntensity: 0.2 }));
        g.add(ring);
        const disc = new T.Mesh(new T.CircleGeometry(0.15, 20), K.basic(0x0d2340, 0.85));
        disc.position.z = -0.01;
        g.add(disc);
        const hit = new T.Mesh(new T.CircleGeometry(0.34, 16), K.basic(0xffffff, 0, { visible: false }));
        hit.position.z = 0.1;
        g.add(hit);
        stage.pickable(hit, { kind: 'socket', id: s.id });
        portal.add(g);
        sockets[s.id] = { group: g, ring: ring, disc: disc, arc: arcs[i], data: s };

        const lab = stage.addLabel(g, '<span class="l-ar">' + s.hint + '</span>', { offsetY: 0.44, cls: 'socket' });
        sockets[s.id].label = lab;
        stage.showLabel(lab, false);
      });

      /* ================= the four failing systems ================= */
      const sysGroup = {};
      const sysPos = { light: [-3.05, 1.5, 0.2], leak: [3.15, -0.95, 0.5], pump: [-0.35, -3.05, 0.6], osmosis: [2.75, 2.15, -0.2] };

      function addFaultMarker(id, pos, offsetY) {
        const g = new T.Group();
        g.position.set(pos[0], pos[1], pos[2]);
        const ring = new T.Mesh(new T.TorusGeometry(0.42, 0.035, 8, 30), K.basic(0xff6b6b, 0.9));
        g.add(ring);
        const glow = stage.spark(0xff6b6b, 1.2);
        glow.material.opacity = 0.35;
        g.add(glow);
        g.userData.animate = (t) => {
          ring.scale.setScalar(1 + Math.sin(t * 4) * 0.13);
          glow.material.opacity = 0.26 + Math.sin(t * 3) * 0.13;
        };
        const hit = new T.Mesh(new T.SphereGeometry(0.5, 12, 10), K.basic(0xffffff, 0, { visible: false }));
        g.add(hit);
        stage.pickable(hit, { kind: 'fault', id: id });
        cell.add(g);
        markers[id] = g;
        const sys = SYSTEMS.find((s) => s.id === id);
        labels[id] = stage.addLabel(g, '<span class="l-ar">' + sys.ar + '</span><span class="l-en">' + sys.en + '</span>',
          { offsetY: offsetY || 0.78, cls: 'hot' });
        return g;
      }

      /* light: chloroplast + beam */
      const chloro = new T.Group();
      chloro.position.set(sysPos.light[0], sysPos.light[1], sysPos.light[2]);
      cell.add(chloro);
      const chloroMat = K.standard(0x2f8f68, { emissiveIntensity: 0.05, roughness: 0.4 });
      const chloroBody = new T.Mesh(new T.SphereGeometry(0.52, 24, 18), chloroMat);
      chloroBody.scale.set(1.45, 0.85, 1);
      chloro.add(chloroBody);
      const grana = [];
      for (let s = 0; s < 3; s++) {
        for (let d = 0; d < 3; d++) {
          const disc = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.05, 14), K.standard(0x1f6b4d, { emissiveIntensity: 0.1 }));
          disc.position.set(-0.36 + s * 0.36, (d - 1) * 0.1, 0.04);
          chloro.add(disc);
          grana.push(disc);
        }
      }
      const beam = new T.Mesh(new T.ConeGeometry(0.55, 2.9, 24, 1, true),
        K.basic(0xfff0b0, 0.07, { transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
      beam.position.set(sysPos.light[0], sysPos.light[1] + 2.2, sysPos.light[2]);
      beam.visible = false;
      cell.add(beam);
      sysGroup.light = chloro;
      addFaultMarker('light', sysPos.light, 1.0);

      /* leak: perforated membrane strip */
      const leak = new T.Group();
      leak.position.set(sysPos.leak[0], sysPos.leak[1], sysPos.leak[2]);
      cell.add(leak);
      const bilayer = new T.Group();
      leak.add(bilayer);
      for (let r = 0; r < 2; r++) {
        for (let i = -4; i <= 4; i++) {
          if (r === 0 && (i === 0 || i === 1)) continue;
          const head = new T.Mesh(new T.SphereGeometry(0.085, 12, 10), K.standard(0x7be7ff, { emissiveIntensity: 0.25 }));
          head.position.set(i * 0.21, r ? 0.17 : -0.17, 0);
          bilayer.add(head);
          const tail = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.15, 6), K.standard(0xffc978, { emissiveIntensity: 0.15 }));
          tail.position.set(i * 0.21, r ? 0.09 : -0.09, 0);
          bilayer.add(tail);
        }
      }
      const leakRing = new T.Mesh(new T.TorusGeometry(0.24, 0.028, 8, 26), K.basic(0xff6b6b, 0.85));
      leakRing.position.set(0.1, 0, 0.02);
      leak.add(leakRing);
      const leakMotes = [];
      for (let i = 0; i < 10; i++) {
        const m = stage.spark(0x7be7ff, 0.1);
        m.material.opacity = 0.55;
        leak.add(m);
        leakMotes.push({ mesh: m, phase: i / 10, a: i * 0.7 });
      }
      bilayer.rotation.z = 0.35;
      leakRing.rotation.z = 0.35;
      sysGroup.leak = leak;
      addFaultMarker('leak', sysPos.leak, 0.62);

      /* pump: transmembrane protein rotor */
      const pump = new T.Group();
      pump.position.set(sysPos.pump[0], sysPos.pump[1], sysPos.pump[2]);
      cell.add(pump);
      const pumpBase = new T.Mesh(new T.CylinderGeometry(0.34, 0.4, 0.2, 24), K.standard(0x2b4770, { emissiveIntensity: 0.1 }));
      pump.add(pumpBase);
      const rotor = new T.Group();
      rotor.position.y = 0.26;
      pump.add(rotor);
      for (let i = 0; i < 3; i++) {
        const holder = new T.Group();
        holder.rotation.y = (i / 3) * Math.PI * 2;
        const blade = new T.Mesh(new T.BoxGeometry(0.48, 0.06, 0.15), K.standard(0x8b6bff, { emissiveIntensity: 0.28, roughness: 0.3 }));
        blade.position.x = 0.2;
        holder.add(blade);
        rotor.add(holder);
      }
      const rotorCore = new T.Mesh(new T.SphereGeometry(0.12, 14, 12), K.standard(0xb79bff, { emissiveIntensity: 0.6 }));
      rotor.add(rotorCore);
      const atpOrbs = [];
      for (let i = 0; i < 4; i++) {
        const o = new T.Mesh(new T.SphereGeometry(0.07, 12, 10), K.standard(0xffd166, { emissiveIntensity: 0.8 }));
        pump.add(o);
        atpOrbs.push({ mesh: o, phase: i / 4 });
      }
      sysGroup.pump = pump;
      addFaultMarker('pump', [sysPos.pump[0], sysPos.pump[1] + 0.2, sysPos.pump[2]], 0.95);

      /* osmosis: tone tank with a cell inside */
      const osmo = new T.Group();
      osmo.position.set(sysPos.osmosis[0], sysPos.osmosis[1], sysPos.osmosis[2]);
      cell.add(osmo);
      const osmoTank = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.78, 26, 1, true), K.glass(0x8fcaff, 0.16));
      osmo.add(osmoTank);
      const osmoLiquid = new T.Mesh(new T.CylinderGeometry(0.38, 0.38, 0.5, 26), K.glass(0xff9f68, 0.28));
      osmoLiquid.position.y = -0.1;
      osmo.add(osmoLiquid);
      const osmoCell = new T.Mesh(new T.SphereGeometry(0.19, 18, 14), K.glass(0x7cf0c0, 0.42, { emissiveIntensity: 0.25 }));
      osmo.add(osmoCell);
      sysGroup.osmosis = osmo;
      addFaultMarker('osmosis', sysPos.osmosis, 0.8);

      /* ================= escape beam ================= */
      const escapeBeam = new T.Mesh(new T.CylinderGeometry(1.05, 1.5, 12, 30, 1, true),
        K.basic(0x9ff7ff, 0.16, { transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
      escapeBeam.rotation.x = Math.PI / 2;
      escapeBeam.position.z = -5;
      escapeBeam.visible = false;
      portal.add(escapeBeam);

      /* ================= animation ================= */
      stage.addTicker((dt, t) => {
        wire.rotation.y -= dt * 0.02;
        SYSTEMS.forEach((s) => {
          if (!state.fixed.has(s.id) && markers[s.id].userData.animate) markers[s.id].userData.animate(t);
        });
        if (!state.fixed.has('leak')) {
          leakMotes.forEach((m) => {
            const ph = (t * 0.5 + m.phase) % 1;
            const r = 0.24 + ph * 0.62;
            m.mesh.position.set(Math.cos(m.a) * r + 0.1, Math.sin(m.a) * r * 0.7, ph * 0.45);
            m.mesh.material.opacity = 0.6 * (1 - ph);
          });
        }
        if (state.fixed.has('pump')) {
          rotor.rotation.y += dt * 4.2;
          atpOrbs.forEach((o) => {
            const ph = (t * 0.6 + o.phase) % 1;
            o.mesh.position.set(Math.cos(ph * 6.28) * 0.4, -0.34 + ph * 0.62, Math.sin(ph * 6.28) * 0.4);
            o.mesh.material.opacity = 0.5 + Math.sin(ph * 3.14) * 0.5;
          });
        }
        if (state.fixed.has('light')) {
          chloroBody.rotation.z = Math.sin(t * 0.8) * 0.03;
          beam.material.opacity = 0.06 + Math.sin(t * 2.4) * 0.025;
        }
        if (state.fixed.has('osmosis')) {
          osmoCell.scale.setScalar(1 + Math.sin(t * 1.6) * 0.02);
        }
        if (Object.keys(state.seated).length > 0) {
          portal.rotation.z = Math.sin(t * 0.6) * 0.02;
        }
        if (state.finished) {
          innerRim.rotation.z += dt * 1.4;
          rim.rotation.z -= dt * 0.5;
        }
      });

      stage.hoverHandler = (hit) => {
        const kind = hit && hit.data && hit.data.kind;
        stage._setCursor(kind === 'fault' || kind === 'portal' || (kind === 'socket' && state.phase === 3) ? 'pointer' : '');
      };

      /* ================= phase helpers ================= */
      function phase() { return PHASES[state.phase]; }
      function setPhase(n) {
        state.phase = n;
        api.steps(n + 1);
        render();
      }
      function nextPhase() {
        if (state.phase < PHASES.length - 1) setPhase(state.phase + 1);
      }

      /* ---------- inspect panel ---------- */
      function inspectHTML() {
        const rows = [{ id: 'portal', ar: 'بوابة الخروج', en: 'ESCAPE PORTAL', icon: 'target' }]
          .concat(SYSTEMS.map((s) => ({ id: s.id, ar: s.ar, en: s.en, icon: s.icon })));
        return '<div class="fault-list">' + rows.map((r) => {
          const done = state.scanned.has(r.id);
          return '<button class="fault-row' + (done ? ' is-fixed' : '') + '" data-scan="' + r.id + '" type="button">' +
            '<svg class="tiny-icon"><use href="#i-' + r.icon + '"/></svg><span>' + r.ar + '</span>' +
            '<i class="' + (done ? 'ok' : 'warn') + '">' + (done ? 'مفحوص' : 'لم يُفحص') + '</i></button>';
        }).join('') + '</div>' +
          '<p class="panel-note">فحصوا البوابة أولًا، ثم كل نظام متوقف. <b>' + K.ar(state.scanned.size) + ' من ٥</b></p>';
      }

      /* ---------- analyse panel ---------- */
      function analyseHTML() {
        return '<div class="fault-list">' + SYSTEMS.map((s) => {
          const done = state.diagnosed.has(s.id);
          return '<button class="fault-row' + (done ? ' is-fixed' : '') + (state.openFault === s.id ? ' is-active' : '') +
            '" data-open="' + s.id + '" type="button"><svg class="tiny-icon"><use href="#i-' + s.icon + '"/></svg>' +
            '<span>' + s.ar + '</span><i class="' + (done ? 'ok' : 'warn') + '">' + (done ? 'تشخيص' : 'علامة') + '</i></button>';
        }).join('') + '</div>' +
          (state.openFault ? symptomHTML(state.openFault)
            : '<p class="panel-note">اختاروا نظامًا لقراءة عرضة ثم تحديد سبب العطل.</p>');
      }

      function symptomHTML(id) {
        const s = SYSTEMS.find((x) => x.id === id);
        if (state.diagnosed.has(id)) {
          return '<div class="console-box"><div class="console-title">' + s.ar + ' <small>مؤكَّد</small></div>' +
            '<p class="panel-note">' + s.causes.find((c) => c.ok).t + '</p></div>';
        }
        return '<div class="console-box"><div class="console-title">' + s.ar + ' <small>' + s.en + '</small></div>' +
          '<p class="panel-note">' + s.symptom + '</p>' +
          '<div class="chip-list">' + shuffled(s.causes).map((c, i) =>
            '<button class="mini-btn" data-cause="' + id + '" data-ok="' + (c.ok ? 1 : 0) + '" data-i="' + i + '" type="button">' + c.t + '</button>'
          ).join('') + '</div></div>';
      }

      /* ---------- repair panel ---------- */
      function repairHTML() {
        return '<div class="fault-list">' + SYSTEMS.map((s) => {
          const done = state.fixed.has(s.id);
          return '<button class="fault-row' + (done ? ' is-fixed' : '') + (state.openFault === s.id ? ' is-active' : '') +
            '" data-open="' + s.id + '" type="button"><svg class="tiny-icon"><use href="#i-' + s.icon + '"/></svg>' +
            '<span>' + s.ar + '</span><i class="' + (done ? 'ok' : 'bad') + '">' + (done ? 'يعمل' : 'متوقف') + '</i></button>';
        }).join('') + '</div>' + (state.openFault ? actionHTML(state.openFault)
          : '<p class="panel-note">لكل نظام إجراء واحد صحيح. اختاروه ثم راقبوا النتيجة في لوحة القياس.</p>');
      }

      function actionHTML(id) {
        const s = SYSTEMS.find((x) => x.id === id);
        if (state.fixed.has(id)) {
          return '<div class="console-box"><div class="console-title">' + s.ar + ' <small>يعمل</small></div>' +
            '<p class="panel-note">' + s.observe + '</p></div>';
        }
        if (id === 'osmosis') {
          return '<div class="console-box"><div class="console-title">' + s.ar + ' <small>' + s.en + '</small></div>' +
            '<div class="slider-row"><svg class="tiny-icon"><use href="#i-water"/></svg>' +
            '<input type="range" min="0" max="100" step="5" value="' + state.osmoValue + '" data-osmo aria-label="تركيز المذاب خارج الخلية">' +
            '<output>' + K.ar(state.osmoValue) + '٪</output></div>' +
            '<p class="panel-note">اضبطوا تركيز المحلول الخارجي حتى يتعادل دخول الماء وخروجه.</p>' +
            '<button class="mini-btn gold" data-fix="osmosis" type="button"><svg class="tiny-icon"><use href="#i-water"/></svg> ' + s.fix + '</button></div>';
        }
        return '<div class="console-box"><div class="console-title">' + s.ar + ' <small>' + s.en + '</small></div>' +
          '<p class="panel-note">' + s.observe + '</p>' +
          '<button class="mini-btn gold" data-fix="' + id + '" type="button"><svg class="tiny-icon"><use href="#i-' + s.icon + '"/></svg> ' + s.fix + '</button></div>';
      }

      /* ---------- route panel ---------- */
      function routeHTML() {
        return '<div class="key-tray">' + state.tray.map((sid) => {
          const s = SOCKETS.find((x) => x.id === sid);
          const seated = !!state.seated[sid];
          return '<button class="key-token' + (seated ? ' is-seated' : '') + (state.selectedKey === sid ? ' is-picked' : '') +
            '" data-key="' + sid + '" type="button"' + (seated ? ' disabled' : '') + '>' +
            '<svg><use href="#i-key"/></svg><span>' + s.key + '</span></button>';
        }).join('') + '</div>' +
          '<p class="panel-note">' + (state.selectedKey
            ? 'المفتاح المحدد: <b>' + SOCKETS.find((x) => x.id === state.selectedKey).key + '</b> — اضغطوا المقبس المناسب حول البوابة.'
            : 'اختاروا مفتاحًا من الحقيبة، ثم اضغطوا المقبس الذي يمثّل نظامه.') + '</p>' +
          '<p class="panel-note">مقابس مشتعلة: <b>' + K.ar(Object.keys(state.seated).length) + ' من ٦</b></p>';
      }

      /* ---------- status board (right panel) ---------- */
      function statusHTML() {
        let html = kit.panelTitle('target', 'حالة البوابة', phase().label);
        html += '<div class="obs-list">';
        html += K.obsRow('الأنظمة المستعادة', K.ar(state.fixed.size) + ' من ٤', state.fixed.size === 4 ? 'ok' : 'warn');
        html += K.obsRow('المفاتيح في مقابسها', K.ar(Object.keys(state.seated).length) + ' من ٦',
          Object.keys(state.seated).length === 6 ? 'ok' : 'warn');
        html += '</div>';
        if (state.phase >= 2) {
          html += '<div class="obs-list">' + SYSTEMS.map((s) =>
            K.obsRow(s.observe.split(':')[0], state.fixed.has(s.id) ? 'يعمل' : 'متوقف', state.fixed.has(s.id) ? 'ok' : 'bad')
          ).join('') + '</div>';
        }
        if (state.phase === 1) {
          html += '<p class="panel-note">شخّصوا سبب كل عطل قبل الإقفال على أي إصلاح.</p>';
        }
        html += '<p class="panel-note">أخطاء: <b>' + K.ar(state.mistakes) + '</b></p>';
        return html;
      }

      function readoutHTML() {
        const seated = Object.keys(state.seated).length;
        return '<span class="readout-pill cell">المرحلة ' + K.ar(state.phase + 1) + ' من ٤</span>' +
          '<span class="readout-pill atp">أنظمة تعمل <b>' + K.ar(state.fixed.size) + ' من ٤</b></span>' +
          '<span class="readout-pill cell">مفاتيح <b>' + K.ar(seated) + ' من ٦</b></span>';
      }

      function render() {
        const body = [inspectHTML, analyseHTML, repairHTML, routeHTML][state.phase]();
        api.panel('start', kit.panelTitle('gear', 'وحدة التحكم', PHASES[state.phase].label) + body);
        api.panel('end', statusHTML());
        api.readout(readoutHTML());
        api.objective(PHASES[state.phase].label, progressCount(), 4);
        SOCKETS.forEach((s) => stage.showLabel(sockets[s.id].label, state.phase === 3 && !state.seated[s.id]));
      }

      function progressCount() {
        return [state.scanned.size >= 5 ? 1 : 0,
          state.diagnosed.size >= 4 ? 1 : 0,
          state.fixed.size >= 4 ? 1 : 0,
          Object.keys(state.seated).length >= 6 ? 1 : 0].reduce((a, b) => a + b, 0);
      }

      /* ================= interactions ================= */
      function scan(id) {
        if (state.finished || state.phase !== 0) return;
        if (id !== 'portal' && !state.scanned.has('portal')) {
          api.toast('افحصوا البوابة أولًا لتعرفوا ما الذي تالف.', '', 'target');
          api.sound('wrong');
          return;
        }
        state.scanned.add(id);
        api.sound('scan');
        const target = id === 'portal' ? portalHit : markers[id];
        kit.flashAt(target.position.clone(), 0x78f5ff);
        if (id === 'portal') {
          stage.focus(0, 0, 8.4, 900);
          api.quip('orbit', CV.line('m6.scan').text, 5200);
          api.holo('<b>بوابة الخروج</b> — ستة مقابس مطفأة، وأربعة أنظمة لا تصلها الطاقة.');
        } else {
          const s = SYSTEMS.find((x) => x.id === id);
          api.quip('pip', s.scan, 4600);
          api.holo('<b>' + s.ar + '</b> — ' + s.scan);
        }
        if (state.scanned.size >= 5) {
          setTimeout(() => {
            if (!api.alive() || state.finished) return;
            api.quip('nova', CV.line('m6.goal').text, 5200);
            setPhase(1);
          }, 1800);
        } else {
          render();
        }
      }

      function diagnose(id, ok) {
        if (state.finished || state.phase !== 1 || state.diagnosed.has(id)) return;
        if (ok === '1') {
          state.diagnosed.add(id);
          api.sound('sparkle');
          const s = SYSTEMS.find((x) => x.id === id);
          api.toast('تشخيص صحيح: ' + s.ar, 'ok', 'check');
          api.quip('nova', s.causes.find((c) => c.ok).t, 3600);
          if (state.diagnosed.size >= 4) {
            setTimeout(() => {
              if (!api.alive() || state.finished) return;
              setPhase(2);
              api.quip('nova', CV.line('m6.analyzed').text, 4600);
            }, 1200);
          } else {
            state.openFault = null;
          }
        } else {
          state.mistakes++;
          api.sound('wrong');
          const btn = document.querySelector('[data-cause="' + id + '"][data-ok="0"]');
          if (btn) SQ.UI.shake(btn);
          api.quip('orbit', CV.line('m6.wrong').text, 3600);
          api.toast('السبب لا يفسّر ما شاهدتم. أعيدوا القراءة.', 'bad', 'cross');
        }
        render();
      }

      function repair(id) {
        if (state.finished || state.phase !== 2 || state.fixed.has(id)) return;
        if (!state.diagnosed.has(id)) {
          api.toast('شخّصوا العطل أولًا.', '', 'bulb');
          return;
        }
        state.fixed.add(id);
        state.openFault = null;
        if (markers[id]) markers[id].visible = false;
        if (labels[id]) {
          labels[id].el.classList.remove('hot');
          labels[id].el.classList.add('bio');
        }
        const s = SYSTEMS.find((x) => x.id === id);
        if (id === 'light') {
          beam.visible = true;
          chloroMat.emissiveIntensity = 0.7;
          chloroMat.color.set(0x4be3a8);
          grana.forEach((g) => { g.material.emissiveIntensity = 0.55; });
          api.sound('sparkle');
        }
        if (id === 'leak') {
          leakMotes.forEach((m) => { m.mesh.visible = false; });
          leakRing.visible = false;
          for (let r = 0; r < 2; r++) {
            for (let i = 0; i <= 1; i++) {
              const head = new T.Mesh(new T.SphereGeometry(0.085, 12, 10), K.standard(0x7be7ff, { emissiveIntensity: 0.3 }));
              head.position.set(i * 0.21, r ? 0.17 : -0.17, 0);
              bilayer.add(head);
            }
          }
          api.sound('snap');
        }
        if (id === 'pump') {
          rotorCore.material.emissiveIntensity = 1.1;
          api.sound('machineStart');
        }
        if (id === 'osmosis') {
          osmoLiquid.material.color.set(0x4be3a8);
          osmoLiquid.material.opacity = 0.3;
          osmoCell.material.emissiveIntensity = 0.6;
          state.osmoValue = 50;
          api.sound('waterFill');
        }
        kit.flashAt(markers[id] ? markers[id].position.clone() : new T.Vector3(), 0x7cf0c0);
        api.toast(s.ar + ' يعمل الآن', 'ok', 'check');
        api.holo('<b>' + s.ar + '</b> — ' + s.observe);
        const line = CV.line(s.line);
        api.quip(line.who, line.text, 3800);
        if (state.fixed.size >= 4) {
          setTimeout(() => {
            if (!api.alive() || state.finished) return;
            api.sound('celebrate');
            api.quip('nova', CV.line('m6.observe').text, 4600);
            setPhase(3);
            api.quip('orbit', CV.line('m6.route').text, 5000);
            lockShackle.visible = false;
            lockBody.material.color.set(0x78f5ff);
            lockBody.material.emissive.set(0x78f5ff);
          }, 1400);
        } else {
          render();
        }
      }

      function checkOsmosis() {
        if (state.fixed.has('osmosis')) return;
        if (state.osmoValue >= 45 && state.osmoValue <= 55) {
          repair('osmosis');
        } else {
          state.mistakes++;
          api.sound('wrong');
          const input = document.querySelector('[data-osmo]');
          if (input) SQ.UI.shake(input.parentElement);
          api.quip('orbit', 'الماء ما زال يتحرك في اتجاه واحد. اضبطوا التركيز ليتعادل في الاتجاهين.', 3800);
          api.toast('ليس متساوي التوتر بعد. أعيدوا الضبط.', 'bad', 'cross');
        }
      }

      function pickKey(sid) {
        if (state.finished || state.phase !== 3 || state.seated[sid]) return;
        state.selectedKey = sid;
        api.sound('scan');
        render();
      }

      function seatKey(sid) {
        if (state.finished || state.phase !== 3) return;
        if (!state.selectedKey) {
          api.toast('اختاروا مفتاحًا من الحقيبة أولًا.', '', 'key');
          return;
        }
        if (state.seated[sid]) {
          api.toast('هذا المقبس نشط بالفعل.', '', 'check');
          return;
        }
        if (state.selectedKey !== sid) {
          state.mistakes++;
          api.sound('wrong');
          const sk = sockets[sid];
          if (sk) {
            sk.ring.material.color.set(0xff6b6b);
            setTimeout(() => { if (sk && !state.seated[sid]) sk.ring.material.color.set(0x9fbfe0); }, 900);
          }
          api.quip('orbit', CV.line('m6.wrong').text, 3600);
          api.toast('المفتاح لا يناسب هذا المقبس.', 'bad', 'cross');
          return;
        }
        state.seated[sid] = true;
        state.selectedKey = null;
        const sk = sockets[sid];
        sk.ring.material.color.set(0x78f5ff);
        sk.ring.material.emissive.set(0x78f5ff);
        sk.ring.material.emissiveIntensity = 1.2;
        sk.disc.material.color.set(0xffd166);
        sk.disc.material.opacity = 1;
        if (sk.arc) {
          sk.arc.material.opacity = 1;
          sk.arc.material.color.set(0x78f5ff);
        }
        stage.showLabel(sk.label, false);
        api.sound('sparkle');
        kit.flashAt(sk.group.position.clone(), 0xffd166);
        const count = Object.keys(state.seated).length;
        api.toast(sk.data.key + ' في مقبسه', 'ok', 'key');
        api.holo('<b>' + sk.data.key + '</b> — ' + sk.data.hint);
        if (count === 6) {
          setTimeout(() => { if (api.alive() && !state.finished) launch(); }, 1100);
        } else {
          render();
        }
      }

      /* ================= the escape ================= */
      async function launch() {
        if (state.busy) return;
        state.busy = true;
        state.finished = true;
        api.bottom('');
        api.panel('start', kit.panelTitle('target', 'البوابة مفعّلة', 'المفاتيح الستة في مقابسها.'));
        api.panel('end', kit.panelTitle('star', 'الهروب', 'استعدوا للقفز.'));
        api.objective('البوابة مفتوحة', 4, 4);
        api.quip('nova', CV.line('m6.ready').text, 4200);
        api.sound('machineStart');
        lockBody.visible = false;
        escapeBeam.visible = true;
        coreMat.opacity = 0.4;
        portalGlow.material.opacity = 0.5;
        stage.focus(0, 0, 10.6, 1400);
        stage.tween(2600, (t) => {
          coreMat.opacity = 0.4 + t * 0.55;
          escapeBeam.material.opacity = 0.16 + t * 0.4;
          rim.rotation.z -= t * 0.4;
          innerRim.scale.setScalar(1 + t * 0.12);
          portalGlow.material.opacity = 0.5 + t * 0.45;
        }, (t) => t * t);
        for (let i = 0; i < 26; i++) {
          const p = stage.spark(i % 3 === 0 ? 0xffd166 : 0x78f5ff, 0.16);
          p.position.set(K.rand(-1.4, 1.4), K.rand(-1.4, 1.4), K.rand(-0.4, 0.4));
          portal.add(p);
          stage.tween(1700 + i * 26, (t) => {
            p.position.z -= t * 6;
            p.material.opacity = 0.95 * (1 - t);
          });
        }
        await CV.kit.wait(2400);
        if (!api.alive()) return;
        SQ.UI.flash('rgba(200,255,250,.6)');
        SQ.FX.confetti(160);
        api.sound('celebrate');
        SQ.Characters.setState('nova', 'happy', 3200);
        SQ.Characters.setState('pip', 'jump', 3000);
        SQ.Characters.setState('orbit', 'happy', 3000);
        await api.say('m6.done');
        if (!api.alive()) return;
        await api.say('m6.escape');
        if (!api.alive()) return;
        const stars = state.mistakes <= 2 ? 3 : state.mistakes <= 5 ? 2 : 1;
        api.complete(stars, {
          title: 'نجحتم في الهروب من العالم المجهري',
          text: 'فحصتم البوابة، وشخّصتم أربعة أعطال دفعة واحدة، وأعدتم كل نظام إلى العمل، ثم وجّهتم المفاتيح الستة إلى مقابسها.',
          learn: 'البناء الضوئي يحتاج الضوء، والغشاء يحفظ الانتقائية، والنقل النشط يستهلك ATP، والماء ينتقل نحو المحلول الأعلى تركيزًا — وكل نظام من هذه الأنظمة مفتاح من مفاتيح الهروب.'
        });
      }

      /* ================= bindings ================= */
      stage.pickHandler = (hit) => {
        if (!hit || !hit.data || state.finished) return;
        const d = hit.data;
        if (d.kind === 'portal') { scan('portal'); return; }
        if (d.kind === 'fault') {
          if (state.phase === 0) scan(d.id);
          else if (state.phase === 1 || state.phase === 2) {
            state.openFault = d.id;
            api.sound('scan');
            render();
          }
          return;
        }
        if (d.kind === 'socket') { seatKey(d.id); }
      };

      kit.onClick(panelStart, '[data-scan]', (n) => scan(n.dataset.scan));
      kit.onClick(panelStart, '[data-open]', (n) => {
        if (state.phase !== 1 && state.phase !== 2) return;
        state.openFault = n.dataset.open;
        api.sound('scan');
        render();
      });
      kit.onClick(panelStart, '[data-cause]', (n) => diagnose(n.dataset.cause, n.dataset.ok));
      kit.onClick(panelStart, '[data-fix]', (n) => {
        if (n.dataset.fix === 'osmosis') checkOsmosis();
        else repair(n.dataset.fix);
      });
      kit.onClick(panelStart, '[data-key]', (n) => pickKey(n.dataset.key));
      kit.on(panelStart, 'input', (e) => {
        const input = e.target.closest('[data-osmo]');
        if (!input) return;
        state.osmoValue = Number(input.value);
        const out = input.parentElement.querySelector('output');
        if (out) out.textContent = SQ.UI.toAr(state.osmoValue) + '٪';
      });

      /* ================= boot ================= */
      api.steps(1);
      setPhase(0);
      api.say('m6.intro');
      setTimeout(() => {
        if (api.alive() && !state.scanned.size && !state.finished) {
          api.toast('اضغط على بوابة الخروج في منتصف الخلية لبدء الفحص.', '', 'target');
          api.quip('pip', CV.line('m6.inspect').text, 4600);
        }
      }, 6200);

      return {
        hint() { if (!state.finished) api.say('m6.hint'); },
        destroy() {
          kit.destroy();
          stage.clearLabels();
        }
      };
    }
  });
})();
