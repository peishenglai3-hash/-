/*
 * @Author: 吴世扬 18368095041@163.com
 * @Date: 2026-08-12 15:05:04
 * @LastEditors: 吴世扬 18368095041@163.com
 * @LastEditTime: 2026-08-12 15:52:57
 * @FilePath: /github_honghu_game/src/stores/modules/director.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ref } from "vue";
import { defineStore } from "pinia";
import Phaser from "phaser";
import { GameDirector } from "@/director/GameDirector";
import { TitleScene } from "@/scenes/Title/TitleScene";
import { Scene01 } from "@/scenes/Scene01/Scene01";
import { PrologueScene02 } from "@/scenes/Scene02/PrologueScene02";
import { Ch01Sc01Scene } from "@/scenes/Scene03/Ch01Sc01Scene";

function createGame(parent: HTMLElement): Phaser.Game {
	return new Phaser.Game({
		type: Phaser.AUTO,
		parent,
		backgroundColor: "#171715",
		width: 1280,
		height: 720,
		dom: { createContainer: true },
		physics: {
			default: "arcade",
			arcade: { gravity: { x: 0, y: 0 }, debug: false },
		},
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: 1280,
			height: 720,
		},
		loader: { baseURL: import.meta.env.BASE_URL },
		scene: [TitleScene, Scene01, PrologueScene02, Ch01Sc01Scene],
	});
}

export const useDirectorStore = defineStore("director", () => {
	const instance = ref<GameDirector | null>(null);
	const game = ref<Phaser.Game | null>(null);

	function init(parent: HTMLElement) {
		const g = createGame(parent);
		const director = new GameDirector({ game: g });
		director.init();
		game.value = g;
		instance.value = director;
		(window as any).game = g;
	}

	return { instance, game, init };
});
