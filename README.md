# 序章·名字留在纸上｜可玩闭环

本工程把此前两个孤立切片（Codex 的场景1 + OpenCode 的场景2）与 Codex 的黑幕转场系统整合为**单一可玩闭环**：

```
开场视频 → 场景1 纪念碑（探索/碑文序列/PRO-Q01 四选一/离场对话）
→ 转场A（黑幕字幕：脚步·车辆·虫鸣远去·风扇出现 →「当晚｜暑期实践驻地」）
→ 场景2 实践驻地（录音→笔记→入睡链，桌面状态随场景1选择变化）
→ 转场B（黑幕声音替换：风扇→碗筷·木门·虫鸣·犬吠 →「1927年9月10日，中秋｜戴家场」→ 揭示图 陈继南家中）
→ 序章结算（固定存档：画像累计 / 选择标签 / PROLOGUE_COMPLETED / TIME_TRAVEL_CHECKPOINT / 三风险=0）
```

## 运行

```powershell
npm run dev          # http://127.0.0.1:5175/
npm run test:content # 内容锁校验
npm run e2e          # Playwright 全流程（约2分钟）
npm run build
```

操作：WASD/方向键移动，E 交互/关闭任务，Space 推进，ESC 暂停。

## 整合要点

- **单一状态总线** `src/state.js`：场景1的选择旗标（`FLAG_PRO_*`）直接写入 `state.flags`，场景2 的 `PRO02_logic.json story_state_bindings` 原样消费——A→笔记核对标记、B→手机纪念碑照片、C→录音停在涂老五文件、D→笔记翻到写名页（`PRO02_states.json` 文案变体）。
- **画像累计**：`PROFILE_DELTAS` 按剧情表（A: C+2 I+1；B: C+1 A+2；C: I+1 G+2；D: D+1 I+2）写入 `state.profile`，结算面板与 localStorage `redcode.prologue.save` 一并落盘，供第一章读取。
- **转场系统**：Codex 的 `SceneTransitionController` 参数化（entries/cues/revealEntryId/revealImageSrc 注入），同一控制器驱动转场A（新增数据，见 `transition-content.js`）与转场B（Codex 原 SC02_* 21 条 + 揭示图）；`TransitionAudioController` 为转场A 增加 footsteps_light / car_engine / insects_recede / fan_emerge 四个合成 cue。
- **对话UI统一**为长期版式：左栏头像+竖排说话人，右栏两端对齐正文；黑旁白/绿心理/绛红对白三色契约贯穿两场景与转场字幕。
- **事件接口**：`prologue:scene01-complete`（场景1→转场A→场景2）、`prologue:sleep-complete`（入睡→转场B）、`prologue:scene-exit`（结算，含 `SCENE_EXIT` 交接契约，目标 `CH01_SC01_CHEN_HOME_WAKE`）。
- 修复：隐形物理代理体按 332×720 原始帧参与 `collideWorldBounds` 导致的位置钳制（场景1/场景2 均已 `setSize/setOffset` 为脚底小碰撞盒）。

## NPC 与音频资产管线

- **BGM**：`public/assets/audio/prologue_bgm.wav`，开场结束后循环播放（音量 0.35，句柄 `window.prologueBgm`）。
- **NPC 尺寸**：场景1 两名 NPC 统一放大至约 1.25×（`NPC_DISPLAY` 77×160，DOM 动图遮罩 84×188），与主角体量匹配。
- **场景2 开场侧身站姿**：主角起始于门旁 `DOOR_STAND`，显示 `player-side-right`（`主角 侧面试图.png` 白底抠图并镜像为面向右，`scripts/build-npc-assets.py` 的 `build_player_side()` 生成），显示高度 328 与行走精灵视高一致；首次移动后无缝切回行走图集。
- **调试入口**：`/?scene=02` 直达场景2（跳过开场视频与场景1）；`scripts/shot-scene02.mjs` 截取开场站姿与移动切换两张验证图。
- **同学甲·翻书动画**：`scripts/build-npc-assets.py` 从绿幕视频抽帧（fps=8）→ 色度抠图 → 对齐拼板 `student-a/actions/reading-sheet.png`（32 帧 8×4，8fps 循环），task1 与 task3 待机均播放。
- **同学乙·拍照动画**：同脚本对 `NPC 乙 拍照 动图.gif` 做背景剔除（边框多种子洪泛 + 天空色清理 + 最大连通域）输出透明 `student-b/actions/camera-keyed.gif`（50 帧），配合 `style.css` 紧贴剪影的 clip-path（含腿间凹口）消除白边。
- **同学乙·task3 站姿**：`student-b/front-task3.png`（绿幕抠图，显示宽度按源图纵横比自适应）。替换站姿源图后重跑：
  `python scripts/build-npc-assets.py <绿幕站姿图路径>`（会同时重生成翻书拼板与拍照动图）。

## 结构

- `src/Scene01.js` 场景1玩法（碑文序列、选择、离场）；`src/PrologueScene02.js` 场景2玩法（目标!标记、风味点、入睡链）。
- `src/content01.js` / `content02.js` 双场景文本锁；`src/transition-content.js` 双转场数据。
- `src/main.js` 流程编排与结算；`src/ui.js` 共享 HUD。
- `public/data/` 场景1 manifest + PRO02 三件套；`public/assets/` 双场景地图/角色/物品/揭示图/开场视频。

## 验收

- `test:content`：场景1 24+1 条 / 4 选项、场景2 6+4+13+6 条 / 6 风味、转场 A5+B21，样式与说话人锁 PASS。
- `e2e`：全流程 8 步 PASS（截图 pl_01…pl_08：场景1、选择、结果、转场A、场景2、转场B、揭示+结算）。
- 生产构建通过。
