import type Phaser from "phaser";
import { useGameSaveStore } from "@/stores/modules/gameSave";

// Phaser 的 SoundManager 是全局总线。项目里的战斗音效使用 Web Audio，
// 因此这里把 Phaser 音轨明确标记为 BGM，并把总音量留给 BGM 设置控制。
const REFERENCE_BGM_VOLUME = 0.35;

function resolveVolume(baseVolume: number, userVolume: number): number {
	if (userVolume <= 0) return 0;
	return Math.min(1, Math.max(0, baseVolume * (userVolume / REFERENCE_BGM_VOLUME)));
}

/**
 * BGM 是全局 Phaser SoundManager 资源，不随场景对象自动隔离。
 * 每次创建新的受管 BGM 前，先清理旧的受管 BGM，避免场景切换或热重载
 * 时出现两首章节音乐叠在一起；普通 SFX 不带这个标记，不会被误关掉。
 */
export function stopManagedBgms(soundManager: any): void {
	for (const sound of soundManager.getAll?.() ?? []) {
		const managedSound = sound as Phaser.Sound.BaseSound & {
			__redcodeAudioBus?: "bgm";
		};
		if (managedSound.__redcodeAudioBus !== "bgm") continue;
		managedSound.stop();
		managedSound.destroy();
	}
}

export function addManagedBgm(
	scene: Phaser.Scene,
	key: string,
	baseVolume: number,
): Phaser.Sound.BaseSound {
	stopManagedBgms(scene.sound);
	const userVolume = useGameSaveStore().getSettings().bgmVolume;
	const sound = scene.sound.add(key, {
		loop: true,
		volume: resolveVolume(baseVolume, userVolume),
	});
	const managedSound = sound as Phaser.Sound.BaseSound & {
		__redcodeAudioBus?: "bgm";
		__redcodeBgmBaseVolume?: number;
	};
	managedSound.__redcodeAudioBus = "bgm";
	managedSound.__redcodeBgmBaseVolume = baseVolume;
	return sound;
}

export function applyManagedBgmVolume(
	soundManager: any,
	userVolume: number,
): void {
	for (const sound of soundManager.getAll()) {
		const managedSound = sound as Phaser.Sound.BaseSound & {
			__redcodeAudioBus?: "bgm";
			__redcodeBgmBaseVolume?: number;
		};
		if (managedSound.__redcodeAudioBus !== "bgm") continue;
		(managedSound as any).setVolume?.(resolveVolume(managedSound.__redcodeBgmBaseVolume ?? 1, userVolume));
	}
}
