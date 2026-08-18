import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5183";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch03\\";
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

await page.goto(`${base}/?chapter=3`, { waitUntil: "networkidle" });
await waitFor(() => !!window.gameDirector && !!window.ch03OpeningGame);
await page.waitForResponse(
	(response) => response.url().includes("ch03_arrival.mp4") && response.status() === 200,
	{ timeout: 5000 },
).catch(() => {});
await waitFor(
	() => {
		const video = window.ch03OpeningGame?.videoOverlay?.video;
		return !!video?.videoWidth && video.readyState >= 2;
	},
	15000,
);

const video = await page.evaluate(() => ({
	width: window.ch03OpeningGame.videoOverlay.video.videoWidth,
	height: window.ch03OpeningGame.videoOverlay.video.videoHeight,
	displayWidth: window.ch03OpeningGame.videoOverlay.displayWidth,
	displayHeight: window.ch03OpeningGame.videoOverlay.displayHeight,
}));
await page.screenshot({ path: `${output}ch03-opening-video.png` });

const sourceAspect = video.width / video.height;
if (Math.abs(sourceAspect - 16 / 9) > 0.01) {
	throw new Error(`unexpected chapter 3 video aspect ratio: ${JSON.stringify(video)}`);
}
if (video.displayWidth < 1200 || video.displayHeight < 680) {
	throw new Error(`chapter 3 video contain sizing failed: ${JSON.stringify(video)}`);
}

await page.keyboard.press("E");
await waitFor(() => !!window.ch03TuCompoundGame, 10000);
await waitFor(() => window.ch03TuCompoundGame.compoundState === "STATE_WAITING");
const map = await page.evaluate(() => {
	const scene = window.ch03TuCompoundGame;
	const layerKeys = Object.values(scene.definition.layerKeys);
	return {
		state: scene.compoundState,
		mapId: scene.mapDocument.map_id,
		canvas: scene.mapDocument.canvas,
		spawnCount: scene.mapDocument.spawns.length,
		collisionCount: scene.mapDocument.collision.length,
		layersLoaded: layerKeys.every((key) => window.game.textures.exists(key)),
		task: document.querySelector(".task-card")?.textContent ?? "",
	};
});
await page.screenshot({ path: `${output}ch03-tu-compound-waiting.png` });

if (!map.layersLoaded) throw new Error(`chapter 3 map layers missing: ${JSON.stringify(map)}`);
if (map.canvas.width !== 1664 || map.canvas.height !== 936) {
	throw new Error(`chapter 3 map canvas mismatch: ${JSON.stringify(map)}`);
}
if (errors.length) throw new Error(errors.join("\n"));

console.log(JSON.stringify({ video, map, screenshots: output, status: "CHAPTER3 OPENING E2E PASS" }, null, 2));
await browser.close();
