import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5184";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch03\\";
mkdirSync(output, { recursive: true });

async function waitFor(page, predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function advanceUntil(page, predicate, max = 34) {
	for (let i = 0; i < max; i += 1) {
		if (await page.evaluate(predicate)) return;
		await page.keyboard.press("Space");
		await page.waitForTimeout(70);
	}
	throw new Error("narrative did not reach expected state");
}

async function enterObservation(page, risk) {
	await page.goto(`${base}/?chapter=3`, { waitUntil: "networkidle" });
	await waitFor(
		page,
		() => !!window.prologueState && !!window.ch03OpeningGame,
	);
	await waitFor(page, () => {
		const video = window.ch03OpeningGame?.videoOverlay?.video;
		return !!video?.videoWidth && video.readyState >= 2;
	});
	await page.evaluate(
		(value) => Object.assign(window.prologueState.risk, value),
		risk,
	);
	// 给视频纹理和场景切换留出一个稳定帧，避免首个 E 与页面初始化竞争。
	await page.waitForTimeout(800);
	await page.keyboard.press("E");
	await waitFor(page, () => !!window.ch03TuCompoundGame);
	await advanceUntil(page, () => !!document.querySelector(".info-screen"));
	await page.locator(".info-card button").click();
	await advanceUntil(page, () =>
		window.prologueState.flags.has("CH03_RISK_PRECHECK_COMPLETE"),
	);
	await waitFor(
		page,
		() => window.prologueState.mode === "explore" && !window.prologueState.inNarrative,
	);
	await page.keyboard.press("E");
	await page.waitForTimeout(120);
	await page.keyboard.press("E");
	await waitFor(page, () => !!document.querySelector(".choice-panel"));
}

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
	if (message.type() === "error") errors.push(message.text());
});

try {
	await enterObservation(page, {
		identity: 0,
		execution: 0,
		coordination: 0,
	});
	const choiceState = await page.evaluate(() => ({
		buttons: [...document.querySelectorAll(".choice")].map((button) => ({
			text: button.textContent ?? "",
			disabled: button.disabled,
		})),
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
	}));
	if (
		choiceState.buttons.length !== 4 ||
		choiceState.buttons.some((button) => button.disabled)
	) {
		throw new Error(
			`forward observation choice availability mismatch: ${JSON.stringify(choiceState)}`,
		);
	}
	if (!choiceState.bgmPlaying || !choiceState.bgmLoop)
		throw new Error(
			`chapter 3 BGM is not looping: ${JSON.stringify(choiceState)}`,
		);
	await page.screenshot({ path: `${output}ch03-observation-choices.png` });

	await page.locator(".choice").nth(0).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	const result = await page.evaluate(() => ({
		imageWidth:
			document.querySelector(".result-panel img")?.naturalWidth ?? 0,
		imageHeight:
			document.querySelector(".result-panel img")?.naturalHeight ?? 0,
		hint: document.querySelector(".result-copy small")?.textContent ?? "",
		mode: window.prologueState.mode,
		risk: window.prologueState.risk,
		flags: [...window.prologueState.flags].filter(
			(flag) =>
				flag.startsWith("CH03_OBSERVATION") || flag === "GATE_OBSERVED",
		),
	}));
	await page.screenshot({ path: `${output}ch03-observation-result-A.png` });
	if (result.imageWidth !== 1672 || result.imageHeight !== 941) {
		throw new Error(
			`observation result image dimensions mismatch: ${JSON.stringify(result)}`,
		);
	}
	if (!result.hint.includes("Space") || result.mode !== "result") {
		throw new Error(
			`observation result exit contract mismatch: ${JSON.stringify(result)}`,
		);
	}

	await page.keyboard.press("Space");
	await waitFor(page, () => !!document.querySelector(".dialogue-panel"));
	for (let i = 0; i < 28; i += 1) {
		if (
			await page.evaluate(() =>
				window.prologueState.flags.has("CH03_OBSERVATION_COMPLETE"),
			)
		)
			break;
		await page.keyboard.press("Space");
		await page.waitForTimeout(70);
	}
	await waitFor(page, () =>
		window.prologueState.flags.has("CH03_OBSERVATION_COMPLETE"),
	);
	const completed = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		profile: window.prologueState.profile,
		risk: window.prologueState.risk,
		flags: [...window.prologueState.flags].filter(
			(flag) =>
				flag === "CH03_OBSERVATION_A" ||
				flag === "CH03_OBSERVATION_COMPLETE",
		),
	}));
	if (completed.profile.C !== 3 || completed.risk.execution !== 0) {
		throw new Error(
			`observation A effects mismatch: ${JSON.stringify(completed)}`,
		);
	}

	const rearContext = await browser.newContext({
		viewport: { width: 1280, height: 720 },
	});
	const rearPage = await rearContext.newPage();
	await enterObservation(rearPage, {
		identity: 0,
		execution: 5,
		coordination: 0,
	});
	const rearChoices = await rearPage.evaluate(() =>
		[...document.querySelectorAll(".choice")].map(
			(button) => button.disabled,
		),
	);
	if (rearChoices.length !== 4 || rearChoices[2] !== true) {
		throw new Error(
			`rear observation C lock mismatch: ${JSON.stringify(rearChoices)}`,
		);
	}
	await rearContext.close();

	if (errors.length) throw new Error(errors.join("\n"));
	console.log(
		JSON.stringify(
			{
				choiceState,
				result,
				completed,
				rearChoices,
				screenshots: output,
				status: "CHAPTER3 OBSERVATION E2E PASS",
			},
			null,
			2,
		),
	);
} finally {
	await context.close();
	await browser.close();
}
