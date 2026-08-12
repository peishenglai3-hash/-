# AGENTS.md — 红色源代码·洪湖篇 序章

## 项目概述

本工程是一个基于 **Phaser 3** 的叙事驱动 2D 探索游戏，是「红色源代码·洪湖篇」的序章（**序章·名字留在纸上**）。

故事背景设定在现代大学生暑期实践队走访洪湖革命遗址。玩家在纪念碑前探索采访材料，做出关键选择（四选一），随后回到驻地整理材料并入睡，通过一段黑幕声音转场穿越到 1927 年洪湖戴家场，最终完成序章结算。

## 技术栈

| 类别 | 技术 |
|------|------|
| 游戏引擎 | Phaser 3.90.0 (ES Module 引入) |
| 构建工具 | Vite 5.4.14 |
| 语言 | TypeScript (strict mode) |
| 运行时 | 纯浏览器端 |
| UI 框架 | Vue 3.5 (HUD 层) |
| 样式 | Vue scoped CSS + 全局 CSS (`src/css/base.css`) |
| 音频 | Web Audio API (合成音效) + HTML5 Audio (BGM) |
| BGM | `public/assets/audio/prologue_bgm.wav` |
| 数据格式 | JSON (场景配置、交互定义、状态绑定) |
| 测试 | 内容锁校验 (`test:content`) + Playwright E2E (`e2e`) |
| 包管理 | pnpm |

## 项目结构

