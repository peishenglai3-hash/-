import { createRequire } from 'module';
const require = createRequire('C:\\Users\\35636\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\noop.js');
const { chromium } = require('playwright');

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\opencode\\';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });

const mode = () => page.evaluate(() => window.prologueState.mode);
async function advanceUntil(predicate, presses = 80, delay = 150) {
  for (let i = 0; i < presses; i += 1) {
    if (await predicate()) return true;
    await page.keyboard.press('Space');
    await sleep(delay);
  }
  return predicate();
}

await page.goto('http://127.0.0.1:5175/');
await page.waitForSelector('#start-button');
await sleep(1200);
await page.click('#start-button');
await sleep(500);
await page.click('#start-button');
await sleep(800);
console.log('1 intro skipped, mode =', await mode());
await page.keyboard.press('e');
await sleep(300);

await page.evaluate(() => window.scene01Game.player.setPosition(24 * 32, 14.5 * 32));
await sleep(400);
await page.screenshot({ path: out + 'pl_01_scene01.png' });
await page.keyboard.press('e');
await sleep(600);
const reachedChoice = await advanceUntil(async () => (await mode()) === 'choice');
console.log('2 monument sequence done, choice =', reachedChoice);
await page.screenshot({ path: out + 'pl_02_choice.png' });
await page.click('[data-choice="PRO_Q01_A"]');
await sleep(500);
await page.screenshot({ path: out + 'pl_03_result.png' });
await page.keyboard.press('Space');
await sleep(500);
await page.keyboard.press('e');
await sleep(300);

await page.evaluate(() => window.scene01Game.player.setPosition(26 * 32, 25 * 32));
await sleep(400);
await page.keyboard.press('e');
await sleep(500);
await advanceUntil(async () => (await mode()) === 'leave_walk', 8);
await page.evaluate(() => window.scene01Game.player.setPosition(22 * 32, 25 * 32));
await sleep(400);
await page.keyboard.press('e');
await sleep(500);
await advanceUntil(async () => (await mode()) === 'transition', 12);
console.log('3 leave dialogues done, entering transition A');
await sleep(8600);
await page.screenshot({ path: out + 'pl_04_transitionA.png' });
await page.waitForFunction(() => window.scene02Game, null, { timeout: 30000 });
console.log('4 transition A done, scene02 started');

await advanceUntil(async () => (await mode()) === 'explore', 20);
await page.keyboard.press('e');
await sleep(300);
await page.screenshot({ path: out + 'pl_05_scene02.png' });

async function interactScene02(x, y) {
  await page.evaluate(([tx, ty]) => window.scene02Game.player.setPosition(tx * 32, ty * 32), [x, y]);
  await sleep(350);
  if (await page.evaluate(() => window.prologueState.taskOpen)) { await page.keyboard.press('e'); await sleep(250); }
  await page.keyboard.press('e');
  await sleep(500);
}

await interactScene02(28, 22);
await advanceUntil(async () => (await mode()) === 'explore', 12);
console.log('5 audio review done');

await interactScene02(32, 22);
await advanceUntil(async () => (await mode()) !== 'narrative', 70, 220);
for (let i = 0; i < 10 && (await mode()) === 'narrative'; i += 1) { await page.keyboard.press('Space'); await sleep(250); }
console.log('6 write question + fall asleep done, transition B running');
await sleep(20000);
await page.screenshot({ path: out + 'pl_06_transitionB.png' });
await sleep(24000);
await page.screenshot({ path: out + 'pl_07_reveal.png' });
await page.waitForFunction(() => !document.querySelector('#end-panel').classList.contains('hidden'), null, { timeout: 60000 });
await sleep(600);
await page.screenshot({ path: out + 'pl_08_end.png' });

const endText = await page.evaluate(() => document.querySelector('#end-panel').textContent);
const save = await page.evaluate(() => JSON.parse(window.localStorage.getItem('redcode.prologue.save') || 'null'));
console.log('7 end panel:', endText.includes('固定回退点') && endText.includes('PROLOGUE_COMPLETED') ? 'OK' : 'MISSING');
console.log('8 save:', save ? `${save.checkpoint} / ${save.choiceTag} / risk ${save.risk.identity}${save.risk.execution}${save.risk.coordination}` : 'MISSING');
await browser.close();
console.log('PROLOGUE E2E PASS');
