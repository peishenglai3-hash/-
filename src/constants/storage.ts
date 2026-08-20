/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 15:21:52
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 15:24:25
 * @FilePath: /github_honghu_game/src/constants/storage.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export const KEY_SETTINGS = "redcode.settings";
export const KEY_AUTO = "redcode.save.auto";
export const KEY_FIXED = "redcode.save.fixed";
export const KEY_AUTO_BACKUP = "redcode.save.auto.bak";
export const KEY_FIXED_BACKUP = "redcode.save.fixed.bak";
export const KEY_MANUAL_PREFIX = "redcode.save.manual.";
export const KEY_MANUAL_BACKUP_PREFIX = "redcode.save.manual.bak.";

export const MANUAL_SAVE_SLOTS = [1, 2, 3] as const;
export type ManualSaveSlot = (typeof MANUAL_SAVE_SLOTS)[number];