```
honghu_game/
├── index.html                       # 入口 HTML，仅保留 Phaser #game 挂载点 + Vue #app 挂载点
├── package.json                     # 项目元信息与脚本
├── tsconfig.json                    # TypeScript 配置（strict / bundler / 路径别名）
├── vite.config.ts                   # Vite 配置（@ 别名 / base 路径 / 端口 / Vue plugin）
├── .env.development                 # 开发环境变量（VITE_BASE=/）
├── .env.production                  # 生产环境变量（VITE_BASE=./）
├── public/
│   ├── assets/
│   │   ├── audio/                   # BGM 音频
│   │   ├── characters/              # 角色精灵图
│   │   │   ├── player/modern/       # 主角行走动画（4方向×8帧 332×720）
│   │   │   ├── student-a/           # 同学甲（翻书动画 32帧 8×4）
│   │   │   └── student-b/           # 同学乙（拍照GIF/站姿）
│   │   ├── choices/                 # 四选一插图
│   │   ├── items/                   # 道具图标（笔记/手机/录音机）
│   │   ├── map/                     # 场景地图（scene01 / pro02）
│   │   ├── transition/              # 转场揭示图
│   │   ├── ui/keyed/                # HUD 面板素材（对话/物品/任务/画板/名牌）
│   │   └── video/                   # 开场视频 intro.mp4
│   └── data/
│       ├── scene01_manifest.json    # 场景1配置（spawn点/碰撞/交互）
│       ├── PRO02_logic.json         # 场景2逻辑（spawn/碰撞/story_state_bindings）
│       ├── PRO02_interactions.json  # 场景2交互区域定义
│       └── PRO02_states.json        # 场景2状态文案变体
├── src/
│   ├── main.ts                      # 游戏入口：Vue app 初始化 + Phaser 初始化 + GameDirector
│   ├── App.vue                      # Vue 根组件，组装所有 HUD 子组件
│   ├── components/
│   │   └── ui/                      # Vue 3 HUD 组件（scoped CSS）
│   │       ├── IntroPanel.vue       # 开场视频面板
│   │       ├── TaskCard.vue         # 任务卡片
│   │       ├── InteractionPrompt.vue # 交互提示（"查看碑文 · E"）
│   │       ├── DialoguePanel.vue    # 对话面板（带打字机动画）
│   │       ├── ItemPanel.vue        # 物品/道具面板
│   │       ├── ChoicePanel.vue      # 四选一面板
│   │       ├── ResultPanel.vue      # 选择结果展示
│   │       ├── SceneFade.vue        # 淡入淡出层
│   │       ├── PausePanel.vue       # 暂停面板
│   │       ├── FlavorToast.vue      # 风味气泡
│   │       ├── EndPanel.vue         # 序章结算面板
│   │       ├── TitleLoadPanel.vue   # 标题读档面板（槽位列表）
│   │       ├── TitleSettingsPanel.vue # 标题设置面板（音量/文字速度）
│   │       └── TransitionOverlay.vue # 转场覆盖层（读取 Pinia hud.transition 渲染黑幕/字幕/揭示图）
│   ├── common/
│   │   ├── actions.ts               # 键位映射（WASD/方向键/E/Space/ESC）
│   │   ├── ambience.ts              # 环境音引擎（风扇/虫鸣/磁带底噪，Web Audio）
│   │   ├── paths.ts                 # 资源路径工具（assetPath，自动拼接 BASE_URL）
│   │   ├── save.ts                  # 本地存档系统（SaveManager：auto/fixed 槽+设置+回退）
│   │   ├── state.ts                 # 游戏状态（flags/profile/risk/propStates/mode 等）
│   │   └── ui.ts                    # HUD 控制转发层（对 Scene 兼容旧接口，转发至 Pinia hud store）
│   ├── stores/
│   │   └── modules/
│   │       └── hud.ts               # HUD reactive 数据层（Pinia store，Vue + Phaser 共用）
│   ├── css/
│   │   └── base.css                 # 全局布局/重置样式
│   ├── director/
│   │   ├── GameDirector.ts          # 流程编排器（intro→场景→转场→结算）
│   │   ├── SceneTransition.ts       # 黑幕字幕转场控制器（直接操作 TransitionOverlay DOM）
│   │   ├── TransitionAudio.ts       # 转场合成音效控制器
│   │   └── flow/
│   │       ├── StartScene.ts        # 开场视频流程
│   │       ├── Scene01ToScene02.ts   # 转场A：场景1→场景2
│   │       ├── Scene02ToSettlement.ts # 转场B：场景2→1927
│   │       └── DebugRoute.ts        # 调试入口（/?scene=02）
│   ├── scenes/
│   │   ├── Title/
│   │   │   └── TitleScene.ts        # 初始界面（设计图+四热区+标题 BGM）
│   │   ├── Scene01/
│   │   │   ├── Scene01.ts           # 场景1：纪念碑探索、NPC对话、叙述链、四选一、离场
│   │   │   ├── content.ts           # 场景1 内容数据（叙述条目/选项/画像增量/离场叙述）
│   │   │   └── style.css            # 场景1 独立样式（npc-gif-mask 等）
│   │   └── Scene02/
│   │       ├── PrologueScene02.ts   # 场景2：驻地整理、录音/笔记/入睡、目标标记、风味点
│   │       └── content.ts           # 场景2 内容数据（开场/录音/写问题/入睡/风味点/道具文案）
│   └── types/
│       ├── common.d.ts               # 核心类型定义（SaveData / NarrativeEntry / GameState）
│       ├── css.d.ts                 # CSS module + .vue 类型声明
│       ├── director.d.ts            # 转场类型定义（TransitionConfig 等）
│       └── vite-env.d.ts            # Vite 客户端类型引用
└── scripts/
    ├── validate-content.mjs         # 内容锁校验脚本
    ├── e2e.mjs                      # Playwright 全流程 E2E 测试
    ├── build-npc-assets.py          # NPC 素材生成（绿幕抠图/色度抠图/翻书拼板/拍照GIF）
    ├── shot-scene02.mjs             # 场景2 验证截图
    └── shot-npcs.mjs                # NPC 验证截图
```

## 路径别名

Vite 配置了 `@` 别名指向 `src/`，所有模块导入使用 `@/` 路径：

```ts
import { state } from '@/common/state';
import { assetPath } from '@/common/paths';
import { setupStartScene } from '@/director/flow/StartScene';
```

同一模块内的相对引用仍使用 `./`（如场景目录内的 `./content`）。

## 资源路径策略

项目通过分层方式管理资源路径，确保开发和生产环境一致：

| 层级 | 方式 | 示例 |
|------|------|------|
| Phaser Loader | `main.ts` 中设 `loader: { baseURL: import.meta.env.BASE_URL }`，preload 路径去掉前导 `/` | `this.load.image('bg01', 'assets/map/scene01_base.png')` |
| 非 Loader JS | 使用 `assetPath()` 包装 | `new Audio(assetPath('/assets/audio/bgm.wav'))` |
| CSS url() | 保持绝对路径，Vite 构建时自动重写为相对路径 | `url('/assets/ui/keyed/dialogue.png')` → `url(../assets/...)` |

