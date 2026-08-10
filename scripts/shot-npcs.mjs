import { createRequire } from 'module';
const require = createRequire('C:\\Users\\35636\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\noop.js');
const { chromium } = require('playwright');

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\opencode\\';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://127.0.0.1:5175/');
await page.waitForSelector('#start-button');
await sleep(1000);
await page.click('#start-button');
await sleep(400);
await page.click('#start-button');
await sleep(900);
console.log('bgm playing:', await page.evaluate(() => !window.prologueBgm.paused && !window.prologueBgm.ended));
await page.keyboard.press('e');
await sleep(300);

await page.evaluate(() => window.scene01Game.player.setPosition(29 * 32, 20.5 * 32));
await sleep(2500);
await page.screenshot({ path: out + 'npc_01_task1.png' });
await page.evaluate(() => window.scene01Game.player.setPosition(32.5 * 32, 21.5 * 32));
await sleep(1200);
await page.screenshot({ path: out + 'npc_02_girl.png' });

await page.evaluate(() => window.scene01Game.player.setPosition(24 * 32, 14.5 * 32));
await sleep(300);
await page.keyboard.press('e');
await sleep(500);
const mode = () => page.evaluate(() => window.prologueState.mode);
for (let i = 0; i < 80 && (await mode()) !== 'choice'; i += 1) { await page.keyboard.press('Space'); await sleep(140); }
await page.click('[data-choice="PRO_Q01_B"]');
await sleep(400);
await page.keyboard.press('Space');
await sleep(500);
await page.keyboard.press('e');
await sleep(300);
await page.evaluate(() => window.scene01Game.player.setPosition(24 * 32, 24 * 32));
await sleep(1500);
await page.screenshot({ path: out + 'npc_03_task3.png' });
await browser.close();
console.log('NPC SHOTS DONE');
