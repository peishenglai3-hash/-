import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5185";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch03\\";
mkdirSync(output, { recursive: true });

async function waitFor(page, predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function advanceUntil(page, predicate, max = 40) {
	for (let i = 0; i < max; i += 1) {
		if (await page.evaluate(predicate)) return;
		await page.keyboard.press("Space");
		await page.waitForTimeout(70);
	}
	throw new Error("narrative did not reach expected state");
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
});

try {
	await page.goto(`${base}/?chapter=3`, { waitUntil: "networkidle" });
	await waitFor(page, () => !!window.ch03OpeningGame && !!window.prologueState);
	await page.keyboard.press("E");
	await waitFor(page, () => !!window.ch03TuCompoundGame);

	await advanceUntil(page, () => !!document.querySelector(".info-screen"));
	await page.locator(".info-card button").click();
	await advanceUntil(page, () => window.prologueState.flags.has("CH03_RISK_PRECHECK_COMPLETE"));
	await page.keyboard.press("E");
	await page.keyboard.press("E");
	await waitFor(page, () => !!document.querySelector(".choice-panel"));

	await page.locator(".choice").nth(0).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	await page.keyboard.press("Space");
	await waitFor(page, () => !!document.querySelector(".dialogue-panel"));
	await advanceUntil(page, () => window.prologueState.flags.has("CH03_OBSERVATION_COMPLETE"));

	const ready = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		task: document.querySelector(".task-card")?.textContent ?? "",
		profile: { ...window.prologueState.profile },
		risk: { ...window.prologueState.risk },
	}));
	if (ready.mode !== "flashback3_ready" || !ready.task.includes("闪回三"))
		throw new Error(`flashback 3 entry task mismatch: ${JSON.stringify(ready)}`);

	await page.keyboard.press("E");
	await page.keyboard.press("E");
	await waitFor(page, () => !!window.ch03Flashback3Game, 12000);
	await waitFor(
		page,
		() => {
			const video = window.ch03Flashback3Game?.videoOverlay?.video;
			return !!video?.videoWidth && video.readyState >= 2;
		},
		15000,
	);
	const video = await page.evaluate(() => ({
		width: window.ch03Flashback3Game.videoOverlay.video.videoWidth,
		height: window.ch03Flashback3Game.videoOverlay.video.videoHeight,
		displayWidth: window.ch03Flashback3Game.videoOverlay.displayWidth,
		displayHeight: window.ch03Flashback3Game.videoOverlay.displayHeight,
	}));
	await page.screenshot({ path: `${output}ch03-flashback3-video.png` });
	if (video.displayWidth < 1200 || video.displayHeight < 680)
		throw new Error(`flashback 3 contain sizing failed: ${JSON.stringify(video)}`);

	await page.keyboard.press("E");
	await waitFor(page, () => !!document.querySelector(".info-screen"));
	const situation = await page.evaluate(() => ({
		title: document.querySelector(".info-title")?.textContent ?? "",
		text: document.querySelector(".info-card")?.textContent ?? "",
	}));
	if (!situation.title.includes("当前处境") || !situation.text.includes("门内仍在吃喝"))
		throw new Error(`flashback 3 situation missing: ${JSON.stringify(situation)}`);
	await page.locator(".info-card button").click();
	await advanceUntil(page, () => !!document.querySelector(".choice-panel"));
	const choices = await page.evaluate(() => ({
		title: document.querySelector(".choice-title")?.textContent ?? "",
		labels: [...document.querySelectorAll(".choice")].map((button) => button.textContent ?? ""),
	}));
	if (choices.labels.length !== 4 || !choices.title.includes("站在门外时"))
		throw new Error(`flashback 3 choice contract mismatch: ${JSON.stringify(choices)}`);
	await page.screenshot({ path: `${output}ch03-flashback3-choices.png` });

	await page.locator(".choice").nth(0).click();
	await advanceUntil(page, () => window.prologueState.flags.has("CH03_FLASHBACK3_COMPLETE"), 35);
	await waitFor(page, () => !!window.ch03TuCompoundGame && window.prologueState.mode === "action_ready", 12000);
	const returned = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		task: document.querySelector(".task-card")?.textContent ?? "",
		profile: { ...window.prologueState.profile },
		risk: { ...window.prologueState.risk },
		flags: [...window.prologueState.flags].filter((flag) => flag.startsWith("CH03_FLASHBACK3")),
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
	}));
	await page.screenshot({ path: `${output}ch03-action-start-ready.png` });
	if (
		returned.mode !== "action_ready" ||
		!returned.task.includes("行动开始：三路同时展开") ||
		returned.profile.I !== 3 ||
		returned.profile.A !== 1 ||
		returned.risk.execution !== 0 ||
		!returned.bgmPlaying ||
		!returned.bgmLoop
	)
		throw new Error(`flashback 3 return contract mismatch: ${JSON.stringify(returned)}`);
	if (errors.length) throw new Error(errors.join("\n"));

	console.log(JSON.stringify({ video, situation, choices, ready, returned, screenshots: output, status: "CHAPTER3 FLASHBACK3 E2E PASS" }, null, 2));
} finally {
	await context.close();
	await browser.close();
}
