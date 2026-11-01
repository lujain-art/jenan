/* =========================================================
   MICROVERSE ESCAPE — voice coverage audit
   Confirms every line the game can speak has a bundled clip,
   so no dialogue silently drops to the cartoon-chatter fallback.
   Usage: node tools/voice_coverage.js [baseUrl]
   ========================================================= */
function requirePuppeteer() {
  for (const g of ['puppeteer-core', 'C:/Users/lujain/AppData/Local/Temp/cvtest/node_modules/puppeteer-core']) {
    try { return require(g); } catch (e) { /* next */ }
  }
  throw new Error('puppeteer-core not found');
}
const fs = require('fs');
const path = require('path');
const puppeteer = requirePuppeteer();
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = (process.argv[2] || 'http://127.0.0.1:4180/index.html').replace(/\/index\.html.*$/, '/');
const ROOT = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* mission scripts speak some strings that never pass through CV.LINES */
function hardcodedLines() {
  const out = [];
  const push = (who, text) => out.push({ who, text, where: 'mission literal' });
  push('pip', 'المحطات الثلاث تعمل. اربطوا كل محطة بما شاهدتموه، لا بما تتوقعونه.');
  ['أ', 'ب', 'ج'].forEach((l) => push('nova', 'المحطة ' + l + ' ما زالت بلا آلية. راجعوا ما شاهدتموه.'));
  push('orbit', 'الآلية لا تطابق ما شاهدتم في هذه المحطة. أعيدوا قراءة الملاحظة.');
  push('nova', 'عيّنة واحدة بقيت. قارنوا اتجاه الماء فيها.');
  push('orbit', 'الاتجاه الذي شاهدتموه لا يطابق هذا النوع. أعيدوا الملاحظة.');
  push('orbit', 'الماء ما زال يتحرك في اتجاه واحد. اضبطوا التركيز ليتعادل في الاتجاهين.');
  const m6 = fs.readFileSync(path.join(ROOT, 'js', 'missions', 'm6-final.js'), 'utf8');
  (m6.match(/scan:\s*'([^']+)'/g) || []).forEach((m) => push('pip', m.replace(/scan:\s*'/, '').replace(/'$/, '')));
  (m6.match(/\{\s*t:\s*'([^']+)',\s*ok:\s*true\s*\}/g) || []).forEach((m) => push('nova', m.replace(/.*t:\s*'/, '').replace(/'.*/, '')));
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1280, height: 720 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(900);

  const lines = await page.evaluate(() => Object.keys(window.CV.LINES).map((id) => ({
    id: id,
    who: window.CV.LINES[id].who,
    text: window.CV.LINES[id].text
  })));
  const speakers = await page.evaluate(() => Object.keys(window.CV_VOICE_CLIPS || {}));
  const totalClips = await page.evaluate(() => Object.keys(window.CV_VOICE_CLIPS || {})
    .reduce((n, w) => n + Object.keys(window.CV_VOICE_CLIPS[w]).length, 0));

  const check = (who, text) => page.evaluate((w, t) => {
    const bank = (window.CV_VOICE_CLIPS || {})[w];
    if (!bank) return 'no-speaker';
    const e = bank[t];
    if (!e) return 'no-clip';
    return e.f && e.d > 0.15 ? 'ok' : 'bad-entry';
  }, who === 'narrator' ? 'nova' : who, text);

  const missing = [];
  for (const l of lines) {
    const st = await check(l.who, l.text);
    if (st !== 'ok') missing.push({ src: 'CV.LINES:' + l.id, who: l.who, status: st, text: l.text.slice(0, 60) });
  }
  for (const l of hardcodedLines()) {
    const st = await check(l.who, l.text);
    if (st !== 'ok') missing.push({ src: l.where, who: l.who, status: st, text: l.text.slice(0, 60) });
  }

  /* every referenced clip file must actually load from disk */
  const sample = await page.evaluate(() => {
    const all = [];
    Object.keys(window.CV_VOICE_CLIPS).forEach((w) => Object.keys(window.CV_VOICE_CLIPS[w]).forEach((t) => {
      all.push(window.CV_VOICE_CLIPS[w][t].f);
    }));
    return all;
  });
  const brokenFiles = await page.evaluate((files) => Promise.all(files.map((f) => fetch(f)
    .then((r) => (r.ok ? null : f))
    .catch(() => f))), sample).then((rs) => rs.filter(Boolean));

  /* live playback: a clip must actually start, not just exist on disk.
     narrator lines are voiced by NOVA, exactly like Characters.speak does. */
  await page.mouse.click(30, 30);
  await sleep(700);
  const live = [];
  for (const who of ['nova', 'pip', 'orbit']) {
    const line = lines.filter((l) => (l.who === who) || (who === 'nova' && l.who === 'narrator'))[0];
    if (!line) { live.push({ who: who, mode: 'no-line' }); continue; }
    const r = await page.evaluate(async (w, speaker, t) => {
      const started = performance.now();
      const p = window.SQ.Voice.speak(w, t);
      let firstSoundAt = null;
      const iv = setInterval(() => {
        if (firstSoundAt === null && window.SQ.Voice.activeClip && window.SQ.Voice.activeClip.currentTime > 0.02) {
          firstSoundAt = Math.round(performance.now() - started);
        }
      }, 20);
      const res = await Promise.race([p, new Promise((res2) => setTimeout(() => res2({ mode: 'timeout' }), 25000))]);
      clearInterval(iv);
      window.SQ.Voice.stop();
      return { mode: res && res.mode, duration: res && res.duration && +res.duration.toFixed(2), firstSoundAt: firstSoundAt, speaker: speaker };
    }, line.who === 'narrator' ? 'nova' : line.who, line.who, line.text);
    live.push(Object.assign({ who: who, line: line.text.slice(0, 26) }, r));
  }

  console.log(JSON.stringify({
    speakers: speakers,
    clips: totalClips,
    gameLines: lines.length + hardcodedLines().length,
    missing: missing,
    brokenAudioFiles: brokenFiles,
    livePlayback: live,
    errors: errors
  }, null, 2));
  await browser.close();
  process.exit(missing.length || brokenFiles.length || errors.length ||
    live.some((l) => l.mode !== 'clip') ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
