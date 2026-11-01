/* =========================================================
   MICROVERSE ESCAPE — offline file:// validation
   Loads the game straight from disk (no server) and plays a
   mission, because the classroom PC may run index.html directly.
   Usage: node tools/offline_test.js
   ========================================================= */
function requirePuppeteer() {
  for (const g of ['puppeteer-core', 'C:/Users/lujain/AppData/Local/Temp/cvtest/node_modules/puppeteer-core']) {
    try { return require(g); } catch (e) { /* next */ }
  }
  throw new Error('puppeteer-core not found');
}
const path = require('path');
const puppeteer = requirePuppeteer();
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FILE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  const errors = [];
  const failed = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('requestfailed', (r) => failed.push(r.url().replace(/^.*microverse-escape\//, '')));

  await page.goto(FILE, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);

  const boot = await page.evaluate(() => ({
    scene: document.getElementById('app').dataset.scene,
    three: typeof window.THREE !== 'undefined',
    kit: !!(window.CV && window.CV.kit),
    missions: window.CV ? Object.keys(window.CV.Missions || {}) : null,
    sheets: document.styleSheets.length,
    clips: window.CV_VOICE_CLIPS ? Object.keys(window.CV_VOICE_CLIPS).reduce((n, w) => n + Object.keys(window.CV_VOICE_CLIPS[w]).length, 0) : 0
  }));

  /* fonts and sprites must decode from disk too */
  const media = await page.evaluate(() => new Promise((res) => {
    const imgs = [...document.images];
    let pending = imgs.filter((i) => !i.complete).length;
    const done = () => res({
      images: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
      fonts: document.fonts ? document.fonts.status : 'n/a'
    });
    if (!pending) return done();
    imgs.forEach((i) => { i.addEventListener('load', check); i.addEventListener('error', check); });
    function check() { if (--pending <= 0) done(); }
    setTimeout(done, 6000);
  }));

  /* play a real mission off disk */
  await page.evaluate(() => {
    const s = { team: 'فريق المستكشفين', stars: { m1: 3, m2: 3, m3: 3, m4: 3 }, done: { m1: 1, m2: 1, m3: 1, m4: 1 }, started: {}, last: null, date: '', code: 'MV-4321', introSeen: true };
    localStorage.setItem('microverse-progress-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await sleep(2000);
  await page.evaluate(() => window.CV.App.startMission('m5'));
  await sleep(5000);
  const mission = await page.evaluate(() => ({
    scene: document.getElementById('app').dataset.scene,
    canvas: !!document.querySelector('#stage3d canvas'),
    labels: document.querySelectorAll('.stage-label').length,
    title: (document.getElementById('mission-title') || {}).textContent
  }));

  /* a bundled clip must decode over file:// */
  const audio = await page.evaluate(() => new Promise((res) => {
    const f = window.CV_VOICE_CLIPS.nova[Object.keys(window.CV_VOICE_CLIPS.nova)[0]].f;
    const a = new Audio();
    a.onloadedmetadata = () => res({ file: f, ok: true, seconds: +a.duration.toFixed(2) });
    a.onerror = () => res({ file: f, ok: false });
    a.preload = 'metadata';
    a.src = f;
    setTimeout(() => res({ file: f, ok: false, reason: 'timeout' }), 8000);
  }));

  console.log(JSON.stringify({ url: FILE, boot: boot, media: media, mission: mission, audio: audio,
    consoleErrors: errors, failedRequests: failed }, null, 2));
  await browser.close();
  process.exit(errors.length || failed.length || !boot.three || !mission.canvas || !audio.ok ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
