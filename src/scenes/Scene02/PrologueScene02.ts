import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { state } from "@/common/state";
import {
	showTask,
	closeTask,
	showPrompt,
	playNarrative,
	advanceNarrative,
	showItem,
	closeItem,
	itemPanelOpen,
	showItemPassive,
	hideItem,
	fadeToBlack,
	togglePause,
	showFlavor,
} from "@/common/ui";
import { useHudStore } from "@/stores/modules/hud";
import { ambience } from "@/common/ambience";
import { assetPath } from "@/common/paths";
import {
	createModernPlayerWalkAnimations,
	MODERN_PLAYER_SOURCE_FRAME,
	modernWalkFrameKey,
	preloadModernPlayerWalk,
	setModernPlayerDirection,
} from "@/common/modernPlayerWalk";
// @ts-ignore Legacy developer editor is shared by the TS scenes.
import { CollisionEditor } from "../../zone-editor.js";
// @ts-ignore Legacy actor collider helpers are shared by the editor.

import { actorColliderBottomAt, ensureActorColliderConfig, createActorColliderEntry, ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";
import {
	OPENING,
	AUDIO_REVIEW,
	WRITE_QUESTION,
	FALL_ASLEEP,
	TASKS,
	PROP_LINES,
	ONE_LINERS,
	FLAVOR_SPOTS,
} from "./content";

const PX = 32;
const PLAYER_FRAME = MODERN_PLAYER_SOURCE_FRAME;
const PLAYER_VIEW_HEIGHT = 160;
const PLAYER_DIRECTIONS = ["down", "left", "right", "up"] as const;
const DOOR_STAND = { x: 8.2 * PX, y: 34 * PX };
const SIDE_VIEW_HEIGHT = 160;
const OBJECTIVE_ANCHORS: Record<string, [number, number]> = {
	recorder: [28.25 * PX, 470],
	notebook: [32.25 * PX, 460],
	bed: [460, 560],
};

interface LogicData {
	logical_grid: { width: number; height: number };
	world_size: [number, number];
	player_spawn: { position: [number, number]; facing: string };
	collision_zones: { id: string; rect: [number, number, number, number] }[];
	story_state_bindings: {
		apply_order: string[];
		flag_map: Record<string, string>;
	};
	walkable_area: { rect: [number, number, number, number] }[];
}

interface InteractionZone {
	rect?: [number, number, number, number];
	action?: string;
	prompt?: string;
	line?: string;
	repeat_line?: string;
	repeat_line_state?: Record<string, string>;
	blocked_line?: string;
}

interface InteractionData {
	margin_tiles: number;
	zones: InteractionZone[];
}

export class PrologueScene02 extends Phaser.Scene {
	zoneEditor: any;
	playerColliderProfile: any;
	actorColliderEntries: any[] = [];

	actorVisualProfile: any;
	actorVisualEntries: any[] = [];
	background!: Phaser.GameObjects.Image;
	foregroundOcclusion: any;
	logic!: LogicData;
	interactionData!: InteractionData;
	statesData!: Record<string, Record<string, string>>;
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	playerDirection: string = "up";
	foreground!: Phaser.GameObjects.Container;
	collisionRects!: {
		id: string;
		x: number;
		y: number;
		width: number;
		height: number;
	}[];
	keyMap!: ReturnType<typeof createKeyMap>;
	objectiveMarker!: Phaser.GameObjects.Container;
	objectiveTarget: string | null = null;
	flavorArmed!: Map<string, boolean>;
	introSide: boolean = false;

	constructor() {
		super("PrologueScene02");
	}

	preload() {
		this.load.json("logic", "data/PRO02_logic.json");
		this.load.json("interactions", "data/PRO02_interactions.json");
		this.load.json("states", "data/PRO02_states.json");
		this.load.image("bg02", "assets/map/pro02_base.png");
		preloadModernPlayerWalk(this);
		this.load.image(
			"player-side-right",
			"assets/characters/player/modern/side-right.png",
		);
	}

	create() {
		this.logic = this.cache.json.get("logic");
		this.setupActorCollider();
		this.interactionData = this.cache.json.get("interactions");
		this.statesData = this.cache.json.get("states");
		this.applyInjectedStates();
		this.physics.world.setBounds(
			0,
			0,
			this.logic.logical_grid.width * PX,
			this.logic.logical_grid.height * PX,
		);
		this.add
			.image(
				this.logic.world_size[0] / 2,
				this.logic.world_size[1] / 2,
				"bg02",
			)
			.setDepth(0);
		this.foreground = this.add.container(0, 0).setDepth(100);
		this.buildCollision();
		this.setupZoneEditor();
		const spawn = this.logic.player_spawn;
		this.player = this.physics.add
			.sprite(
				spawn.position[0] * PX,
				spawn.position[1] * PX,
				modernWalkFrameKey("down", 0),
			)
			.setOrigin(0.5, 1)
			.setDepth(this.depthFor(spawn.position[1] * PX));
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true);
		this.playerDirection = spawn.facing || "up";
		this.player.setPosition(DOOR_STAND.x, DOOR_STAND.y);
		this.setupPlayerVisual();
		if (this.textures.exists("player-side-right")) {
			this.playerVisual.setTexture("player-side-right");
			this.introSide = true;
			this.applyPlayerVisualHeight(this.actorVisualProfile.display_height);
		}
		this.setupObjectiveMarker();
		this.flavorArmed = new Map(FLAVOR_SPOTS.map((spot) => [spot.id, true]));
		this.keyMap = createKeyMap(this);
		this.cameras.main
			.setBounds(0, 0, this.logic.world_size[0], this.logic.world_size[1])
			.startFollow(this.player, true, 0.08, 0.08)
			.setZoom(1);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "ADVANCE", () => {
			if (state.inNarrative) advanceNarrative();
			else if (itemPanelOpen()) closeItem();
		});
		onAction(this, "PAUSE", () => togglePause());
		if (new URLSearchParams(window.location.search).get("debug") === "1")
			this.drawDebug();
		(window as any).scene02Game = this;
		this.startOpening();
	}

	applyInjectedStates() {
		const bindings = this.logic.story_state_bindings;
		for (const stateKey of bindings.apply_order) {
			const flag = Object.keys(bindings.flag_map).find(
				(name) => bindings.flag_map[name] === stateKey,
			);
			if (!flag || !state.flags.has(flag)) continue;
			for (const [prop, value] of Object.entries(
				this.statesData[stateKey] ?? {},
			)) {
				if (prop in state.propStates) state.propStates[prop] = value;
			}
		}
	}

	depthFor(yPx: number): number {
		return 10 + yPx / PX;
	}

	buildCollision() {
		this.collisionRects = this.logic.collision_zones.map((item) => {
			const [x, y, width, height] = item.rect;
			return {
				id: item.id,
				x: x * PX,
				y: y * PX,
				width: width * PX,
				height: height * PX,
			};
		});
	}

	setupActorCollider() {
		this.playerColliderProfile = ensureActorColliderConfig(this.logic as any, "PLAYER", {
			offset: [-0.5625, -0.8125],
			size: [1.125, 1.625],
		});
		this.actorColliderEntries = [createActorColliderEntry({
			id: "ACTOR_PLAYER",
			label: "玩家",
			getActor: () => this.player,
			getProfile: () => this.playerColliderProfile,
		})];
		this.actorVisualProfile = ensureActorVisualConfig(this.logic as any, "PLAYER", PLAYER_VIEW_HEIGHT);
		this.actorVisualEntries = [createActorVisualEntry({
			id: "PLAYER",
			label: "玩家",
			getActor: () => this.playerVisual,
			getProfile: () => this.actorVisualProfile,
		})];
	}

	applyPlayerColliderBody() {
		const profile = this.playerColliderProfile;
		if (!profile || !this.player) return;
		this.player.setSize(profile.size[0] * PX, profile.size[1] * PX)
			.setOffset(PLAYER_FRAME.width / 2 + profile.offset[0] * PX, PLAYER_FRAME.height + profile.offset[1] * PX);
	}

	setupZoneEditor() {
		const logicFile = "public/data/PRO02_logic.json";
		const interactionsFile = "public/data/PRO02_interactions.json";
		const documents = { [logicFile]: this.logic as any, [interactionsFile]: this.interactionData as any };
		this.zoneEditor = new CollisionEditor(this, {
			documents,
			getCollisions: () => (this.logic as any).collision_zones,
			getInteractions: () => (this.interactionData as any).zones,
			getForegrounds: () => {
				const logic = this.logic as any;
				logic.foreground_layers ??= { reserved: true, objects: [] };
				logic.foreground_layers.objects ??= [];
				return logic.foreground_layers.objects;
			},
			getDefaultForegroundDepth: () => 100,
			getWorldSize: () => this.logic.world_size,
			getActorColliders: () => this.actorColliderEntries,
			getActorVisuals: () => this.actorVisualEntries,
			onActorVisualChange: (_id: string, height: number) => this.applyPlayerVisualHeight(height),
			getMagneticSource: () => this.textures.get("bg02").getSourceImage(),
			replaceDocuments: (next: any) => {
				this.logic = next[logicFile];
				this.interactionData = next[interactionsFile];
				documents[logicFile] = this.logic as any;
				documents[interactionsFile] = this.interactionData as any;
				this.setupActorCollider();
				this.applyPlayerVisualHeight(this.actorVisualProfile.display_height);
			},
			onChange: (kind: string) => {
				if (!kind || kind === "collision") {
					this.buildCollision();
					this.applyPlayerColliderBody();
				}
			},
		});
	}

	setupPlayerVisual() {
		createModernPlayerWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, modernWalkFrameKey("down", 0), 0)
			.setOrigin(0.5, 1)
			.setDepth(this.depthFor(this.player.y) + 0.5);
		setModernPlayerDirection(this.playerVisual, "down", PLAYER_VIEW_HEIGHT);
		this.applyPlayerVisualHeight(this.actorVisualProfile.display_height);
		this.player.setVisible(false);
	}

	applyPlayerVisualHeight(height: number) {
		if (!this.playerVisual || !Number.isFinite(height) || height <= 0) return;
		if (this.introSide && this.textures.exists("player-side-right")) {
			const source = this.textures.get("player-side-right").getSourceImage() as HTMLImageElement;
			this.playerVisual.setDisplaySize(Math.round(height * source.width / source.height), height);
			return;
		}
		setModernPlayerDirection(this.playerVisual, this.playerDirection as "down" | "left" | "right" | "up", height);
	}

	syncPlayerVisual(direction: string, moving: boolean) {
		if (!this.playerVisual) return;
		this.playerVisual
			.setPosition(this.player.x, this.player.y)
			.setDepth(this.depthFor(this.player.y) + 0.5);
		if (this.introSide) {
			if (!moving) return;
			this.introSide = false;
			setModernPlayerDirection(this.playerVisual, direction as "down" | "left" | "right" | "up", this.actorVisualProfile.display_height);
		}
		const walkDirection = direction as "down" | "left" | "right" | "up";
		const firstFrame = modernWalkFrameKey(walkDirection, 0);
		if (!this.playerVisual.texture.key.startsWith(`modern-player-${walkDirection}-`))
			setModernPlayerDirection(this.playerVisual, walkDirection, this.actorVisualProfile.display_height);
		if (moving) {
			const animation = `player-walk-${direction}-anim`;
			if (
				this.playerVisual.anims.currentAnim?.key !== animation ||
				!this.playerVisual.anims.isPlaying
			)
				this.playerVisual.play(animation);
			return;
		}
		this.playerVisual.anims.stop();
		this.playerVisual.setTexture(firstFrame, 0);
	}

	setupObjectiveMarker() {
		this.objectiveMarker = this.add
			.container(0, 0)
			.setDepth(180)
			.setVisible(false);
		const bang = this.add
			.text(0, 0, "!", {
				fontFamily: 'Georgia, "Noto Serif SC", serif',
				fontSize: "46px",
				fontStyle: "bold",
				color: "#e03428",
				stroke: "#fff6df",
				strokeThickness: 8,
			})
			.setOrigin(0.5, 1);
		this.objectiveMarker.add(bang);
		this.tweens.add({
			targets: bang,
			y: -12,
			duration: 520,
			yoyo: true,
			repeat: -1,
			ease: "Sine.easeInOut",
		});
	}

	updateObjective() {
		let target: string | null = null;
		if (state.mode === "explore" && !state.sleepStarted) {
			if (!state.audioReviewed) target = "recorder";
			else if (!state.questionWritten) target = "notebook";
			else target = "bed";
		}
		this.objectiveTarget = target;
		if (!target) return this.objectiveMarker.setVisible(false);
		const [x, y] = OBJECTIVE_ANCHORS[target];
		if (this.objectiveMarker.x !== x || this.objectiveMarker.y !== y)
			this.objectiveMarker.setPosition(x, y);
		this.objectiveMarker.setVisible(true);
	}

	updateFlavor() {
		if (state.mode !== "explore" || state.playerLocked || state.paused)
			return;
		const px = this.player.x / PX;
		const py = this.player.y / PX;
		for (const spot of FLAVOR_SPOTS) {
			const distance = Math.hypot(px - spot.at[0], py - spot.at[1]);
			if (distance <= spot.radius) {
				if (this.flavorArmed.get(spot.id)) {
					this.flavorArmed.set(spot.id, false);
					showFlavor(spot.line);
				}
			} else if (distance > spot.radius + 1) {
				this.flavorArmed.set(spot.id, true);
			}
		}
	}

	handleConfirm() {
		if (state.taskOpen) return closeTask();
		if (itemPanelOpen()) return closeItem();
		this.interact();
	}

	interact() {
		if (state.playerLocked || state.mode !== "explore") return;
		const zone = this.nearby();
		if (!zone) return;
		showPrompt("");
		switch (zone.action) {
			case "recorder_review":
				return this.recorderReview(zone);
			case "notebook_write":
				return this.notebookWrite(zone);
			case "phone_look":
				return showItem({
					icon: assetPath("/assets/items/phone-icon.png"),
					title: "手机",
					text:
						PROP_LINES.phone[state.propStates.phone] ??
						PROP_LINES.phone.default,
				});
			case "desk_look":
				return this.oneLine(ONE_LINERS.desk);
			case "bed_look":
				return this.bedLook();
			case "exit_blocked":
				return this.oneLine(zone.line ?? ONE_LINERS.exit);
			default:
				return null;
		}
	}

	recorderReview(zone: InteractionZone) {
		if (state.audioReviewed) {
			return this.oneLine(
				zone.repeat_line_state?.[state.propStates.recorder] ??
					zone.repeat_line!,
			);
		}
		state.mode = "narrative";
		ambience.play("tape");
		showItemPassive({
			icon: assetPath("/assets/items/recorder-icon.png"),
			title: "采访录音设备",
			text:
				PROP_LINES.recorder[state.propStates.recorder] ??
				PROP_LINES.recorder.default,
		});
		playNarrative(AUDIO_REVIEW, () => {
			hideItem();
			ambience.play("stopTape");
			state.audioReviewed = true;
			state.flags.add("FLAG_PRO02_AUDIO_REVIEWED");
			state.mode = "explore";
			showTask(TASKS.afterAudio);
		});
	}

	notebookWrite(zone: InteractionZone) {
		if (!state.audioReviewed) {
			const line = `${PROP_LINES.notebook[state.propStates.notebook] ?? PROP_LINES.notebook.default} ${zone.blocked_line ?? ONE_LINERS.notebookBlocked}`;
			return this.oneLine(line);
		}
		if (state.questionWritten)
			return this.oneLine(zone.repeat_line ?? ONE_LINERS.notebookRepeat);
		state.mode = "narrative";
		showItemPassive({
			icon: assetPath("/assets/items/notebook-written-icon.png"),
			title: "实践笔记",
			text:
				PROP_LINES.notebook[state.propStates.notebook] ??
				PROP_LINES.notebook.default,
		});
		playNarrative(WRITE_QUESTION, () => {
			hideItem();
			state.questionWritten = true;
			state.flags.add("FLAG_PRO02_QUESTION_WRITTEN");
			this.startSleepChain();
		});
	}

	bedLook() {
		if (state.audioReviewed && state.questionWritten && !state.sleepStarted)
			return this.startSleepChain();
		return this.oneLine(ONE_LINERS.bed);
	}

	startSleepChain() {
		if (state.sleepStarted) return;
		state.sleepStarted = true;
		state.mode = "narrative";
		showPrompt("");
		playNarrative(FALL_ASLEEP, () => {
			ambience.play("sleepFade");
			fadeToBlack();
			useHudStore().showOverlay("Scene3Overlay");
		});
	}

	oneLine(text: string) {
		state.mode = "narrative";
		playNarrative(
			[
				{
					entry_id: "LINE",
					kind: "narration",
					speaker_id: "NARRATOR",
					speaker_name: "旁白",
					text,
					style: "narration",
					cps: 16,
					advance: "manual",
				},
			],
			() => {
				state.mode = "explore";
			},
		);
	}

	startOpening() {
		if (state.mode !== "intro") return;
		state.mode = "narrative";
		playNarrative(OPENING, () => {
			state.mode = "explore";
			showTask(TASKS.opening);
		});
	}

	update() {
		if (this.physics.world.debugGraphic)
			this.physics.world.debugGraphic.setVisible(false);
		this.updateObjective();
		this.updateFlavor();
		if (state.paused) {
			this.player.setVelocity(0, 0);
			return;
		}
		const canWalk = state.mode === "explore";
		if (!this.player || state.playerLocked || !canWalk) {
			if (this.player) {
				this.player.setVelocity(0, 0);
				this.syncPlayerVisual(this.playerDirection, false);
			}
			return;
		}
		const speed = 150;
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
		this.player.setDepth(this.depthFor(this.player.y));
		this.syncPlayerVisual(this.playerDirection, x !== 0 || y !== 0);
		this.updatePrompt();
	}

	tryMove(dx: number, dy: number) {
		const profile = this.playerColliderProfile;
		const canOccupy = (nextX: number, nextY: number) => {
			const left = nextX + profile.offset[0] * PX;
			const top = nextY + profile.offset[1] * PX;
			const width = profile.size[0] * PX;
			const height = profile.size[1] * PX;
			if (
				left < 0 || top < 0 || left + width > this.logic.world_size[0] || top + height > this.logic.world_size[1]
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
		const zone = this.nearby();
		showPrompt(zone ? `${zone.prompt}  ·  E` : "");
	}

	nearby(): InteractionZone | undefined {
		const margin = this.interactionData.margin_tiles ?? 0.5;
		const px = this.player.x / PX;
		const py = this.player.y / PX;
		return this.interactionData.zones.find((zone) => {
			if (!zone.rect) return false;
			const [x, y, width, height] = zone.rect;
			return (
				px >= x - margin &&
				px <= x + width + margin &&
				py >= y - margin &&
				py <= y + height + margin
			);
		});
	}

	drawDebug() {
		const g = this.add.graphics().setDepth(500);
		for (let tx = 0; tx <= 64; tx += 1)
			g.lineStyle(1, 0xff3c3c, tx % 5 === 0 ? 0.5 : 0.18).lineBetween(
				tx * PX,
				0,
				tx * PX,
				36 * PX,
			);
		for (let ty = 0; ty <= 36; ty += 1)
			g.lineStyle(1, 0xff3c3c, ty % 5 === 0 ? 0.5 : 0.18).lineBetween(
				0,
				ty * PX,
				64 * PX,
				ty * PX,
			);
		for (const rect of this.logic.collision_zones) {
			const [x, y, w, h] = rect.rect;
			g.lineStyle(2, 0xff4040, 0.9).strokeRect(
				x * PX,
				y * PX,
				w * PX,
				h * PX,
			);
		}
		for (const zone of this.interactionData.zones) {
			if (!zone.rect) continue;
			const [x, y, w, h] = zone.rect;
			g.lineStyle(2, 0x40ff80, 0.9).strokeRect(
				x * PX,
				y * PX,
				w * PX,
				h * PX,
			);
		}
		for (const area of this.logic.walkable_area) {
			const [x, y, w, h] = area.rect;
			g.lineStyle(1, 0x4080ff, 0.7).strokeRect(
				x * PX,
				y * PX,
				w * PX,
				h * PX,
			);
		}
		const [sx, sy] = this.logic.player_spawn.position;
		g.lineStyle(2, 0xffff40, 1).strokeCircle(sx * PX, sy * PX, 10);
	}
}
