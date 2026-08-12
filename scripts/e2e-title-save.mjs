// e2e-title-save.mjs — 初始界面 + 本地存档系统专项验收（2026-08-12）
// 覆盖：标题渲染/热区/设置/读档空态/标题BGM、新游戏自动存档、固定检查点内容、
//       失败回退 API、刷新后读档直达第一章（不重玩序章）
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e\\';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5175';
const fail = (msg) => { console.error('FAIL', msg); process.exit(1); };
const ok = (msg) => console.log('PASS', msg);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://127.0.0.1:' + PORT + '/');
await page.waitForFunction(() => window.titleScene, null, { timeout: 15000 });
await sleep(800);
await page.screenshot({ path: out + 'ts_01_title.png' });
ok('1 标题界面渲染');

// 标题 BGM 元素存在且循环
const bgmMeta = await page.evaluate(() => {
  const a = window.titleScene?.titleBgm;
  return a ? { loop: a.loop, src: a.src } : null;
});
if (!bgmMeta || !bgmMeta.loop || !bgmMeta.src.includes('title_bgm')) fail('标题 BGM 未挂载');
ok('2 标题 BGM 已挂载（loop）');

// 设置面板
await page.mouse.click(736, 641);
await page.waitForSelector('.title-settings-panel');
await page.screenshot({ path: out + 'ts_02_settings.png' });
await page.click('.title-settings-panel .back');
await sleep(300);
ok('3 设置面板开合');

// 读档空态
await page.mouse.click(516, 641);
await page.waitForSelector('.title-load-panel');
const emptyText = await page.evaluate(() => document.querySelector('.title-load-panel').textContent);
if (!emptyText.includes('暂无本地存档')) fail('读档空态文案缺失');
await page.screenshot({ path: out + 'ts_03_load_empty.png' });
await page.click('.title-load-panel .back');
await sleep(300);
ok('4 读档空态');

// 点击交互后标题 BGM 应已起播（自动播放限制解除）
const bgmPlaying = await page.evaluate(() => !window.titleScene.titleBgm.paused);
if (!bgmPlaying) fail('标题 BGM 未起播');
ok('5 标题 BGM 起播');

// 创建新游戏 → 自动存档 PROLOGUE_SC01
await page.mouse.click(301, 641);
await page.waitForSelector('.intro-panel button');
const auto1 = await page.evaluate(() => JSON.parse(localStorage.getItem('redcode.save.auto') || 'null'));
if (!auto1 || auto1.sceneId !== 'PROLOGUE_SC01' || auto1.kind !== 'auto') fail('新游戏自动存档缺失');
ok('6 新游戏自动存档 PROLOGUE_SC01');

// 进入序章（跳过开场视频）
await page.click('.intro-panel button');
await sleep(500);
await page.click('.intro-panel button');
await sleep(800);

// 标题 BGM 应停止
const titleStopped = await page.evaluate(() => window.titleScene.titleBgm.paused);
if (!titleStopped) fail('进入游戏后标题 BGM 未停止');
ok('7 进入游玩后标题 BGM 停止');

// 模拟序章完成跳转第一章（注入含 PRO-Q01 标签的结算事件）
await page.evaluate(() => {
  const save = {
    checkpoint: 'CH01_SC01_CHEN_HOME_WAKE',
    checkpointLabel: '1927年，陈继南家中醒来',
    profile: { D: 1, C: 0, I: 0, G: 1, P: 0, A: 1 },
    choice: 'PRO_Q01_A',
    choiceTag: 'FLAG_PRO_NAME_CHECKED',
    echo: 'test',
    tags: ['FLAG_PRO_NAME_CHECKED', 'PRO_Q01_COMPLETED'],
    fixed: ['PROLOGUE_COMPLETED', 'TIME_TRAVEL_CHECKPOINT'],
    risk: { identity: 0, execution: 0, coordination: 0 },
    exit: { nextSceneCanonical: 'CH01_SC01_CHEN_HOME_WAKE' },
  };
  window.dispatchEvent(new CustomEvent('prologue:scene-exit', { detail: save }));
});
await page.waitForFunction(() => window.ch01Sc01Game, null, { timeout: 15000 });
// 场景整体呈现 = 开场视频 + 入场叙述走完 → beginExplore 写固定存档
await sleep(1200);
await page.keyboard.press('e'); // 跳过开场视频
await sleep(500);
for (let i = 0; i < 40; i += 1) {
  const m = await page.evaluate(() => window.prologueState.mode);
  if (m === 'explore') break;
  await page.keyboard.press('Space');
  await sleep(250);
}
await sleep(600);

