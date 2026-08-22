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
await waitFor(() => window.prologueState.flags.has("CH03_RISK_PRECHECK_STARTED"));
// The intro begins with one narration entry; skip its typewriter and move to
// the first group-leader line before checking the avatar contract.
await page.keyboard.press("Space");
await page.keyboard.press("Space");
await waitFor(() => document.querySelector(".dialogue-speaker")?.textContent?.includes("组长"));
const leaderDialogue = await page.evaluate(() => ({
	speaker: document.querySelector(".dialogue-speaker")?.textContent ?? "",
	avatar: window.useHudStore?.dialogue?.avatarSrc ?? null,
	avatarWidth: document.querySelector(".dialogue-avatar-wrap img")?.naturalWidth ?? 0,
}));
await page.screenshot({ path: `${output}ch03-risk-precheck-dialogue.png` });
if (!leaderDialogue.avatarWidth) throw new Error(`chapter 3 dialogue avatar missing: ${JSON.stringify(leaderDialogue)}`);

// Skip the typewriter and advance the short precheck intro.
for (let i = 0; i < 20; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(70);
	if (await page.locator(".info-screen").count()) break;
}
await waitFor(() => !!document.querySelector(".info-screen"));
const riskInfo = await page.evaluate(() => ({
	title: document.querySelector(".info-title")?.textContent ?? "",
	text: document.querySelector(".info-card")?.textContent ?? "",
}));
await page.screenshot({ path: `${output}ch03-risk-precheck-info.png` });
if (
	!riskInfo.title.includes("行动前重新安排") ||
	!riskInfo.text.includes("重新安排已经完成") ||
	/[身份执行协同]风险|安全等级|[+＋-－]\d/.test(riskInfo.text)
)
	throw new Error(`risk readout visibility contract mismatch: ${JSON.stringify(riskInfo)}`);
await page.locator(".info-card button").click();

for (let i = 0; i < 20; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(70);
	if (await page.evaluate(() => window.prologueState.flags.has("CH03_RISK_PRECHECK_COMPLETE"))) break;
}
await waitFor(() => window.prologueState.flags.has("CH03_RISK_PRECHECK_COMPLETE"));
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
		risk: window.prologueState.risk,
		taskPermission: window.prologueState.chapter3TaskPermission,
		flags: [...window.prologueState.flags].filter((flag) => flag.startsWith("CH03_")),
		task: document.querySelector(".task-card")?.textContent ?? "",
	};
});
await page.screenshot({ path: `${output}ch03-tu-compound-waiting.png` });

if (!map.layersLoaded) throw new Error(`chapter 3 map layers missing: ${JSON.stringify(map)}`);
if (map.canvas.width !== 1664 || map.canvas.height !== 936) {
	throw new Error(`chapter 3 map canvas mismatch: ${JSON.stringify(map)}`);
}
if (map.taskPermission !== "FORWARD_SUPPORT") {
	throw new Error(`chapter 3 low-risk permission mismatch: ${JSON.stringify(map)}`);
}
if (errors.length) throw new Error(errors.join("\n"));

console.log(JSON.stringify({ video, leaderDialogue, riskInfo, map, screenshots: output, status: "CHAPTER3 OPENING + RISK PRECHECK E2E PASS" }, null, 2));
await browser.close();
