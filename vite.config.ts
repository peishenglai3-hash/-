import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [vue()],
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
