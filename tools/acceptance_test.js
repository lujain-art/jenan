/* =========================================================
   MICROVERSE ESCAPE — headless acceptance test
   Usage:  node tools/acceptance_test.js [baseUrl]
   Walks every screen, then audits controls, overflow and console.
   Requires the local asset server plus puppeteer-core + Edge.
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
const VIEWPORTS = [[1920, 1080], [1366, 768], [1280, 720]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const audit = () => {
  const out = { dead: [], offscreen: [], zero: [] };
  const vw = window.innerWidth, vh = window.innerHeight;
  document.querySelectorAll('[data-action]').forEach((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const screen = el.closest('.screen');
    if (screen && !screen.classList.contains('is-active')) return;
    if (el.closest('[hidden]')) return;
    if (cs.visibility === 'hidden' || cs.display === 'none' || el.hidden) return;
    /* faded-out or deliberately inert until it is needed (e.g. the caption skip pill) */
    if (+cs.opacity < 0.05 || cs.pointerEvents === 'none') return;
    if (r.width < 4 || r.height < 4) { out.zero.push(el.dataset.action); return; }
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    if (cx < 0 || cy < 0 || cx > vw || cy > vh) { out.offscreen.push(el.dataset.action + ' @' + Math.round(cx) + ',' + Math.round(cy)); return; }
    const top = document.elementFromPoint(cx, cy);
    if (!top) { out.dead.push(el.dataset.action + ' :: nothing'); return; }
    if (top !== el && !el.contains(top) && !top.closest('[data-action="' + el.dataset.action + '"]')) {
      out.dead.push(el.dataset.action + ' blocked by ' + top.tagName + '.' + (top.className || '').toString().split(' ')[0]);
    }
  });
  const bad = [];
  document.querySelectorAll('.screen.is-active *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'absolute' && el.classList.contains('character')) return;
    /* full-bleed decorative / cinematic layers may bleed past the viewport as long
       as they carry no control: rays, glows, animated title cards */
    if (cs.pointerEvents === 'none' && !el.querySelector('[data-action], button, .stage-label, input')) return;
    if (r.right > vw + 3 || r.left < -3 || r.bottom > vh + 3 || r.top < -3) {
      bad.push((el.id || el.className.toString().split(' ')[0]) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right) + ' T' + Math.round(r.top) + ' B' + Math.round(r.bottom));
    }
  });
  out.overflow = bad.slice(0, 10);
  return out;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const report = { screens: {}, missions: {}, errors: [], netfail: [] };
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', (e) => report.errors.push('PAGEERROR ' + e.message));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    report.netfail.push((f && f.errorText ? f.errorText + ' ' : 'FAILED ') + r.url());
  });
  page.on('response', (r) => { if (r.status() >= 400) report.netfail.push(r.status() + ' ' + r.url()); });

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(900);

  const click = async (sel) => {
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 4) return null;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    if (!box) return false;
    await page.mouse.click(box.x, box.y);
    return true;
  };
  const scene = () => page.evaluate(() => document.getElementById('app').dataset.scene);

  /* ---- title ---- */
  report.screens.title = await page.evaluate(audit);
  await click('[data-action="start-adventure"]');
  for (let i = 0; i < 60; i++) { await sleep(1200); if (await page.evaluate(() => !document.getElementById('intro-cta').hidden)) break; }
  report.screens.intro = await page.evaluate(audit);
  await click('[data-action="enter-game"]');
  await sleep(2500);
  report.screens.dive = await page.evaluate(audit);
  const skipped = await click('[data-action="skip-dive"]');
  await sleep(1500);
  report.diveSkipWorked = skipped && (await scene()) === 'map';
  await sleep(2500);
  report.screens.map = await page.evaluate(audit);
  await page.screenshot({ path: 'tools/out-map.png' });

  /* ---- each mission, straight through the engine ---- */
  const missionIds = await page.evaluate(() => Object.keys(window.CV.MISSIONS_META));
  await page.evaluate((ids) => {
    const s = { team: 'فريق المستكشفين', stars: {}, done: {}, started: {}, last: null, date: '', code: 'MV-1234', introSeen: true };
    ids.forEach((m) => { s.done[m] = true; s.stars[m] = 3; });
    localStorage.setItem('microverse-progress-v1', JSON.stringify(s));
  }, missionIds);
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(900);
  await click('[data-action="start-adventure"]');
  await sleep(1500);
  await page.evaluate(() => { const b = document.querySelector('[data-action="enter-game"]'); if (b) b.click(); });
  await sleep(1200);
  await page.evaluate(() => { const b = document.querySelector('[data-action="skip-dive"]'); if (b) b.click(); });
  await sleep(2500);

  for (const id of missionIds) {
    await page.evaluate((m) => { window.CV.App.startMission(m); }, id);
    await sleep(4200);
    const info = await page.evaluate((m) => ({
      scene: document.getElementById('app').dataset.scene,
      title: (document.getElementById('mission-title') || {}).textContent,
      chip: (document.getElementById('mission-chip') || {}).textContent,
      goal: ((document.getElementById('mission-goal') || {}).textContent || '').slice(0, 70),
      labels: document.querySelectorAll('#stage-labels .stage-label').length,
      canvas: !!document.querySelector('#screen-mission canvas'),
      glLost: !!(window.SQ.Stage && window.SQ.Stage.contextLost)
    }), id);
    const a = await page.evaluate(audit);
    report.missions[id] = Object.assign(info, { dead: a.dead, overflow: a.overflow });
    await page.screenshot({ path: 'tools/out-' + id + '.png' });
    await page.evaluate(() => { window.CV.App.leaveMission(); window.CV.App.showMap(false); });
    await sleep(1200);
  }

  /* ---- victory + certificate ---- */
  await page.evaluate(() => { window.SQ.Progress.state.done.m6 = true; window.SQ.Progress.save(); window.CV.App.victory(); });
  await sleep(2500);
  report.screens.victory = await page.evaluate(audit);
  report.victory = await page.evaluate(() => ({
    keys: (document.getElementById('victory-keys') || {}).textContent,
    stars: (document.getElementById('victory-star-total') || {}).textContent,
    team: (document.getElementById('victory-team') || {}).textContent,
    worldKeys: document.getElementById('world').dataset.keys,
    litArcs: [...document.querySelectorAll('.pseg')].filter((p) => +getComputedStyle(p).opacity > .9).length
  }));
  await page.screenshot({ path: 'tools/out-victory.png' });
  await page.evaluate(() => { const b = document.querySelector('[data-action="show-certificate"]'); if (b) b.click(); });
  await sleep(1200);
  report.certificate = await page.evaluate(() => ({
    hidden: document.getElementById('overlay-certificate').hidden,
    keys: (document.getElementById('cert-keys') || {}).textContent,
    missions: (document.getElementById('cert-missions') || {}).textContent,
    code: (document.getElementById('cert-code') || {}).textContent
  }));
  await page.screenshot({ path: 'tools/out-certificate.png' });

  /* ---- layout sweep on the map ---- */
  report.layouts = {};
  for (const [w, h] of VIEWPORTS) {
    await page.setViewport({ width: w, height: h });
    await page.evaluate(() => { const c = document.querySelector('[data-action="close-certificate"]'); if (c) c.click(); window.CV.App.showMap(false); });
    await sleep(1400);
    report.layouts[w + 'x' + h] = await page.evaluate(audit);
    await page.screenshot({ path: 'tools/out-map-' + w + '.png' });
  }

  report.netfail = report.netfail.filter((u) => !/^chrome:|^blob:/.test(u));
  /* a page reload or a scene change cancels in-flight media; that is not a missing asset */
  report.netaborted = report.netfail.filter((u) => /ERR_ABORTED/.test(u));
  report.netfail = report.netfail.filter((u) => !/ERR_ABORTED/.test(u));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();

  /* ---- verdict: the JSON above is evidence, this is the claim ---- */
  const fails = [];
  const clean = (a, where) => {
    if (!a) return fails.push(where + ' missing');
    ['dead', 'offscreen', 'zero', 'overflow'].forEach((k) => {
      if ((a[k] || []).length) fails.push(where + '.' + k + ' = ' + JSON.stringify(a[k]));
    });
  };
  if (report.errors.length) fails.push('console/page errors: ' + JSON.stringify(report.errors.slice(0, 4)));
  if (report.netfail.length) fails.push('failed requests: ' + JSON.stringify(report.netfail.slice(0, 4)));
  Object.keys(report.screens || {}).forEach((s) => clean(report.screens[s], 'screen:' + s));
  Object.keys(report.layouts || {}).forEach((s) => clean(report.layouts[s], 'layout:' + s));
  missionIds.forEach((id) => {
    const m = report.missions[id];
    if (!m) return fails.push(id + ' never opened');
    if (m.scene !== 'mission') fails.push(id + ' scene=' + m.scene);
    if (!m.canvas) fails.push(id + ' has no WebGL canvas');
    if (m.glLost) fails.push(id + ' lost the GL context');
    if (!(m.labels > 0)) fails.push(id + ' rendered no 3D labels');
    if (!m.title || !m.goal) fails.push(id + ' has no title/goal copy');
    clean(m, 'mission:' + id);
  });
  if (report.diveSkipWorked !== true) fails.push('skip-dive did not reach the map');
  const v = report.victory || {};
  if (v.worldKeys !== '6') fails.push('portal keys attribute = ' + v.worldKeys);
  if (v.litArcs !== 6) fails.push('lit portal arcs = ' + v.litArcs);
  if (!/٦/.test(v.keys || '')) fails.push('victory keys readout = ' + v.keys);
  if (!/١٨/.test(v.stars || '')) fails.push('victory stars readout = ' + v.stars);
  const c = report.certificate || {};
  if (c.hidden !== false) fails.push('certificate overlay stayed hidden');
  if (!/^MV-\d{4}$/.test(c.code || '')) fails.push('certificate code = ' + c.code);
  if (!/٦/.test(c.missions || '')) fails.push('certificate missions = ' + c.missions);

  console.log('FAILURES ' + JSON.stringify(fails));
  console.log('RESULT ' + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
