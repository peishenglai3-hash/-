import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { state } from "@/common/state";
import {
	showTask,
	closeTask,
	hideTask,
	showPrompt,
	hidePrompt,
	playNarrative,
	advanceNarrative,
	showItem,
	closeItem,
	hideItem,
	itemPanelOpen,
	showChoices,
	hideChoices,
	showResult,
	hideResult,
	hideDialogue,
	fadeToBlack,
	togglePause,
	clearFade,
} from "@/common/ui";
import {
	INTRO_NARRATIVE,
	OBS_BASIN_NARRATIVE,
	OBS_DESK_NARRATIVE,
	OBS_DOOR_NARRATIVE,
	CHOICE1_INTRO,
	CHOICES,
	PROFILE_DELTAS,
	INK_NARRATIVE,
	TASKS_CH01_SC01,
	PROP_PATHS,
} from "./ch01Sc01.content";
import type { Choice } from "./ch01Sc01.content";
import { FLAGS } from "./ch01Sc01.flags";
import { assetPath } from "@/common/paths";
import { SaveManager } from "@/common/save";
// @ts-ignore Shared developer tools support both grid and pixel-coordinate scenes.
import { CollisionEditor } from "../../zone-editor.js";
// @ts-ignore Legacy actor collider helpers are shared by the editor.
import { ensureActorColliderConfig, createActorColliderEntry } from "../../actor-collider.js";

const WORLD_W = 1672;
const WORLD_H = 941;
const PLAYER_FRAME = {
	down: { width: 133, height: 302 },
	up: { width: 138, height: 273 },
	left: { width: 138, height: 266 },
	right: { width: 134, height: 297 },
};
const PLAYER_DISPLAY_HEIGHT = 280;
const CAMERA_ZOOM = 0.765;

interface ManifestData {
	spawns: { id: string; position: [number, number]; facing: string }[];
	collision: {
		id: string;
		rect: [number, number, number, number];
		kind?: string;
	}[];
	interactions: {
		id: string;
		prompt?: string;
		rect: [number, number, number, number];
		type?: string;
		prop_icon?: string;
		prompt_anchor?: [number, number];
	}[];
	objectives?: {
		id: string;
		kind: string;
		position: [number, number];
		anchor: [number, number];
	}[];
	exits?: {
		id: string;
		rect: [number, number, number, number];
		target_scene: string;
		initially_blocked: boolean;
	}[];
}

export class Ch01Sc01Scene extends Phaser.Scene {
	zoneEditor: any;
	playerColliderProfile: any;
	actorColliderEntries: any[] = [];
	manifest!: ManifestData;
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	playerDirection: string = "down";
	keyMap!: ReturnType<typeof createKeyMap>;
	camera!: Phaser.Cameras.Scene2D.Camera;
	collisionRects!: {
		id: string;
		x: number;
		y: number;
		width: number;
		height: number;
	}[];
	observationMarks: Phaser.GameObjects.Text[] = [];
	videoOverlay?: Phaser.GameObjects.Video;
	bgm?: Phaser.Sound.BaseSound;

	constructor() {
		super("Ch01Sc01Scene");
	}

	resetHud() {
		// Clear any leftover HUD from the prologue so Chapter 1 starts clean.
		hideTask();
		hideDialogue();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
	}

	preload() {
		this.load.json(
			"ch01_sc01_manifest",
			"data/ch01_sc01_chen_home_wake_manifest.json",
		);
		this.load.image(
			"ch01_sc01_bg",
			"assets/ch01/sc01/map/ch01_sc01_base.png",
		);
		this.load.video(
			"ch01_sc01_intro",
			"assets/ch01/sc01/video/intro_ch01_sc01.mp4",
		);
		this.load.audio("ch01_sc01_bgm", "assets/ch01/sc01/audio/bgm_ch01.mp3");

		const dirs: ("down" | "up" | "left" | "right")[] = [
			"down",
			"up",
			"left",
			"right",
		];
		for (const dir of dirs) {
			this.load.spritesheet(
				`chen-walk-${dir}`,
				`assets/ch01/sc01/sprites/walk_${dir}.png`,
				{
					frameWidth: PLAYER_FRAME[dir].width,
					frameHeight: PLAYER_FRAME[dir].height,
				},
			);
		}
		// Prop icons are loaded on demand by the Vue ItemPanel; no Phaser preload needed.
	}

