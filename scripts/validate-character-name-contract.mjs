import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const runtimeRoots = ["src", "public"];
const legacyNames = ["董锦堂", "余老三", "彭国材"];
const canonicalNames = ["董云庭", "杜老三", "彭定邦"];
const textExtensions = new Set([".ts", ".js", ".vue", ".json", ".md"]);
const violations = [];
const seen = new Set();
let runtimeText = "";

async function walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			await walk(fullPath);
			continue;
		}
		if (!textExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) continue;
		const text = await readFile(fullPath, "utf8");
		runtimeText += `\n${text}`;
		for (const name of legacyNames) {
			if (text.includes(name)) violations.push(`${relative(root, fullPath)} contains legacy player-facing name ${name}`);
		}
		seen.add(fullPath);
	}
}

for (const dir of runtimeRoots) await walk(join(root, dir));
for (const name of canonicalNames) {
	if (!runtimeText.includes(name)) violations.push(`runtime name is missing: ${name}`);
}

if (violations.length) {
	for (const violation of violations) console.error(`FAIL ${violation}`);
	process.exit(1);
}

console.log(JSON.stringify({
	status: "CHARACTER NAME CONTRACT PASS",
	runtimeFilesChecked: seen.size,
	canonicalNames,
	legacyNamesExcludedFromRuntime: legacyNames,
}, null, 2));
