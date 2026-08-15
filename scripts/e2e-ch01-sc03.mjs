import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const out = join(tmpdir(), 'honghu_e2e') + '/';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5176';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

await page.goto('http://127.0.0.1:' + PORT + '/');

await page.waitForFunction(() => window.gameDirector, null, { timeout: 15000 });
await sleep(1500);
console.log('0 title ready');
await page.mouse.click(301, 641);
await page.waitForSelector('.intro-panel button');
await sleep(800);
await page.click('.intro-panel button');
await sleep(600);
await page.click('.intro-panel button');
await sleep(800);

await page.evaluate(() => {
  const save = {
    checkpoint: 'CH01_SC01_CHEN_HOME_WAKE',
    checkpointLabel: '1927',
    profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
    choice: null, choiceTag: null, echo: null,
    tags: [],
    fixed: ['PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT'],
    risk: { identity: 0, execution: 0, coordination: 0 },
    exit: { nextSceneCanonical: 'CH01_SC01_CHEN_HOME_WAKE' },
  };
  window.localStorage.setItem('redcode.prologue.save', JSON.stringify(save));
  window.dispatchEvent(new CustomEvent('prologue:scene-exit', { detail: save }));
});

await page.waitForFunction(() => window.ch01Sc01Game, null, { timeout: 15000 });
console.log('1 SC01 loaded');
await sleep(1200);

await page.evaluate(() => {
  window.gameDirector.enterScene('Ch01Sc03Scene', 'CH01_SC03');
});
await page.waitForFunction(() => window.ch01Sc03Game, null, { timeout: 15000 });
console.log('2 Ch01Sc03Scene started');
await sleep(1500);

await page.screenshot({ path: out + 'yard_1.png' });
console.log('3 screenshot saved: yard_1.png');

const sceneState = await page.evaluate(() => ({
  mode: window.prologueState.mode,
  playerLocked: window.prologueState.playerLocked,
  playerPos: { x: Math.round(window.ch01Sc03Game.player.x), y: Math.round(window.ch01Sc03Game.player.y) },
  liaisonPos: { x: Math.round(window.ch01Sc03Game.liaison.x), y: Math.round(window.ch01Sc03Game.liaison.y) },
  taskOpen: window.prologueState.taskOpen,
  nearby: window.ch01Sc03Game.nearby()?.id || 'none',
}));
console.log('  scene state:', JSON.stringify(sceneState));

await page.evaluate(() => window.ch01Sc03Game.player.setPosition(1200, 450));
await sleep(600);
const nearBefore = await page.evaluate(() => window.ch01Sc03Game.nearby()?.id || 'none');
console.log('  nearby at (1200,450):', nearBefore);

if (await page.evaluate(() => window.prologueState.taskOpen)) {
  // two-stage close: center→corner→dismiss
  await page.keyboard.press('e');
  await sleep(300);
  if (await page.evaluate(() => window.prologueState.taskOpen)) {
    await page.keyboard.press('e');
    await sleep(300);
  }
}
await page.keyboard.press('e');
await sleep(500);
console.log('  mode after E:', await page.evaluate(() => window.prologueState.mode));
console.log('  inNarrative:', await page.evaluate(() => window.prologueState.inNarrative));

for (let i = 0; i < 30; i += 1) {
  const done = await page.evaluate(() => window.prologueState.flags.has('CH01_YARD_DONE'));
  if (done) { console.log('  YARD_CHAIN complete at press', i); break; }
  await page.keyboard.press('Space');
  await sleep(300);
}

const yardDone = await page.evaluate(() => window.prologueState.flags.has('CH01_YARD_DONE'));
console.log('4 CH01_YARD_DONE =', yardDone);

for (let i = 0; i < 20; i += 1) {
  const back = await page.evaluate(() => !!window.ch01Sc01Game && window.prologueState.mode !== 'end');
  if (back) { console.log('5 returned to SC01 at wait', i); break; }
  await sleep(300);
}

await sleep(800);
await page.screenshot({ path: out + 'yard_2_after.png' });
const backToSc01 = await page.evaluate(() => !!window.ch01Sc01Game);
console.log('6 back to SC01:', backToSc01);

const flags = await page.evaluate(() => [...(window.prologueState?.flags || [])].filter(f => f.includes('YARD')));
console.log('7 YARD flags:', flags);
console.log('CH01_SC03 E2E', yardDone && backToSc01 ? 'PASS' : 'FAIL');

await browser.close();
process.exit(yardDone && backToSc01 ? 0 : 1);
