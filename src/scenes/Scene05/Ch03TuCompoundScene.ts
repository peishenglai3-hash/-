import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { actorDepth } from "@/common/displayDepth";
import { useGameStateStore } from "@/stores/modules/gameState";
// @ts-ignore Shared JS helpers are intentionally untyped in the current project.
import { actorColliderBottomAt, actorColliderRectAt, ensureActorColliderConfig, createActorColliderEntry, ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";
// @ts-ignore Shared collision geometry is JavaScript and covered by runtime tests.
import { aabbOverlapsRotatedRect } from "../../collision-geometry.js";
import {
	chenAnimKey,
	chenDisplayWidth,
	chenFrameKey,
	chenFrameSize,
	createChenWalkAnimations,
	preloadChenWalk,
	type ChenWalkDirection,
} from "@/common/chenWalk";
import {
	clearFade,
	closeTask,
	hideChoices,
	hideDialogue,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	showPrompt,
	showTask,
	taskNeedsConfirmation,
} from "@/common/ui";
import {
	mountLayeredMap,
	preloadLayeredMap,
	type LayeredMapObject,
	type LayeredMapObjectDocument,
} from "@/common/layeredMap";
import {
	isTuCompoundState,
	TU_COMPOUND_MAPS,
	TU_COMPOUND_STATE_CATALOG,
	type TuCompoundState,
} from "./tuCompoundMap";

const WORLD_W = 1664;
const WORLD_H = 936;
const PLAYER_DISPLAY_HEIGHT = 280;
const CAMERA_ZOOM = 1280 / WORLD_W;
type Rect = [number, number, number, number];

interface RuntimeMapManifest {
	map_id: string;
	canvas: { width: number; height: number };
	tile_size: number;
	coordinate_origin?: string;
	collision: Array<{ id: string; rect: Rect; rotation?: number }>;
	interactions: Array<{ id: string; prompt?: string; rect: Rect; type?: string; action?: string }>;
	spawns: Array<{ id: string; position: [number, number]; facing: ChenWalkDirection }>;
	exits: Array<{ id: string; prompt?: string; rect: Rect; type?: string; destination?: string }>;
	camera_bounds?: Rect;
	foreground_occlusion: { reserved: boolean; objects: unknown[] };
	actor_colliders?: Record<string, unknown>;
	actor_visuals?: Record<string, unknown>;
}

function rectCenterBottom(rect: Rect): [number, number] {
	return [rect[0] + rect[2] / 2, rect[1] + rect[3]];
}

function isChenWalkDirection(value: unknown): value is ChenWalkDirection {
	return value === "left" || value === "right" || value === "up" || value === "down";
}

function normalizeObjectDocument(document: LayeredMapObjectDocument): RuntimeMapManifest {
	const objects = Array.isArray(document.objects) ? document.objects : [];
	const ofType = <T extends LayeredMapObject>(type: string): T[] =>
		objects.filter((item) => item.type === type) as T[];
	const toRegion = (item: LayeredMapObject) => ({
		id: item.id,
		rect: item.rect as Rect,
		...(typeof item.prompt === "string" ? { prompt: item.prompt } : {}),
		...(typeof item.action === "string" ? { action: item.action } : {}),
		...(typeof item.destination === "string" ? { destination: item.destination } : {}),
	});
	const spawnObjects = ofType<LayeredMapObject>("spawn");
	const camera = ofType<LayeredMapObject>("camera")[0];
	return {
		map_id: document.map_id,
		canvas: document.canvas,
		tile_size: document.tile_size,
		coordinate_origin: document.coordinate_origin,
		collision: ofType("collision").map((item) => ({
			id: item.id,
			rect: item.rect as Rect,
			rotation: Number(item.rotation ?? 0),
		})),
		interactions: ofType("interaction").map(toRegion),
		spawns: spawnObjects.map((item) => ({
			id: item.id,
			position: rectCenterBottom(item.rect as Rect),
			facing: isChenWalkDirection(item.facing) ? item.facing : "up",
		})),
		exits: ofType("exit").map(toRegion),
		camera_bounds: camera?.rect as Rect | undefined,
		foreground_occlusion: { reserved: true, objects: [] },
		actor_colliders: document.actor_colliders as Record<string, unknown> | undefined,
		actor_visuals: document.actor_visuals as Record<string, unknown> | undefined,
	};
}

export class Ch03TuCompoundScene extends Phaser.Scene {
	compoundState: TuCompoundState = "STATE_WAITING";
	definition = TU_COMPOUND_MAPS.STATE_WAITING;
	mapDocument!: RuntimeMapManifest;
	mapDocumentFile = "";
	playerColliderProfile: any;
	actorColliderEntries: any[] = [];
	actorVisualProfiles: Record<string, any> = {};
	actorVisualEntries: any[] = [];
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	playerDirection: ChenWalkDirection = "up";
	keyMap!: ReturnType<typeof createKeyMap>;
	collisionRects: Array<{ id: string; rect: Rect; rotation: number }> = [];

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch03TuCompoundScene");
	}

	init(data?: { state?: string; spawn?: [number, number] }) {
		this.compoundState = isTuCompoundState(data?.state ?? null)
			? data!.state as TuCompoundState
			: "STATE_WAITING";
		this.definition = TU_COMPOUND_MAPS[this.compoundState];
		(this as any).requestedSpawn = data?.spawn;
	}

	preload() {
		this.definition = TU_COMPOUND_MAPS[this.compoundState];
		preloadLayeredMap(this, this.definition);
		preloadChenWalk(this);
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		const mounted = mountLayeredMap(this, this.definition);
		this.mapDocument = normalizeObjectDocument(mounted.objectDocument);
		this.mapDocumentFile = `public/data/${this.definition.objectPath.replace(/^data\//, "")}`;
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.buildCollision();

		const requestedSpawn = (this as any).requestedSpawn as [number, number] | undefined;
		const spawn = this.mapDocument.spawns.find((item) => item.id === "SPAWN_PLAYER_HIDING") ?? this.mapDocument.spawns[0];
		const [spawnX, spawnY] = requestedSpawn ?? spawn?.position ?? [430, 808];
		this.playerDirection = spawn?.facing ?? "up";
		this.player = this.physics.add
			.sprite(spawnX, spawnY, chenFrameKey(this.playerDirection, 0))
			.setOrigin(0.5, 1)
			.setDepth(this.depthForPlayer());
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true).setVisible(false);
		this.setupPlayerVisual();

		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);
		this.keyMap = createKeyMap(this);
		onAction(this, "INTERACT", () => this.handleConfirm());
		(window as any).ch03TuCompoundGame = this;
		this.state.mode = "explore";
		this.state.playerLocked = false;
		const catalog = TU_COMPOUND_STATE_CATALOG[this.compoundState];
		showTask({
			title: `第三章·杜家大院外围｜${catalog.label}`,
			detail: `${catalog.storyUse}。地图资产已接入；风险预检查与正式交互尚待下一步剧情开发。`,
		});
	}

	resetHud() {
		hideTask();
		hideDialogue();
		hideInfoPanel();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
	}

	setupActorCollider() {
		this.playerColliderProfile = ensureActorColliderConfig(this.mapDocument as any, "PLAYER", {
			offset: [-28, -36],
			size: [56, 36],
		});
		this.actorColliderEntries = [
			createActorColliderEntry({
				id: "ACTOR_PLAYER",
				label: "玩家",
				getActor: () => this.player,
				getProfile: () => this.playerColliderProfile,
				tileSize: 1,
			}),
		];
		this.actorVisualProfiles = {
			PLAYER: ensureActorVisualConfig(this.mapDocument as any, "PLAYER", PLAYER_DISPLAY_HEIGHT),
		};
		this.actorVisualEntries = [
			createActorVisualEntry({
				id: "PLAYER",
				label: "玩家",
				getActor: () => this.playerVisual,
				getProfile: () => this.actorVisualProfiles.PLAYER,
				getAnchor: () => (this.player ? { x: this.player.x, y: this.player.y } : null),
				onPositionChange: () => this.applyActorVisualPosition(),
				tileSize: 1,
			}),
		];
	}

	setupPlayerVisual() {
		createChenWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, chenFrameKey(this.playerDirection, 0))
			.setOrigin(0.5, 1)
			.setDisplaySize(chenDisplayWidth(this, this.playerDirection, PLAYER_DISPLAY_HEIGHT), PLAYER_DISPLAY_HEIGHT)
			.setDepth(this.depthForPlayer());
	}

	applyPlayerColliderBody() {
		if (!this.player || !this.playerColliderProfile) return;
		const source = chenFrameSize(this, this.playerDirection);
		this.player
			.setSize(this.playerColliderProfile.size[0], this.playerColliderProfile.size[1])
			.setOffset(source.width / 2 + this.playerColliderProfile.offset[0], source.height + this.playerColliderProfile.offset[1]);
	}

	applyActorVisualPosition() {
		if (!this.playerVisual || !this.player) return;
		const offset = this.actorVisualProfiles.PLAYER?.offset ?? [0, 0];
		this.playerVisual.setPosition(this.player.x + offset[0], this.player.y + offset[1]);
	}

	depthForPlayer() {
		return actorDepth(actorColliderBottomAt(this.player?.x ?? 0, this.player?.y ?? 0, this.playerColliderProfile, 1));
	}

	buildCollision() {
		this.collisionRects = this.mapDocument.collision.map((entry) => ({
			id: entry.id,
			rect: [...entry.rect] as Rect,
			rotation: entry.rotation ?? 0,
		}));
	}

	nearby() {
		const candidates = [
			...this.mapDocument.interactions,
			...this.mapDocument.exits.map((entry) => ({ ...entry, prompt: entry.prompt ?? entry.id })),
		];
		return candidates.find((target) => {
			const [x, y, width, height] = target.rect;
			return this.player.x >= x - 32 && this.player.x <= x + width + 32 && this.player.y >= y - 32 && this.player.y <= y + height + 32;
		});
	}

	updatePrompt() {
		if (this.state.mode !== "explore") {
			hidePrompt();
			return;
		}
		const target = this.nearby();
		showPrompt(target ? `${target.prompt || target.id}  ·  E` : "");
	}

	handleConfirm() {
		if (taskNeedsConfirmation()) {
			closeTask();
			return;
		}
		const target = this.nearby();
		if (!target) return;
		const action = "action" in target ? target.action : undefined;
		showTask({
			title: `地图交互｜${target.id}`,
			detail: `${action ?? target.type ?? "interaction"}。当前只完成杜家大院地图状态接入；该交互将由后续第三章场景实现。`,
		});
	}

	/**
	 * 供后续风险分支和行动节点调用。状态切换只替换地图资源，保留玩家位置，
	 * 不在地图层里偷偷修改画像、风险或历史结果。
	 */
	transitionToState(nextState: TuCompoundState) {
		if (nextState === this.compoundState) return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		this.scene.restart({
			state: nextState,
			spawn: [this.player.x, this.player.y],
		});
	}

	tryMove(dx: number, dy: number) {
		const canOccupy = (nextX: number, nextY: number) => {
			const playerRect = actorColliderRectAt(nextX, nextY, this.playerColliderProfile, 1);
			const [left, top, width, height] = playerRect;
			if (left < 0 || top < 0 || left + width > WORLD_W || top + height > WORLD_H) return false;
			return !this.collisionRects.some((obstacle) =>
				aabbOverlapsRotatedRect(playerRect, obstacle.rect, obstacle.rotation),
			);
		};
		if (canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
		if (canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
	}

	syncPlayerVisual(direction: ChenWalkDirection, moving: boolean) {
		if (!this.playerVisual) return;
		this.playerVisual.anims.timeScale = 1;
		this.applyActorVisualPosition();
		const displayHeight = this.actorVisualProfiles.PLAYER.display_height;
		this.playerVisual.setDisplaySize(chenDisplayWidth(this, direction, displayHeight), displayHeight);
		const animation = chenAnimKey(direction);
		if (moving) {
			if (this.playerVisual.anims.currentAnim?.key !== animation || !this.playerVisual.anims.isPlaying) {
				this.playerVisual.setTexture(chenFrameKey(direction, 0));
				this.playerVisual.play(animation);
			}
			return;
		}
		this.playerVisual.anims.stop();
		this.playerVisual.setTexture(chenFrameKey(direction, 0));
	}

	update() {
		if (!this.player || !this.player.body) return;
		const depth = this.depthForPlayer();
		this.player.setDepth(depth);
		this.playerVisual?.setDepth(depth);
		this.updatePrompt();
		if (this.state.playerLocked || this.state.paused || this.state.mode !== "explore") {
			this.player.setVelocity(0, 0);
			this.syncPlayerVisual(this.playerDirection, false);
			return;
		}
		const speed = 220;
		let x = 0;
		let y = 0;
		if (isActionDown(this.keyMap, "MOVE_LEFT")) x -= 1;
		if (isActionDown(this.keyMap, "MOVE_RIGHT")) x += 1;
		if (isActionDown(this.keyMap, "MOVE_UP")) y -= 1;
		if (isActionDown(this.keyMap, "MOVE_DOWN")) y += 1;
		const vector = new Phaser.Math.Vector2(x, y).normalize().scale(speed * (this.game.loop.delta / 1000));
		this.tryMove(vector.x, vector.y);
		if (x !== 0 || y !== 0) {
			if (Math.abs(x) > Math.abs(y)) this.playerDirection = x < 0 ? "left" : "right";
			if (Math.abs(y) >= Math.abs(x)) this.playerDirection = y < 0 ? "up" : "down";
		}
		this.syncPlayerVisual(this.playerDirection, x !== 0 || y !== 0);
	}

	shutdown() {
		this.playerVisual?.destroy();
		if ((window as any).ch03TuCompoundGame === this) delete (window as any).ch03TuCompoundGame;
	}
}
