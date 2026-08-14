<!--
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 08:10:50
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 16:00:18
 * @FilePath: /github_honghu_game/.agents/skills/hg-project-tips/SKILL.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
---
name: "hg-project-tips"
description: "洪湖游戏项目编码规范和最佳实践。在修改或新增本项目代码时自动应用，确保代码风格一致。"
---

# 洪湖游戏项目编码规范

本 skill 包含洪湖游戏（honghu_game）项目的编码规范和最佳实践，在编写/修改代码时必须遵守。

## 1. Import 语句必须放在文件最顶部

所有 `import` 语句必须集中在文件最顶部，不得与变量声明、逻辑代码等穿插混写。

```ts
// ✅ 正确：所有 import 在顶部
import { onMounted, ref } from "vue";
import { useHudStore } from "@/stores/modules/hud";
import StartScene from "@/components/biz/StartScene.vue";

const hud = useHudStore();
const gameEl = ref<HTMLElement | null>(null);
```

```ts
// ❌ 错误：import 与变量声明混在一起
import { onMounted, ref } from "vue";
const hud = useHudStore();
import StartScene from "@/components/biz/StartScene.vue";  // 不应该出现在这里
```

适用于所有文件类型（.ts、.vue `<script setup>`、.js 等）。

## 2. 优先修改现有文件，避免新建文件

除非绝对必要，否则不创建新文件。优先编辑已有文件以完成目标。

## 3. Pinia Store 使用 Setup Store（函数式）风格

`defineStore` 传入函数而非 Options API 对象，state 用 `ref`/`reactive` 声明，actions 为普通函数，最后 return 导出。

```ts
// ✅ 正确：Setup Store 风格
export const useMyStore = defineStore("my", () => {
  const count = ref(0);
  function increment() { count.value++; }
  return { count, increment };
});
```

```ts
// ❌ 错误：Options API 风格
export const useMyStore = defineStore("my", {
  state: () => ({ count: 0 }),
  actions: { increment() { this.count++; } },
});
```

## 4. 保持方案简洁，避免过度设计

- 只做被直接要求或明确必要的修改
- 不添加未被要求的功能、重构、或"改进"
- 不添加未被要求的文档注释、类型注解
- 只在逻辑不明确时添加注释
- 不为一次性操作创建辅助函数或抽象
- 三条相似代码优于过早抽象

## 5. 状态分层：全局用 Pinia store，瞬时数据下沉

- 除非特别提及，全局共享数据统一放入 Pinia store（Setup Store 风格）
- 场景/组件内部的瞬时状态（临时标志、局部交互状态等）下沉到对应场景类或组件自身
- 避免把所有运行时字段堆进一个「上帝类」或臃肿对象
