import { createRequire } from 'module';
const require = createRequire('C:\\Users\\35636\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\noop.js');
const { chromium } = require('playwright');

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\opencode\\';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://127.0.0.1:5175/?scene=02');
await page.waitForFunction(() => window.scene02Game);
await sleep(800);
const mode = () => page.evaluate(() => window.prologueState.mode);
for (let i = 0; i < 60 && (await mode()) !== 'explore'; i += 1) { await page.keyboard.press('Space'); await sleep(150); }
await sleep(400);
if (await page.evaluate(() => window.prologueState.taskOpen)) { await page.keyboard.press('e'); await sleep(300); }
await page.screenshot({ path: out + 'sc02_start.png' });
await page.keyboard.down('d');
await sleep(600);
await page.keyboard.up('d');
await sleep(300);
await page.screenshot({ path: out + 'sc02_moved.png' });
await browser.close();
console.log('SC02 SHOTS DONE');
