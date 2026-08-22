/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-13 15:18:29
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-13 15:30:55
 * @FilePath: /github_honghu_game/src/utils/storage.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import {
    KEY_SETTINGS,
    KEY_AUTO,
    KEY_FIXED,
    KEY_AUTO_BACKUP,
    KEY_FIXED_BACKUP,
    KEY_MANUAL_PREFIX,
    KEY_MANUAL_BACKUP_PREFIX,
    KEY_REPLAY_ENTRY_PREFIX,
    type ManualSaveSlot,
} from '@/constants/storage';
import type { GameSettings, RunSave } from '@/types/common';

function readJson<T>(key: string): T | undefined {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
        return undefined;
    }
}

function writeWithBackup(key: string, backupKey: string, value: unknown): boolean {
    try {
        const previous = window.localStorage.getItem(key);
        if (previous) window.localStorage.setItem(backupKey, previous);
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function getRedcodeSettings(): GameSettings | undefined {
    try {
        const raw = window.localStorage.getItem(KEY_SETTINGS);
        return raw ? (JSON.parse(raw) as GameSettings) : undefined;
    } catch {
        return undefined;
    }
}

export function setRedcodeSettings(settings: GameSettings) {
    try {
        window.localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
        return true;
    } catch {
        return false;
    }
}

export function removeRedcodeSettings() {
    return window.localStorage.removeItem(KEY_SETTINGS);
}

export function getRedcodeAutoSave(): RunSave | undefined {
    return readJson<RunSave>(KEY_AUTO);
}

export function setRedcodeAutoSave(save: RunSave): boolean {
    return writeWithBackup(KEY_AUTO, KEY_AUTO_BACKUP, save);
}

export function getRedcodeAutoSaveBackup(): RunSave | undefined {
    return readJson<RunSave>(KEY_AUTO_BACKUP);
}

export function getRedcodeFixedSave(): RunSave | undefined {
    return readJson<RunSave>(KEY_FIXED);
}

export function setRedcodeFixedSave(save: RunSave): boolean {
    return writeWithBackup(KEY_FIXED, KEY_FIXED_BACKUP, save);
}

export function getRedcodeFixedSaveBackup(): RunSave | undefined {
    return readJson<RunSave>(KEY_FIXED_BACKUP);
}

export function getRedcodeManualSave(slot: ManualSaveSlot): RunSave | undefined {
    return readJson<RunSave>(`${KEY_MANUAL_PREFIX}${slot}`);
}

export function getRedcodeManualSaveBackup(slot: ManualSaveSlot): RunSave | undefined {
    return readJson<RunSave>(`${KEY_MANUAL_BACKUP_PREFIX}${slot}`);
}

export function setRedcodeManualSave(slot: ManualSaveSlot, save: RunSave): boolean {
    return writeWithBackup(
        `${KEY_MANUAL_PREFIX}${slot}`,
        `${KEY_MANUAL_BACKUP_PREFIX}${slot}`,
        save,
    );
}

export function getRedcodeReplayEntry(chapter: 1 | 2 | 3 | 4): RunSave | undefined {
    return readJson<RunSave>(`${KEY_REPLAY_ENTRY_PREFIX}${chapter}`);
}

export function setRedcodeReplayEntry(chapter: 1 | 2 | 3 | 4, save: RunSave): boolean {
    try {
        window.localStorage.setItem(`${KEY_REPLAY_ENTRY_PREFIX}${chapter}`, JSON.stringify(save));
        return true;
    } catch {
        return false;
    }
}
