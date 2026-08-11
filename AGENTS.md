# AGENTS.md — 红色源代码·洪湖篇 序章

## 项目概述

本工程是一个基于 **Phaser 3** 的叙事驱动 2D 探索游戏，是「红色源代码·洪湖篇」的序章（**序章·名字留在纸上**）。

故事背景设定在现代大学生暑期实践队走访洪湖革命遗址。玩家在纪念碑前探索采访材料，做出关键选择（四选一），随后回到驻地整理材料并入睡，通过一段黑幕声音转场穿越到 1927 年洪湖戴家场，最终完成序章结算。

## 技术栈

| 类别 | 技术 |
|------|------|
| 游戏引擎 | Phaser 3.90.0 (ES Module 引入) |
| 构建工具 | Vite 5.4.14 |
| 运行时 | 纯浏览器端，无框架 |
| 样式 | 原生 CSS (`src/style.css`) |
| 音频 | Web Audio API (合成音效，无外部音频文件) |
| BGM | HTML5 Audio (`public/assets/audio/prologue_bgm.wav`) |
| 数据格式 | JSON (场景配置、交互定义、状态绑定) |
| 测试 | 内容锁校验 (`test:content`) + Playwright E2E (`e2e`) |
| 包管理 | pnpm |

## 项目结构

```
honghu_game/
├── index.html                  # 入口 HTML，包含完整 HUD 结构和 Phaser 挂载点
├── package.json                # 项目元信息与脚本
├── public/
│   ├── assets/
│   │   ├── audio/              # BGM 音频
│   │   ├── characters/         # 角色精灵图
│   │   │   ├── player/modern/  # 主角行走动画（4方向×8帧 332×720）
│   │   │   ├── student-a/      # 同学甲（翻书动画 32帧 8×4）
│   │   │   └── student-b/      # 同学乙（拍照GIF/站姿）
│   │   ├── choices/            # 四选一插图
│   │   ├── items/              # 道具图标（笔记/手机/录音机）
│   │   ├── map/                # 场景地图（scene01 / pro02）
│   │   ├── transition/         # 转场揭示图
│   │   ├── ui/keyed/           # 对话/物品/任务面板扣图素材
│   │   └── video/              # 开场视频 intro.mp4
│   └── data/
│       ├── scene01_manifest.json    # 场景1配置（spawn点/碰撞/交互）
│       ├── PRO02_logic.json         # 场景2逻辑（spawn/碰撞/story_state_bindings）
│       ├── PRO02_interactions.json  # 场景2交互区域定义
│       └── PRO02_states.json        # 场景2状态文案变体
├── src/
│   ├── main.js                 # 游戏入口：Phaser 初始化、流程编排、事件总线、存档
│   ├── state.js                # 全局状态总线（flags/profile/propStates 等）
│   ├── actions.js              # 键位映射（WASD/方向键/E/Space/ESC）
│   ├── ui.js                   # 共享 HUD 系统（对话/任务/物品/选择/结算面板）
│   ├── Scene01.js              # 场景1：纪念碑探索、NPC对话、叙述链、四选一、离场
│   ├── PrologueScene02.js      # 场景2：驻地整理、录音/笔记/入睡链、目标标记、风味点
│   ├── content01.js            # 场景1 内容数据（叙述条目/选项/画像增量/离开叙述）
│   ├── content02.js            # 场景2 内容数据（开场/录音/写问题/入睡/风味点/道具文案）
│   ├── transition-content.js   # 双转场数据（转场A场景1→2，转场B场景2→1927）
│   ├── scene-transition.js     # 黑幕字幕转场控制器
│   ├── transition-audio.js     # 转场合成音效控制器（Web Audio API）
│   ├── ambience.js             # 场景2 环境音（风扇/虫鸣/磁带底噪）
│   └── style.css               # 全局样式（HUD/对话/转场/结算面板）
└── scripts/
    ├── validate-content.mjs    # 内容锁校验脚本
    ├── e2e.mjs                 # Playwright 全流程 E2E 测试
    ├── build-npc-assets.py     # NPC 素材生成（绿幕抠图/色度抠图/翻书拼板/拍照GIF）
    ├── shot-scene02.mjs        # 场景2 验证截图
    └── shot-npcs.mjs           # NPC 验证截图
```

