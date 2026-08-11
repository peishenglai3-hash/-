# 实施计划 v1.0 — 游戏初始界面 + 本地存档系统

> 日期：2026-08-12　｜　负责人：Claude（总策划/引擎）　｜　状态：自动推进中
> 依据：用户任务单（2026-08-12）、`详细剧情3.1-序章1.0`§固定存档与失败回退、`剧情大纲3.2`§失败和回退

---

## 0. 现状摘要（扫描结论）

- 技术栈：Phaser 3.90 + Vue 3.5 HUD（`src/common/store.ts` reactive）+ TS strict + Vite；1280×720 FIT。
- 流程：`App.vue onMounted` → Phaser 自动启动列表第一个场景（Scene01）→ intro 视频（IntroPanel）→ Scene01 → 转场A → Scene02 → 转场B → 结算（`GameDirector.finishPrologue` 写 `redcode.prologue.save`，内容已含固定回退点/三风险0/双固定标签）→ `prologue:scene-exit` 事件 → Ch01Sc01Scene。
- 存档现状：仅两处裸 localStorage 写入（序章结算 + Ch01Sc01.saveProgress 简版），**无统一管理、无槽位、无读档入口、无回退链路**。
- 风险系统：`SaveData.risk` 已建模但无增长逻辑（第一章后续校准），本次只需预留回退 API。

## 1. 目标

1. **初始界面（TitleScene）**：设计图 `public/assets/ui/title_screen.png` 全屏；四木牌按钮=创建/加载/设置/退出（图上已烧录→透明热区叠加+悬停微光）；停留期间循环播放 `public/assets/audio/title_bgm.mp3`；进入正式游玩即停。
2. **本地存档系统（SaveManager）**：场景切换自动存档；陈继南家中场景整体呈现时写固定存档（内容严格按任务单）；失败回退 API（不重玩序章/保留序章画像与标签/穿越后画像恢复存档态/三风险归0）；读档面板支持再次游玩。
3. **设置**：BGM 音量 / 音效音量 / 文字速度，持久化并实时生效。

## 2. 架构决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 存储介质 | localStorage（槽位键 + 索引键） | 与现有代码一致；存档为小 JSON（<50KB）；无异步复杂度；隐私模式 try/catch 兜底 |
| 槽位模型 | `auto`（滚动单槽，每次场景切换覆写）+ `fixed`（固定检查点） | 严格对应任务单"每切换一次场景存一次"+"固定回退点"；读档列表展示两槽元数据 |
| 标题界面 | Phaser 场景 `TitleScene`（列表首位，自动启动） | 与场景体系同构；热区坐标按 1280×720 比例锁定（设计图恰为 16:9） |
| 子面板 | Vue 组件（LoadPanel/SettingsPanel）走 hud reactive | 复用既有 HUD 模式（store.ts + App.vue 组装） |
| 状态恢复 | `SaveManager.applyToState()` 还原 flags/profile/choice/propStates → `director.startFromSave()` 直达目标场景 | flags 全局化（CH01_* 与 PRO_* 同 Set），tags 即进度 |
| 固定存档内容 | 写时**过滤 CH01 前缀旗标**、risk 强制 0、profile 取当下值 | 保证回退后第一章重玩、序章保留（幂等可重写） |
| 调试路由 | `/?scene=02` 绕过标题直达 Scene02（保留） | e2e 与开发调试不破坏 |

## 3. 数据模型（types/common.d.ts 追加）

```ts
interface RunSave {
  version: 1;
  kind: "auto" | "fixed";
  sceneId: "PROLOGUE_SC01" | "PROLOGUE_SC02" | "CH01_SC01";
  sceneLabel: string;
  checkpoint: string;
  timestamp: number;
  profile: Record<string, number>;
  choice: { id: string; flag: string; echo_summary: string } | null;
  tags: string[];        // 剧情旗标（Set 序列化）
  fixed: string[];       // 固定标签
  risk: { identity: number; execution: number; coordination: number };
  propStates: Record<string, string>;
}
interface GameSettings { bgmVolume: number; sfxVolume: number; textSpeed: 0.75 | 1 | 1.5; }
```

键：`redcode.settings` / `redcode.save.auto` / `redcode.save.fixed`。

## 4. 模块清单

