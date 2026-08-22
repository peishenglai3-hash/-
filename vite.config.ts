/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 08:10:50
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 09:14:28
 * @FilePath: /github_honghu_game/vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { defineConfig, loadEnv, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { IncomingMessage } from "node:http";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const writableFiles = new Set([
	"public/data/scene01_manifest.json",
	"public/data/PRO02_logic.json",
	"public/data/PRO02_interactions.json",
	"public/data/ch01_sc01_chen_home_wake_manifest.json",
	"public/data/ch01_sc02_flashback_petition_manifest.json",
	"public/data/ch01_sc03_yard_manifest.json",
	"public/data/ch02_ancestral_hall_main_objects.json",
	"public/data/ch02_ancestral_hall_mainhall_close_objects.json",
	"public/data/ch02_ancestral_hall_sidewall_objects.json",
]);

const MAX_ZONE_REQUEST_BYTES = 256 * 1024;

function isLoopbackAddress(address: string | undefined): boolean {
	return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function isAllowedOrigin(origin: string | undefined): boolean {
	if (!origin) return true;
	try {
		const url = new URL(origin);
		return url.protocol === "http:" && isLoopbackAddress(url.hostname);
	} catch {
		return false;
	}
}

function zoneEditorApi(): Plugin {
	return {
		name: "zone-editor-api",
		configureServer(server) {
			server.middlewares.use("/__dev/save-zones", (request, response) => {
				response.setHeader("cache-control", "no-store");
				response.setHeader("content-type", "application/json; charset=utf-8");
				if (!isLoopbackAddress(request.socket.remoteAddress) || !isAllowedOrigin(request.headers.origin)) {
					response.statusCode = 403;
					return response.end(JSON.stringify({ error: "Local development access required" }));
				}
				if (request.method !== "POST") {
					response.statusCode = 405;
					response.setHeader("allow", "POST");
					return response.end(JSON.stringify({ error: "POST required" }));
				}
				const contentType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
				if (contentType !== "application/json") {
					response.statusCode = 415;
					return response.end(JSON.stringify({ error: "application/json required" }));
				}
				let body = "";
				let bodyBytes = 0;
				let ended = false;
				request.on("data", (chunk) => {
					if (ended) return;
					bodyBytes += Buffer.byteLength(chunk);
					if (bodyBytes > MAX_ZONE_REQUEST_BYTES) {
						ended = true;
						response.statusCode = 413;
						response.end(JSON.stringify({ error: "Request body too large" }));
						request.destroy();
						return;
					}
					body += chunk.toString("utf8");
				});
				request.on("end", async () => {
					if (ended) return;
					try {
						const { file, data } = JSON.parse(body);
						if (typeof file !== "string" || !writableFiles.has(file))
							throw new Error("File is not writable");
						if (!data || typeof data !== "object")
							throw new Error("Zone data must be an object");
						await writeFile(
							resolve(process.cwd(), file),
							`${JSON.stringify(data, null, 2)}\n`,
							"utf8",
						);
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

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [vue(), ...(command === "serve" ? [zoneEditorApi()] : [])],
		base: env.VITE_BASE || "/",
		cacheDir: ".vite-cache",
		resolve: {
			alias: {
				"@": resolve(projectRoot, "src"),
			},
		},
		server: {
			port: 5175,
			host: "127.0.0.1",
		},
	};
});