`assetPath()` 定义在 [src/common/paths.ts](src/common/paths.ts)，自动拼接 `import.meta.env.BASE_URL`：

```ts
const BASE = import.meta.env.BASE_URL;
export function assetPath(path: string): string {
  return BASE + path.replace(/^\//, '');
}
```

### 环境变量

| 文件 | `VITE_BASE` | 用途 |
|------|-------------|------|
| `.env.development` | `/` | `pnpm dev` — 根路径部署 |
| `.env.production` | `./` | `pnpm build` — 相对路径，适配任意子目录 |

## 核心架构

### 状态管理

游戏状态分为两层：

**游戏状态** — [src/common/state.ts](src/common/state.ts)，全局可变对象，所有模块直接导入引用：

- `flags: Set<string>` — 剧情旗标（如 `FLAG_PRO_Q01_COMPLETED`），决定场景2的状态注入
- `profile: Record<string, number>` — 画像六维数值，由四选一产生不同增量
- `propStates: Record<string, string>` — 道具状态，受 `story_state_bindings` 按 flag 注入不同文案
- `mode: string` — 控制玩家行为模式（`intro`/`explore`/`narrative`/`choice`/`result`/`leave_walk` 等）
- `playerLocked: boolean` — 控制玩家移动和交互锁定

**HUD 状态** — [src/stores/modules/hud.ts](src/stores/modules/hud.ts)，Pinia store（Options API），Vue 组件 + Phaser Scene 共用：

- `hud.taskCard` / `hud.dialogue` / `hud.itemPanel` / `hud.choicePanel` / ... — 各面板数据
- `hud.playerLocked` — 同步至 `state.playerLocked`，控制场景侧输入锁定
- Scene 通过 `ui.ts` 转发层修改 store，Vue 组件通过 `v-if` / `watch` 自动响应渲染

### Vue HUD 架构

```
src/stores/modules/hud.ts (Pinia)
        │
   ┌────┴────┐
   │         │
┌──▼─────┐  ┌▼──────────┐
│ Scene  │  │ Vue 组件   │
│ (写)    │  │ (自动渲染)  │
└────────┘  └───────────┘
```

Vue 通过 `v-if` 按可见性渲染面板，转场系统由 `useTransition` composable 写入 `hud.transition.*`，`TransitionOverlay.vue` 响应式渲染黑幕/字幕/揭示图。

### 场景1 → 场景2 状态传递

`state.flags` 写入 `FLAG_PRO_*` 后，场景2 通过 `PRO02_logic.json` 的 `story_state_bindings` 将 flag 映射到 `stateKey`，再匹配 `PRO02_states.json` 注入 `propStates`：

- A 选项 → `FLAG_PRO_NAME_CHECKED` → `notebook: name_checked`
- B 选项 → `FLAG_PRO_PHOTO_TAKEN` → `phone: monument_photo`
- C 选项 → `FLAG_PRO_TEAM_RECORD_FOUND` → `recorder: selected_file`
- D 选项 → `FLAG_PRO_NAME_WRITTEN` → `notebook: name_written`

### 流程编排

`src/main.ts` 通过 Phaser 事件系统驱动流程，实际路由逻辑由 `GameDirector` 模块管理：

```
intro 视频 → Scene01 (探索/叙事/四选一/离场)
  → 事件 prologue:scene01-complete → 转场A (flow/Scene01ToScene02.ts) → Scene02
  → Scene02 (整理/录音/笔记/入睡)
  → 事件 prologue:sleep-complete → 转场B (flow/Scene02ToSettlement.ts) → 结算面板 + localStorage 存档
```

调试入口：`/?scene=02` 跳过开场和场景1，直达场景2。

### 对话系统

对话面板采用 UE 式版式（`dialogue-panel`），通过 `style` 字段区分三种视觉风格：

- `narration` — 黑色文字、米色面板（旁白）
- `thought` — 绿色文字、米色面板（心理描写）
- `dialogue` — 绛红文字、暗色面板（对白）

