import Phaser from "phaser";
import "./style.css";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { state } from "@/common/state";
import {
	showTask,
	closeTask,
	hideTask,
	showPrompt,
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
} from "@/common/ui";
import { useHudStore } from "@/stores/modules/hud";
import {
	REQUIRED_NARRATIVE,
	CHOICES,
	TASKS01,
	LEAVE_NARRATIVE,
	PROFILE_DELTAS,
} from "./content";
import type { Choice } from "./content";
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
// @ts-ignore Shared foreground renderer is implemented in JavaScript.
import { ForegroundOcclusionRenderer, foregroundBottomPx } from "../../foreground-occlusion.js";
// @ts-ignore Legacy actor collider helpers are shared by the editor.


import { actorColliderBottomAt, ensureActorColliderConfig, createActorColliderEntry, ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";

const PX = 32;
const ACTOR_DEPTH_BASE = 500;
const actorDepth = (bottomY: number) => ACTOR_DEPTH_BASE + bottomY;
const PLAYER_FRAME = MODERN_PLAYER_SOURCE_FRAME;
const PLAYER_DISPLAY_HEIGHT = 160;
const NPC_DISPLAY = { width: 77, height: 160 };
const STUDENT_A_FRAME = { width: 453, height: 902 };
const STUDENT_A_DISPLAY = {
	width: Math.round(
		NPC_DISPLAY.height * (STUDENT_A_FRAME.width / STUDENT_A_FRAME.height),
	),
	height: NPC_DISPLAY.height,
};

interface ManifestData {
	spawns: { id: string; position: [number, number]; facing: string }[];
	collision: { id: string; rect: [number, number, number, number] }[];
	interactions: {
		id: string;
		prompt?: string;
		rect: [number, number, number, number];
		type?: string;
	}[];
}

export class Scene01 extends Phaser.Scene {
	zoneEditor: any;
	actorColliderProfiles: any;
	actorColliderEntries: any[] = [];


	actorVisualProfiles: any;
	actorVisualEntries: any[] = [];
	background!: Phaser.GameObjects.Image;
	foregroundOcclusion: any;
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
	studentA!: Phaser.GameObjects.Sprite;
	studentB!: Phaser.GameObjects.Sprite | Phaser.GameObjects.DOMElement;
	studentBExit: Phaser.GameObjects.Sprite | null = null;
	leaveNpcArrived: { A: boolean; B: boolean } | null = null;

	constructor() {
		super("Scene01");
	}

	preload() {
		this.load.json("manifest", "data/scene01_manifest.json");
		this.load.image("bg01", "assets/map/scene01_base.png");
		preloadModernPlayerWalk(this);
		for (const id of ["front", "back", "side"])
			this.load.image(
				`student-b-${id}`,
				`assets/characters/student-b/${id}.png`,
			);
		this.load.image(
			"student-b-front-task3",
			"assets/characters/student-b/front-task3.png",
		);
		this.load.spritesheet(
			"student-a-reading",
			"assets/characters/student-a/actions/reading-sheet.png",
			{
				frameWidth: STUDENT_A_FRAME.width,
				frameHeight: STUDENT_A_FRAME.height,
			},
		);
	}

	create() {
		this.manifest = this.cache.json.get("manifest");
		this.setupActorColliders();
		this.createKeyedTexture("student-b-front", "student-b-front-keyed");
		this.createKeyedTexture("student-b-back", "student-b-back-keyed");
		this.createKeyedTexture("student-b-side", "student-b-side-keyed");
		this.anims.create({
			key: "student-a-reading-anim",
			frames: this.anims.generateFrameNumbers("student-a-reading", {
				start: 0,
				end: 31,
			}),
			frameRate: 8,
			repeat: -1,
		});
		this.physics.world.setBounds(0, 0, 48 * PX, 27 * PX);
		this.background = this.add
			.image(768, 432, "bg01")
			.setDisplaySize(1536, 864)
			.setDepth(-20);
		this.foregroundOcclusion = new ForegroundOcclusionRenderer(this, {
			background: this.background,
			getObjects: () => (this.manifest as any).foreground_occlusion?.objects ?? [],
			resolveDepth: (object: any) => actorDepth(foregroundBottomPx(object, PX) ?? 0) + 0.001,
			tileSize: PX,
		});
		this.buildCollision();
		this.setupZoneEditor();
		const spawn = (id: string) =>
			this.manifest.spawns.find((entry) => entry.id === id);
		const playerSpawn = spawn("PLAYER_START")!;
		this.player = this.physics.add
			.sprite(
				playerSpawn.position[0] * PX,
				playerSpawn.position[1] * PX,
				modernWalkFrameKey("down", 0),
			)
			.setOrigin(0.5, 1)
			.setDepth(this.depthForActorAt(
				playerSpawn.position[0] * PX,
				playerSpawn.position[1] * PX,
				this.actorColliderProfiles.PLAYER,
			));
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true);
		this.player.setVisible(false);
		this.playerDirection = "down";
		this.setupPlayerVisual();
		this.keyMap = createKeyMap(this);
		this.camera = this.cameras.main
			.setBounds(0, 0, 1536, 864)
			.startFollow(this.player, true, 0.08, 0.08);
		this.camera.setZoom(1);
		const studentASpawn = spawn("NPC_CH00_STUDENT_A")!;
		const studentBSpawn = spawn("NPC_CH00_STUDENT_B")!;
		this.createNpc(
			"student-a",
			"NPC_CH00_STUDENT_A",
			studentASpawn.position[0],
			studentASpawn.position[1],
			studentASpawn.facing,
		);
		this.createNpc(
			"student-b",
			"NPC_CH00_STUDENT_B",
			studentBSpawn.position[0],
			studentBSpawn.position[1],
			studentBSpawn.facing,
		);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "ADVANCE", () => {
			if (state.mode === "result") this.beginLeave();
			else if (state.inNarrative) advanceNarrative();
			else if (itemPanelOpen()) closeItem();
		});
		onAction(this, "PAUSE", () => togglePause());
		(window as any).scene01Game = this;
	}

	beginExplore() {
		if (state.mode !== "intro") return;
		state.mode = "explore";
		state.playerLocked = false;
		showTask(TASKS01.intro);
	}

	setupPlayerVisual() {
		createModernPlayerWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, modernWalkFrameKey("down", 0), 0)
			.setOrigin(0.5, 1)
			.setDepth(this.depthForActor(this.player, this.actorColliderProfiles.PLAYER));
		setModernPlayerDirection(this.playerVisual, "down", PLAYER_DISPLAY_HEIGHT);
		this.applyActorVisualHeight("PLAYER", this.actorVisualProfiles.PLAYER.display_height);
	}

	syncPlayerVisual(direction: string, moving: boolean) {
		if (!this.playerVisual) return;
		this.playerVisual


			.setDepth(this.depthForActor(this.player, this.actorColliderProfiles.PLAYER))
			.setFlipX(false);
		this.applyActorVisualPosition("PLAYER");
		const walkDirection = direction as "down" | "left" | "right" | "up";
		const firstFrame = modernWalkFrameKey(walkDirection, 0);
		if (!this.playerVisual.texture.key.startsWith(`modern-player-${walkDirection}-`))
			setModernPlayerDirection(this.playerVisual, walkDirection, this.actorVisualProfiles.PLAYER.display_height);
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

	createKeyedTexture(sourceKey: string, targetKey: string) {
		const source = this.textures
			.get(sourceKey)
			.getSourceImage() as HTMLImageElement;
		const canvas = document.createElement("canvas");
		canvas.width = source.width;
		canvas.height = source.height;
		const context = canvas.getContext("2d", { willReadFrequently: true })!;
		context.drawImage(source, 0, 0);
		const image = context.getImageData(0, 0, canvas.width, canvas.height);
		const data = image.data;
		const visited = new Uint8Array(canvas.width * canvas.height);
		const queue: number[] = [];
		const isBackground = (index: number) => {
			const r = data[index];
			const g = data[index + 1];
			const b = data[index + 2];
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			return max < 28 || (max - min < 12 && min > 180);
		};
		const enqueue = (x: number, y: number) => {
			if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height)
				return;
			const pixel = y * canvas.width + x;
			if (visited[pixel]) return;
			const index = pixel * 4;
			if (!isBackground(index)) return;
			visited[pixel] = 1;
			queue.push(pixel);
		};
		for (let x = 0; x < canvas.width; x += 1) {
			enqueue(x, 0);
			enqueue(x, canvas.height - 1);
		}
		for (let y = 0; y < canvas.height; y += 1) {
			enqueue(0, y);
			enqueue(canvas.width - 1, y);
		}
		for (let cursor = 0; cursor < queue.length; cursor += 1) {
			const pixel = queue[cursor];
			const x = pixel % canvas.width;
			const y = Math.floor(pixel / canvas.width);
			data[pixel * 4 + 3] = 0;
			enqueue(x - 1, y);
			enqueue(x + 1, y);
			enqueue(x, y - 1);
			enqueue(x, y + 1);
		}
		context.putImageData(image, 0, 0);
		if (this.textures.exists(targetKey)) this.textures.remove(targetKey);
		this.textures.addCanvas(targetKey, canvas);
	}

	buildCollision() {
		this.collisionRects = this.manifest.collision.map((item) => {
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

	setupActorColliders() {
		const defaults = { offset: [-0.375, -0.625], size: [0.75, 1.25] };
		const manifest = this.manifest as any;
		this.actorColliderProfiles = {
			PLAYER: ensureActorColliderConfig(manifest, "PLAYER", defaults),
			NPC_CH00_STUDENT_A: ensureActorColliderConfig(manifest, "NPC_CH00_STUDENT_A", defaults),
			NPC_CH00_STUDENT_B: ensureActorColliderConfig(manifest, "NPC_CH00_STUDENT_B", defaults),
		};
		this.actorColliderEntries = [
			createActorColliderEntry({ id: "ACTOR_PLAYER", label: "玩家", getActor: () => this.player, getProfile: () => this.actorColliderProfiles.PLAYER }),
			createActorColliderEntry({ id: "ACTOR_STUDENT_A", label: "学生甲", getActor: () => this.studentA, getProfile: () => this.actorColliderProfiles.NPC_CH00_STUDENT_A }),
			createActorColliderEntry({ id: "ACTOR_STUDENT_B", label: "学生乙", getActor: () => this.studentB, getProfile: () => this.actorColliderProfiles.NPC_CH00_STUDENT_B }),
		];
		this.actorVisualProfiles = {
			PLAYER: ensureActorVisualConfig(manifest, "PLAYER", PLAYER_DISPLAY_HEIGHT),
			NPC_CH00_STUDENT_A: ensureActorVisualConfig(manifest, "NPC_CH00_STUDENT_A", NPC_DISPLAY.height),
			NPC_CH00_STUDENT_B: ensureActorVisualConfig(manifest, "NPC_CH00_STUDENT_B", 188),
		};
		this.actorVisualEntries = [
			createActorVisualEntry({ id: "PLAYER", label: "玩家", getActor: () => this.playerVisual, getProfile: () => this.actorVisualProfiles.PLAYER, getAnchor: () => ({ x: this.player.x / PX, y: this.player.y / PX }), onPositionChange: (id: string) => this.applyActorVisualPosition(id), tileSize: PX }),
			createActorVisualEntry({ id: "NPC_CH00_STUDENT_A", label: "学生甲", getActor: () => this.studentA, getProfile: () => this.actorVisualProfiles.NPC_CH00_STUDENT_A, getAnchor: () => this.visualAnchor("NPC_CH00_STUDENT_A"), onPositionChange: (id: string) => this.applyActorVisualPosition(id), tileSize: PX }),
			createActorVisualEntry({ id: "NPC_CH00_STUDENT_B", label: "学生乙", getActor: () => this.studentBExit ?? this.studentB, getProfile: () => this.actorVisualProfiles.NPC_CH00_STUDENT_B, getAnchor: () => this.visualAnchor("NPC_CH00_STUDENT_B"), onPositionChange: (id: string) => this.applyActorVisualPosition(id), tileSize: PX }),
		];
	}

	applyPlayerColliderBody() {
		const profile = this.actorColliderProfiles?.PLAYER;
		if (!profile || !this.player) return;
		this.player.setSize(profile.size[0] * PX, profile.size[1] * PX)
			.setOffset(PLAYER_FRAME.width / 2 + profile.offset[0] * PX, PLAYER_FRAME.height + profile.offset[1] * PX);
	}

	depthForActorAt(x: number, y: number, profile: any): number {
		return actorDepth(actorColliderBottomAt(x, y, profile, PX));
	}

	depthForActor(actor: { x: number; y: number }, profile: any): number {
		return this.depthForActorAt(actor.x, actor.y, profile);
	}

	setupZoneEditor() {
		const file = "public/data/scene01_manifest.json";
		const documents = { [file]: this.manifest as any };
		this.zoneEditor = new CollisionEditor(this, {
			documents,
			getCollisions: () => (this.manifest as any).collision,
			getInteractions: () => (this.manifest as any).interactions,
			getForegrounds: () => {
				const manifest = this.manifest as any;
				manifest.foreground_occlusion ??= { reserved: true, objects: [] };
				manifest.foreground_occlusion.objects ??= [];
				return manifest.foreground_occlusion.objects;
			},
			getDefaultForegroundDepth: () => 2000,
			getWorldSize: () => [48, 27],
			getActorColliders: () => this.actorColliderEntries,
			getActorVisuals: () => this.actorVisualEntries,
			onActorVisualChange: (id: string, height: number) => this.applyActorVisualHeight(id, height),
			getMagneticSource: () => this.textures.get("bg01").getSourceImage(),
			replaceDocuments: (next: any) => {
				this.manifest = next[file];
				documents[file] = this.manifest as any;
				this.setupActorColliders();
				this.applyActorVisualHeights();
			},
			onChange: (kind: string) => {
				if (!kind || kind === "collision") {
					this.buildCollision();
					this.applyPlayerColliderBody();
				}
				if (!kind || kind === "foreground") this.foregroundOcclusion.rebuild();
			},
		});
	}

	applyActorVisualHeights() {
		for (const [id, profile] of Object.entries(this.actorVisualProfiles ?? {})) this.applyActorVisualHeight(id, Number((profile as any).display_height));
	}

	applyActorVisualHeight(id: string, height: number) {
		if (!Number.isFinite(height) || height <= 0) return;
		if (id === "PLAYER" && this.playerVisual) setModernPlayerDirection(this.playerVisual, this.playerDirection as any, height);
		else if (id === "NPC_CH00_STUDENT_A" && this.studentA) this.studentA.setDisplaySize(Math.round(height * STUDENT_A_FRAME.width / STUDENT_A_FRAME.height), height);
		else if (id === "NPC_CH00_STUDENT_B" && this.studentB) {
			const node = (this.studentB as Phaser.GameObjects.DOMElement).node as HTMLElement;
			node.style.width = `${Math.round(height * 84 / 188)}px`;
			node.style.height = `${height}px`;
			if (this.studentBExit) {
				const source = this.textures.get(this.studentBExit.texture.key).getSourceImage() as HTMLImageElement;
				this.studentBExit.setDisplaySize(Math.round(height * source.width / source.height), height);
			}
		}
		this.applyActorVisualPosition(id);
	}

	visualActor(id: string): any {
		return id === "PLAYER" ? this.playerVisual : id === "NPC_CH00_STUDENT_A" ? this.studentA : this.studentBExit ?? this.studentB;
	}

	visualAnchor(id: string) {
		const actor = this.visualActor(id);
		if (id !== "PLAYER" && actor) {
			const x = actor.getData?.("visualBaseX");
			const y = actor.getData?.("visualBaseY");
			if (Number.isFinite(x) && Number.isFinite(y)) return { x: x / PX, y: y / PX };
		}
		const offset = this.actorVisualProfiles?.[id]?.offset ?? [0, 0];
		return actor ? { x: actor.x / PX - offset[0], y: actor.y / PX - offset[1] } : { x: 0, y: 0 };
	}

	applyActorVisualPosition(id: string) {
		const visual = this.visualActor(id);
		const base = id === "PLAYER" ? { x: this.player.x / PX, y: this.player.y / PX } : this.visualAnchor(id);
		const offset = this.actorVisualProfiles?.[id]?.offset ?? [0, 0];
		visual?.setPosition((base.x + offset[0]) * PX, (base.y + offset[1]) * PX);
	}

	setActorVisualBasePosition(id: string, x: number, y: number) {
		const visual = this.visualActor(id);
		const offset = this.actorVisualProfiles?.[id]?.offset ?? [0, 0];
		visual?.setData?.("visualBaseX", x);
		visual?.setData?.("visualBaseY", y);
		visual?.setPosition(x + offset[0] * PX, y + offset[1] * PX);
	}

	createNpc(
		prefix: string,
		id: string,
		x: number,
		y: number,
		facing: string,
	) {
		const textureFacing =
			facing === "down" ? "front" : facing === "up" ? "back" : "side";
		const depth = this.depthForActorAt(x * PX, y * PX, this.actorColliderProfiles[id]);
		if (id === "NPC_CH00_STUDENT_B") {
			const image = document.createElement("img");
			image.src = assetPath(
				"/assets/characters/student-b/actions/camera-keyed.gif",
			);
			image.className = "scene01-npc-gif-mask";
			image.alt = "同学乙拍照";
			const npc = this.add
				.dom(x * PX, y * PX, image)
				.setOrigin(0.5, 1)
				.setDepth(depth);
			npc.setData("spawnId", id);
			npc.setData("facing", facing);
			npc.setData("action", "photo");
			this.studentB = npc;
			this.setActorVisualBasePosition(id, x * PX, y * PX);
			return;
		}
		if (id === "NPC_CH00_STUDENT_A") {
			const npc = this.add
				.sprite(x * PX, y * PX, "student-a-reading", 0)
				.setDisplaySize(Math.round(this.actorVisualProfiles.NPC_CH00_STUDENT_A.display_height * STUDENT_A_FRAME.width / STUDENT_A_FRAME.height), this.actorVisualProfiles.NPC_CH00_STUDENT_A.display_height)
				.setOrigin(0.5, 1)
				.setDepth(depth);
			npc.setData("spawnId", id);
			npc.setData("facing", facing);
			npc.setData("action", "reading");
			npc.play("student-a-reading-anim");
			this.studentA = npc;
			this.setActorVisualBasePosition(id, x * PX, y * PX);
			return;
		}
		const npc = this.add
			.sprite(x * PX, y * PX, `${prefix}-${textureFacing}-keyed`)
			.setDisplaySize(Math.round(this.actorVisualProfiles.NPC_CH00_STUDENT_B.display_height * 84 / 188), this.actorVisualProfiles.NPC_CH00_STUDENT_B.display_height)
			.setOrigin(0.5, 1)
			.setDepth(depth);
		npc.setData("spawnId", id);
		npc.setData("facing", facing);
		npc.setData("action", "idle");
		(this as any)[prefix === "student-a" ? "studentA" : "studentB"] = npc;
		this.setActorVisualBasePosition(id, x * PX, y * PX);
	}

	repositionActors() {
		this.player.setPosition(24 * PX, 25 * PX);
		this.setActorVisualBasePosition("NPC_CH00_STUDENT_A", 26 * PX, 25 * PX);
		this.setActorVisualBasePosition("NPC_CH00_STUDENT_B", 22 * PX, 25 * PX);
		this.studentB.setVisible(false);
	}

	startLeaveWalk() {
		this.leaveNpcArrived = { A: true, B: true };
		this.studentA.setData("action", "packing");
		(this.studentB as Phaser.GameObjects.Sprite).setData(
			"action",
			"returning",
		);
		this.setActorVisualBasePosition("NPC_CH00_STUDENT_A", 26 * PX, 25 * PX);
		this.setActorVisualBasePosition("NPC_CH00_STUDENT_B", 22 * PX, 25 * PX);
		this.swapStudentBToExitPose();
	}

	swapStudentBToExitPose() {
		this.studentB.setVisible(false);
		this.studentBExit?.destroy();
		const texture = this.textures.exists("student-b-front-task3")
			? "student-b-front-task3"
			: "student-b-front-keyed";
		const source = this.textures
			.get(texture)
			.getSourceImage() as HTMLImageElement;
		const displayHeight = this.actorVisualProfiles.NPC_CH00_STUDENT_B.display_height;
		const displayWidth = Math.round(
			displayHeight * (source.width / source.height),
		);
		this.studentBExit = this.add
			.sprite(22 * PX, 25 * PX, texture)
			.setDisplaySize(displayWidth, displayHeight)
			.setOrigin(0.5, 1)
			.setDepth(this.depthForActorAt(22 * PX, 25 * PX, this.actorColliderProfiles.NPC_CH00_STUDENT_B));
		this.studentBExit.setData("spawnId", "NPC_CH00_STUDENT_B");
		this.setActorVisualBasePosition("NPC_CH00_STUDENT_B", 22 * PX, 25 * PX);
	}

	handleConfirm() {
		if (state.taskOpen) return closeTask();
		if (itemPanelOpen()) return closeItem();
		this.interact();
	}

	update() {
		if (this.physics.world.debugGraphic)
			this.physics.world.debugGraphic.setVisible(false);
		this.syncActorDepths();
		const canWalk = state.mode === "explore" || state.mode === "leave_walk";
		if (!this.player || state.playerLocked || state.paused || !canWalk) {
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
			if (Math.abs(x) > Math.abs(y)) {
				this.playerDirection = x < 0 ? "left" : "right";
			}
			if (Math.abs(y) >= Math.abs(x))
				this.playerDirection = y < 0 ? "up" : "down";
		}
		this.syncPlayerVisual(this.playerDirection, x !== 0 || y !== 0);
		this.updatePrompt();
	}

	syncActorDepths() {
		if (this.player) this.player.setDepth(this.depthForActor(this.player, this.actorColliderProfiles.PLAYER));
		if (this.playerVisual) this.playerVisual.setDepth(this.depthForActor(this.player, this.actorColliderProfiles.PLAYER));
		if (this.studentA) this.studentA.setDepth(this.depthForActor(this.studentA, this.actorColliderProfiles.NPC_CH00_STUDENT_A));
		if (this.studentB) this.studentB.setDepth(this.depthForActor(this.studentB, this.actorColliderProfiles.NPC_CH00_STUDENT_B));
		if (this.studentBExit) this.studentBExit.setDepth(this.depthForActor(this.studentBExit, this.actorColliderProfiles.NPC_CH00_STUDENT_B));
	}

	tryMove(dx: number, dy: number) {
		const profile = this.actorColliderProfiles.PLAYER;
		const canOccupy = (nextX: number, nextY: number) => {
			const left = nextX + profile.offset[0] * PX;
			const top = nextY + profile.offset[1] * PX;
			const width = profile.size[0] * PX;
			const height = profile.size[1] * PX;
			if (
				left < 0 || top < 0 || left + width > 48 * PX || top + height > 27 * PX
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
		  }
		| undefined {
		const px = this.player.x / PX;
		const py = this.player.y / PX;
		const targets = [...this.manifest.interactions];
		if (state.mode === "explore") {
			targets.push({
				id: "NPC_CH00_STUDENT_A",
				prompt: "与同学甲交谈",
				rect: [33, 20, 2, 2],
				type: "dialogue",
			});
			targets.push({
				id: "NPC_CH00_STUDENT_B",
				prompt: "与同学乙交谈",
				rect: [19.5, 17.5, 2, 2],
				type: "dialogue",
			});
		}
		if (state.mode === "leave_walk") {
			if (!state.npcDialogue.has("A") && this.leaveNpcArrived?.A)
				targets.push({
					id: "LEAVE_NPC_A",
					prompt: "与同学甲交谈",
					rect: [25, 24, 2, 2],
					type: "dialogue",
				});
			if (
				state.npcDialogue.has("A") &&
				!state.npcDialogue.has("B") &&
				this.leaveNpcArrived?.B
			)
				targets.push({
					id: "LEAVE_NPC_B",
					prompt: "与同学乙交谈",
					rect: [21, 24, 2, 2],
					type: "dialogue",
				});
		}
		return targets.find((target) => {
			if (target.id === "EXIT_TRIGGER") return false;
			if (target.id === "PRO_Q01_TRIGGER" && !state.monumentSeen)
				return false;
			const [x, y, width, height] = target.rect;
			return (
				px >= x - 1 &&
				px <= x + width + 1 &&
				py >= y - 1 &&
				py <= y + height + 1
			);
		});
	}

	interact() {
		if (
			state.playerLocked ||
			!["explore", "leave_walk"].includes(state.mode)
		)
			return;
		const target = this.nearby();
		if (!target) return;
		if (target.id === "INT_FIELDWORK_MATERIAL") return this.showFieldwork();
		if (target.id === "NPC_CH00_STUDENT_A") return this.openNpc("D1");
		if (target.id === "NPC_CH00_STUDENT_B") return this.openNpc("D2");
		if (target.id === "INT_MONUMENT") return this.startMonument();
		if (target.id === "PRO_Q01_TRIGGER") return this.openChoices();
		if (target.id === "LEAVE_NPC_A") return this.startLeaveNpcDialogue("A");
		if (target.id === "LEAVE_NPC_B") return this.startLeaveNpcDialogue("B");
		return null;
	}

	showFieldwork() {
		state.fieldworkSeen = true;
		state.flags.add("FLAG_FIELDWORK_MATERIAL_SEEN");
		showItem({
			icon: assetPath("/assets/items/notebook-open.png"),
			title: "实践笔记",
			text: "散落的采访记录与待确认的名字。",
		});
	}

	openNpc(entryId: string) {
		state.mode = "narrative";
		playNarrative(
			REQUIRED_NARRATIVE.filter((entry) => entry.entry_id === entryId),
			() => {
				state.mode = "explore";
			},
		);
	}

	startMonument() {
		if (state.monumentSeen) return this.openChoices();
		state.mode = "narrative";
		const sequence = REQUIRED_NARRATIVE.filter((entry) =>
			[
				"N1",
				"N2",
				"N3",
				"N4",
				"N5",
				"N6",
				"D1",
				"D2",
				"N7",
				"N8",
				"N9",
				"N10",
				"N11",
				"N12",
				"M1",
				"M2",
				"M3",
				"M4",
				"M5",
				"M6",
			].includes(entry.entry_id),
		);
		playNarrative(sequence, () => {
			state.monumentSeen = true;
			state.flags.add("FLAG_INT_MONUMENT_COMPLETED");
			showTask(TASKS01.afterMonument);
			window.setTimeout(() => this.openChoices(), 500);
		});
	}

	openChoices() {
		state.mode = "choice";
		state.playerLocked = true;
		showChoices(CHOICES, (id: string) => this.choose(id));
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
		state.flags.add("FLAG_PRO_Q01_COMPLETED");
		hideChoices();
		showResult(choice);
		state.mode = "result";
	}

	beginLeave() {
		hideResult();
		state.mode = "leave_walk";
		state.leavePhase = "walk";
		state.playerLocked = false;
		state.flags.add("FLAG_LEAVE_WALK_ENABLED");
		this.startLeaveWalk();
		showTask({
			title: "走向南门",
			detail: "沿石板路向南门行走，与同学甲和同学乙汇合",
		});
	}

	startLeaveNpcDialogue(which: string) {
		const entryId = which === "A" ? "L1" : "L2";
		state.mode = which === "A" ? "leave_npc_a" : "leave_npc_b";
		state.leavePhase = state.mode;
		state.playerLocked = true;
		playNarrative(
			REQUIRED_NARRATIVE.filter((entry) => entry.entry_id === entryId),
			() => {
				state.npcDialogue.add(which);
				if (which === "A") {
					state.mode = "leave_walk";
					state.leavePhase = "walk";
					state.playerLocked = false;
					showPrompt("与同学乙交谈 · E");
				} else {
					state.flags.add("FLAG_LEAVE_NPCS_COMPLETED");
					state.mode = "leave_narrative";
					state.leavePhase = "narrative";
					state.playerLocked = true;
					showTask({
						title: "收好实践笔记",
						detail: "你将实践笔记放进包里",
					});
					playNarrative(LEAVE_NARRATIVE, () => this.finishLeave());
				}
			},
		);
	}

	finishLeave() {
		state.mode = "transition";
		state.leavePhase = "blackout";
		state.playerLocked = true;
		state.taskOpen = false;
		hideTask();
		showPrompt("");
		hideItem();
		hideDialogue();
		fadeToBlack();
		useHudStore().showOverlay("Scene2Overlay");
	}
}
