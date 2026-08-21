import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { useGameStateStore } from "@/stores/modules/gameState";
import { addManagedBgm } from "@/common/audioBus";
import {
	showTask,
	hideTask,
	closeTask,
	taskNeedsConfirmation,
	getPlayerMovementMultiplier,
	getPlayerAnimationMultiplier,
	applyDevPlayerMotionFromJson,
	showPrompt,
	hidePrompt,
	playNarrative,
	advanceNarrative,
	hideChoices,
	hideDialogue,
	hideItem,
	hideResult,
	fadeToBlack,
	clearFade,
	togglePause,
} from "@/common/ui";
import { YARD_CHAIN } from "./ch01Return.content";
// @ts-ignore Shared developer tools support both grid and pixel-coordinate scenes.
import { CollisionEditor } from "../../zone-editor.js";
// @ts-ignore Legacy actor collider helpers are shared by the editor.
import { actorColliderBottomAt, ensureActorColliderConfig, createActorColliderEntry, ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";
// @ts-ignore Foreground occlusion renderer clips background copies above the player.
import { ForegroundOcclusionRenderer, foregroundBottomPx } from "../../foreground-occlusion.js";
import { actorDepth, foregroundDepth } from "@/common/displayDepth";
import {
	chenAnimKey,
	chenDisplayWidth,
	chenFrameSize,
	chenFrameKey,
	createChenWalkAnimations,
	preloadChenWalk,
} from "@/common/chenWalk";
import type { ChenWalkDirection } from "@/common/chenWalk";

// 外景院墙：完整使用底图原始尺寸（1672×941），不缩放不改裁
const WORLD_W = 1672;
const WORLD_H = 941;
const PLAYER_DISPLAY_HEIGHT = 380;
const LIAISON_DISPLAY_HEIGHT = 360;
const CAMERA_ZOOM = 0.765;

interface ManifestData {
	spawns: { id: string; position: [number, number]; facing: string }[];
	collision: { id: string; rect: [number, number, number, number] }[];
	interactions: { id: string; prompt?: string; rect: [number, number, number, number]; type?: string }[];
	foreground_occlusion?: { reserved: boolean; objects: unknown[] };
}

// 第一章场景3：外景院墙阴影下·联络通知
export class Ch01Sc03Scene extends Phaser.Scene {
	zoneEditor: any;
	playerColliderProfile: any;
	actorColliderEntries: any[] = [];
	actorVisualProfiles: Record<string, any> = {};
	actorVisualEntries: any[] = [];
	manifest!: ManifestData;
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	liaison!: Phaser.GameObjects.Sprite;
	background!: Phaser.GameObjects.Image;
	foregroundRenderer: any;
	playerDirection: ChenWalkDirection = "right";	keyMap!: ReturnType<typeof createKeyMap>;
	camera!: Phaser.Cameras.Scene2D.Camera;
	collisionRects!: { id: string; x: number; y: number; width: number; height: number }[];
	bgm?: Phaser.Sound.BaseSound;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch01Sc03Scene");
	}

	resetHud() {
		hideTask();
		hideDialogue();
		hideItem();
		hidePrompt();
		hideChoices();
		hideResult();
		clearFade();
	}

	preload() {
		this.load.json("ch01_sc03_manifest", "data/ch01_sc03_yard_manifest.json");
		this.load.image("ch01_sc03_bg", "assets/ch01/sc03/map/yard_base.png");
		preloadChenWalk(this);
		this.load.image("liaison_idle", "assets/ch01/sc03/npc/liaison.png");
		// 沿用第一章 BGM
		this.load.audio("ch01_sc03_bgm", "assets/ch01/sc01/audio/bgm_ch01.mp3");
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.manifest = this.cache.json.get("ch01_sc03_manifest");
		applyDevPlayerMotionFromJson((this.manifest as any).player_motion);
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.background = this.add.image(WORLD_W / 2, WORLD_H / 2, "ch01_sc03_bg").setDepth(-20);
		this.setupForegroundOcclusion();
		this.buildCollision();

		// 玩家：偏左出场
		const playerSpawn = this.manifest.spawns.find((entry) => entry.id === "PLAYER_CHENJINNAN")!;
		this.player = this.physics.add
			.sprite(playerSpawn.position[0], playerSpawn.position[1], chenFrameKey("right", 0))
			.setOrigin(0.5, 1)
			.setDepth(actorDepth(actorColliderBottomAt(playerSpawn.position[0], playerSpawn.position[1], this.playerColliderProfile, 1)));
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true);
		this.player.setVisible(false);
		this.setupPlayerVisual();
		this.applyActorVisualHeight("PLAYER", this.actorVisualProfiles.PLAYER.display_height);

		// NPC 联络员：静止于右侧院墙阴影旁
		const liaisonSpawn = this.manifest.spawns.find((entry) => entry.id === "NPC_LIAISON")!;
		this.liaison = this.add
			.sprite(liaisonSpawn.position[0], liaisonSpawn.position[1], "liaison_idle")
			.setOrigin(0.5, 1)
			.setDisplaySize(
				Math.round((LIAISON_DISPLAY_HEIGHT * 1024) / 1536),
				LIAISON_DISPLAY_HEIGHT,
			)
			.setDepth(actorDepth(liaisonSpawn.position[1]));
		this.applyActorVisualHeight("NPC_LIAISON", this.actorVisualProfiles.NPC_LIAISON.display_height);
		this.applyActorVisualPosition("NPC_LIAISON");

		this.camera = this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);
		this.setupZoneEditor();

		this.keyMap = createKeyMap(this);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "ADVANCE", () => {
			if (this.state.inNarrative) advanceNarrative();
		});
		onAction(this, "PAUSE", () => togglePause());
		(window as any).ch01Sc03Game = this;

	this.bgm = addManagedBgm(this, "ch01_sc03_bgm", 0.35);
		this.bgm.play();

		// 开场：任务卡 → 自由探索（走近联络人按 E 触发剧情）
		this.state.mode = "explore";
		this.state.playerLocked = false;
		showTask({ title: "院墙阴影下：联络通知", detail: "走近右边的联络人，听他把话说完。" });
	}

	/* ===== 开发者工具（与 SC01/SC02 同模式） ===== */

	setupActorCollider() {
		this.playerColliderProfile = ensureActorColliderConfig(this.manifest as any, "PLAYER", {
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
			PLAYER: ensureActorVisualConfig(this.manifest as any, "PLAYER", PLAYER_DISPLAY_HEIGHT),
			NPC_LIAISON: ensureActorVisualConfig(this.manifest as any, "NPC_LIAISON", LIAISON_DISPLAY_HEIGHT),
		};
		this.actorVisualEntries = [
			createActorVisualEntry({
				id: "PLAYER",
				label: "陈继南（玩家）",
				getActor: () => this.playerVisual,
				getProfile: () => this.actorVisualProfiles.PLAYER,
				getAnchor: () => ({ x: this.player.x, y: this.player.y }),
				onPositionChange: () => this.applyActorVisualPosition("PLAYER"),
				tileSize: 1,
			}),
			createActorVisualEntry({
				id: "NPC_LIAISON",
				label: "联络人（NPC）",
				getActor: () => this.liaison,
				getProfile: () => this.actorVisualProfiles.NPC_LIAISON,
				getAnchor: () => this.actorSpawnPosition("NPC_LIAISON"),
				onPositionChange: () => this.applyActorVisualPosition("NPC_LIAISON"),
				tileSize: 1,
			}),
		];
	}

	actorSpawnPosition(id: string): { x: number; y: number } | null {
		const spawn = this.manifest?.spawns?.find((entry) => entry.id === id);
		return spawn ? { x: spawn.position[0], y: spawn.position[1] } : null;
	}

	applyActorVisualHeight(id: string, height: number) {
		if (!Number.isFinite(height) || height <= 0) return;
		const actor = id === "PLAYER" ? this.playerVisual : id === "NPC_LIAISON" ? this.liaison : null;
		if (!actor) return;
		if (id === "PLAYER") {
			const source = chenFrameSize(this, "right");
			actor.setDisplaySize(Math.round((source.width / source.height) * height), height);
		} else {
			actor.setDisplaySize(Math.round((1024 / 1536) * height), height);
		}
		this.applyActorVisualPosition(id);
	}

	applyActorVisualPosition(id: string) {
		const actor = id === "PLAYER" ? this.playerVisual : id === "NPC_LIAISON" ? this.liaison : null;
		const anchor = id === "PLAYER" && this.player
			? { x: this.player.x, y: this.player.y }
			: this.actorSpawnPosition(id);
		const offset = this.actorVisualProfiles[id]?.offset ?? [0, 0];
		if (actor && anchor) actor.setPosition(anchor.x + offset[0], anchor.y + offset[1]);
	}

	applyPlayerColliderBody() {
		const profile = this.playerColliderProfile;
		if (!profile || !this.player) return;
		const source = chenFrameSize(this, "right");
		this.player
			.setSize(profile.size[0], profile.size[1])
			.setOffset(
				source.width / 2 + profile.offset[0],
				source.height + profile.offset[1],
			);
	}

	setupZoneEditor() {
		const file = "public/data/ch01_sc03_yard_manifest.json";
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
			getActorVisuals: () => this.actorVisualEntries,
			onActorVisualChange: (id: string, height: number) => this.applyActorVisualHeight(id, height),
			getMagneticSource: () => this.textures.get("ch01_sc03_bg").getSourceImage(),
			replaceDocuments: (next: any) => {
				this.manifest = next[file];
				documents[file] = this.manifest as any;
				applyDevPlayerMotionFromJson((this.manifest as any).player_motion);
				this.setupActorCollider();
				this.applyActorVisualHeight("PLAYER", this.actorVisualProfiles.PLAYER.display_height);
				this.applyActorVisualHeight("NPC_LIAISON", this.actorVisualProfiles.NPC_LIAISON.display_height);
			},
			onChange: (kind: string) => {
				if (!kind || kind === "foreground") this.foregroundRenderer?.rebuild();
				if (!kind || kind === "collision") {
					this.buildCollision();
					this.applyPlayerColliderBody();
				}
			},
		});
	}

	/* ===== 玩家视觉 ===== */

	// 前景遮罩：玩家走到院墙/树影后时被背景副本遮挡（与 SC01/SC02 同模式）
	setupForegroundOcclusion() {
		this.foregroundRenderer = new ForegroundOcclusionRenderer(this, {
			background: this.background,
			getObjects: () => (this.manifest as any).foreground_occlusion?.objects ?? [],
			resolveDepth: (object: any) => foregroundDepth(foregroundBottomPx(object, 1) ?? 0),
			tileSize: 1,
		});
	}

	depthForPlayer(): number {
		return actorDepth(actorColliderBottomAt(this.player.x, this.player.y, this.playerColliderProfile, 1));
	}

	setupPlayerVisual() {
		createChenWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, chenFrameKey("right", 0))
			.setOrigin(0.5, 1)
			.setDisplaySize(
				chenDisplayWidth(this, "right", PLAYER_DISPLAY_HEIGHT),
				PLAYER_DISPLAY_HEIGHT,
			)
			.setDepth(this.depthForPlayer());
	}

	syncPlayerVisual(direction: ChenWalkDirection, moving: boolean) {
		if (!this.playerVisual) return;
		this.playerVisual.anims.timeScale = getPlayerAnimationMultiplier();
		this.applyActorVisualPosition("PLAYER");
		this.playerVisual.setFlipX(false);
		const displayHeight = this.actorVisualProfiles.PLAYER.display_height;
		const displayWidth = chenDisplayWidth(this, direction, displayHeight);
		const animation = chenAnimKey(direction);
		if (moving) {
			if (this.playerVisual.anims.currentAnim?.key !== animation || !this.playerVisual.anims.isPlaying) {
				this.playerVisual.setTexture(chenFrameKey(direction, 0));
				this.playerVisual.play(animation);
			}
			this.playerVisual.setDisplaySize(displayWidth, displayHeight);
			return;
		}
		this.playerVisual.anims.stop();
		this.playerVisual
			.setTexture(chenFrameKey(direction, 0))
			.setDisplaySize(displayWidth, displayHeight);
	}

	buildCollision() {
		// 正式碰撞：读取 manifest 中已配置的碰撞矩形（墙、家具、门窗）
		this.collisionRects = (this.manifest.collision ?? []).map((entry) => {
			const [x, y, w, h] = entry.rect;
			return { id: entry.id, x, y, width: w, height: h };
		});
	}

	/* ===== 移动 ===== */

	update() {
		if (this.physics.world.debugGraphic) this.physics.world.debugGraphic.setVisible(false);
		if (this.player) {
			const depth = this.depthForPlayer();
			this.player.setDepth(depth);
			this.playerVisual?.setDepth(depth);
		}
		const canWalk = this.state.mode === "explore";
		// 交互提示始终更新——即使玩家被任务卡锁定也要显示，否则玩家不知道可以按 E
		this.updatePrompt();
		if (!this.player || this.state.playerLocked || this.state.paused || !canWalk) {
			if (this.player?.body) {
				this.player.setVelocity(0, 0);
				this.syncPlayerVisual(this.playerDirection, false);
			}
			return;
		}
		const speed = 220 * getPlayerMovementMultiplier();
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

	tryMove(dx: number, dy: number) {
		const profile = this.playerColliderProfile;
		const canOccupy = (nextX: number, nextY: number) => {
			const left = nextX + profile.offset[0];
			const top = nextY + profile.offset[1];
			const width = profile.size[0];
			const height = profile.size[1];
			if (left < 0 || top < 0 || left + width > WORLD_W || top + height > WORLD_H) return false;
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

	nearby(): { id: string; prompt?: string; rect: [number, number, number, number] } | undefined {
		const px = this.player.x;
		const py = this.player.y;
		return this.manifest.interactions.find((target) => {
			const [x, y, width, height] = target.rect;
			return px >= x - 32 && px <= x + width + 32 && py >= y - 32 && py <= y + height + 32;
		});
	}

	handleConfirm() {
		if (taskNeedsConfirmation()) return closeTask();
		if (this.nearby()) return this.interact();
		if (this.state.taskOpen) return closeTask();
		this.interact();
	}

	interact() {
		if (this.state.playerLocked || this.state.mode !== "explore") return;
		const target = this.nearby();
		if (!target || target.id !== "wall_shadow") return;
		this.beginYardNarrative();
	}

	/* ===== 剧情链 ===== */

	beginYardNarrative() {
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		playNarrative(YARD_CHAIN, () => this.completeScene());
	}

	completeScene() {
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.state.flags.add("CH01_YARD_DONE");
		fadeToBlack();
		window.setTimeout(() => {
			this.game.events.emit("ch01:sc03-complete");
		}, 900);
	}

	shutdown() {
		this.bgm?.stop();
		this.bgm?.destroy();
		this.bgm = undefined;
	}
}
