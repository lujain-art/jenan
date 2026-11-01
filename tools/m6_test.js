/* =========================================================
   MICROVERSE ESCAPE — mission 6 end-to-end playthrough
   Drives inspect -> analyse -> repair -> route -> escape by
   calling the stage pick handler and clicking the panels.
   Usage: node tools/m6_test.js [baseUrl]
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
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(700);
  await page.evaluate(() => {
    const s = { team: 'فريق المستكشفين', stars: {}, done: {}, started: {}, last: null, date: '', code: 'MV-1234', introSeen: true };
    ['m1', 'm2', 'm3', 'm4', 'm5'].forEach((m) => { s.done[m] = true; s.stars[m] = 3; });
    localStorage.setItem('microverse-progress-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(700);
  await page.evaluate(() => { window.CV.App.startMission('m6'); });
  await sleep(4500);

  const log = [];
  const snap = () => page.evaluate(() => ({
    goal: (document.getElementById('mission-goal') || {}).textContent,
    count: (document.getElementById('objective-count') || {}).textContent,
    keys: document.querySelectorAll('.key-token').length,
    picked: document.querySelectorAll('.key-token.is-picked').length,
    seated: document.querySelectorAll('.key-token.is-seated').length,
    fixed: document.querySelectorAll('.fault-row.is-fixed').length,
    causes: document.querySelectorAll('[data-cause]').length,
    fixes: document.querySelectorAll('[data-fix]').length,
    scans: document.querySelectorAll('[data-scan]').length,
    readout: (document.getElementById('stage-readout') || {}).textContent
  }));

  const pick = (data) => page.evaluate((d) => { window.CV.App.stage.pickHandler({ data: d }); }, data);

  /* Dialogue now plays real 6-10s voice clips, so the panels are only usable
     once the line finishes.  Poll instead of assuming a fixed sleep. */
  const quiet = (timeout = 30000) => page.waitForFunction(
    () => !window.SQ || !window.SQ.Dialogue || !window.SQ.Dialogue.active, { timeout, polling: 250 }
  ).catch(() => null);

  const clickSel = async (sel, timeout = 20000) => {
    try {
      await page.waitForFunction((s) => {
        const el = document.querySelector(s);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width >= 3 && r.height >= 3;
      }, { timeout, polling: 250 }, sel);
    } catch (e) {
      return false;
    }
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    await page.mouse.click(box.x, box.y);
    return true;
  };

  const waitPred = (fn, timeout = 25000) => page.waitForFunction(fn, { timeout, polling: 250 }).catch(() => null);
  const phaseIs = (n) => waitPred((want) => {
    const el = document.getElementById('stage-readout');
    return el && el.textContent.indexOf(want) >= 0;
  }, 25000, 'المرحلة ' + n);

  /* ---- phase 1: inspect ---- */
  await quiet();
  log.push('boot ' + JSON.stringify(await snap()));
  await pick({ kind: 'portal' });
  await quiet();
  for (const id of ['light', 'leak', 'pump', 'osmosis']) {
    await pick({ kind: 'fault', id: id });
    await quiet();
  }
  await phaseIs('٢');
  log.push('inspect done ' + JSON.stringify(await snap()));

  /* ---- phase 2: analyse ---- */
  for (const id of ['light', 'leak', 'pump', 'osmosis']) {
    const opened = await clickSel('[data-open="' + id + '"]');
    const ok = await clickSel('[data-cause="' + id + '"][data-ok="1"]');
    log.push('cause ' + id + ' opened=' + opened + ' clickable=' + ok);
    await quiet();
  }
  await phaseIs('٣');
  await quiet();
  log.push('analyse done ' + JSON.stringify(await snap()));

  /* ---- phase 3: repair ---- */
  for (const id of ['light', 'leak', 'pump']) {
    await clickSel('[data-open="' + id + '"]');
    await clickSel('[data-fix="' + id + '"]');
    await quiet();
  }
  await clickSel('[data-open="osmosis"]');
  const wrongBefore = await page.evaluate(() => document.querySelectorAll('.fault-row.is-fixed').length);
  await clickSel('[data-fix="osmosis"]');
  await quiet();
  await page.evaluate(() => {
    const input = document.querySelector('[data-osmo]');
    if (!input) return;
    input.value = 50;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(300);
  await clickSel('[data-fix="osmosis"]');
  await phaseIs('٤');
  await quiet();
  log.push('repair done (slider wrong first: fixed=' + wrongBefore + ') ' + JSON.stringify(await snap()));

  /* ---- phase 4: route the six keys ---- */
  await clickSel('[data-key]', 20000);
  const socketIds = await page.evaluate(() => [...document.querySelectorAll('[data-key]')].map((b) => b.dataset.key));
  log.push('tray ' + JSON.stringify(socketIds));
  await clickSel('[data-key="' + socketIds[0] + '"]');
  await pick({ kind: 'socket', id: socketIds[0] === 's1' ? 's2' : 's1' });
  await sleep(500);
  const wrongRejected = await page.evaluate(() => document.querySelectorAll('.key-token.is-seated').length === 0);
  for (const sid of socketIds) {
    await clickSel('[data-key="' + sid + '"]');
    await pick({ kind: 'socket', id: sid });
    await quiet();
  }
  log.push('route done wrongKeyRejected=' + wrongRejected + ' ' + JSON.stringify(await snap()));

  /* ---- escape ---- */
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    if (await page.evaluate(() => !document.getElementById('overlay-complete').hidden)) break;
  }
  const done = await page.evaluate(() => ({
    overlay: !document.getElementById('overlay-complete').hidden,
    title: (document.getElementById('complete-title') || {}).textContent,
    key: (document.getElementById('complete-key') || {}).textContent,
    learn: ((document.getElementById('complete-learn') || {}).textContent || '').slice(0, 40),
    stars: (document.getElementById('complete-stars-label') || {}).textContent,
    stored: (JSON.parse(localStorage.getItem('microverse-progress-v1') || '{}').done) || null
  }));
  log.push('complete ' + JSON.stringify(done));
  await page.screenshot({ path: 'tools/out-m6-complete.png' });

  await page.evaluate(() => { const b = document.querySelector('[data-action="next-mission"]'); if (b) b.click(); });
  await sleep(3500);
  log.push('after next ' + JSON.stringify(await page.evaluate(() => ({
    scene: document.getElementById('app').dataset.scene,
    worldKeys: document.getElementById('world').dataset.keys,
    lit: [...document.querySelectorAll('.pseg')].filter((p) => +getComputedStyle(p).opacity > .9).length
  }))));
  await page.screenshot({ path: 'tools/out-m6-map.png' });

  console.log(log.join('\n'));
  console.log('ERRORS ' + JSON.stringify(errors.slice(0, 12)));
  await browser.close();
  const passed = done.overlay && done.stored && done.stored.m6 && !errors.length;
  console.log('RESULT ' + (passed ? 'PASS' : 'FAIL'));
  process.exit(passed ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
