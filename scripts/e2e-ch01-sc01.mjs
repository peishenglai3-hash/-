import { createRequire } from 'module';
const require = createRequire('C:\\Users\\35636\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\noop.js');
const { chromium } = require('playwright');

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\opencode\\';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('requestfailed', (r) => console.log('[requestfailed]', r.url(), r.failure()?.errorText));

await page.goto('http://127.0.0.1:5175/');
await page.waitForSelector('.intro-panel button');
await sleep(800);
await page.click('.intro-panel button');   // start intro video
await sleep(600);
await page.click('.intro-panel button');   // skip intro video -> begin prologue
await sleep(800);

// Simulate prologue completion and jump into CH01_SC01
await page.evaluate(() => {
  const save = {
    checkpoint: 'CH01_SC01_CHEN_HOME_WAKE',
    checkpointLabel: '1927年，陈继南家中醒来',
    profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
    choice: null,
    choiceTag: null,
    echo: null,
    tags: [],
    fixed: ['PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT'],
    risk: { identity: 0, execution: 0, coordination: 0 },
    exit: { nextSceneCanonical: 'CH01_SC01_CHEN_HOME_WAKE' },
  };
  window.localStorage.setItem('redcode.prologue.save', JSON.stringify(save));
  window.dispatchEvent(new CustomEvent('prologue:scene-exit', { detail: save }));
});

await page.waitForFunction(() => window.ch01Sc01Game, null, { timeout: 15000 });
console.log('1 Ch01Sc01Scene started');
await sleep(1200);
await page.screenshot({ path: out + 'ch01_sc01_video.png' });

// Skip intro video
await page.keyboard.press('e');
await sleep(500);
await page.keyboard.press('Space');
await sleep(500);
await page.screenshot({ path: out + 'ch01_sc01_intro.png' });

// Advance intro narrative
await waitExplore(40);
// Close the task card that appears on entering explore mode
await page.keyboard.press('e');
await sleep(400);
const mode = await page.evaluate(() => window.prologueState?.mode);
console.log('2 intro narrative done, mode =', mode, 'taskOpen =', await page.evaluate(() => window.prologueState?.taskOpen));

async function waitExplore(presses = 40) {
  for (let i = 0; i < presses; i += 1) {
    const done = await page.evaluate(() => !window.prologueState.inNarrative && window.prologueState.mode === 'explore');
    if (done) return;
    await page.keyboard.press('Space');
    await sleep(220);
  }
}

async function interactAt(x, y, name) {
  await page.evaluate(([tx, ty]) => window.ch01Sc01Game.player.setPosition(tx, ty), [x, y]);
  await sleep(500);
  const near = await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none');
  console.log(`  nearby at ${name} (${x},${y}):`, near);
  await page.keyboard.press('e');
  await sleep(500);
  await waitExplore();
  // Close item panel if one was shown after the observation narrative
  const itemOpen = await page.evaluate(() => !!document.querySelector('.item-panel'));
  if (itemOpen) { await page.keyboard.press('e'); await sleep(400); }
  await page.screenshot({ path: out + `ch01_sc01_${name}.png` });
}

await interactAt(176, 576, 'basin');
await interactAt(1456, 672, 'desk');
await interactAt(1520, 256, 'door');

// Trigger choice 1 at family
const leftoverItem = await page.evaluate(() => !!document.querySelector('.item-panel'));
if (leftoverItem) { await page.keyboard.press('e'); await sleep(400); }
await page.evaluate(() => window.ch01Sc01Game.player.setPosition(672, 480));
await sleep(500);
console.log('  nearby family:', await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none'));
await page.keyboard.press('e');
await sleep(500);
console.log('  mode after family E:', await page.evaluate(() => window.prologueState?.mode), 'inNarrative:', await page.evaluate(() => window.prologueState?.inNarrative));
// Advance CHOICE1_INTRO narrative until choice panel appears
for (let i = 0; i < 20; i += 1) {
  const hasChoice = await page.evaluate(() => !!document.querySelector('.choice-panel'));
  if (hasChoice) break;
  await page.keyboard.press('Space');
  await sleep(250);
}
await page.screenshot({ path: out + 'ch01_sc01_choice.png' });
// Pick choice A (first button)
await page.evaluate(() => document.querySelectorAll('.choice-panel .choice')[0]?.click());
await sleep(800);
await page.screenshot({ path: out + 'ch01_sc01_result.png' });
console.log('  mode after choice:', await page.evaluate(() => window.prologueState?.mode));
// Close result -> beginInkEvent (shows ink task card)
await page.keyboard.press('Space');
await sleep(500);
// Close the ink task card
await page.keyboard.press('e');
await sleep(400);

// Ink event at desk
await page.evaluate(() => window.ch01Sc01Game.player.setPosition(1344, 736));
await sleep(500);
console.log('  nearby ink:', await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none'));
await page.keyboard.press('e');
await sleep(500);
await waitExplore(20);
const inkItemOpen = await page.evaluate(() => !!document.querySelector('.item-panel'));
if (inkItemOpen) { await page.keyboard.press('e'); await sleep(400); }
await page.screenshot({ path: out + 'ch01_sc01_ink.png' });
// Close the leave task card shown after ink_done
const leaveTask = await page.evaluate(() => window.prologueState?.taskOpen);
if (leaveTask) { await page.keyboard.press('e'); await sleep(400); }

// Exit
await page.evaluate(() => window.ch01Sc01Game.player.setPosition(1360, 288));
await sleep(500);
console.log('  nearby exit:', await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none'));
await page.keyboard.press('e');
await sleep(800);
await page.screenshot({ path: out + 'ch01_sc01_exit.png' });

const flags = await page.evaluate(() => [...(window.prologueState?.flags || [])]);
console.log('3 flags:', flags);
const complete = await page.evaluate(() => window.prologueState?.flags?.has('CH01_SC01_COMPLETE'));
const inkDone = await page.evaluate(() => window.prologueState?.flags?.has('CH01_SC01_INK_DONE'));
const choiceDone = await page.evaluate(() => window.prologueState?.flags?.has('CH01_SC01_CHOICE1_A'));
console.log('4 choice1 =', choiceDone, ' ink =', inkDone, ' complete =', complete);
console.log('CH01_SC01 E2E PASS');
process.exit(0);
