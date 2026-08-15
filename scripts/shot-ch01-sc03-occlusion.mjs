import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// 验证 Ch01Sc03（外景院墙）前景遮挡：人物走到套索区域后方时应被前景底图副本遮住
const out = join(tmpdir(), 'honghu_e2e') + '/';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5176';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });

await page.goto('http://127.0.0.1:' + PORT + '/');
await page.waitForFunction(() => window.gameDirector, null, { timeout: 15000 });
await sleep(1000);

// 从标题直接注入序章结算存档，进入第一章链路
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
await sleep(800);

await page.evaluate(() => window.gameDirector.enterScene('Ch01Sc03Scene', 'CH01_SC03'));
await page.waitForFunction(() => window.ch01Sc03Game, null, { timeout: 15000 });
await sleep(1500);
console.log('1 Ch01Sc03Scene started');

// 渲染器结构与深度
const info = await page.evaluate(() => {
  const s = window.ch01Sc03Game;
  return {
    hasRenderer: !!s.foregroundRenderer,
    groups: s.foregroundRenderer?.groups?.map((g) => g.depth) ?? [],
    playerDepth: s.playerVisual?.depth,
    liaisonDepth: s.liaison?.depth,
  };
});
console.log('2 renderer:', JSON.stringify(info));

// 强制可探索状态，便于摆放人物
await page.evaluate(() => {
  window.prologueState.mode = 'explore';
  window.prologueState.playerLocked = false;
});

// A：人物站到西南屋顶套索条带内（y=780 < 判定线 816），应被前景遮住
await page.evaluate(() => window.ch01Sc03Game.player.setPosition(400, 780));
await sleep(500);
const behindA = await page.evaluate(() => ({
  playerDepth: window.ch01Sc03Game.playerVisual.depth,
  playerY: Math.round(window.ch01Sc03Game.player.y),
}));
await page.screenshot({ path: out + 'sc03_occlusion_sw.png' });
console.log('3 SW strip (400,780):', JSON.stringify(behindA), '→ sc03_occlusion_sw.png');

// B：人物站到大门口套索条带内（y=780 < 判定线 820），应被前景遮住
await page.evaluate(() => window.ch01Sc03Game.player.setPosition(1000, 780));
await sleep(500);
const behindB = await page.evaluate(() => ({
  playerDepth: window.ch01Sc03Game.playerVisual.depth,
  playerY: Math.round(window.ch01Sc03Game.player.y),
}));
await page.screenshot({ path: out + 'sc03_occlusion_gate.png' });
console.log('4 gate strip (1000,780):', JSON.stringify(behindB), '→ sc03_occlusion_gate.png');

// C：对照——空旷院子中央（不在任何多边形内），人物应完整可见
await page.evaluate(() => window.ch01Sc03Game.player.setPosition(836, 600));
await sleep(500);
await page.screenshot({ path: out + 'sc03_occlusion_open.png' });
console.log('5 open yard (836,600) → sc03_occlusion_open.png');

const fgDepths = info.groups;
const depthOk = fgDepths.length > 0
  && behindA.playerDepth < 1316.001   // 低于西南前景组深度
  && behindB.playerDepth < 1320.001;  // 低于大门前景组深度
console.log('6 depth order ok:', depthOk);
console.log('SC03 OCCLUSION', info.hasRenderer && fgDepths.length > 0 && depthOk ? 'PASS' : 'FAIL');

await browser.close();