### 新建
| 文件 | 职责 |
|---|---|
| `src/common/save.ts` | SaveManager：autosave(sceneId)/writeFixedCheckpoint()/listSlots()/loadSlot()/applyToState()/settings 读写与生效 |
| `src/scenes/Title/TitleScene.ts` | 标题场景：底图+四热区（pointerover 微光/pointerdown 动作）+标题 BGM 循环 |
| `src/components/TitleLoadPanel.vue` | 读档面板：槽位列表（自动/固定+场景名+时间+画像摘要+风险）→读档/返回；无档置灰 |
| `src/components/TitleSettingsPanel.vue` | 设置面板：BGM/音效滑条+文字速度三档+返回 |

### 修改
| 文件 | 变更 |
|---|---|
| `src/App.vue` | scene 列表首位 TitleScene；组装两新面板；`setupStartScene` 延迟到"创建"触发；introVisible 初值 false |
| `src/director/GameDirector.ts` | +titleBgm；+beginNewGame()（重置 state→intro 流程→Scene01 启动+autosave）；+startFromSave(save)；+enterScene(key,sceneId) 统一"停旧场景+autosave+启动"；+rollbackToCheckpoint()；设置生效钩子 |
| `src/director/flow/*.ts`（3 个转场+StartScene） | 场景启动改走 `director.enterScene`（自动存档挂钩） |
| `src/scenes/Scene03/Ch01Sc01Scene.ts` | beginExplore 首次进入时 `writeFixedCheckpoint()`；saveProgress 改调 SaveManager.autosave |
| `src/common/store.ts` | hud 增加 `title:{loadOpen,settingsOpen}`、introVisible 初值 false；文字速度乘数接入 `_renderCurrentEntry` |
| `src/common/state.ts` | +resetState()（创建新游戏时清零） |
| `scripts/e2e*.mjs` | 适配标题门禁；新增 `e2e-title-save.mjs` 专项验收 |
| `AGENTS.md` | 补"初始界面/存档系统/设置"三节文档 |

## 5. 关键行为细则（严格对齐任务单）

- **自动存档**：每次 `enterScene` 触发，写 `auto` 槽（sceneId/sceneLabel/timestamp/全量状态）。
- **固定存档**：Ch01Sc01 `beginExplore()` 时写 `fixed` 槽：
  - 序章画像累计（profile 当下值）；PRO-Q01 后续引用标签（choice.flag ∈ tags）；
  - fixed = `["PROLOGUE_COMPLETED","TIME_TRAVEL_CHECKPOINT"]`；
  - risk = 0/0/0；tags 过滤 `CH01` 前缀。
- **失败回退** `rollbackToCheckpoint()`：读 fixed → applyToState → enterScene(CH01_SC01)。**不触碰序章场景**；画像/风险按 fixed 内容恢复。预留供后续"全章统一校准失败条件"调用。
- **序章不检查风险、不触发失败**：保持现状（无风险增长逻辑），代码注释声明。
- **BGM 编排**：标题停→创建/读档后按目标场景起对应 BGM（序章 prologue_bgm / 第一章 bgm_ch01）。
- **设置生效**：bgm→HTMLAudio.volume；sfx→`game.sound.volume`+ambience（若暴露）；textSpeed→打字 cps 乘数。

## 6. 验证矩阵

| 项 | 手段 |
|---|---|
| 类型 | `npx tsc --noEmit` 零错 |
| 内容锁 | `pnpm run test:content` 绿 |
| 构建 | `pnpm run build` 成功 |
| 全流程 | `e2e.mjs`（标题→新游戏→序章→第一章）绿 |
| 存档专项 | `e2e-title-save.mjs`：标题渲染+BGM playing；auto 槽随场景切换更新；fixed 槽 risk000+双标签；读档直达 ch1；rollback API 状态断言 |
| 外部验收 | 子代理独立跑 build+e2e+代码审查，对照任务单逐条核 |

## 7. 推进顺序（自动推进，不等审批）

P1 素材 ✅ → P2 save.ts+类型 → P3 TitleScene+面板 → P4 流程重构（App/Director/flow） → P5 ch01 挂钩+设置生效 → P6 tsc/build/e2e → P7 外部验收子代理 → P8 commit+push（SSH）。
