import Phaser from "phaser";
import type { GameDirector } from "../GameDirector";
import { state } from "@/common/state";
import { ambience } from "@/common/ambience";
import { hideIntro } from "@/common/ui";

export function setupDebugRoute(director: GameDirector): void {
	if (new URLSearchParams(window.location.search).get("scene") !== "02")
		return;

	director.game.events.once(Phaser.Core.Events.READY, () => {
		hideIntro();
		director.leaveTitle();
		director.game.scene.stop("Scene01");
		state.mode = "intro";
		ambience.unlock();
		ambience.startRoom();
		director.game.scene.start("PrologueScene02");
	});
}
