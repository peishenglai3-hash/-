/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 08:10:50
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 09:14:28
 * @FilePath: /github_honghu_game/vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig, loadEnv, type ViteDevServer, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const writableFiles = new Set([
	"public/data/scene01_manifest.json",
	"public/data/PRO02_logic.json",
	"public/data/PRO02_interactions.json",
	"public/data/ch01_sc01_chen_home_wake_manifest.json",
	"public/data/ch01_sc02_flashback_petition_manifest.json",
	"public/data/ch01_sc03_yard_manifest.json",
]);

function zoneEditorApi(): Plugin {
	return {
		name: "zone-editor-api",
		configureServer(server) {
			server.middlewares.use("/__dev/save-zones", (request, response) => {
				if (request.method !== "POST") {
					response.statusCode = 405;
					return response.end("POST required");
				}
				let body = "";
				request.on("data", (chunk) => {
					body += chunk.toString("utf8");
				});
				request.on("end", async () => {
					try {
						const { file, data } = JSON.parse(body);
						if (!writableFiles.has(file))
							throw new Error("File is not writable");
						await writeFile(
							resolve(process.cwd(), file),
							`${JSON.stringify(data, null, 2)}\n`,
							"utf8",
						);
						response.setHeader("content-type", "application/json");
						response.end(JSON.stringify({ ok: true }));
					} catch (error) {
						response.statusCode = 400;
						response.end(
							error instanceof Error
								? error.message
								: "Unknown error",
						);
					}
				});
			});
		},
	};
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [vue(), zoneEditorApi()],
		base: env.VITE_BASE || "/",
		resolve: {
			alias: {
				"@": resolve(__dirname, "src"),
			},
		},
		server: {
			port: 5175,
		},
	};
});
