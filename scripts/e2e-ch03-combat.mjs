import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const port = process.env.E2E_PORT || "5185";
const base = `http://127.0.0.1:${port}`;
const output = "C:\\Users\\35636\\AppData\\Local\\Temp\\honghu_e2e_ch03\\";
mkdirSync(output, { recursive: true });

async function waitFor(page, predicate, timeout = 15000) {
	await page.waitForFunction(predicate, null, { timeout });
}

async function advanceNarrative(page, max = 30) {
	for (let i = 0; i < max; i += 1) {
		if (await page.evaluate(() => !window.prologueState.inNarrative)) return;
		await page.keyboard.press("Space");
		await page.waitForTimeout(55);
	}
	throw new Error("combat narrative did not finish");
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
	await page.goto(`${base}/?chapter=3&combat=1`, { waitUntil: "networkidle" });
	await waitFor(page, () => !!window.ch03GateBreachCombatGame && !!window.prologueState);
	await advanceNarrative(page);
	await waitFor(page, () => document.querySelector(".combat-hud"));
	const intro = await page.evaluate(() => ({
		phase: window.ch03GateBreachCombatGame.phase,
		mode: window.prologueState.mode,
		bgmPlaying: Boolean(window.ch03GateBreachCombatGame.chapter3Bgm?.isPlaying),
		bgmLoop: Boolean(window.ch03GateBreachCombatGame.chapter3Bgm?.loop),
		objective: document.querySelector(".combat-objective strong")?.textContent ?? "",
		weapon: document.querySelector(".combat-weapon strong")?.textContent ?? "",
	}));
	await page.screenshot({ path: `${output}ch03-gate-breach-combat-start.png` });
	if (
		intro.phase !== "capture" ||
		intro.mode !== "combat" ||
		!intro.bgmPlaying ||
		!intro.bgmLoop ||
		!intro.objective.includes("俘虏")
	)
		throw new Error(`combat start contract mismatch: ${JSON.stringify(intro)}`);
	const shot = await page.evaluate(() => {
		const game = window.ch03GateBreachCombatGame;
		const target = game.enemies[0];
		// 董云庭是实时协同单位，可能在断言前已命中同一目标；
		// 射击 smoke 先固定目标初始状态，避免把协同行为竞态误报成玩家武器故障。
		target.state = "active";
		target.hp = target.maxHp;
		target.sprite.x = game.player.x + 120;
		target.sprite.y = game.player.y;
		const before = target.hp;
		game.lastAim.set(1, 0);
		game.shoot();
		return { before, ammoAfter: game.weaponAmmo[game.weapon] };
	});
	await page.waitForTimeout(160);
	const shotResult = await page.evaluate(() => ({
		targetHp: window.ch03GateBreachCombatGame.enemies[0].hp,
		projectiles: window.ch03GateBreachCombatGame.projectiles.length,
	}));
	if (shotResult.targetHp >= shot.before || shot.ammoAfter > 11)
		throw new Error(`combat shooting contract mismatch: ${JSON.stringify({ shot, shotResult })}`);

	// 用场景公开的战斗运行时做确定性 smoke：把三个已击晕目标放到玩家附近，
	// 仍通过 E 完成真实的俘虏入口，不绕过战斗状态机。
	await page.evaluate(() => {
		const game = window.ch03GateBreachCombatGame;
		for (const [index, enemy] of game.enemies.slice(0, 3).entries()) {
			enemy.state = "stunned";
			enemy.hp = 0;
			enemy.sprite.x = game.player.x + 34 + index * 8;
			enemy.sprite.y = game.player.y;
			game.drawEnemyMarker(enemy);
		}
	});
	for (let i = 0; i < 3; i += 1) {
		await page.keyboard.press("e");
		await page.waitForTimeout(80);
	}
	await advanceNarrative(page);
	await waitFor(page, () => window.ch03GateBreachCombatGame.phase === "pursuit");
	const pursuit = await page.evaluate(() => ({
		phase: window.ch03GateBreachCombatGame.phase,
		captured: window.ch03GateBreachCombatGame.captured,
		objective: document.querySelector(".combat-objective strong")?.textContent ?? "",
		flags: [...window.prologueState.flags].filter((flag) => flag.startsWith("CH03_GATE_BREACH")),
	}));
	await page.screenshot({ path: `${output}ch03-gate-breach-combat-pursuit.png` });
	if (pursuit.phase !== "pursuit" || pursuit.captured !== 3 || !pursuit.objective.includes("董云庭"))
		throw new Error(`combat pursuit contract mismatch: ${JSON.stringify(pursuit)}`);

	// 让董云庭路径立即完成，再验证正式完成标记和任务卡。
	await page.evaluate(() => {
		const game = window.ch03GateBreachCombatGame;
		game.pursuitIndex = game.pursuitPath.length;
		game.dongYunting.x = game.player.x;
		game.dongYunting.y = game.player.y;
	});
	await page.waitForTimeout(120);
	await page.evaluate(() => window.ch03GateBreachCombatGame.completePursuit());
	await advanceNarrative(page);
	await waitFor(page, () => window.prologueState.flags.has("CH03_GATE_BREACH_COMPLETE"));
	const complete = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		phase: window.ch03GateBreachCombatGame.phase,
		task: document.querySelector(".task-card")?.textContent ?? "",
		combatHudVisible: Boolean(document.querySelector(".combat-hud")),
		profile: { ...window.prologueState.profile },
		risk: { ...window.prologueState.risk },
	}));
	if (complete.phase !== "complete" || !complete.task.includes("大门撞开") || complete.combatHudVisible)
		throw new Error(`combat completion contract mismatch: ${JSON.stringify(complete)}`);
	// The historical node loads a user-provided video asset before exposing its
	// runtime handle. Keep this wait separate from the combat completion wait so
	// a slower local video decode does not look like a gameplay failure.
	await waitFor(page, () => !!window.ch03HistoricalNodeGame, 30000);
	const historical = await page.evaluate(() => ({
		mode: window.prologueState.mode,
		videoReady: Boolean(window.ch03HistoricalNodeGame.videoOverlay),
		videoFinished: window.ch03HistoricalNodeGame.videoFinished,
	}));
	await page.screenshot({ path: `${output}ch03-historical-node.png` });
	if (historical.mode !== "transition" || !historical.videoReady || historical.videoFinished)
		throw new Error(`historical node contract mismatch: ${JSON.stringify(historical)}`);
	await page.keyboard.press("Space");
	await waitFor(page, () => window.ch03TuCompoundGame?.compoundState === "STATE_AFTER_BATTLE", 30000);
	const afterBattle = await page.evaluate(() => ({
		state: window.ch03TuCompoundGame.compoundState,
		npcCount: window.ch03TuCompoundGame.npcActors.length,
		fixedSeen: window.prologueState.flags.has("CH03_HISTORICAL_NODE_SEEN"),
	}));
	if (afterBattle.state !== "STATE_AFTER_BATTLE" || afterBattle.npcCount !== 5 || !afterBattle.fixedSeen)
		throw new Error(`after-battle route contract mismatch: ${JSON.stringify(afterBattle)}`);
	if (errors.length) throw new Error(errors.join("\n"));

	console.log(JSON.stringify({ intro, pursuit, complete, historical, afterBattle, screenshots: output, status: "CHAPTER3 GATE BREACH COMBAT E2E PASS" }, null, 2));
} finally {
	await context.close();
	await browser.close();
}