// 自动存档已切到 CH01_SC01
const auto2 = await page.evaluate(() => JSON.parse(localStorage.getItem('redcode.save.auto') || 'null'));
if (!auto2 || auto2.sceneId !== 'CH01_SC01') fail('场景切换自动存档未更新');
ok('8 场景切换自动存档 → CH01_SC01');

// 固定检查点内容严格按任务单
const fixed = await page.evaluate(() => JSON.parse(localStorage.getItem('redcode.save.fixed') || 'null'));
if (!fixed || fixed.kind !== 'fixed') fail('固定存档缺失');
if (fixed.risk.identity !== 0 || fixed.risk.execution !== 0 || fixed.risk.coordination !== 0) fail('固定存档风险未归0');
if (!fixed.fixed.includes('PROLOGUE_COMPLETED') || !fixed.fixed.includes('TIME_TRAVEL_CHECKPOINT')) fail('固定标签缺失');
if (!fixed.tags.includes('FLAG_PRO_NAME_CHECKED')) fail('PRO-Q01 引用标签未保留');
if (fixed.tags.some((t) => t.startsWith('CH01'))) fail('固定存档混入 CH01 旗标');
if (fixed.profile.D !== 1 || fixed.profile.A !== 1) fail('序章画像累计未保留');
ok('9 固定检查点内容合规（风险000/双固定标签/序章画像与标签）');

// 失败回退：污染运行时状态后回退
await page.evaluate(() => {
  window.prologueState.flags.add('CH01_TEST_POLLUTION');
  window.prologueState.risk.identity = 3;
  window.prologueState.profile.D = 9;
});
const rolled = await page.evaluate(() => window.rollbackToCheckpoint());
await sleep(1500);
const after = await page.evaluate(() => ({
  polluted: window.prologueState.flags.has('CH01_TEST_POLLUTION'),
  risk: window.prologueState.risk.identity,
  D: window.prologueState.profile.D,
  prologueKept: window.prologueState.flags.has('FLAG_PRO_NAME_CHECKED'),
  ch01Running: !!window.ch01Sc01Game,
}));
if (!rolled) fail('rollbackToCheckpoint 返回 false');
if (after.polluted) fail('回退后仍含 CH01 污染旗标');
if (after.risk !== 0) fail('回退后风险未归0');
if (after.D !== 1) fail('回退后画像未恢复存档态');
if (!after.prologueKept) fail('回退后序章标签丢失');
if (!after.ch01Running) fail('回退后第一章未重启');
ok('10 失败回退链路合规（不重玩序章/画像恢复/风险归0）');

// 刷新 → 标题 → 读档直达第一章
await page.goto('http://127.0.0.1:' + PORT + '/');
await page.waitForFunction(() => window.titleScene, null, { timeout: 15000 });
await sleep(600);
await page.mouse.click(516, 641);
await page.waitForSelector('.title-load-panel .slot');
const slotCount = await page.evaluate(() => document.querySelectorAll('.title-load-panel .slot').length);
if (slotCount < 2) fail(`读档列表槽位不足（${slotCount}）`);
await page.screenshot({ path: out + 'ts_04_load_slots.png' });
await page.click('.title-load-panel .slot'); // 固定检查点排在首位
await page.waitForFunction(() => window.ch01Sc01Game, null, { timeout: 15000 });
const loaded = await page.evaluate(() => ({
  flags: window.prologueState.flags.has('PROLOGUE_COMPLETED'),
  introHidden: !window.prologueState.flags.has('CH01_TEST_POLLUTION'),
}));
if (!loaded.flags) fail('读档后固定标签未恢复');
ok('11 刷新后读档直达第一章（不重玩序章）');
await page.screenshot({ path: out + 'ts_05_loaded_ch01.png' });

await browser.close();
console.log('TITLE+SAVE E2E PASS');
