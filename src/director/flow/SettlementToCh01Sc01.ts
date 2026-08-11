import type { GameDirector } from "../GameDirector";
import { state } from "@/common/state";
import { hideIntro } from "@/common/ui";
import type { SaveData } from "@/types/common";

export function setupSettlementToCh01Sc01(director: GameDirector): void {
	window.addEventListener("prologue:scene-exit", ((
		event: CustomEvent<SaveData>,
	) => {
		const save = event.detail;
		// Restore prologue profile and flags into runtime state
		if (save?.profile) {
			for (const [axis, value] of Object.entries(save.profile))
				state.profile[axis] = value;
		}
		if (save?.tags) {
			for (const tag of save.tags) state.flags.add(tag);
		}
		if (save?.fixed) {
			for (const tag of save.fixed) state.flags.add(tag);
		}
		// Hide any leftover intro UI and stop previous scenes
		hideIntro();
		director.game.scene.stop("Scene01");
		director.game.scene.stop("PrologueScene02");
		// Start Chapter 1 Scene 1 (auto-save on scene switch)
		director.enterScene("Ch01Sc01Scene", "CH01_SC01");
	}) as EventListener);
}