## 核心架构

### 状态管理

全局状态统一存储在 [src/state.js](src/state.js) 的 `state` 对象中，所有模块直接导入引用：

- `flags: Set<string>` — 剧情旗标（如 `FLAG_PRO_Q01_COMPLETED`），决定场景2的状态注入
- `profile: { D, C, I, G, P, A }` — 画像六维数值，由四选一产生不同增量
- `propStates: { notebook, phone, recorder }` — 道具状态，受 `story_state_bindings` 按 flag 注入不同文案
- `mode: string` — 控制玩家行为模式（`intro`/`explore`/`narrative`/`choice`/`result`/`leave_walk` 等）
- `playerLocked: boolean` — 控制玩家移动和交互锁定

### 场景1 → 场景2 状态传递

`state.flags` 写入 `FLAG_PRO_*` 后，场景2 通过 `PRO02_logic.json` 的 `story_state_bindings` 将 flag 映射到 `stateKey`，再匹配 `PRO02_states.json` 注入 `propStates`：

- A 选项 → `FLAG_PRO_NAME_CHECKED` → `notebook: name_checked`
- B 选项 → `FLAG_PRO_PHOTO_TAKEN` → `phone: monument_photo`
- C 选项 → `FLAG_PRO_TEAM_RECORD_FOUND` → `recorder: selected_file`
- D 选项 → `FLAG_PRO_NAME_WRITTEN` → `notebook: name_written`

### 流程编排

`src/main.js` 通过 Phaser 事件系统驱动流程：

```
intro 视频 → Scene01 (探索/叙事/四选一/离场)
  → 事件 prologue:scene01-complete → 转场A → Scene02
  → Scene02 (整理/录音/笔记/入睡)
  → 事件 prologue:sleep-complete → 转场B → 结算面板 + localStorage 存档
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
- **环境音**：[src/ambience.js](src/ambience.js) — 风扇、虫鸣、磁带底噪（Web Audio 合成）
- **转场音效**：[src/transition-audio.js](src/transition-audio.js) — 脚步、车辆、虫鸣、风扇、碗筷等合成 cue
- 音频解锁：通过用户首次点击调用 `ambience.unlock()` / `transitionAudio.prime()`

### 存档系统

序章结算时将存档写入 `localStorage`：
- `redcode.prologue.flags` — 旗标集合
- `redcode.prologue.save` — 完整存档对象（checkpoint/profile/choice/risk/flags）

供第一章读取。

## 开发指南

### 启动与测试

```bash
pnpm dev              # 开发服务器 http://127.0.0.1:5175/
pnpm run test:content # 内容锁校验（条目数/样式/说话人完整性）
pnpm run e2e          # Playwright 全流程测试（约2分钟）
pnpm run build        # 生产构建
```

### 添加新叙述条目

1. 在对应 `content*.js` 的数组中添加条目：
   ```js
   { entry_id: 'X1', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白',
     text: '文本内容', style: 'narration', cps: 14, advance: 'manual' }
   ```
2. 更新 `validate-content.mjs` 中的条目数断言
3. 运行 `pnpm run test:content` 验证

### 添加新场景

1. 创建 `src/SceneXX.js`，继承 `Phaser.Scene`
2. 在 [src/main.js](src/main.js) 的 `scene: []` 数组中注册
3. 通过 `game.scene.start('SceneXX')` 或事件触发切换
4. 如有状态传递，通过 `state.flags` + JSON 数据文件

### 注意事项

- **不要修改 `content*.js` 的条目顺序**，条目 id 和顺序被内容锁校验保护
- **精灵图尺寸**：主角行走帧 332×720（原始），显示尺寸 83×180（场景1）/ ~166×360（场景2）
- 碰撞检测使用手动网格碰撞（`tryMove`），非 Phaser Arcade 物理碰撞
- NPC 素材生成需运行 `python scripts/build-npc-assets.py`（需要 Python 环境 + PIL）
