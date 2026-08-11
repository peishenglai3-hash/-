/** 资源路径辅助：自动拼接 Vite base 路径（tsx/node 等非 Vite 环境回退 "/"） */
const BASE = import.meta.env?.BASE_URL ?? "/";

export function assetPath(path: string): string {
	return BASE + path.replace(/^\//, "");
}
