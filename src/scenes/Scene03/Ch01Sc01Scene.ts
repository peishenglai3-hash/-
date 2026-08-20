import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { actorDepth, foregroundDepth, WORLD_INDICATOR_DEPTH } from "@/common/displayDepth";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	showTask,
	closeTask,
	taskNeedsConfirmation,
	getPlayerMovementMultiplier,
	getPlayerAnimationMultiplier,
	applyDevPlayerMotionFromJson,
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
	showEndPanel,
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
	INK_NARRATIVE,
	TASKS_CH01_SC01,
	PROP_PATHS,
	PROP_ICON_FILES,
} from "./ch01Sc01.content";
import type { Choice } from "./ch01Sc01.content";
import { applyFormalChoice } from "@/common/actionProfileSystem";
import { FLAGS } from "./ch01Sc01.flags";
import { FLAGS2 } from "./ch01Sc02.flags";
import { assetPath } from "@/common/paths";
import { useGameSaveStore } from "@/stores";
import { playInkTransition } from "@/common/inkTransition";
import { RETURN_NARRATIVE } from "./ch01Sc02.content";
import { KNOCK_CHAIN, DOOR_CODE_CHAIN, Q3_CHOICES, Q4_CHOICES, FAREWELL_INTRO, ENDING_NARRATIVE, END_SUBTITLE } from "./ch01Return.content";
// @ts-ignore Shared developer tools support both grid and pixel-coordinate scenes.
import { CollisionEditor } from "../../zone-editor.js";
// @ts-ignore Shared foreground renderer is implemented in JavaScript.
import { ForegroundOcclusionRenderer, foregroundBottomPx } from "../../foreground-occlusion.js";
// @ts-ignore Legacy actor collider helpers are shared by the editor.


