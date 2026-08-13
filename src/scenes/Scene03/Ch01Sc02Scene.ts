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
	showChoices,
	hideChoices,
	hideDialogue,
	hideItem,
	hideResult,
	showFlavor,
	fadeToBlack,
	clearFade,
	togglePause,
} from "@/common/ui";
import {
	ARRIVE_NARRATIVE,
	FISHERMAN_CHAIN,
	HANDOFF_CHAIN,
	FISH_CHAIN,
	CHOICES2,
	PROFILE_DELTAS2,
	EXIT_NARRATIVE,
} from "./ch01Sc02.content";
import type { NarrativeEntry } from "@/types/common";
import { FLAGS2 } from "./ch01Sc02.flags";
// @ts-ignore Shared developer tools support both grid and pixel-coordinate scenes.
import { CollisionEditor } from "../../zone-editor.js";
// @ts-ignore Legacy actor collider helpers are shared by the editor.
import { ensureActorColliderConfig, createActorColliderEntry } from "../../actor-collider.js";
// @ts-ignore Foreground occlusion renderer clips background copies above the player.
import { ForegroundOcclusionRenderer } from "../../foreground-occlusion.js";
import {
	CHEN_SOURCE_FRAME,
	chenAnimKey,
	chenDisplayWidth,
	chenFrameKey,
	createChenWalkAnimations,
	preloadChenWalk,
} from "@/common/chenWalk";
import type { ChenWalkDirection } from "@/common/chenWalk";
import { playInkTransition } from "@/common/inkTransition";

// 地图完整使用底图原始尺寸（1672×941），不缩放不改裁
const WORLD_W = 1672;
const WORLD_H = 941;
const PLAYER_DISPLAY_HEIGHT = 280;
const FISHERMAN_DISPLAY_HEIGHT = 320;
const CAMERA_ZOOM = 0.765;

interface ManifestData {
	spawns: { id: string; position: [number, number]; facing: string }[];
	collision: { id: string; rect: [number, number, number, number] }[];
	interactions: { id: string; prompt?: string; rect: [number, number, number, number]; type?: string }[];
	foreground_occlusion?: { reserved: boolean; objects: unknown[] };
}

