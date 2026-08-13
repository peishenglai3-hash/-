// e2e-ch01-return.mjs — 返回陈家全链专项（归位+敲门→暗号Q3→外景联络→告别Q4→章末）
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e\\';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5176';
const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

const advance = async (pred, presses = 40) => {
  for (let i = 0; i < presses; i += 1) {
    if (await page.evaluate(pred)) return true;
    await page.keyboard.press('Space');
    await sleep(220);
  }
  return page.evaluate(pred);
};
const hasFlag = (f) => page.evaluate((x) => window.prologueState.flags.has(x), f);
const toExplore = () => advance(() => window.prologueState.mode === 'explore' && !window.prologueState.inNarrative, 60);
const closeTask = async () => {
  // 两段式任务卡：第一段居中→右上角，第二段右上角→关闭
  for (let i = 0; i < 2; i++) {
    if (!(await page.evaluate(() => window.prologueState.taskOpen))) break;
    await page.keyboard.press('e');
    await sleep(300);
  }
};

await page.goto('http://127.0.0.1:' + PORT + '/');
await page.waitForFunction(() => window.titleScene, null, { timeout: 15000 });
await page.mouse.click(301, 641);
await page.waitForSelector('.intro-panel button');
await sleep(600);
await page.click('.intro-panel button');
await sleep(400);
await page.click('.intro-panel.button, .intro-panel button');
await sleep(800);
// 直达 SC01
await page.evaluate(() => {
  const s = { checkpoint: 'x', checkpointLabel: 'x', profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 }, choice: null, choiceTag: null, echo: null, tags: [], fixed: ['PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT'], risk: { identity: 0, execution: 0, coordination: 0 }, exit: { nextSceneCanonical: 'x' } };
  window.localStorage.setItem('redcode.prologue.save', JSON.stringify(s));
  window.dispatchEvent(new CustomEvent('prologue:scene-exit', { detail: s }));
});
await page.waitForFunction(() => window.ch01Sc01Game, null, { timeout: 15000 });
await sleep(1000);
await closeTask();
await toExplore();
console.log('1 SC01 explore');

// 注入闪回完成旗标，触发返回链第一段
await page.evaluate(() => window.prologueState.flags.add('CH01_SC02_COMPLETE'));
await page.evaluate(() => window.ch01Sc01Game.beginExplore());
await sleep(400);
if (!(await advance(() => window.prologueState.flags.has('CH01_RETURN_TASK'), 40))) fail('RETURN_TASK not set');
console.log('2 return narrative + knock done, task =', await page.evaluate(() => document.querySelector('.task-card')?.textContent?.slice(0, 20)));
await closeTask();

// 门边暗号
await page.evaluate(() => window.ch01Sc01Game.player.setPosition(1320, 360));
await sleep(300);
await page.keyboard.press('e');
await sleep(500);
if (!(await advance(() => !!document.querySelector('.choice-panel'), 20))) fail('Q3 choice panel missing');
await page.screenshot({ path: out + 'ret_01_q3.png' });
await page.evaluate(() => document.querySelectorAll('.choice-panel .choice')[0]?.click());
await sleep(600);
if (!(await hasFlag('CH01_Q3_A'))) fail('Q3_A not set');
console.log('3 Q3 chosen, advancing through feedback');
// Advance through Q3 feedback narrative (5 entries for A), then black screen → SC03
await advance(() => false, 20); // exhaust narrative entries
await sleep(400);
await page.waitForFunction(() => window.ch01Sc03Game, null, { timeout: 20000 });
console.log('4 yard scene entered');
await sleep(800);
await page.screenshot({ path: out + 'ret_02_yard.png' });

// 外景：走近联络人 → 对话 → 完成回 SC01
await page.evaluate(() => window.ch01Sc03Game.player.setPosition(1200, 470));
await sleep(300);
// First 'e': close any open task card; second 'e': interact with liaison
await closeTask();
await sleep(400);
await page.keyboard.press('e');
await sleep(500);
if (!(await advance(() => window.prologueState.flags.has('CH01_YARD_DONE'), 40))) fail('YARD_DONE not set');
console.log('5 yard contact done');
await page.waitForFunction(() => window.prologueState.flags.has('CH01_FAREWELL_TASK'), null, { timeout: 15000 });
console.log('6 back to SC01 at door, farewell task on');
await closeTask();

// 桌边告别
await page.evaluate(() => window.ch01Sc01Game.player.setPosition(700, 560));
await sleep(300);
await page.keyboard.press('e');
await sleep(500);
if (!(await advance(() => !!document.querySelector('.choice-panel'), 25))) fail('Q4 choice panel missing');
await page.screenshot({ path: out + 'ret_03_q4.png' });
await page.evaluate(() => document.querySelectorAll('.choice-panel .choice')[0]?.click());
await sleep(600);
if (!(await hasFlag('CH01_Q4_A'))) fail('Q4_A not set');
if (!(await hasFlag('MOONCAKE_PROMISE'))) fail('MOONCAKE_PROMISE not set');
console.log('7 Q4 done (mooncake tag set)');
await advance(() => window.prologueState.mode === 'explore', 30);
await closeTask();

// 离场 → 章末黑幕
await page.evaluate(() => window.ch01Sc01Game.player.setPosition(1360, 288));
await sleep(300);
await page.keyboard.press('e');
await sleep(1200);
if (!(await advance(() => window.prologueState.flags.has('CH01_CHAPTER_COMPLETE'), 40))) fail('CHAPTER_COMPLETE not set');
await sleep(2500);
await page.screenshot({ path: out + 'ret_04_ending.png' });
console.log('8 ending card shown');

// 风险/画像结算抽查（Q3_A + Q4_A：风险应全0）
const sum = await page.evaluate(() => ({ risk: window.prologueState.risk, profile: window.prologueState.profile }));
console.log('9 summary:', JSON.stringify(sum));
if (sum.risk.identity !== 0) fail('risk should be 0 for A/A path');

await browser.close();
console.log('RETURN CHAIN E2E PASS');
