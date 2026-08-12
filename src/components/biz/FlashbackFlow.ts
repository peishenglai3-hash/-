import type Phaser from "phaser";
import type { SceneId } from "@/types/common";

interface FbDirector {
  game: Phaser.Game;
  enterScene: (key: string, sceneId: SceneId) => void;
}

// 闪回一·状纸：SC01 墨迹触发 → SC02；SC02 完成 → 返回 SC01（均走 enterScene 自动存档）
// 返回陈家链：SC01 暗号选择后 → 外景院墙；联络通知完成 → 回 SC01 告别
export function setupFlashbackFlow(director: FbDirector): void {
  const g = director.game;
  g.events.on("ch01:sc02-enter", () => {
    director.enterScene("Ch01Sc02Scene", "CH01_SC02");
    // 延迟停止 SC01，避免在 ink tween 回调中销毁场景
    window.setTimeout(() => g.scene.stop("Ch01Sc01Scene"), 0);
  });
  g.events.on("ch01:sc02-complete", () => {
    g.scene.stop("Ch01Sc02Scene");
    director.enterScene("Ch01Sc01Scene", "CH01_SC01");
  });
  g.events.on("ch01:sc03-enter", () => {
    director.enterScene("Ch01Sc03Scene", "CH01_SC03");
    window.setTimeout(() => g.scene.stop("Ch01Sc01Scene"), 0);
  });
  g.events.on("ch01:sc03-complete", () => {
    g.scene.stop("Ch01Sc03Scene");
    director.enterScene("Ch01Sc01Scene", "CH01_SC01");
  });
}