// 第一章场景2：闪回一·状纸（陈家室内·白日）
export class Ch01Sc02Scene extends Phaser.Scene {
	zoneEditor: any;
	foregroundRenderer: any;
	playerColliderProfile: any;
	actorColliderEntries: any[] = [];
	manifest!: ManifestData;
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	fisherman!: Phaser.GameObjects.Sprite;
	playerDirection: ChenWalkDirection = "down";
	keyMap!: ReturnType<typeof createKeyMap>;
	camera!: Phaser.Cameras.Scene2D.Camera;
	collisionRects!: { id: string; x: number; y: number; width: number; height: number }[];
	observationMarks: Phaser.GameObjects.Text[] = [];

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch01Sc02Scene");
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
		this.load.json("ch01_sc02_manifest", "data/ch01_sc02_flashback_petition_manifest.json");
		this.load.image("ch01_sc02_bg", "assets/ch01/sc02/map/ch01_sc02_flashback_base.png");
		preloadChenWalk(this);
		this.load.image("fisherman_idle", "assets/ch01/sc02/npc/fisherman_idle.png");
		this.load.image("fisherman_petition", "assets/ch01/sc02/npc/fisherman_petition.png");
		this.load.image("fisherman_fish", "assets/ch01/sc02/npc/fisherman_fish.png");
		// 闪回沿用第一章 BGM
		this.load.audio("ch01_sc02_bgm", "assets/ch01/sc01/audio/bgm_ch01.mp3");
	}

	create() {
		this.resetHud();
		this.manifest = this.cache.json.get("ch01_sc02_manifest");
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		const bg = this.add.image(WORLD_W / 2, WORLD_H / 2, "ch01_sc02_bg").setDepth(-20);
		this.buildCollision();

		const playerSpawn = this.manifest.spawns.find((entry) => entry.id === "PLAYER_CHENJINNAN")!;
		this.player = this.physics.add
			.sprite(playerSpawn.position[0], playerSpawn.position[1], chenFrameKey("down", 0))
			.setOrigin(0.5, 1)
			.setDepth(800);
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true);
		this.player.setVisible(false);
		this.setupPlayerVisual();

		// 渔民：整场位置固定于门槛外，随剧情切换三态
		const fisherSpawn = this.manifest.spawns.find((entry) => entry.id === "NPC_FISHERMAN")!;
		this.fisherman = this.add
			.sprite(fisherSpawn.position[0], fisherSpawn.position[1], "fisherman_idle")
			.setOrigin(0.5, 1)
			.setDisplaySize(
				Math.round((FISHERMAN_DISPLAY_HEIGHT * 1024) / 1536),
				FISHERMAN_DISPLAY_HEIGHT,
			)
			.setDepth(799);

		this.camera = this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.centerOn(WORLD_W / 2, WORLD_H / 2);
		this.setupZoneEditor();
		this.setupForegroundOcclusion(bg);

		this.keyMap = createKeyMap(this);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "ADVANCE", () => {
			if (this.state.inNarrative) advanceNarrative();
		});
		onAction(this, "PAUSE", () => togglePause());
		(window as any).ch01Sc02Game = this;

		this.sound.add("ch01_sc02_bgm", { loop: true, volume: 0.35 }).play();

		// 开场：到场叙述 + 渔民对话连播（玩家锁定在书桌旁）
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		showTask({ title: "闪回·状纸", detail: "门边的渔民有话要说。听他把话说完。" });
		playNarrative([...ARRIVE_NARRATIVE, ...FISHERMAN_CHAIN], () => {
			this.state.flags.add(FLAGS2.BEAT1);
			this.updateObservationMarks();
			this.beginExplore();
		});
		this.updateObservationMarks();
	}

	/* ===== 开发者工具（与 SC01 同模式） ===== */

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
		const file = "public/data/ch01_sc02_flashback_petition_manifest.json";
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
			getMagneticSource: () => this.textures.get("ch01_sc02_bg").getSourceImage(),
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

	// 前景遮罩：玩家走到桌/床等家具后方时被背景副本遮挡
	setupForegroundOcclusion(bg: Phaser.GameObjects.Image) {
		this.foregroundRenderer = new ForegroundOcclusionRenderer(this, {
			background: bg,
			getObjects: () => (this.manifest as any).foreground_occlusion?.objects ?? [],
			resolveDepth: (object: any) => object?.depth ?? 2000,
			tileSize: 1,
		});
	}

	/* ===== 玩家视觉 ===== */

	setupPlayerVisual() {
		createChenWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, chenFrameKey("down", 0))
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

	setFisherman(texture: "fisherman_idle" | "fisherman_petition" | "fisherman_fish") {
		this.fisherman?.setTexture(texture);
	}

	buildCollision() {
		// TODO: 碰撞墙暂时禁用，后续由专人修复
		this.collisionRects = [];
	}

	updateObservationMarks() {
		for (const mark of this.observationMarks) mark.destroy();
		this.observationMarks = [];
		if (this.state.flags.has(FLAGS2.HANDOFF) || !this.state.flags.has(FLAGS2.BEAT1)) return;
		const mark = this.add
			.text(1260, 300, "!", {
				fontFamily: "monospace",
				fontSize: "48px",
				color: "#ff2222",
				stroke: "#000000",
				strokeThickness: 4,
			})
			.setOrigin(0.5)
			.setDepth(1000);
		this.tweens.add({ targets: mark, scale: { from: 1, to: 1.2 }, duration: 600, yoyo: true, repeat: -1 });
		this.observationMarks.push(mark);
	}

	beginExplore() {
		this.state.mode = "explore";
		this.state.playerLocked = false;
		showTask({ title: "闪回·状纸", detail: "状纸写好了。走到门边，把它交给渔民。" });
	}

	/* ===== 移动 ===== */

	update() {
		if (this.physics.world?.debugGraphic) this.physics.world.debugGraphic.setVisible(false);
		const canWalk = this.state.mode === "explore";
		// 交互提示始终更新——即使玩家被任务卡锁定也要显示
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
		const halfW = 28;
		const halfH = 18;
		const canOccupy = (nextX: number, nextY: number) => {
			if (nextX - halfW < 0 || nextY - halfH < 0 || nextX + halfW > WORLD_W || nextY + halfH > WORLD_H)
				return false;
			return !this.collisionRects.some(
				(rect) =>
					nextX + halfW > rect.x &&
					nextX - halfW < rect.x + rect.width &&
					nextY + halfH > rect.y &&
					nextY - halfH < rect.y + rect.height,
			);
		};
		if (canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
		if (canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
	}

	updatePrompt() {
		const nearby = this.nearby();
		const showable = nearby && this.state.flags.has(FLAGS2.BEAT1) && !this.state.flags.has(FLAGS2.HANDOFF);
		showPrompt(showable ? `${nearby.prompt || nearby.id}  ·  E` : "");
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
		// closeTask 会恢复任务前的玩家锁定状态（hideTask 不恢复）
		if (this.state.taskOpen) return closeTask();
		this.interact();
	}

	interact() {
		if (this.state.playerLocked || this.state.mode !== "explore") return;
		const target = this.nearby();
		if (!target || target.id !== "fisherman_door") return;
		if (!this.state.flags.has(FLAGS2.BEAT1)) return showFlavor("渔民还有话要说。");
		if (!this.state.flags.has(FLAGS2.HANDOFF)) this.handoff();
	}

	/* ===== 剧情链 ===== */

	handoff() {
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.setFisherman("fisherman_petition");
		playNarrative(HANDOFF_CHAIN, () => {
			this.state.flags.add(FLAGS2.HANDOFF);
			this.updateObservationMarks();
			// 墨水转场 3 秒 = 几天后
			this.inkTransition(() => {
				this.setFisherman("fisherman_fish");
				playNarrative(FISH_CHAIN, () => {
					this.state.flags.add(FLAGS2.BEAT3);
					this.startChoice2();
				});
			});
		});
	}

	// 程序化墨水转场（共享模块）：墨团约3秒覆盖全屏 = "几天后"
	inkTransition(onCovered: () => void) {
		playInkTransition(this, { onCovered });
	}

	startChoice2() {
		this.state.mode = "choice";
		showChoices(
			CHOICES2.map((choice) => ({ id: choice.id, label: choice.label, detail: choice.detail })),
			(id: string) => this.choose(id),
			"如何理解这段片段？",
		);
	}

	choose(id: string) {
		const choice = CHOICES2.find((item) => item.id === id);
		if (!choice) return;
		for (const [axis, delta] of Object.entries(PROFILE_DELTAS2[choice.id] ?? {}))
			this.state.profile[axis] += delta;
		this.state.flags.add(choice.flag);
		hideChoices();
		this.state.mode = "narrative";
		const thoughts: NarrativeEntry[] = choice.thoughts.map((text, index) => ({
			entry_id: `FB01_Q2_${choice.id}_${index}`,
			kind: "thought",
			speaker_name: "心理描写",
			text,
			style: "thought",
			cps: 12,
			advance: "manual",
		}));
		playNarrative([...thoughts, ...EXIT_NARRATIVE], () => this.completeFlashback());
	}

	completeFlashback() {
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.state.flags.add(FLAGS2.COMPLETE);
		fadeToBlack();
		window.setTimeout(() => {
			const standalone = (window as any).gameDirector?.standaloneFb;
			if (standalone) {
				const card = this.add
					.text(640, 360, "闪回一 · 状纸 · 完", {
						fontFamily: "serif",
						fontSize: "42px",
						color: "#f0e4c5",
					})
					.setOrigin(0.5)
					.setDepth(3200)
					.setAlpha(0);
				this.tweens.add({ targets: card, alpha: 1, duration: 800 });
			} else {
				this.game.events.emit("ch01:sc02-complete");
			}
		});
	}
}
