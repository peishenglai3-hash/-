import Phaser from "phaser";
import { onAction } from "@/common/actions";
import {
	advanceNarrative,
	clearFade,
	hideChoices,
	hideDialogue,
	hideEndPanel,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	playNarrative,
} from "@/common/ui";
import {
	mountLayeredMap,
	preloadLayeredMap,
	type LayeredMapObjectDocument,
} from "@/common/layeredMap";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	CH04_WANGYE_TEMPLE_MAPS,
	type Ch04TempleShot,
} from "./ch04WangyeTempleMap";
import { CH04_WANGYE_TEMPLE_SCENE1 } from "./ch04Scene1.content";
import {
	createCh04TempleFlag,
	preloadCh04TempleCharacters,
	setupCh04TempleActors,
} from "./ch04TemplePresentation";

const WORLD_W = 1664;
const WORLD_H = 936;
const CAMERA_ZOOM = 1280 / WORLD_W;
const SCENE_COMPLETE_FLAG = "CH04_SCENE1_COMPLETE";
const FLAG_REVEAL_ENTRY = "CH04_SC01_FLAG_REVEAL";

/**
 * 第四章场景一：戴家场王爷庙戏台。
 *
 * 这是固定镜头叙事，不开放自由移动。地图 L01-L04/L06-L07 由统一的
 * layered-map 管线挂载，人物从 L05 的命名出生点运行时生成，远景人影
 * 只用于表现“画面之外还有人”，不把四千人做成独立节点。
 */
export class Ch04WangyeTempleScene extends Phaser.Scene {
	shot: Ch04TempleShot = "SHOT_WIDE";
	definition = CH04_WANGYE_TEMPLE_MAPS.SHOT_WIDE;
	objectDocument!: LayeredMapObjectDocument;
	actors: Phaser.GameObjects.Image[] = [];
	ambientActors: Phaser.GameObjects.Image[] = [];
	flagGraphic?: Phaser.GameObjects.Graphics;
	narrativeEntryListener?: (event: Event) => void;
	completed = false;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch04WangyeTempleScene");
	}

	init(data?: { shot?: Ch04TempleShot }) {
		this.shot = data?.shot && data.shot in CH04_WANGYE_TEMPLE_MAPS ? data.shot : "SHOT_WIDE";
		this.definition = CH04_WANGYE_TEMPLE_MAPS[this.shot];
		this.actors = [];
		this.ambientActors = [];
		this.flagGraphic = undefined;
		this.narrativeEntryListener = undefined;
		this.completed = false;
	}

	preload() {
		this.definition = CH04_WANGYE_TEMPLE_MAPS[this.shot];
		preloadLayeredMap(this, this.definition);
		preloadCh04TempleCharacters(this);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.cameras.main.setBackgroundColor("#c5b28f");

		const mounted = mountLayeredMap(this, this.definition);
		this.objectDocument = mounted.objectDocument as LayeredMapObjectDocument;
		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);

		const people = setupCh04TempleActors(this, this.objectDocument);
		this.actors = people.actors;
		this.ambientActors = people.ambientActors;
		this.flagGraphic = createCh04TempleFlag(this, 0);
		this.setupNarrativeEntryListener();
		this.completed = this.state.flags.has(SCENE_COMPLETE_FLAG);
		this.state.playerLocked = true;
		this.state.mode = this.completed ? "end" : "narrative";

		if (this.completed) {
			this.revealFlag(true);
		} else {
			this.time.delayedCall(160, () => {
				if (this.scene.isActive()) playNarrative(CH04_WANGYE_TEMPLE_SCENE1, () => this.completeScene());
			});
		}

		onAction(this, "INTERACT", () => this.handleAdvance());
		onAction(this, "ADVANCE", () => this.handleAdvance());
		(window as any).ch04WangyeTempleGame = this;
	}

	resetHud() {
		hideEndPanel();
		hideTask();
		hideDialogue();
		hideInfoPanel();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
	}

	revealFlag(immediate = false) {
		if (!this.flagGraphic) return;
		if (immediate) {
			this.flagGraphic.setAlpha(1);
			return;
		}
		this.tweens.add({ targets: this.flagGraphic, alpha: 1, duration: 480, ease: "Cubic.Out" });
	}

	setupNarrativeEntryListener() {
		this.narrativeEntryListener = (event: Event) => {
			const entryId = (event as CustomEvent<{ entryId?: string }>).detail?.entryId;
			if (entryId === FLAG_REVEAL_ENTRY) this.revealFlag();
		};
		window.addEventListener("honghu:narrative-entry", this.narrativeEntryListener);
	}

	handleAdvance() {
		if (this.state.inNarrative) advanceNarrative();
	}

	completeScene() {
		if (this.completed) return;
		this.completed = true;
		this.state.flags.add(SCENE_COMPLETE_FLAG);
		this.state.mode = "end";
		this.state.playerLocked = true;
		useGameSaveStore().autosave("CH04_WANGYE_TEMPLE");
		this.game.events.emit("ch04:wangye-temple-complete");
	}

	shutdown() {
		if (this.narrativeEntryListener)
			window.removeEventListener("honghu:narrative-entry", this.narrativeEntryListener);
		this.narrativeEntryListener = undefined;
		if ((window as any).ch04WangyeTempleGame === this)
			delete (window as any).ch04WangyeTempleGame;
	}
}
