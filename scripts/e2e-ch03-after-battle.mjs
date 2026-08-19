import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5185";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch03\\";
mkdirSync(output, { recursive: true });

async function waitFor(page, predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function advanceNarrative(page, max = 40) {
	for (let i = 0; i < max; i += 1) {
		if (await page.evaluate(() => !window.prologueState.inNarrative)) return;
		await page.keyboard.press("Space");
		await page.waitForTimeout(55);
	}
	throw new Error("narrative did not finish");
}

async function closeTaskAndInteract(page) {
	await page.keyboard.press("e");
	await page.waitForTimeout(60);
	await page.keyboard.press("e");
	await waitFor(page, () => !window.prologueState.taskOpen);
	await page.keyboard.press("e");
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
	await page.goto(`${base}/?chapter=3&ch3state=STATE_AFTER_BATTLE`, { waitUntil: "networkidle" });
	await waitFor(page, () => !!window.ch03TuCompoundGame && !!window.prologueState);
	await waitFor(page, () => window.ch03TuCompoundGame.compoundState === "STATE_AFTER_BATTLE");
	const scene = await page.evaluate(() => ({
		state: window.ch03TuCompoundGame.compoundState,
		npcCount: window.ch03TuCompoundGame.npcActors.length,
		spawn: [window.ch03TuCompoundGame.player.x, window.ch03TuCompoundGame.player.y],
		mode: window.prologueState.mode,
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
	}));
	await page.screenshot({ path: `${output}ch03-after-battle-scene.png` });
	if (scene.state !== "STATE_AFTER_BATTLE" || scene.npcCount !== 5 || scene.mode !== "explore" || !scene.bgmPlaying || !scene.bgmLoop)
		throw new Error(`after-battle scene contract mismatch: ${JSON.stringify(scene)}`);

	// 交互四：选择 C，确认进入战后清点。
	await closeTaskAndInteract(page);
	await waitFor(page, () => !!document.querySelector(".choice-panel"));
	const choices = await page.locator(".choice").count();
	if (choices !== 4) throw new Error(`after-battle choices mismatch: ${choices}`);

	await page.locator(".choice").nth(2).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	const resultImage = await page.locator(".result-panel img").getAttribute("src");
	await page.screenshot({ path: `${output}ch03-after-battle-choice-c.png` });
	if (!resultImage?.includes("branch07-C.png")) throw new Error(`branch07 image mismatch: ${resultImage}`);

	await page.keyboard.press("Space");
	await page.waitForTimeout(90);
	await advanceNarrative(page);
	await waitFor(page, () => window.ch03TuCompoundGame.afterBattlePhase === "clearing_ready");
	const afterInteraction4 = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		profile: { ...window.prologueState.profile },
		risk: { ...window.prologueState.risk },
		flags: [...window.prologueState.flags].filter((flag) => flag.startsWith("CH03_AFTER_BATTLE")),
	}));
	if (afterInteraction4.profile.C !== 2 || afterInteraction4.profile.P !== 2 || afterInteraction4.risk.execution !== 0)
		throw new Error(`after-battle system contract mismatch: ${JSON.stringify(afterInteraction4)}`);

	// 交互五：选择 A，确认 branch08 图片、画像和清点完成后进入月饼节点。
	await closeTaskAndInteract(page);
	await advanceNarrative(page);
	await waitFor(page, () => !!document.querySelector(".choice-panel"));
	await page.locator(".choice").nth(0).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	const clearingResultImage = await page.locator(".result-panel img").getAttribute("src");
	await page.screenshot({ path: `${output}ch03-clearing-choice-a.png` });
	if (!clearingResultImage?.includes("branch08-A.png")) throw new Error(`branch08 image mismatch: ${clearingResultImage}`);
	await page.keyboard.press("Space");
	await page.waitForTimeout(90);
	await advanceNarrative(page);
	await waitFor(page, () => window.ch03TuCompoundGame.afterBattlePhase === "moon_cake_ready");

	// 交互六：选择 B，确认 branch09 图片、月饼物件状态与最终画像结果。
	await closeTaskAndInteract(page);
	await advanceNarrative(page);
	await waitFor(page, () => !!document.querySelector(".choice-panel"));
	await page.locator(".choice").nth(1).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	const mooncakeResultImage = await page.locator(".result-panel img").getAttribute("src");
	await page.screenshot({ path: `${output}ch03-mooncake-choice-b.png` });
	if (!mooncakeResultImage?.includes("branch09-B.png")) throw new Error(`branch09 image mismatch: ${mooncakeResultImage}`);
	await page.keyboard.press("Space");
	await page.waitForTimeout(90);
	await advanceNarrative(page);
	await waitFor(page, () => window.prologueState.flags.has("CH03_MOONCAKE_COMPLETE"));
	const complete = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		phase: window.ch03TuCompoundGame.afterBattlePhase,
		profile: { ...window.prologueState.profile },
		risk: { ...window.prologueState.risk },
		mooncake: window.prologueState.propStates.mooncake,
		flags: [...window.prologueState.flags].filter((flag) => flag.startsWith("CH03_") || flag.startsWith("MOONCAKE_")),
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
	}));
	if (
		complete.mode !== "explore" ||
		complete.phase !== "chapter_end_ready" ||
		complete.profile.C !== 4 ||
		complete.profile.P !== 4 ||
		complete.profile.G !== 3 ||
		complete.profile.A !== 1 ||
		complete.risk.execution !== 0 ||
		complete.risk.coordination !== 0 ||
		complete.mooncake !== "MOONCAKE_GROUP" ||
		!complete.bgmPlaying ||
		!complete.bgmLoop
	)
		throw new Error(`aftermath system contract mismatch: ${JSON.stringify(complete)}`);

	// 章末收束：行动结束叙事 → 章末视频，验证视频源画幅完整 contain。
	await closeTaskAndInteract(page);
	await advanceNarrative(page);
	await waitFor(page, () => !!window.ch03ChapterEndGame, 30000);
	await waitFor(page, () => {
		const video = window.ch03ChapterEndGame?.videoOverlay?.video;
		return !!video?.videoWidth && video.readyState >= 2;
	}, 30000);
	const chapterEndVideo = await page.evaluate(() => ({
		width: window.ch03ChapterEndGame.videoOverlay.video.videoWidth,
		height: window.ch03ChapterEndGame.videoOverlay.video.videoHeight,
		displayWidth: window.ch03ChapterEndGame.videoOverlay.displayWidth,
		displayHeight: window.ch03ChapterEndGame.videoOverlay.displayHeight,
	}));
	await page.screenshot({ path: `${output}ch03-chapter-end-video.png` });
	const videoAspect = chapterEndVideo.width / chapterEndVideo.height;
	if (
		chapterEndVideo.width < 1200 ||
		chapterEndVideo.height < 680 ||
		chapterEndVideo.displayWidth > 1281 ||
		chapterEndVideo.displayHeight > 721 ||
		Math.abs(chapterEndVideo.displayWidth / chapterEndVideo.displayHeight - videoAspect) > 0.01
	)
		throw new Error(`chapter-end video sizing failed: ${JSON.stringify(chapterEndVideo)}`);
	await page.keyboard.press("e");
	await waitFor(page, () => !!document.querySelector(".end-panel"));
	const chapterEnd = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		complete: window.prologueState.flags.has("CH03_CHAPTER_END_COMPLETE"),
		sceneId: JSON.parse(window.localStorage.getItem("redcode.save.auto") || "null")?.sceneId,
	}));
	if (chapterEnd.mode !== "end" || !chapterEnd.complete || chapterEnd.sceneId !== "CH03_END")
		throw new Error(`chapter-end completion mismatch: ${JSON.stringify(chapterEnd)}`);
	if (errors.length) throw new Error(errors.join("\n"));

	console.log(JSON.stringify({ scene, choices, resultImage, clearingResultImage, mooncakeResultImage, afterInteraction4, complete, chapterEndVideo, chapterEnd, screenshots: output, status: "CHAPTER3 AFTERMATH + END E2E PASS" }, null, 2));
} finally {
	await context.close();
	await browser.close();
}
