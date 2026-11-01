/* =========================================================
   MICROVERSE ESCAPE — dialogue interrupt test
   Real voice clips run 6-10s and the mission panels are
   pointer-events:none while one plays, so every scene that can
   hold a line must offer a visible, genuinely clickable way to
   move on.  This drives the game with real mouse clicks and
   proves the audio actually stops early.
   Usage: node tools/dialogue_test.js [baseUrl]
   ========================================================= */
function requirePuppeteer() {
  for (const g of ['puppeteer-core', 'C:/Users/lujain/AppData/Local/Temp/cvtest/node_modules/puppeteer-core']) {
    try { return require(g); } catch (e) { /* next */ }
  }
  throw new Error('puppeteer-core not found');
}
const puppeteer = requirePuppeteer();
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = (process.argv[2] || 'http://127.0.0.1:4180/index.html').replace(/\/index\.html.*$/, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setCacheEnabled(false);
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  const waitFor = async (fn, ms, label) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await page.evaluate(fn)) return true;
      await sleep(200);
    }
    throw new Error('timeout waiting for ' + label);
  };

  /* geometry + hit-test of one control, as a student's mouse sees it */
  const probe = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    return {
      found: true, w: Math.round(r.width), h: Math.round(r.height),
      opacity: +cs.opacity, pointerEvents: cs.pointerEvents,
      onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      clickable: !!top && (top === el || el.contains(top))
    };
  }, sel);

  /* does the pill sit on top of the caption text? */
  const captionClash = () => page.evaluate(() => {
    const pill = document.querySelector('.dialog-skip');
    const text = document.querySelector('#subtitle span');
    if (!pill || !text) return false;
    const p = pill.getBoundingClientRect(), t = text.getBoundingClientRect();
    return !(p.right < t.left || p.left > t.right || p.bottom < t.top || p.top > t.bottom);
  });

  const state = () => page.evaluate(() => ({
    scene: document.getElementById('app').dataset.scene,
    dialogMode: document.getElementById('app').classList.contains('dialog-mode'),
    speaking: !!(window.SQ && window.SQ.Dialogue && window.SQ.Dialogue.active),
    panels: (() => {
      const out = {};
      document.querySelectorAll('.mission-panel, .mission-bottom').forEach((el, i) => {
        out[(el.id || 'panel' + i) ] = getComputedStyle(el).pointerEvents;
      });
      return out;
    })(),
    clip: (() => {
      const a = window.SQ && window.SQ.Voice && window.SQ.Voice.activeClip;
      if (!a) return null;
      const url = (a.currentSrc || a.src || '').split('/').slice(-2).join('/');
      return { url, t: +a.currentTime.toFixed(2), dur: +a.duration.toFixed(2) };
    })()
  }));

  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await waitFor(() => !!(window.CV && window.CV.App && window.SQ), 20000, 'boot');
  await page.evaluate(() => localStorage.clear());
  await sleep(300);

  const report = {};

  /* ---------- the pill must be inert while nothing is speaking ---------- */
  report.idleSkip = await probe('.dialog-skip');

  /* ---------- intro: has its own visible skip ---------- */
  await page.mouse.click(960, 540);            /* first gesture unlocks audio */
  await sleep(250);
  const start = await probe('[data-action="start-adventure"]');
  if (start.found) {
    await page.mouse.click(Math.round(960), Math.round(await page.evaluate(() => {
      const r = document.querySelector('[data-action="start-adventure"]').getBoundingClientRect();
      return r.top + r.height / 2;
    })));
  }
  await waitFor(() => document.getElementById('app').dataset.scene === 'intro', 15000, 'intro scene');
  await waitFor(() => !!(window.SQ.Dialogue.active || document.querySelector('#subtitle.show')), 20000, 'intro narration');
  report.intro = Object.assign(await state(), {
    skipIntro: await probe('[data-action="skip-intro"]'),
    pillHiddenInIntro: await page.evaluate(() => {
      const el = document.querySelector('.dialog-skip');
      return !!el && getComputedStyle(el).pointerEvents === 'none';
    })
  });
  if (report.intro.skipIntro.clickable) {
    const box = await page.evaluate(() => {
      const r = document.querySelector('[data-action="skip-intro"]').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.click(box.x, box.y);
    await sleep(1200);
    report.intro.afterSkip = await state();
  }

  /* ---------- mission: the caption pill ----------
     headless audio occasionally hands back a clip that never advances, so
     re-enter the mission until a line is genuinely audible — otherwise
     "cut it short" would prove nothing. */
  let before = null;
  for (let attempt = 1; attempt <= 3 && !before; attempt++) {
    await page.evaluate(() => window.CV.App.startMission('m1'));
    await waitFor(() => document.getElementById('app').dataset.scene === 'mission', 15000, 'mission scene');
    await waitFor(() => !!(window.SQ.Dialogue.active && window.SQ.Voice.activeClip), 25000, 'a voiced mission line');
    try {
      await waitFor(() => window.SQ.Voice.activeClip && !window.SQ.Voice.activeClip.paused &&
        window.SQ.Voice.activeClip.currentTime > 1.2, 10000, 'the clip to start playing');
    } catch (e) {
      report['stalledAttempt' + attempt] = await state();
      await page.evaluate(() => window.SQ.Dialogue.cancelAll());
      await sleep(600);
      continue;
    }
    before = await state();
    report.attempts = attempt;
  }
  if (!before) throw new Error('no voiced mission line ever became audible');

  report.mission = Object.assign(before, { pill: await probe('.dialog-skip'), coversCaptionText: await captionClash() });
  await page.screenshot({ path: 'tools/out-dialogue-skip.png' });

  const pill = report.mission.pill;
  if (pill.found && pill.clickable) {
    await page.evaluate(() => { window.__probeClip = window.SQ.Voice.activeClip; });
    const at = await page.evaluate(() => {
      const r = document.querySelector('.dialog-skip').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.click(at.x, at.y);
    let cut = false;
    try {
      await waitFor(() => !window.SQ.Voice.activeClip || window.SQ.Voice.activeClip !== window.__probeClip, 3000, 'the clip to stop');
      cut = true;
    } catch (e) { cut = false; }
    await sleep(700);
    await waitFor(() => !document.getElementById('app').classList.contains('dialog-mode'), 6000, 'dialog-mode to clear');
    const after = await state();
    report.mission.cutEarly = cut && before.clip
      ? (before.clip.t > 1.0 && before.clip.t < before.clip.dur - 0.5)
      : false;
    report.mission.clipAtClick = before.clip;
    report.mission.panelsAfterSkip = after.panels;
  }

  /* ---------- same pill at the other two projector resolutions ---------- */
  report.resolutions = [];
  for (const vp of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }]) {
    await page.setViewport(vp);
    await sleep(400);
    await page.evaluate(() => window.CV.App.startMission('m1'));
    await waitFor(() => !!(window.SQ.Dialogue.active && window.SQ.Voice.activeClip), 25000, 'voiced line at ' + vp.width);
    await waitFor(() => window.SQ.Voice.activeClip && !window.SQ.Voice.activeClip.paused &&
      window.SQ.Voice.activeClip.currentTime > 0.6, 12000, 'playback').catch(() => null);
    const geo = await page.evaluate(() => {
      const pill = document.querySelector('.dialog-skip');
      const bar = document.getElementById('subtitle');
      const text = bar.querySelector('span');
      const p = pill.getBoundingClientRect(), b = bar.getBoundingClientRect(), t = text.getBoundingClientRect();
      const cx = p.left + p.width / 2, cy = p.top + p.height / 2;
      const top = document.elementFromPoint(cx, cy);
      const overlapsText = !(p.right < t.left || p.left > t.right || p.bottom < t.top || p.top > t.bottom);
      return {
        vw: innerWidth, vh: innerHeight,
        pill: { w: Math.round(p.width), h: Math.round(p.height) },
        fullyOnScreen: p.left >= 0 && p.top >= 0 && p.right <= innerWidth && p.bottom <= innerHeight,
        clickable: !!top && (top === pill || pill.contains(top)),
        coversCaptionText: overlapsText,
        captionBarHeight: Math.round(b.height),
        opacity: +getComputedStyle(pill).opacity
      };
    });
    report.resolutions.push(geo);
    await page.evaluate(() => window.SQ.Dialogue.cancelAll());
    await sleep(500);
  }

  console.log(JSON.stringify({ report, errors: errors.slice(0, 10) }, null, 2));
  await browser.close();

  const locked = Object.values(report.mission.panels || {});
  const unlocked = Object.values(report.mission.panelsAfterSkip || {});
  const okIdle = report.idleSkip.found && !report.idleSkip.clickable && report.idleSkip.opacity === 0;
  const okIntro = report.intro.skipIntro.found && report.intro.skipIntro.clickable &&
    report.intro.skipIntro.onScreen && report.intro.pillHiddenInIntro !== false;
  const okMission = pill.found && pill.clickable && pill.onScreen && pill.opacity > 0.5 &&
    report.mission.coversCaptionText === false &&
    report.mission.cutEarly === true &&
    locked.length > 0 && locked.every((p) => p === 'none') &&
    unlocked.length > 0 && unlocked.every((p) => p !== 'none');
  const okRes = report.resolutions.length === 2 && report.resolutions.every(
    (r) => r.fullyOnScreen && r.clickable && !r.coversCaptionText && r.opacity > 0.5
  );
  const pass = okIdle && okIntro && okMission && okRes && !errors.length;
  console.log('checks idlePillInert=' + okIdle + ' introSkip=' + okIntro + ' missionPill=' + okMission + ' resolutions=' + okRes);
  console.log('panels while speaking=' + JSON.stringify(locked) + ' after skip=' + JSON.stringify(unlocked));
  console.log('RESULT ' + (pass ? 'PASS' : 'FAIL'));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
