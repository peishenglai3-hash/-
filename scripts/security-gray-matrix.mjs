import { chromium } from "playwright";

const grayBaseUrl = process.env.GRAY_BASE_URL || "http://127.0.0.1:5190/";
const devApiUrl = process.env.SECURITY_DEV_URL;

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function checkDevApi() {
	if (!devApiUrl) return null;
	const endpoint = new URL("/__dev/save-zones", devApiUrl).toString();
	const request = async (init) => (await fetch(endpoint, init)).status;
	const results = {
		get: await request({ method: "GET" }),
		contentType: await request({
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "{}",
		}),
		badFile: await request({
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ file: "../../outside.json", data: {} }),
		}),
		badOrigin: await request({
			method: "POST",
			headers: { "content-type": "application/json", origin: "http://evil.example" },
			body: JSON.stringify({ file: "public/data/scene01_manifest.json", data: {} }),
		}),
		overSized: await request({
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ file: "public/data/scene01_manifest.json", data: { padding: "x".repeat(270000) } }),
		}),
	};
	assert(results.get === 405, `dev API GET expected 405, got ${results.get}`);
	assert(results.contentType === 415, `dev API content type expected 415, got ${results.contentType}`);
	assert(results.badFile === 400, `dev API bad file expected 400, got ${results.badFile}`);
	assert(results.badOrigin === 403, `dev API bad origin expected 403, got ${results.badOrigin}`);
	assert(results.overSized === 413, `dev API oversized body expected 413, got ${results.overSized}`);
	return results;
}

async function checkProductionMatrix() {
	const browser = await chromium.launch({ headless: true });
	const matrix = [
		{ name: "desktop", viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
		{ name: "high-dpi", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 },
		{ name: "mobile", viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
	];
	const results = [];
	try {
		for (const target of matrix) {
			const context = await browser.newContext(target);
			const page = await context.newPage();
			const pageErrors = [];
			const consoleErrors = [];
			const failedRequests = [];
			page.on("pageerror", (error) => pageErrors.push(error.message));
			page.on("console", (message) => {
				if (message.type() === "error") consoleErrors.push(message.text());
			});
			page.on("requestfailed", (request) => failedRequests.push(request.url()));

			await page.goto(`${grayBaseUrl}?chapter=3&combat=1`, {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			});
			await page.waitForSelector("#game canvas", { timeout: 30000 });
			await page.evaluate(() => {
				localStorage.setItem("redcode.settings", JSON.stringify({
					bgmVolume: 999999,
					sfxVolume: -999999,
					textSpeed: "invalid",
					extra: "ignored",
				}));
			});
			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForSelector("#game canvas", { timeout: 30000 });
			await page.evaluate(() => window.dispatchEvent(new CustomEvent("honghu:dev-add-task")));
			await page.waitForTimeout(250);
			const state = await page.evaluate(() => ({
				canvas: Boolean(document.querySelector("#game canvas")),
				devGlobals: ["gameDirector", "prologueState", "scene01Game"].filter((key) => key in window),
				gameGlobalIsDomOnly: !("game" in window) || window.game instanceof HTMLElement,
				editor: Boolean(document.querySelector(".dev-zone-editor")),
				tasks: document.querySelectorAll(".task-card").length,
			}));
			assert(state.canvas, `${target.name}: canvas missing`);
			assert(state.devGlobals.length === 0, `${target.name}: production debug globals exposed: ${state.devGlobals.join(",")}`);
			assert(state.gameGlobalIsDomOnly, `${target.name}: Phaser instance exposed as window.game`);
			assert(!state.editor, `${target.name}: production zone editor mounted`);
			assert(state.tasks === 0, `${target.name}: development task event remained active`);
			assert(pageErrors.length === 0, `${target.name}: page errors: ${pageErrors.join(" | ")}`);
			assert(consoleErrors.length === 0, `${target.name}: console errors: ${consoleErrors.join(" | ")}`);
			results.push({ ...target, state, failedRequests: failedRequests.length });
			await context.close();
		}
	} finally {
		await browser.close();
	}
	return results;
}

const devApi = await checkDevApi();
const production = await checkProductionMatrix();
console.log(JSON.stringify({ devApi, production, status: "SECURITY GRAY MATRIX PASS" }, null, 2));
