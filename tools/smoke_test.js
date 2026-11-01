/* =========================================================
   MICROVERSE ESCAPE — headless smoke test
   Usage:  node tools/smoke_test.js [url]
   Requires the local asset server and puppeteer-core.
   Set PUPPETEER_PATH / NODE_PATH if puppeteer lives elsewhere.
   ========================================================= */
const path = require('path');

function requirePuppeteer() {
  const guesses = [
    'puppeteer-core',
    'C:/Users/lujain/AppData/Local/Temp/cvtest/node_modules/puppeteer-core'
  ];
  for (const g of guesses) {
    try { return require(g); } catch (e) { /* next */ }
  }
  throw new Error('puppeteer-core not found');
}

const puppeteer = requirePuppeteer();
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL_ = process.argv[2] || 'http://127.0.0.1:4180/index.html';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  const errors = [];
  const netfail = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('requestfailed', (r) => netfail.push(r.url() + ' :: ' + r.failure().errorText));
  page.on('response', (r) => { if (r.status() >= 400) netfail.push(r.status() + ' ' + r.url()); });

  await page.goto(URL_, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  const boot = await page.evaluate(() => {
    const need = ['app', 'world', 'screen-intro', 'characters', 'subtitle', 'dust',
      'ambient-bubbles', 'screen-flash', 'toast-layer', 'mission-chip', 'mission-goal',
      'map-nodes', 'team-input', 'lights-label', 'victory-keys', 'complete-key', 'cert-keys',
      'overlay-certificate', 'teacher-menu', 'settings'];
    return {
      missingIds: need.filter((id) => !document.getElementById(id)),
      title: document.title,
      scene: document.getElementById('app') && document.getElementById('app').dataset.scene,
      pseg: document.querySelectorAll('.pseg').length,
      portalNode: document.querySelectorAll('.portal-node').length,
      cast: (window.SQ && window.SQ.CAST) ? Object.keys(window.SQ.CAST) : null,
      missions: (window.CV && window.CV.MISSIONS_META) ? Object.keys(window.CV.MISSIONS_META) : null,
      registered: (window.CV && window.CV.Missions) ? Object.keys(window.CV.Missions) : null,
      lines: window.CV && window.CV.LINES ? Object.keys(window.CV.LINES).length : null,
      stylesheets: [...document.styleSheets].length
    };
  });

  const sprites = await page.evaluate(async () => {
    const names = ['nova-idle', 'nova-talk', 'nova-happy', 'pip-idle', 'pip-talk', 'orbit-idle', 'orbit-happy'];
    const out = [];
    for (const n of names) {
      const url = 'assets/characters/' + n + '.webp';
      const ok = await new Promise((res) => {
        const i = new Image();
        i.onload = () => res({ ok: true, w: i.naturalWidth, h: i.naturalHeight });
        i.onerror = () => res({ ok: false });
        i.src = url + '?t=' + Date.now();
      });
      out.push(n + ': ' + (ok.ok ? ok.w + 'x' + ok.h : 'MISSING'));
    }
    return out;
  });

  /* walk title -> intro -> map */
  const flow = [];
  try {
    await page.mouse.click(960, 540);
    await page.evaluate(() => document.querySelector('[data-action="start-adventure"]').click());
    await new Promise((r) => setTimeout(r, 900));
    flow.push('after start click: scene=' + await page.evaluate(() => document.getElementById('app').dataset.scene));
    await page.evaluate(() => { const b = document.querySelector('[data-action="enter-game"]'); if (b) b.click(); });
    await new Promise((r) => setTimeout(r, 1200));
    await page.evaluate(() => { const b = document.querySelector('[data-action="skip-dive"]'); if (b) b.click(); });
    await new Promise((r) => setTimeout(r, 2500));
    flow.push('after skip: scene=' + await page.evaluate(() => document.getElementById('app').dataset.scene));
    flow.push('nodes=' + await page.evaluate(() => document.querySelectorAll('.mission-node').length));
    flow.push('nodeKeys=' + await page.evaluate(() => document.querySelectorAll('.mission-node .node-key').length));
  } catch (e) {
    flow.push('FLOW ERROR ' + e.message);
  }

  const overflow = await page.evaluate(() => {
    const bad = [];
    const vw = window.innerWidth, vh = window.innerHeight;
    document.querySelectorAll('#app > .screen:not([hidden]) *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && (el.classList.contains('character') || el.classList.contains('world'))) return;
      if (r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2 || r.top < -2) {
        bad.push(el.className + ' L' + Math.round(r.left) + ' R' + Math.round(r.right) + ' T' + Math.round(r.top) + ' B' + Math.round(r.bottom));
      }
    });
    return bad.slice(0, 12);
  });

  await page.screenshot({ path: 'tools/shot-map.png' });

  console.log(JSON.stringify({ boot, sprites, flow, overflow, errors: errors.slice(0, 25), netfail: netfail.slice(0, 25) }, null, 2));
  await browser.close();

  /* ---- verdict ---- */
  const fails = [];
  if (boot.missingIds.length) fails.push('missing DOM ids: ' + boot.missingIds.join(','));
  if (!/MICROVERSE ESCAPE/.test(boot.title)) fails.push('document.title = ' + boot.title);
  if (boot.scene !== 'title') fails.push('first scene = ' + boot.scene);
  if (boot.pseg !== 6) fails.push('portal arcs = ' + boot.pseg);
  if (!boot.portalNode) fails.push('no portal node on the map');
  const cast = (boot.cast || []).slice().sort().join(',');
  if (cast !== 'nova,orbit,pip') fails.push('cast = ' + cast);
  if ((boot.missions || []).length !== 6) fails.push('missions = ' + JSON.stringify(boot.missions));
  if ((boot.registered || []).sort().join(',') !== 'm1,m2,m3,m4,m5,m6') fails.push('registered = ' + JSON.stringify(boot.registered));
  if (!(boot.lines > 50)) fails.push('dialogue lines = ' + boot.lines);
  if (boot.stylesheets < 4) fails.push('stylesheets = ' + boot.stylesheets);
  sprites.filter((s) => /MISSING/.test(s)).forEach((s) => fails.push('sprite ' + s));
  if (!/scene=intro/.test(flow[0] || '')) fails.push('start click -> ' + flow[0]);
  if (!/scene=map/.test(flow[1] || '')) fails.push('skip dive -> ' + flow[1]);
  if (!/nodes=6/.test(flow[2] || '')) fails.push(flow[2]);
  if (!/nodeKeys=6/.test(flow[3] || '')) fails.push(flow[3]);
  if (overflow.length) fails.push('overflow: ' + overflow.slice(0, 3).join(' | '));
  if (errors.length) fails.push('console errors: ' + errors.slice(0, 3).join(' | '));
  if (netfail.length) fails.push('net failures: ' + netfail.slice(0, 3).join(' | '));
  console.log('FAILURES ' + JSON.stringify(fails));
  console.log('RESULT ' + (fails.length ? 'FAIL' : 'PASS'));
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
