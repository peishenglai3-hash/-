import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5176";
const base = `http://127.0.0.1:${port}`;
const output = ".tmp_e2e/ch02/";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}
async function state() {
	return page.evaluate(() => ({
		mode: window.prologueState.mode,
		inNarrative: window.prologueState.inNarrative,
		taskOpen: window.prologueState.taskOpen,
		flags: [...window.prologueState.flags],
		profile: { ...window.prologueState.profile },
		risk: { ...window.prologueState.risk },
	}));
}
async function activePhaserSounds() {
	return page.evaluate(() => window.game.sound.getAll()
		.filter((sound) => sound.isPlaying)
		.map((sound) => sound.key));
}
async function advanceNarrative(limit = 180) {
	for (let i = 0; i < limit; i += 1) {
		if (!(await state()).inNarrative) return;
		await page.keyboard.press("Space");
		await sleep(75);
	}
	throw new Error("narrative did not finish");
}
async function closeCurrentTask() {
	if ((await state()).taskOpen) {
		await page.keyboard.press("E");
		await sleep(180);
	}
}
async function moveToInteraction(id) {
	await page.evaluate((targetId) => {
		const scene = window.ch02AncestralHallGame;
		const target = scene.mapDocument.interactions.find((item) => item.id === targetId);
		if (!target) throw new Error(`interaction missing: ${targetId}`);
		const [x, y, width, height] = target.rect;
		scene.player.setPosition(x + width / 2, y + height / 2);
	}, id);
	await sleep(220);
}
async function interact(id) {
	await closeCurrentTask();
	await moveToInteraction(id);
	await page.keyboard.press("E");
	await sleep(450);
}
async function continueInfo() {
	await page.locator(".info-card button").click();
	await sleep(220);
}
async function choose(index) {
	await page.locator(".choice-panel .choice").nth(index).click();
	await sleep(250);
}

await page.goto(`${base}/?chapter=2`);
await waitFor(() => !!window.gameDirector && !!window.ch02TransitionGame);
await page.waitForResponse((response) => response.url().includes("ch02_to_ch03_transition.mp4") && response.status() === 200, { timeout: 5000 }).catch(() => {});

// 第二章入口视频只作试玩跳过；随后完整走完第二章三个正式选择节点。
await sleep(900);
await page.keyboard.press("E");
await waitFor(() => window.ch02AncestralHallGame?.entry === "arrival");
await advanceNarrative();
await interact("TRG_HALL_OBSERVE");
await waitFor(() => window.ch02AncestralHallGame?.entry === "deployment");
await waitFor(() => document.querySelector('.dialogue-avatar-wrap img[src*="ch02-group-leader"]')?.naturalWidth > 0);
await page.screenshot({ path: `${output}ch02-dialogue-avatar.png` });
await advanceNarrative();
await interact("TRG_DEPLOYMENT_MAP");
await waitFor(() => !!window.ch02FlashbackGame);
if ((await activePhaserSounds()).some((key) => key.startsWith("ch02_bgm_")))
	throw new Error(`chapter 2 BGM leaked into flashback video: ${JSON.stringify(await activePhaserSounds())}`);
