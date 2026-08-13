import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const port = process.env.E2E_PORT || "5175";
const outputDir = resolve("artifacts", "modern-player-qa");
mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
	if (
		message.type() === "error" &&
		!message.text().includes("Failed to load resource")
	) {
		errors.push(`console: ${message.text()}`);
	}
});
page.on("response", (response) => {
	if (response.status() >= 400)
		errors.push(`${response.status()} ${response.url()}`);
});

try {
	await page.goto(`http://127.0.0.1:${port}/`);
	await page.waitForFunction(() => window.titleScene, null, {
		timeout: 15_000,
	});
	await page.mouse.click(301, 641);
	await page.waitForSelector(".intro-panel button");
	await page.click(".intro-panel button");
	await page.waitForTimeout(400);
	await page.click(".intro-panel button");
	await page.waitForFunction(() => window.scene01Game?.playerVisual, null, {
		timeout: 15_000,
	});
	await page.keyboard.press("e");
	await page.waitForTimeout(300);

	const report = await page.evaluate(() => {
		const scene = window.scene01Game;
		const directions = ["down", "left", "right", "up"];
		const textures = Object.fromEntries(
			directions.map((direction) => {
				const frames = Array.from({ length: 8 }, (_, index) => {
					const key = `modern-player-${direction}-${index}`;
					const source = scene.textures.get(key).getSourceImage();
					return { key, width: source.width, height: source.height };
				});
				return [direction, frames];
			}),
		);
		const studentA = scene.studentA;
		const studentB = scene.studentB;
		scene.player.setPosition(
			(studentA.x + studentB.x) / 2,
			studentA.y + 12,
		);
		scene.syncPlayerVisual("down", false);
		return {
			textures,
			player: {
				width: scene.playerVisual.displayWidth,
				height: scene.playerVisual.displayHeight,
			},
			npcs: [
				{
					width: studentA.displayWidth,
					height: studentA.displayHeight,
				},
				{
					width: studentB.displayWidth,
					height: studentB.displayHeight,
				},
			],
		};
	});

	for (const [direction, frames] of Object.entries(report.textures)) {
		if (
			frames.length !== 8 ||
			frames.some((frame) => frame.height !== 720)
		) {
			throw new Error(
				`${direction} does not contain eight valid 720px frames`,
			);
		}
		await page.evaluate((nextDirection) => {
			const scene = window.scene01Game;
			scene.syncPlayerVisual(nextDirection, true);
		}, direction);
		await page.waitForTimeout(300);
		await page.screenshot({
			path: resolve(outputDir, `scene01-${direction}.png`),
		});
	}

	if (Math.round(report.player.height) !== 160) {
		throw new Error(
			`player height is ${report.player.height}, expected 160`,
		);
	}
	const averageNpcHeight =
		report.npcs.reduce((sum, npc) => sum + npc.height, 0) /
		report.npcs.length;
	if (
		Math.abs(averageNpcHeight - report.player.height) / averageNpcHeight >
		0.2
	) {
		throw new Error(
			`player/NPC height mismatch: ${JSON.stringify(report)}`,
		);
	}
	if (errors.length) throw new Error(errors.join("\n"));

	console.log(JSON.stringify(report, null, 2));
	console.log(`screenshots: ${outputDir}`);
} finally {
	await browser.close();
}
