import type Phaser from "phaser";
import { useGameSaveStore } from "@/stores/modules/gameSave";

// Phaser 的 SoundManager 是全局总线。项目里的战斗音效使用 Web Audio，
// 因此这里把 Phaser 音轨明确标记为 BGM，并把总音量留给 BGM 设置控制。
const REFERENCE_BGM_VOLUME = 0.35;

function resolveVolume(baseVolume: number, userVolume: number): number {
	if (userVolume <= 0) return 0;
	return Math.min(1, Math.max(0, baseVolume * (userVolume / REFERENCE_BGM_VOLUME)));
}

export function addManagedBgm(
	scene: Phaser.Scene,
	key: string,
	baseVolume: number,
): Phaser.Sound.BaseSound {
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