await page.keyboard.press("E");
await page.waitForSelector(".info-screen");
await continueInfo();
await waitFor(() => document.querySelector('.dialogue-avatar-wrap img[src*="ch02-chen"]')?.naturalWidth > 0);
await advanceNarrative();
await choose(3);
await advanceNarrative();
await page.keyboard.press("E");
await sleep(180);
await page.keyboard.press("E");
await waitFor(() => window.ch02AncestralHallGame?.entry === "discipline" && window.ch02AncestralHallGame?.variant === "mainhall-close" && window.ch02AncestralHallGame?.mapDocument?.interactions?.some((item) => item.id === "TRG_GROUP_LEADER"));
await interact("TRG_DEPLOYMENT_MAP");
await advanceNarrative();
const disciplineMarkerVisible = await page.evaluate(() => !!window.ch02AncestralHallGame.interactionMarkers.GROUP_LEADER?.visible);
if (!disciplineMarkerVisible) throw new Error("discipline NPC interaction marker is not visible");
await closeCurrentTask();
await page.screenshot({ path: `${output}ch02-discipline-marker.png` });
await interact("TRG_GROUP_LEADER");
await advanceNarrative();
await page.waitForSelector(".info-screen");
await continueInfo();
await choose(1);
await advanceNarrative();
await page.keyboard.press("E");
await sleep(180);
await page.keyboard.press("E");
await waitFor(() => window.ch02AncestralHallGame?.entry === "materials" && window.ch02AncestralHallGame?.variant === "sidewall" && window.ch02AncestralHallGame?.mapDocument?.interactions?.some((item) => item.id === "TRG_MATERIALS_NPC"), 5000);
const materialsMarkerVisible = await page.evaluate(() => !!window.ch02AncestralHallGame.interactionMarkers.GROUP_LEADER?.visible);
if (!materialsMarkerVisible) throw new Error("materials NPC interaction marker is not visible");
await closeCurrentTask();
await page.screenshot({ path: `${output}ch02-materials-marker.png` });
await interact("TRG_MATERIALS_NPC");
const bgm = await page.evaluate(() => ({
	key: window.ch02AncestralHallGame.chapter2Bgm?.key ?? null,
	loop: window.ch02AncestralHallGame.chapter2Bgm?.loop ?? null,
	isPlaying: window.ch02AncestralHallGame.chapter2Bgm?.isPlaying ?? null,
}));
if (!bgm.loop || !bgm.isPlaying) throw new Error(`chapter 2 BGM did not start at the scene cue: ${JSON.stringify(bgm)}`);
await advanceNarrative();
await page.waitForSelector(".info-screen");
await continueInfo();
await choose(1);
await advanceNarrative();
await page.screenshot({ path: `${output}ch02-materials-complete.png` });
await page.keyboard.press("E");
await sleep(180);
await page.keyboard.press("E");
await waitFor(() => !!window.ch02DepartureGame, 5000);
if ((await activePhaserSounds()).length) throw new Error(`scene BGM leaked into departure video: ${JSON.stringify(await activePhaserSounds())}`);
await waitFor(() => {
	const video = window.ch02DepartureGame.videoOverlay;
	return !!video?.video?.videoWidth && video.video.readyState >= 3 && video.displayWidth >= 1200;
}, 15000);
const video = await page.evaluate(() => ({
	width: window.ch02DepartureGame.videoOverlay.video.videoWidth,
	height: window.ch02DepartureGame.videoOverlay.video.videoHeight,
	displayWidth: window.ch02DepartureGame.videoOverlay.displayWidth,
	displayHeight: window.ch02DepartureGame.videoOverlay.displayHeight,
}));
await page.screenshot({ path: `${output}ch02-departure-video.png` });
await sleep(900);
await page.keyboard.press("E");
await page.waitForSelector(".dialogue-panel");
await waitFor(() => (document.querySelector(".dialogue-text")?.textContent?.length ?? 0) > 0);
await page.screenshot({ path: `${output}ch02-departure-epilogue.png` });
await advanceNarrative();
await page.waitForSelector(".end-panel");
const finalText = await page.locator(".end-panel").textContent();

const finalState = await state();
if (!finalState.flags.includes("FLASHBACK_CONSCRIPTION_D")) throw new Error("flashback choice tag missing");
if (!finalState.flags.includes("SUPPLY_HANDLED")) throw new Error("supply handled tag missing");
if (video.width !== 1280 || video.height !== 720 || video.displayWidth < 1200 || video.displayHeight < 680)
	throw new Error(`departure video sizing failed: ${JSON.stringify(video)}`);
if (!finalText?.includes("第三章")) throw new Error("chapter 2 end panel missing third chapter handoff");
if (errors.length) throw new Error(errors.join("\n"));

console.log(JSON.stringify({
	entry: "chapter2-only",
	formalChoices: ["闪回二：抓壮丁", "接受小组安排", "协助准备物资"],
	bgm,
	video,
	finalState,
	screenshots: output,
	status: "CHAPTER2 E2E PASS",
}, null, 2));
await browser.close();
