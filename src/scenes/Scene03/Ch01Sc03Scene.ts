import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	showTask,
	hideTask,
	closeTask,
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
import { ensureActorColliderConfig, createActorColliderEntry } from "../../actor-collider.js";
import {
	CHEN_SOURCE_FRAME,
	chenAnimKey,
	chenDisplayWidth,
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
	manifest!: ManifestData;
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	liaison!: Phaser.GameObjects.Sprite;
	playerDirection: ChenWalkDirection = "right";
	keyMap!: ReturnType<typeof createKeyMap>;
	camera!: Phaser.Cameras.Scene2D.Camera;
	collisionRects!: { id: string; x: number; y: number; width: number; height: number }[];

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
		this.manifest = this.cache.json.get("ch01_sc03_manifest");
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.add.image(WORLD_W / 2, WORLD_H / 2, "ch01_sc03_bg").setDepth(-20);
		this.buildCollision();

		// 玩家：偏左出场
		const playerSpawn = this.manifest.spawns.find((entry) => entry.id === "PLAYER_CHENJINNAN")!;
		this.player = this.physics.add
			.sprite(playerSpawn.position[0], playerSpawn.position[1], chenFrameKey("right", 0))
			.setOrigin(0.5, 1)
			.setDepth(800);
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true);
		this.player.setVisible(false);
		this.setupPlayerVisual();

		// NPC 联络员：静止于右侧院墙阴影旁
		const liaisonSpawn = this.manifest.spawns.find((entry) => entry.id === "NPC_LIAISON")!;
		this.liaison = this.add
			.sprite(liaisonSpawn.position[0], liaisonSpawn.position[1], "liaison_idle")
			.setOrigin(0.5, 1)
			.setDisplaySize(
				Math.round((LIAISON_DISPLAY_HEIGHT * 1024) / 1536),
				LIAISON_DISPLAY_HEIGHT,
			)
			.setDepth(799);

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

		this.sound.add("ch01_sc03_bgm", { loop: true, volume: 0.35 }).play();

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
	}

	applyPlayerColliderBody() {
		const profile = this.playerColliderProfile;
		if (!profile || !this.player) return;
		this.player
			.setSize(profile.size[0], profile.size[1])
			.setOffset(
				CHEN_SOURCE_FRAME.width / 2 + profile.offset[0],
				CHEN_SOURCE_FRAME.height + profile.offset[1],
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
			getMagneticSource: () => this.textures.get("ch01_sc03_bg").getSourceImage(),
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

	/* ===== 玩家视觉 ===== */

	setupPlayerVisual() {
		createChenWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, chenFrameKey("right", 0))
			.setOrigin(0.5, 1)
			.setDisplaySize(chenDisplayWidth(PLAYER_DISPLAY_HEIGHT), PLAYER_DISPLAY_HEIGHT)
			.setDepth(801);
	}

	syncPlayerVisual(direction: ChenWalkDirection, moving: boolean) {
		if (!this.playerVisual) return;
		this.playerVisual
			.setPosition(this.player.x, this.player.y)
			.setDisplaySize(chenDisplayWidth(PLAYER_DISPLAY_HEIGHT), PLAYER_DISPLAY_HEIGHT)
			.setFlipX(false);
		const animation = chenAnimKey(direction);
		if (moving) {
			if (this.playerVisual.anims.currentAnim?.key !== animation || !this.playerVisual.anims.isPlaying)
				this.playerVisual.play(animation);
			return;
		}
		this.playerVisual.anims.stop();
		this.playerVisual.setTexture(chenFrameKey(direction, 0));
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
}
