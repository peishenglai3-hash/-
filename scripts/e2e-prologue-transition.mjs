import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e\\';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5175';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle' });
// 标题门禁（2026-08-12 起）：先点「创建」热区进入新游戏流程
await page.waitForFunction(() => window.titleScene, null, { timeout: 15000 });
await page.mouse.click(301, 641);
await page.waitForSelector('.intro-panel button');
await sleep(800);

// Start intro video then skip to enter prologue (starts prologue BGM)
await page.click('.intro-panel button');
await sleep(400);
await page.click('.intro-panel button');
await sleep(800);

// Confirm prologue BGM is playing
const prologueBgmPlaying = await page.evaluate(() => {
  const bgm = window.gameDirector?.bgm;
  return bgm ? !bgm.paused && bgm.currentTime > 0 : false;
});
console.log('1 prologue BGM playing:', prologueBgmPlaying);

// Trigger finishPrologue (real code path: stops prologue BGM, dispatches event, shows EndPanel)
await page.evaluate(() => {
  window.gameDirector.finishPrologue();
});

// Wait for EndPanel to appear
await page.waitForSelector('.end-panel', { timeout: 5000 });
await sleep(300);
const endPanelText = await page.$eval('.end-card strong', (el) => el.textContent);
console.log('2 end panel shown:', endPanelText);

// Verify prologue BGM stopped
const prologueBgmStopped = await page.evaluate(() => {
  const bgm = window.gameDirector?.bgm;
  return bgm ? bgm.paused : false;
});
console.log('3 prologue BGM stopped:', prologueBgmStopped);

// Take screenshot with end panel
await page.screenshot({ path: out + 'ch01_end_panel.png' });

// Close end panel via button
await page.click('.enter-chapter');
await sleep(500);
const endPanelGone = await page.evaluate(() => !document.querySelector('.end-panel'));
console.log('4 end panel closed:', endPanelGone);

// Verify Chapter 1 scene started and its BGM is playing
await page.waitForFunction(() => window.ch01Sc01Game, null, { timeout: 10000 });
// Skip intro video + narrative so the screenshot shows explore mode
await sleep(1500);
await page.keyboard.press('e');
await sleep(400);
// Advance through intro narrative so we reach explore mode
for (let i = 0; i < 12; i += 1) { await page.keyboard.press('Space'); await sleep(280); }
await sleep(800);
const cameraInfo = await page.evaluate(() => {
  const cam = window.ch01Sc01Game?.cameras?.main;
  return cam ? { zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY, width: cam.width, height: cam.height } : null;
});
console.log('5 camera info:', cameraInfo);
const markCount = await page.evaluate(() => window.ch01Sc01Game?.observationMarks?.length ?? -1);
console.log('5 observation marks:', markCount);
const ch01BgmPlaying = await page.evaluate(() => {
  const scene = window.ch01Sc01Game?.scene?.manager?.keys?.Ch01Sc01Scene;
  const bgm = scene?.bgm;
  return bgm ? bgm.isPlaying : false;
});
console.log('6 Chapter 1 BGM playing:', ch01BgmPlaying);

await page.screenshot({ path: out + 'ch01_after_end_panel.png' });

let exitCode = 0;
if (prologueBgmPlaying && prologueBgmStopped && endPanelGone && ch01BgmPlaying) {
  console.log('PROLOGUE TRANSITION E2E PASS');
} else {
  console.log('PROLOGUE TRANSITION E2E FAIL', { prologueBgmPlaying, prologueBgmStopped, endPanelGone, ch01BgmPlaying });
  exitCode = 1;
}

try {
  await Promise.race([browser.close(), sleep(2000)]);
} catch (e) {
  console.log('browser close warning:', e.message);
}
console.log('exitCode =', exitCode);
process.exit(exitCode);
