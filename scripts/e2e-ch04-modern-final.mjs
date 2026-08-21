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
await page.addInitScript(() => {
	localStorage.clear();
	sessionStorage.clear();
});

async function waitFor(predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

await page.goto(`${base}/?chapter=4&ch4scene=modern-return`, { waitUntil: "networkidle" });
await waitFor(() => !!window.gameDirector && !!window.ch04ModernReturnGame);
await waitFor(() => window.prologueState.inNarrative);

const modern = await page.evaluate(() => ({
	baseLoaded: window.game.textures.exists("ch04_modern_return_base"),
	playerLoaded: window.game.textures.exists("ch04_modern_return_player"),
	playerLocked: window.prologueState.playerLocked,
	mode: window.prologueState.mode,
	bgmLoaded: !!window.ch04ModernReturnGame.bgm,
}));
await page.screenshot({ path: `${output}ch04-modern-return.png` });
if (!modern.baseLoaded || !modern.playerLoaded || !modern.playerLocked || modern.mode !== "narrative")
	throw new Error(`chapter 4 modern return contract failed: ${JSON.stringify(modern)}`);

for (let i = 0; i < 42; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(35);
}
await waitFor(() => window.prologueState.flags.has("CH04_SCENE3_COMPLETE"), 8000);
await waitFor(() => !!window.ch04FinalChoiceGame, 15000);
await waitFor(() => window.prologueState.inNarrative, 5000);

for (let i = 0; i < 20 && !(await page.locator(".choice-panel").count()); i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(40);
}
await waitFor(() => !!document.querySelector(".choice-panel"));
const choiceUi = await page.evaluate(() => ({
	title: document.querySelector(".choice-title")?.textContent ?? "",
	text: document.querySelector(".choice-panel")?.textContent ?? "",
	buttons: [...document.querySelectorAll(".choice")].map((button) => button.textContent?.trim()),
}));
await page.screenshot({ path: `${output}ch04-final-choice-panel.png` });
if (choiceUi.buttons.length !== 4 || !choiceUi.title.includes("怎样补完这句话？"))
	throw new Error(`FIN-Q01 choice panel mismatch: ${JSON.stringify(choiceUi)}`);
if (/[DCIGPA]\s*[+＋-－]\s*\d/.test(choiceUi.text) || /风险\s*[+＋-－]\s*\d/.test(choiceUi.text))
	throw new Error(`FIN-Q01 leaked backend effect in UI: ${JSON.stringify(choiceUi)}`);

await page.getByRole("button", { name: /在需要行动时作出决定/ }).click();
await waitFor(() => !!document.querySelector(".result-panel img"));
const firstResult = await page.evaluate(() => ({
	image: document.querySelector(".result-panel img")?.getAttribute("src") ?? "",
	text: document.querySelector(".result-copy")?.textContent ?? "",
	profile: window.prologueState.profile,
	risk: window.prologueState.risk,
}));
await page.screenshot({ path: `${output}ch04-final-choice-result-a01.png` });
if (!firstResult.image.includes("/assets/ch04/final-choice/A/01.png"))
	throw new Error(`FIN-Q01 first result page mismatch: ${JSON.stringify(firstResult)}`);
if (firstResult.profile.D !== 2 || firstResult.profile.P !== 1)
	throw new Error(`FIN-Q01 profile backend delta mismatch: ${JSON.stringify(firstResult)}`);
if (Object.values(firstResult.risk).some((value) => value !== 0))
	throw new Error(`FIN-Q01 changed risk unexpectedly: ${JSON.stringify(firstResult.risk)}`);

for (let i = 0; i < 8; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(40);
}
await waitFor(() => window.prologueState.flags.has("CH04_FINAL_CHOICE_COMPLETE"), 8000);
await waitFor(() => !!window.ch04AnswerWrittenGame, 8000);
for (let i = 0; i < 20; i += 1) {
	await page.keyboard.press("Space");
	await page.waitForTimeout(40);
}
await waitFor(() => window.prologueState.flags.has("CH04_SCENE5_COMPLETE"), 8000);
await waitFor(() => !!window.ch04Scene5VideoGame, 8000);
const transitionVideo = await page.evaluate(() => ({
	loaded: !!window.ch04Scene5VideoGame.videoOverlay,
	videoWidth: window.ch04Scene5VideoGame.videoOverlay?.video?.videoWidth ?? 0,
	videoHeight: window.ch04Scene5VideoGame.videoOverlay?.video?.videoHeight ?? 0,
}));
if (!transitionVideo.loaded) throw new Error(`scene 5 transition video not loaded: ${JSON.stringify(transitionVideo)}`);
await page.keyboard.press("Space");
await waitFor(() => !!window.ch04PortraitGame, 8000);
await waitFor(() => !!document.querySelector(".portrait-result"), 8000);
const portrait = await page.evaluate(() => ({
	code: document.querySelector(".portrait-name strong")?.textContent?.trim() ?? "",
	name: document.querySelector(".portrait-name h2")?.textContent?.trim() ?? "",
	poster: document.querySelector(".poster-frame img")?.getAttribute("src") ?? "",
	bgmLoaded: !!window.ch04PortraitGame.bgm,
	text: document.querySelector(".portrait-result")?.textContent ?? "",
	profile: window.prologueState.profile,
	risk: window.prologueState.risk,
}));
await page.screenshot({ path: `${output}ch04-portrait-result.png` });
if (portrait.code !== "DIP" || !portrait.poster.includes("/assets/ch04/final-posters/独胆守正.png") || !portrait.bgmLoaded)
	throw new Error(`final portrait mapping mismatch: ${JSON.stringify(portrait)}`);
if (Object.values(portrait.risk).some((value) => value !== 0))
	throw new Error(`final portrait changed risk unexpectedly: ${JSON.stringify(portrait.risk)}`);
const save = await page.evaluate(() => JSON.parse(window.localStorage.getItem("redcode.save.auto") || "null"));
if (save?.sceneId !== "CH04_PORTRAIT_RESULT")
	throw new Error(`chapter 4 portrait autosave missing: ${JSON.stringify(save)}`);
await page.keyboard.press("Escape");
await waitFor(() => window.game.scene.isActive("TitleScene"), 8000);
await waitFor(() => !document.querySelector(".portrait-result"), 4000);
if (errors.length) throw new Error(errors.join("\n"));

console.log(JSON.stringify({
	status: "CHAPTER4 SCENE3 + FIN-Q01 + SCENE5 + PORTRAIT E2E PASS",
	modern,
	choiceUi,
	firstResult,
	transitionVideo,
	portrait,
	save: { sceneId: save?.sceneId, checkpoint: save?.checkpoint },
	returnedToTitle: true,
	screenshots: output,
}, null, 2));
await browser.close();
