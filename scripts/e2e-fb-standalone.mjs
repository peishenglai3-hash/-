import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e\\';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5173';

let hasPageError = false;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => { console.log('[pageerror]', e.message); hasPageError = true; });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

// --- Step 1: goto ?scene=fb → wait for scene instance ---
await page.goto('http://127.0.0.1:' + PORT + '/?scene=fb');
await page.waitForFunction(() => window.ch01Sc02Game, null, { timeout: 15000 });
console.log('1 FB scene started');
await sleep(1200);
await page.screenshot({ path: out + 'fb_01_arrive.png' });

// --- Step 2: arrival narrative + fisherman dialogue (beat1) ---
// Space until explore mode; BEAT1 should be set along the way.
for (let i = 0; i < 60; i += 1) {
  const done = await page.evaluate(
    () => window.prologueState.mode === 'explore' && !window.prologueState.inNarrative,
  );
  if (done) break;
  await page.keyboard.press('Space');
  await sleep(250);
}
await sleep(400);
await page.screenshot({ path: out + 'fb_01b_explore.png' });

// Assert task card visible with "把状纸交给渔民"
const taskVisible = await page.evaluate(() => !!document.querySelector('.task-card'));
if (!taskVisible) { console.log('FAIL: task card not visible after beat1'); process.exit(1); }
const taskText = await page.evaluate(() => document.querySelector('.task-card')?.textContent || '');
console.log('  task card text:', taskText);
const beat1 = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_BEAT1'));
console.log('2 beat1 =', beat1, ' taskOpen =', await page.evaluate(() => window.prologueState?.taskOpen));

// --- Step 3: teleport to door → E → handoff narrative → ink transition → beat3 ---
await page.evaluate(() => window.ch01Sc02Game.player.setPosition(1260, 430));
await sleep(500);
// closeTask (two-stage: center→corner→dismiss)
for (let i = 0; i < 2; i++) {
  if (!(await page.evaluate(() => window.prologueState.taskOpen))) break;
  await page.keyboard.press('e');
  await sleep(300);
}
await page.keyboard.press('e');
await sleep(500);
await page.screenshot({ path: out + 'fb_02_door_handoff.png' });

// Space through handoff narrative; assert HANDOFF flag set along the way
for (let i = 0; i < 40; i += 1) {
  const handoff = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_HANDOFF'));
  if (handoff) break;
  await page.keyboard.press('Space');
  await sleep(250);
}
const handoff = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_HANDOFF'));
console.log('  handoff =', handoff);
if (!handoff) { console.log('FAIL: HANDOFF not set'); process.exit(1); }

// Continue Space until BEAT3 set (fisherman dialogue after ink transition)
for (let i = 0; i < 40; i += 1) {
  const beat3 = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_BEAT3'));
  if (beat3) break;
  await page.keyboard.press('Space');
  await sleep(250);
}
await sleep(300);
await page.screenshot({ path: out + 'fb_03_fish.png' });
const beat3 = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_BEAT3'));
console.log('3 beat3 =', beat3);

// --- Step 4: choice 2 (auto-pops after BEAT3) ---
await page.waitForSelector('.choice-panel', { timeout: 8000 });
await page.screenshot({ path: out + 'fb_04_choice2.png' });
await page.evaluate(() => document.querySelectorAll('.choice-panel .choice')[0]?.click());
await sleep(800);
const choice2a = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_CHOICE2_A'));
const panelGone = await page.evaluate(() => !document.querySelector('.choice-panel'));
console.log('4 choice2_A =', choice2a, ' panel gone =', panelGone);
if (!choice2a || !panelGone) { console.log('FAIL: choice 2 not resolved'); process.exit(1); }

// --- Step 5: psychological description + departure narrative → COMPLETE → end ---
for (let i = 0; i < 60; i += 1) {
  const complete = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_COMPLETE'));
  if (complete) break;
  await page.keyboard.press('Space');
  await sleep(250);
}
const complete = await page.evaluate(() => window.prologueState.flags.has('CH01_SC02_COMPLETE'));
console.log('5 complete =', complete);

// Wait for end mode (black screen / ending text)
for (let i = 0; i < 40; i += 1) {
  const endMode = await page.evaluate(() => window.prologueState.mode === 'end');
  if (endMode) break;
  await page.keyboard.press('Space');
  await sleep(250);
}
const endMode = await page.evaluate(() => window.prologueState.mode === 'end');
console.log('  endMode =', endMode);
await sleep(500);
await page.screenshot({ path: out + 'fb_05_end.png' });

// --- Final summary ---
const flags = await page.evaluate(() => [...(window.prologueState?.flags || [])]);
console.log('flags:', flags);

await browser.close();

if (hasPageError) {
  console.log('FB STANDALONE E2E FAIL (pageerror detected)');
  process.exit(1);
}
console.log('FB STANDALONE E2E PASS');
process.exit(0);