import { actorColliderBottomAt, ensureActorColliderConfig, createActorColliderEntry, ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";

const WORLD_W = 1672;
const WORLD_H = 941;
const PLAYER_DIRECTIONS = ["down", "up", "left", "right"] as const;
type PlayerDirection = (typeof PLAYER_DIRECTIONS)[number];
const PLAYER_FRAME_FILES = Array.from(
	{ length: 8 },
	(_, index) => `frame-${String(index + 1).padStart(2, "0")}.png`,
);
const PLAYER_FRAME_FOLDERS: Record<PlayerDirection, string> = {
	down: "正面8帧",
	up: "背面8帧",
	left: "左侧8帧",
	right: "右侧8帧",
};
const playerFrameKey = (direction: PlayerDirection, index: number) =>
	`ch01-sc01-player-${direction}-${index}`;
const playerAnimationKey = (direction: PlayerDirection) =>
	`ch01-sc01-player-${direction}-anim`;
const PLAYER_DISPLAY_HEIGHT = 280;
const CAMERA_ZOOM = 0.765;

interface ManifestData {
	spawns: { id: string; position: [number, number]; facing: string }[];
	collision: {
		id: string;
		rect: [number, number, number, number];
		kind?: string;
		rotation?: number;
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


	actorVisualProfile: any;
	actorVisualEntries: any[] = [];
	background!: Phaser.GameObjects.Image;
	foregroundOcclusion: any;
	manifest!: ManifestData;
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	playerDirection: PlayerDirection = "down";
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

	get state() {
		return useGameStateStore().state;
	}

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
		// 第一章章末离开视频（告别后整幅播放）
		this.load.video(
			"ch01_finale",
			"assets/ch01/sc01/video/finale_leave.mp4",
		);

		for (const direction of PLAYER_DIRECTIONS) {
			PLAYER_FRAME_FILES.forEach((file, index) => {
				this.load.image(
					playerFrameKey(direction, index),
					`assets/ch01/sc01/sprites/${PLAYER_FRAME_FOLDERS[direction]}/processed/version-rekeyed/runtime/${file}`,
				);
			});
		}
		// Prop icons are loaded on demand by the Vue ItemPanel; no Phaser preload needed.
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.manifest = this.cache.json.get("ch01_sc01_manifest");
		applyDevPlayerMotionFromJson((this.manifest as any).player_motion);
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.background = this.add.image(WORLD_W / 2, WORLD_H / 2, "ch01_sc01_bg").setDepth(-20);
		this.foregroundOcclusion = new ForegroundOcclusionRenderer(this, {
			background: this.background,
			getObjects: () => (this.manifest as any).foreground_occlusion?.objects ?? [],
			resolveDepth: (object: any) => foregroundDepth(foregroundBottomPx(object, 1) ?? 0),
			tileSize: 1,
		});
		this.buildCollision();

		const spawn = (id: string) =>
			this.manifest.spawns.find((entry) => entry.id === id);
		const playerSpawn = spawn("PLAYER_CHENJINNAN")!;
		this.player = this.physics.add
			.sprite(
				playerSpawn.position[0],
				playerSpawn.position[1],
				playerFrameKey("down", 0),
			)
			.setOrigin(0.5, 1)
			.setDepth(actorDepth(actorColliderBottomAt(
				playerSpawn.position[0],
				playerSpawn.position[1],
				this.playerColliderProfile,
				1,
			)));
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
			if (this.state.mode === "result") this.beginInkEvent();
			else if (this.state.inNarrative) advanceNarrative();
			else if (itemPanelOpen()) closeItem();
		});
		onAction(this, "PAUSE", () => togglePause());
		(window as any).ch01Sc01Game = this;

		if (!this.state.flags.has(FLAGS.VIDEO_SEEN)) {
			this.playIntroVideo();
		} else {
			this.startBgm();
			this.beginExplore();
		}
		this.updateObservationMarks();
	}

	playIntroVideo() {
		this.stopBgm();
		this.state.mode = "intro";
		this.state.playerLocked = true;
		this.videoOverlay = this.add
			.video(WORLD_W / 2, WORLD_H / 2, "ch01_sc01_intro")
			.setDepth(2000);
		// 必须等视频纹理就绪后再 setDisplaySize：纹理未就绪时 Phaser 以默认帧 32×32
		// 为基准计算 scale，首帧（1280×720）到达后视频被放大数倍、只剩中间画面。
		// 且 textureready 触发时 width 仍是构造默认 256，须先 setSizeToFrame 校正基准
		this.videoOverlay.once("textureready", () => {
			const v = this.videoOverlay;
			if (!v) return;
			v.setSizeToFrame();
			v.setDisplaySize(WORLD_W, WORLD_H);
		});
		this.videoOverlay.play();
		this.videoOverlay.on("complete", () => {
			this.state.flags.add(FLAGS.VIDEO_SEEN);
			this.videoOverlay?.destroy();
			this.videoOverlay = undefined;
			this.startBgm();
			this.startIntroNarrative();
		});
		// Fallback: allow skip with interact after 1s
		this.time.delayedCall(1000, () => {
			onAction(this, "INTERACT", () => {
				if (this.videoOverlay) {
					this.videoOverlay.stop();
					this.videoOverlay.destroy();
					this.videoOverlay = undefined;
					this.state.flags.add(FLAGS.VIDEO_SEEN);
					this.startBgm();
					this.startIntroNarrative();
				}
			});
		});
	}

	startIntroNarrative() {
		this.state.mode = "narrative";
		playNarrative(INTRO_NARRATIVE, () => this.beginExplore());
	}

	beginExplore() {
		// 固定存档点：玩家进入陈继南家中、场景整体呈现时后台自动建立（幂等）
		useGameSaveStore().writeFixedCheckpoint();
		// 从 SC02 闪回返回 → 播放归位叙述 + 敲门暗号
		if (
			this.state.flags.has(FLAGS2.COMPLETE) &&
			!this.state.flags.has(FLAGS.INK_DONE)
		) {
			this.state.flags.add(FLAGS.INK_DONE);
			this.state.mode = "narrative";
			this.state.playerLocked = true;
			playNarrative([...RETURN_NARRATIVE, ...KNOCK_CHAIN], () => {
				this.state.mode = "explore";
				this.state.playerLocked = false;
				showTask(TASKS_CH01_SC01.leave);
				this.saveProgress();
			});
			return;
		}
		// 从 SC03 院墙返回 → 月饼告别（正式选择四）→ 章末离开视频
		if (this.state.flags.has(FLAGS.YARD_DONE)) {
			this.state.mode = "narrative";
			this.state.playerLocked = true;
			playNarrative(FAREWELL_INTRO, () => this.startQ4());
			return;
		}
		this.state.mode = "explore";
		this.state.playerLocked = false;
		showTask(TASKS_CH01_SC01.explore);
	}

	setupPlayerVisual() {
		for (const direction of PLAYER_DIRECTIONS) {
			const key = playerAnimationKey(direction);
			if (this.anims.exists(key)) continue;
			this.anims.create({
				key,
				frames: PLAYER_FRAME_FILES.map((_, index) => ({
					key: playerFrameKey(direction, index),
				})),
				frameRate: 16,
				repeat: -1,
			});
		}
		const initialKey = playerFrameKey("down", 0);
		const source = this.textures.get(initialKey).getSourceImage() as HTMLImageElement;
		const displayWidth = Math.round((source.width / source.height) * PLAYER_DISPLAY_HEIGHT);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, initialKey)
			.setOrigin(0.5, 1)
			.setDisplaySize(displayWidth, PLAYER_DISPLAY_HEIGHT)


			.setDepth(this.depthForPlayer());
		this.applyPlayerVisualHeight(this.actorVisualProfile.display_height);
	}

	syncPlayerVisual(direction: string, moving: boolean) {
		if (!this.playerVisual) return;
		this.playerVisual.anims.timeScale = getPlayerAnimationMultiplier();
		const dir = direction as PlayerDirection;
		const firstFrame = playerFrameKey(dir, 0);
		const source = this.textures.get(firstFrame).getSourceImage() as HTMLImageElement;
		const displayHeight = this.actorVisualProfile.display_height;
		const displayWidth = Math.round((source.width / source.height) * displayHeight);
		this.playerVisual
			.setDepth(this.depthForPlayer())
			.setFlipX(false);
		this.applyActorVisualPosition();
		if (moving) {
			const animation = playerAnimationKey(dir);
			if (
				this.playerVisual.anims.currentAnim?.key !== animation ||
				!this.playerVisual.anims.isPlaying
			) {
				this.playerVisual.setTexture(firstFrame);
				this.playerVisual.play(animation);
			}
			this.playerVisual.setDisplaySize(displayWidth, displayHeight);
			return;
		}
		this.playerVisual.anims.stop();
		this.playerVisual
			.setTexture(firstFrame)
			.setDisplaySize(displayWidth, displayHeight);
	}

	buildCollision() {
		// 正式碰撞：读取 manifest 中已配置的碰撞矩形（墙、家具、门窗）。
		// 含 rotation 的矩形先求旋转后 AABB，作为保守近似。
		this.collisionRects = (this.manifest.collision ?? []).map((entry) => {
			const [x, y, w, h] = entry.rect;
			const rot = entry.rotation ?? 0;
			if (rot === 0) {
				return { id: entry.id, x, y, width: w, height: h };
			}
			const rad = (rot * Math.PI) / 180;
			const cos = Math.abs(Math.cos(rad));
			const sin = Math.abs(Math.sin(rad));
			const rw = w * cos + h * sin;
			const rh = w * sin + h * cos;
			const cx = x + w / 2;
			const cy = y + h / 2;
			return {
				id: entry.id,
				x: cx - rw / 2,
				y: cy - rh / 2,
				width: rw,
				height: rh,
			};
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
		this.actorVisualProfile = ensureActorVisualConfig(this.manifest as any, "PLAYER", PLAYER_DISPLAY_HEIGHT);
		this.actorVisualEntries = [createActorVisualEntry({
			id: "PLAYER",
			label: "陈继南",
			getActor: () => this.playerVisual,
			getProfile: () => this.actorVisualProfile,
			getAnchor: () => ({ x: this.player.x, y: this.player.y }),
			onPositionChange: () => this.applyActorVisualPosition(),
			tileSize: 1,
		})];
	}

	applyPlayerVisualHeight(height: number) {
		if (!this.playerVisual || !Number.isFinite(height) || height <= 0) return;
		const source = this.textures
			.get(playerFrameKey(this.playerDirection, 0))
			.getSourceImage() as HTMLImageElement;
		this.playerVisual.setDisplaySize(Math.round((source.width / source.height) * height), height);
		this.applyActorVisualPosition();
	}

	applyActorVisualPosition() {
		const offset = this.actorVisualProfile?.offset ?? [0, 0];
		this.playerVisual?.setPosition(this.player.x + offset[0], this.player.y + offset[1]);
	}

	applyPlayerColliderBody() {
		const profile = this.playerColliderProfile;
		if (!profile || !this.player) return;
		const source = this.textures.get(playerFrameKey("down", 0)).getSourceImage() as HTMLImageElement;
		this.player.setSize(profile.size[0], profile.size[1])
			.setOffset(source.width / 2 + profile.offset[0], source.height + profile.offset[1]);
	}

	depthForPlayer(): number {
		return actorDepth(actorColliderBottomAt(this.player.x, this.player.y, this.playerColliderProfile, 1));
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
			getActorVisuals: () => this.actorVisualEntries,
			onActorVisualChange: (_id: string, height: number) => this.applyPlayerVisualHeight(height),
			getMagneticSource: () => this.textures.get("ch01_sc01_bg").getSourceImage(),
			replaceDocuments: (next: any) => {
				this.manifest = next[file];
				documents[file] = this.manifest as any;
				applyDevPlayerMotionFromJson((this.manifest as any).player_motion);
				this.setupActorCollider();
				this.applyPlayerVisualHeight(this.actorVisualProfile.display_height);
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
			if (flag && this.state.flags.has(flag)) continue;
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
				.setDepth(WORLD_INDICATOR_DEPTH);
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
		if (taskNeedsConfirmation()) return closeTask();
		if (itemPanelOpen()) return closeItem();
		if (this.nearby()) return this.interact();
		if (this.state.taskOpen) return closeTask();
		this.interact();
	}

	update() {
		if (this.physics.world.debugGraphic)
			this.physics.world.debugGraphic.setVisible(false);
		if (this.player) {
			const depth = this.depthForPlayer();
			this.player.setDepth(depth);
			this.playerVisual?.setDepth(depth);
		}
		const canWalk = this.state.mode === "explore";
		// 交互提示始终更新——即使玩家被任务卡锁定也要显示
		if (canWalk) this.updatePrompt();
		if (!this.player || this.state.playerLocked || this.state.paused || !canWalk) {
			if (this.player) {
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
			this.state.flags.has(FLAGS.OBS_BASIN) &&
			this.state.flags.has(FLAGS.OBS_DESK) &&
			this.state.flags.has(FLAGS.OBS_DOOR) &&
			!this.state.flags.has(FLAGS.INK_DONE)
		) {
			targets.push({
				id: "FAMILY_CHOICE1",
				prompt: "回应家人",
				rect: [640, 448, 192, 128],
				type: "event",
			});
		}
		if (
			this.state.flags.has(FLAGS.INK_DONE) &&
			!this.state.flags.has(FLAGS.CODE_DONE)
		) {
			targets.push({
				id: "DOOR_CODE",
				prompt: "推开木门",
				rect: [927.3, 49.9, 363.4, 396.2],
				type: "event",
			});
		}
		if (
			this.state.flags.has(FLAGS.CODE_DONE) &&
			!this.state.flags.has(FLAGS.SCENE_COMPLETE)
		) {
			targets.push({
				id: "EXIT_COURTYARD",
				prompt: "走到院墙下",
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
		if (this.state.playerLocked || this.state.mode !== "explore") return;
		const target = this.nearby();
		if (!target) return;
		if (target.id === "copper_basin") return this.observeBasin();
		if (target.id === "book") return this.observeDesk();
		if (target.id === "outer_gown") return this.observeDoor();
		if (target.id === "FAMILY_CHOICE1") return this.startChoice1();
		if (
			target.id === "inkstone_paper" &&
			this.state.flags.has(FLAGS.INK_DONE) === false &&
			this.state.choice
		)
			return this.startInkEvent();
		if (target.id === "DOOR_CODE") return this.startDoorCode();
		if (target.id === "EXIT_COURTYARD") return this.completeScene();
		// Generic inspect items：prop_icon 短名须经 PROP_ICON_FILES 映射到真实图标文件
		if (target.prop_icon) {
			const icon = PROP_ICON_FILES[target.prop_icon];
			if (!icon) return;
			showItem({
				icon,
				title: target.prompt || "查看",
				text: target.id,
			});
		}
	}

	observeBasin() {
		this.state.mode = "narrative";
		playNarrative(OBS_BASIN_NARRATIVE, () => {
			this.state.flags.add(FLAGS.OBS_BASIN);
			this.updateObservationMarks();
			this.checkObservationsComplete();
			this.state.mode = "explore";
		});
	}

	observeDesk() {
		this.state.mode = "narrative";
		playNarrative(OBS_DESK_NARRATIVE, () => {
			this.state.flags.add(FLAGS.OBS_DESK);
			this.updateObservationMarks();
			this.checkObservationsComplete();
			showItem({
				icon: PROP_PATHS.PAPERWEIGHT,
				title: "镇纸压纸",
				text: "纸上有几行未写完的字，最下面一行墨色比别处新一些：陳繼南。",
			});
			this.state.mode = "explore";
		});
	}

	observeDoor() {
		this.state.mode = "narrative";
		playNarrative(OBS_DOOR_NARRATIVE, () => {
			this.state.flags.add(FLAGS.OBS_DOOR);
			this.updateObservationMarks();
			this.checkObservationsComplete();
			showItem({
				icon: PROP_PATHS.HAORI,
				title: "外褂",
				text: "衣摆沾着干泥，像是白天出过门。",
			});
			this.state.mode = "explore";
		});
	}

	checkObservationsComplete() {
		if (
			this.state.flags.has(FLAGS.OBS_BASIN) &&
			this.state.flags.has(FLAGS.OBS_DESK) &&
			this.state.flags.has(FLAGS.OBS_DOOR)
		) {
			showTask(TASKS_CH01_SC01.choice);
			showPrompt("回应家人 · E");
		}
	}

	startChoice1() {
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(CHOICE1_INTRO, () => {
			this.state.mode = "choice";
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
		applyFormalChoice(this.state, {
			choiceId: choice.id,
			chapter: 1,
			isFormalChoice: true,
			portraitChange: choice.profileDelta,
			riskChange: choice.riskDelta,
			flag: choice.flag,
			tags: choice.tags,
			echoSummary: choice.echo_summary,
			failureCheck: false,
		});
		useGameSaveStore().autosave("CH01_SC01");
		hideChoices();
		showResult(choice);
		this.state.mode = "result";
		this.saveProgress();
	}

	beginInkEvent() {
		hideResult();
		this.state.mode = "explore";
		this.state.playerLocked = false;
		showTask(TASKS_CH01_SC01.ink);
	}

	startInkEvent() {
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		showItem({
			icon: PROP_PATHS.INK_PEN,
			title: "未干的墨",
			text: "砚中的墨还没有完全干透，笔杆磨得光滑。",
		});
		playNarrative(INK_NARRATIVE, () => {
			// 墨色漫开 → 墨水痕迹转场 → 进入闪回一·状纸（SC02）
			hideItem();
			this.state.mode = "transition";
			this.state.playerLocked = true;
			playInkTransition(this, {
				fadeOut: false,
				onCovered: () => this.game.events.emit("ch01:sc02-enter"),
			});
		});
	}

	completeScene() {
		this.state.mode = "transition";
		this.state.playerLocked = true;
		this.state.flags.add(FLAGS.SCENE_COMPLETE);
		hideTask();
		showPrompt("");
		hideItem();
		hideDialogue();
		fadeToBlack();
		this.saveProgress();
		// 黑屏后进入外景院墙（SC03：联络通知）
		this.time.delayedCall(900, () =>
			this.game.events.emit("ch01:sc03-enter"),
		);
	}

	/* ===== 门外人暗号（正式选择三） ===== */

	startDoorCode() {
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		this.state.flags.add(FLAGS.CODE_DONE);
		playNarrative(DOOR_CODE_CHAIN, () => this.startQ3());
	}

	startQ3() {
		this.state.mode = "choice";
		showChoices(
			Q3_CHOICES.map((choice) => ({
				id: choice.id,
				label: choice.label,
				detail: choice.detail,
			})),
			(id: string) => this.chooseQ3(id),
			"门外的人是谁？怎么回应？",
		);
	}

	chooseQ3(id: string) {
		const choice = Q3_CHOICES.find((item) => item.id === id);
		if (!choice) return;
		applyFormalChoice(this.state, {
			choiceId: choice.id,
			chapter: 1,
			isFormalChoice: true,
			portraitChange: choice.profile,
			riskChange: choice.risk,
			flag: choice.flag,
			tags: choice.tags,
			echoSummary: choice.label,
			failureCheck: false,
		});
		useGameSaveStore().autosave("CH01_SC01");
		hideChoices();
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(choice.feedback, () => this.afterQ3());
	}

	afterQ3() {
		this.state.flags.add(FLAGS.Q3_DONE);
		showTask(TASKS_CH01_SC01.yard);
		this.state.mode = "explore";
		this.state.playerLocked = false;
		this.saveProgress();
	}

	startQ4() {
		this.state.mode = "choice";
		showChoices(
			Q4_CHOICES.map((choice) => ({
				id: choice.id,
				label: choice.label,
				detail: choice.detail,
			})),
			(id: string) => this.chooseQ4(id),
			"怎样和家人告别？",
		);
	}

	chooseQ4(id: string) {
		const choice = Q4_CHOICES.find((item) => item.id === id);
		if (!choice) return;
		applyFormalChoice(this.state, {
			choiceId: choice.id,
			chapter: 1,
			isFormalChoice: true,
			portraitChange: choice.profile,
			riskChange: choice.risk,
			flag: choice.flag,
			tags: choice.tags,
			echoSummary: choice.label,
			failureCheck: false,
		});
		useGameSaveStore().autosave("CH01_SC01");
		hideChoices();
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(choice.feedback, () => this.afterQ4());
	}

	afterQ4() {
		this.state.flags.add(FLAGS.FAREWELL_DONE);
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		fadeToBlack();
		// 黑幕后播放章末离开视频（整幅 1280×720 等比例缩放，避免拉伸变形）
		this.time.delayedCall(900, () => {
			clearFade();
			this.playFinaleVideo();
		});
	}

	playFinaleVideo() {
		this.stopBgm();
		this.sound.stopAll();
		const video = this.add
			.video(WORLD_W / 2, WORLD_H / 2, "ch01_finale")
			.setDepth(3000);
		this.videoOverlay = video;
		// 整幅展示：等纹理就绪后按视频原始分辨率等比例缩放，不拉伸变形
		// （textureready 触发时 width 仍是构造默认 256，须先 setSizeToFrame 校正基准，
		//   否则 scale 按 256 计算、视频被放大数倍只剩中间画面）
		video.once("textureready", () => {
			video.setSizeToFrame();
			const vw = video.video?.videoWidth || video.frame?.realWidth || 1280;
			const vh = video.video?.videoHeight || video.frame?.realHeight || 720;
			const scale = Math.min(WORLD_W / vw, WORLD_H / vh);
			video.setDisplaySize(vw * scale, vh * scale);
		});
		video.play();
		video.on("complete", () => {
			this.skipFinaleVideo();
		});
		// 允许按 E / 空格跳过（一次性，避免重复注册堆叠）
		const onSkip = () => this.skipFinaleVideo();
		this.input.keyboard?.on("keydown-E", onSkip);
		this.input.keyboard?.on("keydown-SPACE", onSkip);
		this.videoSkipCleanup = () => {
			this.input.keyboard?.off("keydown-E", onSkip);
			this.input.keyboard?.off("keydown-SPACE", onSkip);
		};
	}

	videoSkipCleanup?: () => void;

	skipFinaleVideo() {
		if (!this.videoOverlay) return;
		this.videoOverlay.destroy();
		this.videoOverlay = undefined;
		this.videoSkipCleanup?.();
		this.startBgm();
		this.finishChapter();
	}

	finishChapter() {
		this.state.flags.add(FLAGS.CHAPTER_COMPLETE);
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(ENDING_NARRATIVE, () => {
			hideTask();
			hidePrompt();
			fadeToBlack();
			// 章末：固定存档点 + 结算面板 + 段落字幕
			useGameSaveStore().writeFixedCheckpoint();
			showEndPanel({
				checkpointLabel: "第一章完成",
				checkpoint: "CH01_END",
				profile: this.state.profile,
				choiceTag: this.state.choice?.flag ?? null,
				fixed: [...this.state.flags],
				risk: this.state.risk,
			}, {
				title: "第一章·陈继南家中醒来｜完成",
				hint: "第二章·陈家祠堂｜场景衔接",
				buttonLabel: "进入第二章",
				next: "chapter2",
			});
			this.time.delayedCall(300, () => {
				(window as any).showTitleCard?.(END_SUBTITLE);
			});
			this.saveProgress();
		});
	}

	saveProgress() {
		useGameSaveStore().autosave("CH01_SC01");
	}

	startBgm() {
		if (!this.bgm)
			this.bgm = this.sound.add("ch01_sc01_bgm", { loop: true, volume: 0.35 });
		if (!this.bgm.isPlaying) this.bgm.play();
	}

	stopBgm() {
		this.bgm?.stop();
	}

	shutdown() {
		this.videoSkipCleanup?.();
		this.videoOverlay?.stop();
		this.videoOverlay?.destroy();
		this.videoOverlay = undefined;
		this.bgm?.stop();
		this.bgm?.destroy();
		this.bgm = undefined;
	}
}
