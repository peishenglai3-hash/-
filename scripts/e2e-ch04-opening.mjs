import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5182";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch04\\";
mkdirSync(output, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
});

async function waitFor(predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

await page.goto(`${base}/?chapter=4`, { waitUntil: "networkidle" });
await waitFor(() => !!window.gameDirector && !!window.ch04OpeningGame);
await waitFor(
	() => {
		const video = window.ch04OpeningGame?.videoOverlay?.video;
		return !!video?.videoWidth && !!video?.videoHeight && video.readyState >= 2;
	},
	30000,
);

const video = await page.evaluate(() => ({
	width: window.ch04OpeningGame.videoOverlay.video.videoWidth,
	height: window.ch04OpeningGame.videoOverlay.video.videoHeight,
	displayWidth: window.ch04OpeningGame.videoOverlay.displayWidth,
	displayHeight: window.ch04OpeningGame.videoOverlay.displayHeight,
}));
await page.screenshot({ path: `${output}ch04-opening-video.png` });
const sourceAspect = video.width / video.height;
const displayAspect = video.displayWidth / video.displayHeight;
if (Math.abs(sourceAspect - displayAspect) > 0.01)
	throw new Error(`chapter 4 video aspect ratio changed: ${JSON.stringify(video)}`);
if (video.displayWidth > 1280.5 || video.displayHeight > 720.5 || video.displayHeight < 700)
	throw new Error(`chapter 4 video contain sizing failed: ${JSON.stringify(video)}`);

await page.keyboard.press("E");
await waitFor(() => !!window.ch04WangyeTempleGame, 15000);
await waitFor(() => window.ch04WangyeTempleGame.objectDocument?.map_id === "MAP_CH4_WANGYE_TEMPLE");
await waitFor(() => window.prologueState.inNarrative);

const map = await page.evaluate(() => {
	const scene = window.ch04WangyeTempleGame;
	const layerKeys = Object.values(scene.definition.layerKeys);
	return {
		shot: scene.shot,
		mapId: scene.objectDocument.map_id,
		canvas: scene.objectDocument.canvas,
		actorCount: scene.actors.length,
		layersLoaded: layerKeys.every((key) => window.game.textures.exists(key)),
		flagAlphaAtStart: scene.flagGraphic?.alpha ?? -1,
		speaker: document.querySelector(".dialogue-speaker")?.textContent ?? "",
		text: document.querySelector(".dialogue-text")?.textContent ?? "",
	};
});
await page.screenshot({ path: `${output}ch04-wangye-temple-start.png` });
if (!map.layersLoaded || map.canvas.width !== 1664 || map.canvas.height !== 936)
	throw new Error(`chapter 4 map mounting failed: ${JSON.stringify(map)}`);
if (map.actorCount < 15) throw new Error(`chapter 4 crowd runtime count too small: ${JSON.stringify(map)}`);

// Advance through the first 21 entries to verify the authored flag reveal event
// is tied to the narrative entry rather than a wall-clock timer.
for (let i = 0; i < 42; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(35);
}
const flag = await page.evaluate(() => ({
	alpha: window.ch04WangyeTempleGame.flagGraphic?.alpha ?? -1,
	flags: [...window.prologueState.flags].filter((flag) => flag.startsWith("CH04_")),
}));
await page.screenshot({ path: `${output}ch04-wangye-temple-flag.png` });
if (flag.alpha < 0.9) throw new Error(`chapter 4 flag reveal did not trigger: ${JSON.stringify(flag)}`);

for (let i = 0; i < 20; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(35);
}
await waitFor(() => window.prologueState.flags.has("CH04_SCENE1_COMPLETE"), 5000);
await waitFor(() => !!window.ch04ConsciousnessGame, 15000);
await waitFor(() => window.prologueState.inNarrative, 5000);
const consciousness = await page.evaluate(() => {
	const scene = window.ch04ConsciousnessGame;
	return {
		shot: scene.shot,
		actorCount: scene.actors.length,
		ghostCount: scene.instabilityGhosts.length,
		playerExists: !!scene.player,
		playerLocked: window.prologueState.playerLocked,
		mode: window.prologueState.mode,
		speaker: document.querySelector(".dialogue-speaker")?.textContent ?? "",
		text: document.querySelector(".dialogue-text")?.textContent ?? "",
	};
});
await page.screenshot({ path: `${output}ch04-consciousness-start.png` });
if (!consciousness.playerLocked || consciousness.playerExists || consciousness.ghostCount < 15)
	throw new Error(`chapter 4 consciousness fixed-scene contract failed: ${JSON.stringify(consciousness)}`);

// Scene 2 has 16 manual entries; each entry needs one key to finish typing and
// another to advance, so 40 presses also covers the final completion callback.
for (let i = 0; i < 40; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(35);
}
await waitFor(() => window.prologueState.flags.has("CH04_SC02_COMPLETE"), 7000);
await waitFor(() => !!window.ch04ModernReturnGame, 15000);
const save = await page.evaluate(() => JSON.parse(window.localStorage.getItem("redcode.save.auto") || "null"));
if (save?.sceneId !== "CH04_MODERN_RETURN")
	throw new Error(`chapter 4 modern-return autosave missing: ${JSON.stringify(save)}`);
if (errors.length) throw new Error(errors.join("\n"));

console.log(JSON.stringify({
	status: "CHAPTER4 OPENING + SCENE1 + SCENE2 + MODERN RETURN E2E PASS",
	video,
	map,
	flag,
	consciousness,
	modernReturn: await page.evaluate(() => ({
		baseLoaded: window.game.textures.exists("ch04_modern_return_base"),
		playerLoaded: window.game.textures.exists("ch04_modern_return_player"),
		playerLocked: window.prologueState.playerLocked,
	})),
	save: { sceneId: save?.sceneId, checkpoint: save?.checkpoint },
	screenshots: output,
}, null, 2));
await browser.close();
