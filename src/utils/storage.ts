/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 15:18:29
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 15:30:55
 * @FilePath: /github_honghu_game/src/utils/storage.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { KEY_SETTINGS, KEY_AUTO, KEY_FIXED } from '@/constants/storage';
import type { GameSettings, RunSave } from '@/types/common';

export function getRedcodeSettings(): GameSettings | undefined {
    try {
        const raw = window.localStorage.getItem(KEY_SETTINGS);
        return raw ? (JSON.parse(raw) as GameSettings) : undefined;
    } catch {
        return undefined;
    }
}

export function setRedcodeSettings(settings: GameSettings) {
    return window.localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

export function removeRedcodeSettings() {
    return window.localStorage.removeItem(KEY_SETTINGS);
}

export function getRedcodeAutoSave(): RunSave | undefined {
    try {
        const raw = window.localStorage.getItem(KEY_AUTO);
        return raw ? (JSON.parse(raw) as RunSave) : undefined;
    } catch {
        return undefined;
    }
}

export function setRedcodeAutoSave(save: RunSave): boolean {
    try {
        window.localStorage.setItem(KEY_AUTO, JSON.stringify(save));
        return true;
    } catch {
        return false;
    }
}

export function getRedcodeFixedSave(): RunSave | undefined {
    try {
        const raw = window.localStorage.getItem(KEY_FIXED);
        return raw ? (JSON.parse(raw) as RunSave) : undefined;
    } catch {
        return undefined;
    }
}

export function setRedcodeFixedSave(save: RunSave): boolean {
    try {
        window.localStorage.setItem(KEY_FIXED, JSON.stringify(save));
        return true;
    } catch {
        return false;
    }
}
