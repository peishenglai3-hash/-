import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// 验证区域编辑器：1) 缩小按钮只保留操作按钮 2) 切换选中/切换模式时自动保存 JSON
const out = join(tmpdir(), 'honghu_e2e') + '/';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5176';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });

let savePosts = 0;
page.on('request', (r) => { if (r.url().includes('/__dev/save-zones')) savePosts += 1; });

await page.goto('http://127.0.0.1:' + PORT + '/');
await page.waitForFunction(() => window.gameDirector, null, { timeout: 15000 });
await sleep(1000);

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
await sleep(1200);
await page.evaluate(() => {
  window.prologueState.mode = 'explore';
  window.prologueState.playerLocked = false;
});
console.log('1 scene ready');

// 打开编辑器
await page.keyboard.press('p');
await sleep(400);
const editorOpen = await page.evaluate(() => !!document.querySelector('.dev-zone-editor:not(.hidden)'));
console.log('2 editor open:', editorOpen);

const EDITOR = '.dev-zone-editor:not(.hidden)';

// 缩小：应只剩 标题栏 + 操作按钮
await page.click(EDITOR + ' [data-action="minimize"]');
await sleep(300);
const mini = await page.evaluate(() => {
  const p = document.querySelector('.dev-zone-editor:not(.hidden)');
  const shown = (sel) => {
    const el = p.querySelector(sel);
    return el ? getComputedStyle(el).display !== 'none' : false;
  };
  return {
    class: p.classList.contains('minimized'),
    tabs: shown('.dev-zone-tabs'),
    rect: shown('[data-section="rect"]'),
    help: shown('p[data-field="help"]'),
    status: shown('output[data-field="status"]'),
    actions: shown('.dev-zone-actions'),
  };
});
console.log('3 minimized state:', JSON.stringify(mini));
await page.screenshot({ path: out + 'editor_minimized.png' });

// 展开恢复
await page.click(EDITOR + ' [data-action="minimize"]');
await sleep(300);
const restored = await page.evaluate(() => {
  const p = document.querySelector('.dev-zone-editor:not(.hidden)');
  return {
    class: p.classList.contains('minimized'),
    tabs: getComputedStyle(p.querySelector('.dev-zone-tabs')).display !== 'none',
  };
});
console.log('4 restored state:', JSON.stringify(restored));
await page.screenshot({ path: out + 'editor_restored.png' });

// 自动保存：修改碰撞箱 X → 切换选中项 → 应触发 /__dev/save-zones
await page.evaluate(() => {
  const ed = window.ch01Sc03Game.zoneEditor;
  ed.select(ed.items[0]);
  const input = ed.panel.querySelector('[data-field="x"]');
  input.value = String(Number(input.value) + 1);
  input.dispatchEvent(new Event('change'));
});
await sleep(200);
const dirtyAfterEdit = await page.evaluate(() => window.ch01Sc03Game.zoneEditor.dirty);
const postsBefore = savePosts;
await page.evaluate(() => {
  const ed = window.ch01Sc03Game.zoneEditor;
  ed.itemSelect.value = '1';
  ed.itemSelect.dispatchEvent(new Event('change'));
});
await sleep(600);
const afterSwitch = await page.evaluate(() => ({
  dirty: window.ch01Sc03Game.zoneEditor.dirty,
  status: window.ch01Sc03Game.zoneEditor.status.textContent,
}));
console.log('5 dirty after edit:', dirtyAfterEdit, '| autosave posts:', savePosts - postsBefore, '| after switch:', JSON.stringify(afterSwitch));

// 自动保存：修改 → 切换标签页（交互区）→ 应再次触发保存
await page.evaluate(() => {
  const ed = window.ch01Sc03Game.zoneEditor;
  const input = ed.panel.querySelector('[data-field="x"]');
  input.value = String(Number(input.value) + 1);
  input.dispatchEvent(new Event('change'));
});
await sleep(200);
const postsBeforeTab = savePosts;
await page.click(EDITOR + ' [data-kind="interaction"]');
await sleep(600);
console.log('6 tab switch autosave posts:', savePosts - postsBeforeTab);

const miniOk = mini.class && !mini.tabs && !mini.rect && !mini.help && !mini.status && mini.actions;
const autosaveOk = dirtyAfterEdit === true && (savePosts - postsBefore) >= 1 && afterSwitch.dirty === false && (savePosts - postsBeforeTab) >= 1;
console.log('ZONE EDITOR', editorOpen && miniOk && restored.tabs && autosaveOk ? 'PASS' : 'FAIL');

await browser.close();