	create() {
		this.resetHud();
		this.manifest = this.cache.json.get("ch01_sc01_manifest");
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.add.image(WORLD_W / 2, WORLD_H / 2, "ch01_sc01_bg").setDepth(-20);
		this.buildCollision();

		const spawn = (id: string) =>
			this.manifest.spawns.find((entry) => entry.id === id);
		const playerSpawn = spawn("PLAYER_CHENJINNAN")!;
		this.player = this.physics.add
			.sprite(
				playerSpawn.position[0],
				playerSpawn.position[1],
				"chen-walk-down",
			)
			.setOrigin(0.5, 1)
			.setDepth(800);
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true);
		this.player.setVisible(false);
		this.setupPlayerVisual();

		// Static camera: show the full map centered on screen.
		this.camera = this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);
		this.setupZoneEditor();

		this.keyMap = createKeyMap(this);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "ADVANCE", () => {
			if (state.mode === "result") this.beginInkEvent();
			else if (state.inNarrative) advanceNarrative();
			else if (itemPanelOpen()) closeItem();
		});
		onAction(this, "PAUSE", () => togglePause());
		(window as any).ch01Sc01Game = this;

		this.bgm = this.sound.add("ch01_sc01_bgm", {
			loop: true,
			volume: 0.35,
		});
		this.bgm.play();

		if (!state.flags.has(FLAGS.VIDEO_SEEN)) {
			this.playIntroVideo();
		} else {
			this.beginExplore();
		}
		this.updateObservationMarks();
	}

	playIntroVideo() {
		state.mode = "intro";
		state.playerLocked = true;
		this.videoOverlay = this.add
			.video(WORLD_W / 2, WORLD_H / 2, "ch01_sc01_intro")
			.setDepth(2000);
		this.videoOverlay.setDisplaySize(WORLD_W, WORLD_H);
		this.videoOverlay.play();
		this.videoOverlay.on("complete", () => {
			state.flags.add(FLAGS.VIDEO_SEEN);
			this.videoOverlay?.destroy();
			this.videoOverlay = undefined;
			this.startIntroNarrative();
		});
		// Fallback: allow skip with interact after 1s
		this.time.delayedCall(1000, () => {
			onAction(this, "INTERACT", () => {
				if (this.videoOverlay) {
					this.videoOverlay.stop();
					this.videoOverlay.destroy();
					this.videoOverlay = undefined;
					state.flags.add(FLAGS.VIDEO_SEEN);
					this.startIntroNarrative();
				}
			});
		});
	}

	startIntroNarrative() {
		state.mode = "narrative";
		playNarrative(INTRO_NARRATIVE, () => this.beginExplore());
	}

	beginExplore() {
		state.mode = "explore";
		state.playerLocked = false;
		showTask(TASKS_CH01_SC01.explore);
		// 固定存档点：玩家进入陈继南家中、场景整体呈现时后台自动建立（幂等）
		SaveManager.writeFixedCheckpoint();
	}

	setupPlayerVisual() {
		for (const dir of ["down", "up", "left", "right"] as const) {
			this.anims.create({
				key: `chen-walk-${dir}-anim`,
				frames: this.anims.generateFrameNumbers(`chen-walk-${dir}`, {
					start: 0,
					end: 7,
				}),
				frameRate: 8,
				repeat: -1,
			});
		}
		const frame = PLAYER_FRAME.down;
		const displayWidth = Math.round(
			(frame.width / frame.height) * PLAYER_DISPLAY_HEIGHT,
		);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, "chen-walk-down", 0)
			.setOrigin(0.5, 1)
			.setDisplaySize(displayWidth, PLAYER_DISPLAY_HEIGHT)
			.setDepth(801);
	}

	syncPlayerVisual(direction: string, moving: boolean) {
		if (!this.playerVisual) return;
		const dir = direction as keyof typeof PLAYER_FRAME;
		const frame = PLAYER_FRAME[dir];
		const displayWidth = Math.round(
			(frame.width / frame.height) * PLAYER_DISPLAY_HEIGHT,
		);
		this.playerVisual
			.setPosition(this.player.x, this.player.y)
			.setDisplaySize(displayWidth, PLAYER_DISPLAY_HEIGHT)
			.setFlipX(false);
		if (moving) {
			const animation = `chen-walk-${direction}-anim`;
			if (
				this.playerVisual.anims.currentAnim?.key !== animation ||
				!this.playerVisual.anims.isPlaying
			)
				this.playerVisual.play(animation);
			return;
		}
		this.playerVisual.anims.stop();
		this.playerVisual.setTexture(`chen-walk-${direction}`, 0);
	}

	buildCollision() {
		this.collisionRects = this.manifest.collision.map((item) => {
			const [x, y, width, height] = item.rect;
			return { id: item.id, x, y, width, height };
		});
	}

	setupActorCollider() {
		this.playerColliderProfile = ensureActorColliderConfig(this.manifest as any, "PLAYER", {
			offset: [-28, -36],
			size: [56, 36],
		});
		this.actorColliderEntries = [createActorColliderEntry({
			id: "ACTOR_PLAYER",
			label: "玩家",
			getActor: () => this.player,
			getProfile: () => this.playerColliderProfile,
			tileSize: 1,
		})];
	}

	applyPlayerColliderBody() {
		const profile = this.playerColliderProfile;
		if (!profile || !this.player) return;
		this.player.setSize(profile.size[0], profile.size[1])
			.setOffset(PLAYER_FRAME.down.width / 2 + profile.offset[0], PLAYER_FRAME.down.height + profile.offset[1]);
	}

	setupZoneEditor() {
		const file = "public/data/ch01_sc01_chen_home_wake_manifest.json";
		const documents = { [file]: this.manifest as any };
		this.zoneEditor = new CollisionEditor(this, {
			documents,
			tileSize: 1,
			snapStep: 1,
			getCollisions: () => (this.manifest as any).collision,
			getInteractions: () => (this.manifest as any).interactions,
			getForegrounds: () => {
				const manifest = this.manifest as any;
				manifest.foreground_occlusion ??= { reserved: true, objects: [] };
				manifest.foreground_occlusion.objects ??= [];
				return manifest.foreground_occlusion.objects;
			},
			getDefaultForegroundDepth: () => 2000,
			getWorldSize: () => [WORLD_W, WORLD_H],
			getActorColliders: () => this.actorColliderEntries,
			getMagneticSource: () => this.textures.get("ch01_sc01_bg").getSourceImage(),
			replaceDocuments: (next: any) => {
				this.manifest = next[file];
				documents[file] = this.manifest as any;
				this.setupActorCollider();
			},
			onChange: (kind: string) => {
				if (!kind || kind === "collision") {
					this.buildCollision();
					this.applyPlayerColliderBody();
				}
			},
		});
	}

	updateObservationMarks() {
		for (const mark of this.observationMarks) mark.destroy();
		this.observationMarks = [];
		if (!this.manifest.objectives) return;
		const observations = this.manifest.objectives.filter(
			(o) => o.kind === "observation",
		);
		for (const obs of observations) {
			const flagMap: Record<string, string> = {
				OBS_BASIN: FLAGS.OBS_BASIN,
				OBS_DESK: FLAGS.OBS_DESK,
				OBS_DOOR: FLAGS.OBS_DOOR,
			};
			const flag = flagMap[obs.id];
			if (flag && state.flags.has(flag)) continue;
			const [x, y] = obs.anchor;
			const mark = this.add
				.text(x, y, "!", {
					fontFamily: "monospace",
					fontSize: "48px",
					color: "#ff2222",
					stroke: "#000000",
					strokeThickness: 4,
				})
				.setOrigin(0.5)
				.setDepth(1000);
			this.tweens.add({
				targets: mark,
				scale: { from: 1, to: 1.2 },
				duration: 600,
				yoyo: true,
				repeat: -1,
			});
			this.observationMarks.push(mark);
		}
	}

	handleConfirm() {
		if (state.taskOpen) return closeTask();
		if (itemPanelOpen()) return closeItem();
		this.interact();
	}

	update() {
		if (this.physics.world.debugGraphic)
			this.physics.world.debugGraphic.setVisible(false);
		const canWalk = state.mode === "explore";
		if (!this.player || state.playerLocked || state.paused || !canWalk) {
			if (this.player) {
				this.player.setVelocity(0, 0);
				this.syncPlayerVisual(this.playerDirection, false);
			}
			return;
		}
		const speed = 220;
		let x = 0;
		let y = 0;
		if (isActionDown(this.keyMap, "MOVE_LEFT")) x -= 1;
		if (isActionDown(this.keyMap, "MOVE_RIGHT")) x += 1;
		if (isActionDown(this.keyMap, "MOVE_UP")) y -= 1;
		if (isActionDown(this.keyMap, "MOVE_DOWN")) y += 1;
		const vector = new Phaser.Math.Vector2(x, y)
			.normalize()
			.scale(speed * (this.game.loop.delta / 1000));
		this.tryMove(vector.x, vector.y);
		if (x !== 0 || y !== 0) {
			if (Math.abs(x) > Math.abs(y))
				this.playerDirection = x < 0 ? "left" : "right";
			if (Math.abs(y) >= Math.abs(x))
				this.playerDirection = y < 0 ? "up" : "down";
		}
		this.syncPlayerVisual(this.playerDirection, x !== 0 || y !== 0);
		this.updatePrompt();
	}

	tryMove(dx: number, dy: number) {
		const profile = this.playerColliderProfile;
		const canOccupy = (nextX: number, nextY: number) => {
			const left = nextX + profile.offset[0];
			const top = nextY + profile.offset[1];
			const width = profile.size[0];
			const height = profile.size[1];
			if (
				left < 0 || top < 0 || left + width > WORLD_W || top + height > WORLD_H
			)
				return false;
			return !this.collisionRects.some(
				(rect) =>
					left + width > rect.x &&
					left < rect.x + rect.width &&
					top + height > rect.y &&
					top < rect.y + rect.height,
			);
		};
		if (canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
		if (canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
	}

	updatePrompt() {
		const nearby = this.nearby();
		showPrompt(nearby ? `${nearby.prompt || nearby.id}  ·  E` : "");
	}

	nearby():
		| {
				id: string;
				prompt?: string;
				rect: [number, number, number, number];
				type?: string;
				prop_icon?: string;
		  }
		| undefined {
		const px = this.player.x;
		const py = this.player.y;
		const targets: {
			id: string;
			prompt?: string;
			rect: [number, number, number, number];
			type?: string;
			prop_icon?: string;
		}[] = [];
		// Dynamic event targets take precedence over static inspect targets
		if (
			state.flags.has(FLAGS.OBS_BASIN) &&
			state.flags.has(FLAGS.OBS_DESK) &&
			state.flags.has(FLAGS.OBS_DOOR) &&
			!state.flags.has(FLAGS.INK_DONE)
		) {
			targets.push({
				id: "FAMILY_CHOICE1",
				prompt: "回应家人",
				rect: [640, 448, 192, 128],
				type: "event",
			});
		}
		if (
			state.flags.has(FLAGS.INK_DONE) &&
			!state.flags.has(FLAGS.SCENE_COMPLETE)
		) {
			targets.push({
				id: "EXIT_COURTYARD",
				prompt: "推开木门",
				rect: [1280, 128, 160, 384],
				type: "event",
			});
		}
		targets.push(...this.manifest.interactions);
		return targets.find((target) => {
			const [x, y, width, height] = target.rect;
			return (
				px >= x - 32 &&
				px <= x + width + 32 &&
				py >= y - 32 &&
				py <= y + height + 32
			);
		});
	}

	interact() {
		if (state.playerLocked || state.mode !== "explore") return;
		const target = this.nearby();
		if (!target) return;
		if (target.id === "copper_basin") return this.observeBasin();
		if (target.id === "book") return this.observeDesk();
		if (target.id === "outer_gown") return this.observeDoor();
		if (target.id === "FAMILY_CHOICE1") return this.startChoice1();
		if (
			target.id === "inkstone_paper" &&
			state.flags.has(FLAGS.INK_DONE) === false &&
			state.choice
		)
			return this.startInkEvent();
		if (target.id === "EXIT_COURTYARD") return this.completeScene();
		// Generic inspect items
		if (target.prop_icon) {
			showItem({
				icon: assetPath(
					`/assets/ch01/sc01/props/${target.prop_icon}_Icon_v01.png`,
				),
				title: target.prompt || "查看",
				text: target.id,
			});
		}
	}

	observeBasin() {
		state.mode = "narrative";
		playNarrative(OBS_BASIN_NARRATIVE, () => {
			state.flags.add(FLAGS.OBS_BASIN);
			this.updateObservationMarks();
			this.checkObservationsComplete();
			state.mode = "explore";
		});
	}

	observeDesk() {
		state.mode = "narrative";
		playNarrative(OBS_DESK_NARRATIVE, () => {
			state.flags.add(FLAGS.OBS_DESK);
			this.updateObservationMarks();
			this.checkObservationsComplete();
			showItem({
				icon: PROP_PATHS.PAPERWEIGHT,
				title: "镇纸压纸",
				text: "纸上有几行未写完的字，最下面一行墨色比别处新一些：陳繼南。",
			});
			state.mode = "explore";
		});
	}

	observeDoor() {
		state.mode = "narrative";
		playNarrative(OBS_DOOR_NARRATIVE, () => {
			state.flags.add(FLAGS.OBS_DOOR);
			this.updateObservationMarks();
			this.checkObservationsComplete();
			showItem({
				icon: PROP_PATHS.HAORI,
				title: "外褂",
				text: "衣摆沾着干泥，像是白天出过门。",
			});
			state.mode = "explore";
		});
	}

	checkObservationsComplete() {
		if (
			state.flags.has(FLAGS.OBS_BASIN) &&
			state.flags.has(FLAGS.OBS_DESK) &&
			state.flags.has(FLAGS.OBS_DOOR)
		) {
			showTask(TASKS_CH01_SC01.choice);
			showPrompt("回应家人 · E");
		}
	}

	startChoice1() {
		state.mode = "narrative";
		state.playerLocked = true;
		playNarrative(CHOICE1_INTRO, () => {
			state.mode = "choice";
			showChoices(
				CHOICES,
				(id: string) => this.choose(id),
				"你如何回应家人？",
			);
		});
	}

	choose(id: string) {
		const choice = CHOICES.find((item) => item.id === id);
		if (!choice) return;
		state.choice = choice;
		for (const [axis, delta] of Object.entries(
			PROFILE_DELTAS[choice.id] ?? {},
		))
			state.profile[axis] += delta;
		state.flags.add(choice.flag);
		hideChoices();
		showResult(choice);
		state.mode = "result";
		this.saveProgress();
	}

	beginInkEvent() {
		hideResult();
		state.mode = "explore";
		state.playerLocked = false;
		showTask(TASKS_CH01_SC01.ink);
	}

	startInkEvent() {
		state.mode = "narrative";
		state.playerLocked = true;
		showItem({
			icon: PROP_PATHS.INK_PEN,
			title: "未干的墨",
			text: "砚中的墨还没有完全干透，笔杆磨得光滑。",
		});
		playNarrative(INK_NARRATIVE, () => {
			state.flags.add(FLAGS.INK_DONE);
			hideItem();
			showTask(TASKS_CH01_SC01.leave);
			state.mode = "explore";
			state.playerLocked = false;
			this.saveProgress();
		});
	}

	completeScene() {
		state.mode = "transition";
		state.playerLocked = true;
		state.flags.add(FLAGS.SCENE_COMPLETE);
		hideTask();
		showPrompt("");
		hideItem();
		hideDialogue();
		fadeToBlack();
		this.saveProgress();
		this.game.events.emit("ch01:sc01-complete");
	}

	saveProgress() {
		SaveManager.autosave("CH01_SC01");
	}
}
