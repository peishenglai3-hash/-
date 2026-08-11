import type Phaser from "phaser";
import type { TransitionConfig } from "@/types/director";
import { TransitionAudioController } from "./TransitionAudio";
import { SceneTransitionController } from "./SceneTransition";
import { SCENE_EXIT } from "@/scenes/Scene01/content";
import { state } from "@/common/state";
import type { SaveData } from "@/types/common";
import { assetPath } from "@/common/paths";
import { showEndPanel } from "@/common/ui";
import { setupScene01ToScene02 } from "./flow/Scene01ToScene02";
import { setupScene02ToSettlement } from "./flow/Scene02ToSettlement";
import { setupDebugRoute } from "./flow/DebugRoute";

export interface DirectorOptions {
	game: Phaser.Game;
}

export class GameDirector {
	game: Phaser.Game;
	transitionAudio: TransitionAudioController;
	bgm: HTMLAudioElement;
	controller: SceneTransitionController | null = null;

	constructor({ game }: DirectorOptions) {
		this.game = game;
		this.transitionAudio = new TransitionAudioController();
		this.bgm = new Audio(assetPath("/assets/audio/prologue_bgm.wav"));
		this.bgm.loop = true;
		this.bgm.volume = 0.35;
	}

	init(): void {
		setupDebugRoute(this);
		setupScene01ToScene02(this);
		setupScene02ToSettlement(this);
	}

	/* ===== 通用 ===== */

	runTransition(config: TransitionConfig, onComplete: () => void): void {
		this.controller?.cancel();
		this.controller = new SceneTransitionController({
			audio: this.transitionAudio,
			entries: config.entries,
			cues: config.cues,
			revealEntryId: config.revealEntryId,
			revealImageSrc: config.revealImage,
			onComplete,
		});
		this.controller.start();
	}

	/* ===== 序章结算 ===== */

	finishPrologue(): void {
		const save: SaveData = {
			checkpoint: SCENE_EXIT.nextSceneCanonical,
			checkpointLabel: "1927年，陈继南家中醒来",
			profile: state.profile,
			choice: state.choice?.id ?? null,
			choiceTag: state.choice?.flag ?? null,
			echo: state.choice?.echo_summary ?? null,
			tags: [...state.flags],
			fixed: ["PROLOGUE_COMPLETED", "TIME_TRAVEL_CHECKPOINT"],
			risk: { identity: 0, execution: 0, coordination: 0 },
			exit: SCENE_EXIT,
		};
		try {
			window.localStorage.setItem(
				"redcode.prologue.flags",
				JSON.stringify([...state.flags]),
			);
			window.localStorage.setItem(
				"redcode.prologue.save",
				JSON.stringify(save),
			);
		} catch {
			/* storage unavailable */
		}
		window.dispatchEvent(
			new CustomEvent("prologue:scene-exit", {
				detail: structuredClone(save),
			}),
		);
		showEndPanel(save);
	}
}
