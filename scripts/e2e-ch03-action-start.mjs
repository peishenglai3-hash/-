import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5185";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch03\\";
mkdirSync(output, { recursive: true });

async function waitFor(page, predicate, timeout = 20000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function advanceUntil(page, predicate, max = 48) {
	for (let i = 0; i < max; i += 1) {
		if (await page.evaluate(predicate)) return;
		await page.keyboard.press("Space");
		await page.waitForTimeout(70);
	}
	throw new Error("action narrative did not reach expected state");
}

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (message.type() === "error")
		errors.push(`console.error: ${message.text()}`);
});

try {
	await page.goto(`${base}/?chapter=3`, { waitUntil: "networkidle" });
	await waitFor(
		page,
		() => !!window.ch03OpeningGame && !!window.prologueState,
	);
	await page.keyboard.press("E");
	await waitFor(page, () => !!window.ch03TuCompoundGame);

	// Put the scene at the post-flashback checkpoint without bypassing the
	// production scene code that owns the action transition.
	await page.evaluate(() => {
		const state = window.prologueState;
		state.risk.identity = 0;
		state.risk.execution = 0;
		state.risk.coordination = 0;
		state.flags.add("CH03_RISK_PRECHECK_COMPLETE");
		state.flags.add("CH03_TASK_FORWARD_SUPPORT");
		state.flags.add("CH03_FLASHBACK3_COMPLETE");
		state.mode = "action_ready";
		window.ch03TuCompoundGame.restoreCompletedRiskPrecheck();
	});
	await waitFor(page, () => window.prologueState.mode === "action_ready");
	await page.keyboard.press("E");
	await page.keyboard.press("E");
	await waitFor(
		page,
		() => window.ch03TuCompoundGame.compoundState === "STATE_GATE_CLOSED",
		25000,
	);
	await waitFor(page, () =>
		window.prologueState.flags.has("CH03_ACTION_START_STARTED"),
	);

	await advanceUntil(page, () => !!document.querySelector(".choice-panel"), 48);

	const actionScene = await page.evaluate(() => ({
		state: window.ch03TuCompoundGame.compoundState,
		choices: [...document.querySelectorAll(".choice")].map((button) => ({
			text: button.textContent ?? "",
			disabled: button.disabled,
		})),
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
		emberEmitter: Boolean(window.ch03TuCompoundGame.fireEmbers),
		fireGlow: Boolean(window.ch03TuCompoundGame.fireGlow),
	}));
	await page.screenshot({ path: `${output}ch03-action-fire-choice.png` });
	if (
		actionScene.state !== "STATE_GATE_CLOSED" ||
		actionScene.choices.length !== 4 ||
		actionScene.choices.some((choice) => choice.disabled) ||
		!actionScene.bgmPlaying ||
		!actionScene.bgmLoop ||
		actionScene.emberEmitter ||
		actionScene.fireGlow
	)
		throw new Error(
			`action scene contract mismatch: ${JSON.stringify(actionScene)}`,
		);

	await page.locator(".choice").nth(0).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	const result = await page.evaluate(() => ({
		imageWidth:
			document.querySelector(".result-panel img")?.naturalWidth ?? 0,
		imageHeight:
			document.querySelector(".result-panel img")?.naturalHeight ?? 0,
		hint: document.querySelector(".result-copy small")?.textContent ?? "",
		mode: window.prologueState.mode,
		risk: { ...window.prologueState.risk },
		profile: { ...window.prologueState.profile },
	}));
	await page.screenshot({ path: `${output}ch03-action-result-A.png` });
	if (
		result.imageWidth !== 1536 ||
		result.imageHeight !== 1024 ||
		!result.hint.includes("Space") ||
		result.mode !== "result" ||
		result.risk.execution !== 0 ||
		result.profile.C !== 2 ||
		result.profile.P !== 1
	)
		throw new Error(
			`action result contract mismatch: ${JSON.stringify(result)}`,
		);

	await page.keyboard.press("Space");
	await advanceUntil(
		page,
		() => window.prologueState.flags.has("CH03_ACTION_OBSERVE_COMPLETE"),
		20,
	);
	const completed = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		state: window.ch03TuCompoundGame.compoundState,
		task: document.querySelector(".task-card")?.textContent ?? "",
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
	}));
	if (
		completed.mode !== "gate_attack_ready" ||
		!completed.task.includes("大门受阻") ||
		!completed.bgmPlaying ||
		!completed.bgmLoop
	)
		throw new Error(
			`action completion contract mismatch: ${JSON.stringify(completed)}`,
		);

	await page.keyboard.press("E");
	await page.keyboard.press("E");
	await waitFor(
		page,
		() => window.ch03TuCompoundGame.compoundState === "STATE_GATE_ATTACK",
		25000,
	);
	await waitFor(
		page,
		() => window.prologueState.flags.has("CH03_GATE_ATTACK_STARTED"),
		25000,
	);
	await advanceUntil(
		page,
		() => window.prologueState.flags.has("CH03_GATE_ATTACK_FIRE_STARTED"),
		64,
	);
	await waitFor(
		page,
		() => window.ch03TuCompoundGame.compoundState === "STATE_FIRE_STARTED",
		25000,
	);
	await advanceUntil(page, () => !!document.querySelector(".choice-panel"), 48);

	const fireScene = await page.evaluate(() => ({
		state: window.ch03TuCompoundGame.compoundState,
		choices: [...document.querySelectorAll(".choice")].map((button) => ({
			text: button.textContent ?? "",
			disabled: button.disabled,
		})),
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
		emberEmitter: Boolean(window.ch03TuCompoundGame.fireEmbers),
		smokeEmitter: Boolean(window.ch03TuCompoundGame.fireSmoke),
		fireGlow: Boolean(window.ch03TuCompoundGame.fireGlow),
	}));
	await page.screenshot({ path: `${output}ch03-gate-attack-fire-choice.png` });
	if (
		fireScene.state !== "STATE_FIRE_STARTED" ||
		fireScene.choices.length !== 4 ||
		fireScene.choices.some((choice) => choice.disabled) ||
		!fireScene.bgmPlaying ||
		!fireScene.bgmLoop ||
		!fireScene.emberEmitter ||
		!fireScene.smokeEmitter ||
		!fireScene.fireGlow
	)
		throw new Error(`gate attack/fire contract mismatch: ${JSON.stringify(fireScene)}`);

	await page.locator(".choice").nth(0).click();
	await waitFor(page, () => !!document.querySelector(".result-panel"));
	const gateResult = await page.evaluate(() => ({
		imageWidth: document.querySelector(".result-panel img")?.naturalWidth ?? 0,
		imageHeight: document.querySelector(".result-panel img")?.naturalHeight ?? 0,
		hint: document.querySelector(".result-copy small")?.textContent ?? "",
		mode: window.prologueState.mode,
		risk: { ...window.prologueState.risk },
		profile: { ...window.prologueState.profile },
	}));
	await page.screenshot({ path: `${output}ch03-gate-entry-result-A.png` });
	if (
		gateResult.imageWidth !== 1672 ||
		gateResult.imageHeight !== 941 ||
		!gateResult.hint.includes("Space") ||
		gateResult.mode !== "result" ||
		gateResult.risk.execution !== 0 ||
		gateResult.risk.coordination !== 0 ||
		gateResult.profile.D !== 1 ||
		gateResult.profile.G !== 3
	)
		throw new Error(`gate entry result contract mismatch: ${JSON.stringify(gateResult)}`);

	await page.keyboard.press("Space");
	await advanceUntil(
		page,
		() => window.prologueState.flags.has("CH03_GATE_ENTRY_COMPLETE"),
		20,
	);
	const gateCompleted = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		state: window.ch03TuCompoundGame.compoundState,
		task: document.querySelector(".task-card")?.textContent ?? "",
		bgmPlaying: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03TuCompoundGame.chapter3Bgm?.loop),
	}));
	if (
		gateCompleted.mode !== "gate_attack_complete" ||
		!gateCompleted.task.includes("交互三") ||
		!gateCompleted.bgmPlaying ||
		!gateCompleted.bgmLoop
	)
		throw new Error(`gate entry completion mismatch: ${JSON.stringify(gateCompleted)}`);

	await page.keyboard.press("E");
	await page.keyboard.press("E");
	await waitFor(page, () => !!window.ch03GateBreachCombatGame, 12000);
	await advanceUntil(page, () => !!document.querySelector(".combat-hud"), 35);
	const combatEntry = await page.evaluate(() => ({
		phase: window.ch03GateBreachCombatGame.phase,
		mode: window.prologueState.mode,
		objective: document.querySelector(".combat-objective strong")?.textContent ?? "",
		bgmPlaying: Boolean(window.ch03GateBreachCombatGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03GateBreachCombatGame.chapter3Bgm?.loop),
	}));
	if (
		combatEntry.phase !== "capture" ||
		combatEntry.mode !== "combat" ||
		!combatEntry.objective.includes("俘虏") ||
		!combatEntry.bgmPlaying ||
		!combatEntry.bgmLoop
	)
		throw new Error(`combat entry mismatch: ${JSON.stringify(combatEntry)}`);
	if (errors.length) throw new Error(errors.join("\n"));

	console.log(
		JSON.stringify(
			{
				actionScene,
				result,
				completed,
				fireScene,
				gateResult,
				gateCompleted,
				combatEntry,
				screenshots: output,
				status: "CHAPTER3 ACTION START E2E PASS",
			},
			null,
			2,
		),
	);
} finally {
	await context.close();
	await browser.close();
}
