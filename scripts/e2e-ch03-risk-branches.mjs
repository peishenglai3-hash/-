import { chromium } from "playwright";

const port = process.env.E2E_PORT || "5184";
const base = `http://127.0.0.1:${port}`;
const cases = [
	{
		name: "low",
		risk: { identity: 0, execution: 0, coordination: 0 },
		expected: "FORWARD_SUPPORT",
	},
	{
		name: "execution",
		risk: { identity: 0, execution: 5, coordination: 0 },
		expected: "REAR_SUPPORT",
	},
	{
		name: "coordination",
		risk: { identity: 0, execution: 0, coordination: 7 },
		expected: "REAR_COORDINATION",
	},
	{
		name: "identity",
		risk: { identity: 4, execution: 0, coordination: 0 },
		expected: "ESCORTED_SUPPORT",
	},
	{
		name: "failure",
		risk: { identity: 6, execution: 0, coordination: 0 },
		expected: "WITHDRAWN",
	},
];

async function waitFor(page, predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function advanceUntil(page, predicate, max = 28) {
	for (let i = 0; i < max; i += 1) {
		if (await page.evaluate(predicate)) return;
		await page.keyboard.press("Space");
		await page.waitForTimeout(80);
	}
	throw new Error("narrative did not reach expected state");
}

const browser = await chromium.launch();
const results = [];
try {
	for (const testCase of cases) {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 720 },
		});
		const page = await context.newPage();
		const errors = [];
		page.on("pageerror", (error) => errors.push(error.message));
		try {
			// A video request can remain active for the whole opening scene. DOM
			// readiness plus the explicit video-ready wait is the reliable gate;
			// networkidle would make this five-case branch audit wait unnecessarily.
			await page.goto(`${base}/?chapter=3`, { waitUntil: "domcontentloaded" });
			await waitFor(
				page,
				() => !!window.prologueState && !!window.ch03OpeningGame,
			);
			await waitFor(page, () => {
				const video = window.ch03OpeningGame?.videoOverlay?.video;
				return !!video?.videoWidth && video.readyState >= 2;
			});
			await page.evaluate(
				(risk) => Object.assign(window.prologueState.risk, risk),
				testCase.risk,
			);
			await page.waitForTimeout(250);
			await page.keyboard.press("E");
			await waitFor(
				page,
				() =>
					!!window.ch03TuCompoundGame &&
					window.prologueState.flags.has("CH03_RISK_PRECHECK_STARTED"),
			);
			await advanceUntil(
				page,
				() => !!document.querySelector(".info-screen"),
			);
			await page.locator(".info-card button").click();
			await advanceUntil(page, () =>
				window.prologueState.flags.has("CH03_RISK_PRECHECK_COMPLETE"),
			);
			const state = await page.evaluate(() => ({
				permission: window.prologueState.chapter3TaskPermission,
				risk: window.prologueState.risk,
				flags: [...window.prologueState.flags].filter((flag) =>
					flag.startsWith("CH03_TASK_"),
				),
			}));
			if (state.permission !== testCase.expected)
				throw new Error(`${testCase.name}: ${JSON.stringify(state)}`);
			if (errors.length)
				throw new Error(`${testCase.name}: ${errors.join("\\n")}`);
			results.push({
				name: testCase.name,
				permission: state.permission,
				flags: state.flags,
			});
		} finally {
			await context.close();
		}
	}
	console.log(
		JSON.stringify(
			{ results, status: "CHAPTER3 RISK BRANCH E2E PASS" },
			null,
			2,
		),
	);
} finally {
	await browser.close();
}
