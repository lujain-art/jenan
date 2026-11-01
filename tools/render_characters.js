/* Renders every animation frame of NOVA / PIP / ORBIT to tools/.frames.
   Usage (from project root, with a local server on :4180):
     node tools/render_characters.js
   Requires puppeteer-core (the test harness supplies it) and Edge. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const PUPPETEER = process.env.PUPPETEER_PATH ||
  'C:/Users/lujain/AppData/Local/Temp/cvtest/node_modules/puppeteer-core';
const EDGE = process.env.EDGE_PATH ||
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const puppeteer = require(PUPPETEER);

const STATES = {
  nova: ['idle', 'talk', 'happy', 'sad', 'surprised', 'wave'],
  pip: ['idle', 'talk', 'happy', 'sad', 'surprised'],
  orbit: ['idle', 'talk', 'happy', 'sad', 'surprised']
};
const FRAMES = { idle: 16, talk: 8, happy: 12, sad: 12, surprised: 10, wave: 12 };

(async () => {
  fs.mkdirSync(path.join(ROOT, 'tools', '.frames'), { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb', '--hide-scrollbars']
  });
  for (const char of Object.keys(STATES)) {
    const page = await browser.newPage();
    await page.setViewport({ width: 480, height: 640, deviceScaleFactor: 2 });
    await page.goto('http://127.0.0.1:4180/tools/render_characters.html?char=' + char, {
      waitUntil: 'networkidle0'
    });
    await page.waitForFunction('window.__ready === true', { timeout: 15000 });
    for (const state of STATES[char]) {
      const dir = path.join(ROOT, 'tools', '.frames', char, state);
      fs.mkdirSync(dir, { recursive: true });
      const n = FRAMES[state];
      for (let f = 0; f < n; f++) {
        await page.evaluate((s, i, total) => window.applyFrame(s, i, total), state, f, n);
        await new Promise((r) => setTimeout(r, 16));
        await page.screenshot({
          path: path.join(dir, String(f).padStart(2, '0') + '.png'),
          omitBackground: true,
          clip: { x: 0, y: 0, width: 480, height: 640 }
        });
      }
      console.log('rendered', char, state, n);
    }
    await page.close();
  }
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