每段叙事条目包含 `entry_id`、`kind`、`speaker_name`、`text`、`style`、`cps`（打字速度）等字段，由 `playNarrative(entries, onComplete)` 驱动播放。

### 音效系统

- **BGM**：[public/assets/audio/prologue_bgm.wav](public/assets/audio/prologue_bgm.wav)，开场后循环，音量 0.35
- **环境音**：[src/common/ambience.ts](src/common/ambience.ts) — 风扇、虫鸣、磁带底噪（Web Audio 合成）
- **转场音效**：[src/director/TransitionAudio.ts](src/director/TransitionAudio.ts) — 脚步、车辆、虫鸣、风扇、碗筷等合成 cue
- 音频解锁：通过用户首次点击调用 `ambience.unlock()` / `transitionAudio.prime()`

### 初始界面（TitleScene，2026-08-12 引入）

启动后 Phaser 自动进入 `TitleScene`（scene 列表首位）：设计图
`public/assets/ui/title_screen.png` 等比铺满 1280×720，四个烧录木牌按钮对应透明热区
（创建/加载/设置/退出，悬停微光），动作经 `game.events.emit("title:action", id)` 派发给
`GameDirector.handleTitleAction`。停留标题期间循环播放
`public/assets/audio/title_bgm.mp3`（浏览器自动播放限制下于首次交互起播），
进入正式游玩即停。

- **创建**：`resetRunState()` → 离场 → Scene01 + 自动存档 → `director:new-game` 事件触发 App 接线开场视频流程
- **加载**：`TitleLoadPanel.vue` 列槽（固定检查点在前）→ `director.startFromSave(save)` 直达目标场景，不重玩序章
- **设置**：`TitleSettingsPanel.vue`（音乐/音效音量、文字速度三档），持久化 `redcode.settings`，订阅实时生效
- **退出**：`window.close()` + 兜底提示
- 调试路由 `/?scene=02` 经 `director.leaveTitle()` 绕过标题

### 存档系统（SaveManager，2026-08-12 引入）

[src/common/save.ts](src/common/save.ts) 统一管理，localStorage 后端（几 KB 纯 JSON），
全部读写 try/catch（隐私模式兜底），`version + checksum` 读档校验：

| 槽 | 键 | 写入时机 | 内容 |
|---|---|---|---|
| auto | `redcode.save.auto` | 每次场景切换（`director.enterScene`） | 全量运行时状态（flags/profile/choice/risk/propStates） |
| fixed | `redcode.save.fixed` | 进入陈继南家中、场景整体呈现（`Ch01Sc01Scene.beginExplore`，幂等） | 序章画像累计 + PRO-Q01 引用标签 + 固定标签 `PROLOGUE_COMPLETED`/`TIME_TRAVEL_CHECKPOINT` + 三风险 0；tags 过滤 `CH01` 前缀 |

- **失败回退**：`director.rollbackToCheckpoint()`（`window.rollbackToCheckpoint` 调试钩子）——读 fixed 槽恢复 state 后重启 Ch01Sc01Scene；不重玩现代序章、序章画像/标签保留、穿越后画像恢复存档态、三风险归 0。预留供后续全章统一校准的失败条件调用。序章本身不检查风险、不触发失败。
- **读档恢复**：`SaveManager.applyToState(save)` 还原 flags/profile/choice/risk/propStates 并复位瞬态字段。
- 序章结算仍兼容写 `redcode.prologue.flags` / `redcode.prologue.save`（旧键保留）。

## 类型系统

### 核心接口

- `GameState` / `SaveData` / `NarrativeEntry` — 定义在 [src/types/common.d.ts](src/types/common.d.ts)
- `TransitionConfig` / `TransitionEntry` / `TransitionCue` — 定义在 [src/types/director.d.ts](src/types/director.d.ts)
- `DirectorDom` / `DirectorOptions` — 定义在 [src/director/GameDirector.ts](src/director/GameDirector.ts)
- `Choice` — 定义在 [src/scenes/Scene01/content.ts](src/scenes/Scene01/content.ts)
- `LogicData` / `InteractionData` / `InteractionZone` — 定义在 [src/scenes/Scene02/PrologueScene02.ts](src/scenes/Scene02/PrologueScene02.ts)

### 类型声明文件

