import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const writableFiles = new Set([
  "public/data/scene01_manifest.json",
  "public/data/PRO02_logic.json",
  "public/data/PRO02_interactions.json",
  "public/data/ch01_sc01_chen_home_wake_manifest.json",
]);

function zoneEditorApi() {
  return {
    name: "zone-editor-api",
    configureServer(server) {
      server.middlewares.use("/__dev/save-zones", (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          return response.end("POST required");
        }
        let body = "";
        request.on("data", (chunk) => { body += chunk; });
        request.on("end", async () => {
          try {
            const { file, data } = JSON.parse(body);
            if (!writableFiles.has(file)) throw new Error("File is not writable");
            await writeFile(resolve(process.cwd(), file), `${JSON.stringify(data, null, 2)}\n`, "utf8");
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ ok: true }));
          } catch (error) {
            response.statusCode = 400;
            response.end(error instanceof Error ? error.message : "Unknown error");
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
