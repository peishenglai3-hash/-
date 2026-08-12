import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = 'C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e\\';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const PORT = process.env.E2E_PORT || '5176';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://127.0.0.1:' + PORT + '/');
await page.waitForFunction(() => window.titleScene, null, { timeout: 15000 });
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
    choice: null, choiceTag: null, echo: null, tags: [],
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

await page.keyboard.press('e');
await sleep(500);
await page.keyboard.press('Space');
await sleep(500);

for (let i = 0; i < 40; i++) {
  const done = await page.evaluate(() => !window.prologueState.inNarrative && window.prologueState.mode === 'explore');
  if (done) break;
  await page.keyboard.press('Space');
  await sleep(220);
}
// Close task card (two-stage: center→corner→dismiss)
await page.keyboard.press('e');
await sleep(300);
if (await page.evaluate(() => window.prologueState?.taskOpen)) {
  await page.keyboard.press('e');
  await sleep(400);
}
console.log('2 mode =', await page.evaluate(() => window.prologueState?.mode));

// Hold a direction key for a given duration (ms). Speed ~220px/s → ~13px per 60ms
async function holdMove(key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(20);
}

// Walk to target using a simple approach: hold the dominant direction until close
async function walkTo(targetX, targetY, maxMs = 12000) {
  const start = Date.now();
  let stuckCount = 0;
  let lastPos = null;

  while (Date.now() - start < maxMs) {
    const pos = await page.evaluate(() => ({
      x: Math.round(window.ch01Sc01Game.player.x),
      y: Math.round(window.ch01Sc01Game.player.y),
    }));

    const dx = targetX - pos.x;
    const dy = targetY - pos.y;
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return pos;

    // Stuck detection
    if (lastPos && Math.abs(pos.x - lastPos.x) < 2 && Math.abs(pos.y - lastPos.y) < 2) {
      stuckCount++;
      if (stuckCount > 5) {
        // Try perpendicular nudge
        if (Math.abs(dx) > Math.abs(dy)) {
          await holdMove(dy >= 0 ? 'ArrowDown' : 'ArrowUp', 150);
        } else {
          await holdMove(dx >= 0 ? 'ArrowRight' : 'ArrowLeft', 150);
        }
        stuckCount = 0;
      }
    } else {
      stuckCount = 0;
    }
    lastPos = pos;

    // Move in dominant axis with longer holds for efficiency
    const holdTime = 120;
    if (Math.abs(dx) > Math.abs(dy)) {
      await holdMove(dx > 0 ? 'ArrowRight' : 'ArrowLeft', holdTime);
    } else {
      await holdMove(dy > 0 ? 'ArrowDown' : 'ArrowUp', holdTime);
    }
  }
  return await page.evaluate(() => ({
    x: Math.round(window.ch01Sc01Game.player.x),
    y: Math.round(window.ch01Sc01Game.player.y),
  }));
}

const spawn = await page.evaluate(() => ({
  x: Math.round(window.ch01Sc01Game.player.x),
  y: Math.round(window.ch01Sc01Game.player.y),
}));
console.log('3 spawn at', spawn);

// Waypoints: navigate around stool (x:896-960,y:800-864) and up through
// the gap between main_table (right edge x=1184) and desk area (left edge x=1272).
// Use x=1210 to stay clear of chair_child (now at x:1272-1320).
const waypoints_desk = [
  { x: 780, y: 910 },
  { x: 1100, y: 910 },
  { x: 1210, y: 910 },
  { x: 1210, y: 736 },
  { x: 1300, y: 736 },
];

console.log('  Walking to desk area...');
for (const wp of waypoints_desk) {
  const reached = await walkTo(wp.x, wp.y);
  console.log(`  -> (${wp.x},${wp.y}) => (${reached.x},${reached.y})`);
}

const nearInk = await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none');
console.log('4 nearby desk:', nearInk);
await page.screenshot({ path: out + 'walk_desk.png' });

// Walk right to book area
const posBook = await walkTo(1380, 736);
console.log('  book approach:', posBook);
const nearBook = await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none');
console.log('5 nearby book:', nearBook);

// Walk to gown: return to corridor, go right below door rects, then up
const waypoints_gown = [
  { x: 1210, y: 736 },
  { x: 1210, y: 460 },
  { x: 1350, y: 460 },
  { x: 1470, y: 460 },
  { x: 1470, y: 260 },
];

console.log('  Walking to gown area...');
for (const wp of waypoints_gown) {
  const reached = await walkTo(wp.x, wp.y);
  console.log(`  -> (${wp.x},${wp.y}) => (${reached.x},${reached.y})`);
}

const nearGown = await page.evaluate(() => window.ch01Sc01Game.nearby()?.id || 'none');
console.log('6 nearby gown:', nearGown);
await page.screenshot({ path: out + 'walk_gown.png' });

const inkOk = nearInk === 'inkstone_paper' || nearInk === 'book';
const bookOk = nearBook === 'book' || nearBook === 'inkstone_paper';
const gownOk = nearGown === 'outer_gown';

console.log('');
console.log('=== WALK TEST RESULTS ===');
console.log('ink area:', inkOk, '(got:', nearInk, ')');
console.log('book area:', bookOk, '(got:', nearBook, ')');
console.log('gown area:', gownOk, '(got:', nearGown, ')');

if (inkOk && bookOk && gownOk) {
  console.log('WALK TEST PASS');
} else {
  console.log('WALK TEST FAIL');
}

await browser.close();
process.exit(inkOk && bookOk && gownOk ? 0 : 1);