- [src/types/css.d.ts](src/types/css.d.ts) — CSS module 声明
- [src/types/vite-env.d.ts](src/types/vite-env.d.ts) — Vite 客户端类型（`/// <reference types="vite/client" />`）

## 开发指南

### 启动与测试

```bash
pnpm dev              # 开发服务器 http://127.0.0.1:5175/
pnpm run test:content # 内容锁校验（条目数/样式/说话人完整性，经 tsx）
pnpm run e2e          # Playwright 全流程测试（约2分钟）
node scripts/e2e-title-save.mjs          # 初始界面+存档系统专项（11 断言）
node scripts/e2e-ch01-sc01.mjs           # 第一章场景全流程
node scripts/e2e-prologue-transition.mjs # 转场+BGM 专项
# 端口被占时可用 E2E_PORT 环境变量改端口（配合 vite --port <P>）
npx tsc --noEmit      # TypeScript 类型检查（不生成文件）
pnpm run build        # 生产构建
```

### 添加新叙述条目

1. 在对应 `scenes/SceneXX/content.ts` 的数组中添加条目：
   ```ts
   { entry_id: 'X1', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白',
     text: '文本内容', style: 'narration', cps: 14, advance: 'manual' }
   ```
2. 更新 `scripts/validate-content.mjs` 中的条目数断言
3. 运行 `pnpm run test:content` 验证

### 添加新 HUD 面板

1. 在 `src/components/ui/` 创建 `NewPanel.vue`，使用 scoped CSS：
   ```vue
   <script setup lang="ts">
   import { useHudStore } from '@/stores/modules/hud';
   const hud = useHudStore();
   </script>
   <template>
     <div v-if="hud.newPanel.visible" class="new-panel">...</div>
   </template>
   <style scoped>.new-panel { ... }</style>
   ```
2. 在 [src/stores/modules/hud.ts](src/stores/modules/hud.ts) 的 `state` / `actions` 中添加对应字段
3. 在 [src/common/ui.ts](src/common/ui.ts) 中添加转发函数（如需要 Scene 侧兼容调用）
4. 在 [src/App.vue](src/App.vue) 中引入并组装组件

### 添加新场景

1. 创建 `src/scenes/SceneXX/SceneXX.ts`，继承 `Phaser.Scene`
2. 在 [src/main.ts](src/main.ts) 的 `scene: []` 数组中注册
3. 在 `src/director/flow/` 中创建对应的转场流程文件（如需要）
4. 在 [src/director/GameDirector.ts](src/director/GameDirector.ts) 中注册事件监听
5. 如有状态传递，通过 `state.flags` + JSON 数据文件

### 添加新公共模块

1. 创建 `src/common/new-module.ts`
2. 文件内使用 `@/common/` 路径引用其他公共模块
3. 场景或 director 文件通过 `@/common/new-module` 导入

### 添加新的 Phaser Loader 资源路径

在场景 `preload()` 中使用**不带前导 `/` 的相对路径**，Phaser 会自动拼接 `loader.baseURL`：

```ts
this.load.image('key', 'assets/xxx/yyy.png');   // ✅ 正确
this.load.image('key', '/assets/xxx/yyy.png');  // ❌ 错误（与 baseURL 冲突）
```

### 添加非 Loader 资源路径

使用 `assetPath()` 工具函数包装：

```ts
import { assetPath } from '@/common/paths';
const img = document.createElement('img');
img.src = assetPath('/assets/xxx/yyy.png');
```

### 注意事项

- **不要修改 content.ts 的条目顺序**，条目 id 和顺序被内容锁校验保护
- **精灵图尺寸**：主角行走帧 332×720（原始），显示尺寸 83×180（场景1）/ ~166×360（场景2）
- 碰撞检测使用手动网格碰撞（`tryMove`），非 Phaser Arcade 物理碰撞
- NPC 素材生成需运行 `python scripts/build-npc-assets.py`（需要 Python 环境 + PIL）
- **所有新文件使用 `.ts` 扩展名**；Vue 组件使用 `.vue` 扩展名
- 类型检查命令：`npx tsc --noEmit`
- **Phaser Canvas 与 Vue DOM 分开管理**：Phaser 只操作 `<canvas>` 内的 `#game`，Vue 只操作 `#app` 内的 HUD DOM
