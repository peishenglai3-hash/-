import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { actorDepth } from "@/common/displayDepth";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { useGameStateStore } from "@/stores/modules/gameState";
import {
	clearFade,
	closeTask,
	advanceNarrative,
	hideChoices,
	hideDialogue,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	hideCombatHud,
	playNarrative,
	showCombatHud,
	showPrompt,
	showTask,
	taskNeedsConfirmation,
	updateCombatHud,
} from "@/common/ui";
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
	mountLayeredMap,
	preloadLayeredMap,
	type LayeredMapObject,
} from "@/common/layeredMap";
import { getChapter3TaskAssignment, type Chapter3TaskPermission } from "./ch03RiskPrecheck";
import { TU_COMPOUND_MAPS } from "./tuCompoundMap";
import {
	CH03_COMBAT_FLAGS,
	CH03_GATE_BREACH_CAPTURE_INTRO,
	CH03_GATE_BREACH_COMPLETE_TASK,
	CH03_GATE_BREACH_FAILURE_TASK,
	CH03_GATE_BREACH_FINISH,
	CH03_GATE_BREACH_INTRO,
	CH03_GATE_BREACH_PURSUIT_INTRO,
} from "./ch03GateBreachCombat.content";

const WORLD_W = 1664;
const WORLD_H = 936;
const PLAYER_HEIGHT = 172;
const CAMERA_ZOOM = 1280 / WORLD_W;
const CAPTURE_TOTAL = 3;
type Rect = [number, number, number, number];
type WeaponId = "pistol" | "longgun";
type CombatPhase = "intro" | "capture" | "pursuit" | "complete" | "failure";

interface CombatMapObject extends LayeredMapObject {
	rect?: Rect;
	hazard?: string;
}

interface EnemyUnit {
	id: string;
	sprite: Phaser.GameObjects.Image;
	weaponSprite: Phaser.GameObjects.Image;
	marker: Phaser.GameObjects.Graphics;
	hp: number;
	maxHp: number;
	state: "active" | "stunned" | "captured";
	lastShotAt: number;
	staggerUntil: number;
	patrolTarget: Phaser.Math.Vector2;
}

interface ProjectileUnit {
	sprite: Phaser.GameObjects.Rectangle;
	velocity: Phaser.Math.Vector2;
	damage: number;
	faction: "player" | "ally" | "enemy";
	life: number;
}

interface WeaponDefinition {
	id: WeaponId;
	label: string;
	texture: string;
	magazine: number;
	reserve: number;
	damage: number;
	cooldown: number;
	projectileSpeed: number;
}

const WEAPONS: Record<WeaponId, WeaponDefinition> = {
	pistol: {
		id: "pistol",
		label: "短枪",
		texture: "ch03_weapon_pistol",
		magazine: 12,
		reserve: 48,
		damage: 34,
		cooldown: 245,
		projectileSpeed: 850,
	},
	longgun: {
		id: "longgun",
		label: "长枪",
		texture: "ch03_weapon_longgun",
		magazine: 5,
		reserve: 20,
		damage: 58,
		cooldown: 540,
		projectileSpeed: 1080,
	},
};

const START_POSITION_BY_PERMISSION: Record<Chapter3TaskPermission, [number, number]> = {
	FORWARD_SUPPORT: [820, 610],
	REAR_SUPPORT: [720, 610],
	REAR_COORDINATION: [620, 610],
	ESCORTED_SUPPORT: [560, 610],
	WITHDRAWN: [500, 610],
};

function centerOf(sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite): Phaser.Math.Vector2 {
	return new Phaser.Math.Vector2(sprite.x, sprite.y - sprite.displayHeight * 0.46);
}

function distanceBetween(
	a: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
	b: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
): number {
	return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
}

export class Ch03GateBreachCombatScene extends Phaser.Scene {
	compoundDefinition = TU_COMPOUND_MAPS.STATE_GATE_BROKEN;
	mapDocument!: { objects: CombatMapObject[] };
	collisionRects: Array<{ id: string; rect: Rect; rotation: number }> = [];
	player!: Phaser.GameObjects.Sprite;
	playerDirection: ChenWalkDirection = "right";
	playerWeapon!: Phaser.GameObjects.Image;
	dongYunting!: Phaser.GameObjects.Image;
	dongWeapon!: Phaser.GameObjects.Image;
	dongLabel!: Phaser.GameObjects.Text;
	keyMap!: ReturnType<typeof createKeyMap>;
	enemies: EnemyUnit[] = [];
	projectiles: ProjectileUnit[] = [];
	phase: CombatPhase = "intro";
	permission: Chapter3TaskPermission = "FORWARD_SUPPORT";
	captured = 0;
	playerHp = 120;
	maxPlayerHp = 120;
	weapon: WeaponId = "pistol";
	weaponAmmo: Record<WeaponId, number> = { pistol: 12, longgun: 5 };
	weaponReserve: Record<WeaponId, number> = { pistol: 48, longgun: 20 };
	lastShotAt = 0;
	reloadUntil = 0;
	invulnerableUntil = 0;
	dongLastShotAt = 0;
	lastAim = new Phaser.Math.Vector2(1, 0);
	reticle!: Phaser.GameObjects.Graphics;
	muzzleFlash?: Phaser.GameObjects.Rectangle;
	combatSmoke?: Phaser.GameObjects.Particles.ParticleEmitter;
	combatEmbers?: Phaser.GameObjects.Particles.ParticleEmitter;
	pursuitPath: Array<[number, number]> = [
		[935, 570],
		[1010, 455],
		[900, 335],
		[810, 260],
	];
	pursuitIndex = 0;
	retrying = false;
	runtimeSfxSources: AudioScheduledSourceNode[] = [];
	runtimeSfxGains: GainNode[] = [];
	chapter3Bgm?: Phaser.Sound.BaseSound;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch03GateBreachCombatScene");
	}

	init(data?: { retry?: boolean }) {
		this.retrying = Boolean(data?.retry);
		this.mapDocument = { objects: [] };
		this.collisionRects = [];
		this.enemies = [];
		this.projectiles = [];
		this.phase = "intro";
		this.captured = 0;
		this.playerHp = 120;
		this.weapon = "pistol";
		this.weaponAmmo = { pistol: 12, longgun: 5 };
		this.weaponReserve = { pistol: 48, longgun: 20 };
		this.lastShotAt = 0;
		this.reloadUntil = 0;
		this.invulnerableUntil = 0;
		this.dongLastShotAt = 0;
		this.pursuitIndex = 0;
		this.lastAim = new Phaser.Math.Vector2(1, 0);
		this.runtimeSfxSources = [];
		this.runtimeSfxGains = [];
		const assignment = getChapter3TaskAssignment({ ...this.state.risk });
		this.permission = this.state.chapter3TaskPermission ?? assignment.permission;
	}

	preload() {
		preloadLayeredMap(this, this.compoundDefinition);
		preloadChenWalk(this);
		this.load.image("ch03_combat_militia_a", "assets/characters/ch03-militia/idle-a.png");
		this.load.image("ch03_combat_militia_b", "assets/characters/ch03-militia/idle-b.png");
		this.load.image("ch03_dong_yunting", "assets/characters/ch03-dong-yunting/idle.png");
		this.load.image("ch03_weapon_pistol", "assets/ch03/combat/pistol.png");
		this.load.image("ch03_weapon_longgun", "assets/ch03/combat/long-gun.png");
		this.load.audio("ch03_bgm_gate_breach", "assets/audio/ch03/04_铁门裂响_突入大院.mp3");
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.playBgm();
		const mounted = mountLayeredMap(this, this.compoundDefinition);
		this.mapDocument = {
			objects: (mounted.objectDocument.objects ?? []) as CombatMapObject[],
		};
		this.buildCollision();
		this.setupRuntimeFx();
		this.setupActors();
		this.cameras.main
			.setBounds(0, 0, WORLD_W, WORLD_H)
			.setZoom(CAMERA_ZOOM)
			.fadeIn(580, 0, 0, 0);

		this.keyMap = createKeyMap(this);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "ADVANCE", () => {
			if (this.state.inNarrative) advanceNarrative();
		});
		onAction(this, "SWAP_WEAPON", () => this.swapWeapon());
		this.input.on("pointerdown", this.handlePointerDown, this);
		this.input.mouse?.disableContextMenu();
		(window as any).ch03GateBreachCombatGame = this;

		this.state.flags.add(CH03_COMBAT_FLAGS.started);
		this.state.mode = "combat_intro";
		this.state.playerLocked = true;
		if (this.retrying) {
			this.time.delayedCall(220, () => this.beginCapturePhase());
		} else {
			playNarrative(CH03_GATE_BREACH_INTRO, () => {
				playNarrative(CH03_GATE_BREACH_CAPTURE_INTRO, () => this.beginCapturePhase());
			});
		}
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
		hideCombatHud();
	}

	buildCollision() {
		const excluded = new Set([
			"COL_GATE_LEAF_LEFT",
			"COL_GATE_LEAF_RIGHT",
			"COL_RAM_POLE_REST",
			"HAZARD_OIL_PRESS_FIRE",
		]);
		this.collisionRects = this.mapDocument.objects
			.filter((item) => item.type === "collision" && item.rect && !excluded.has(item.id))
			.map((item) => ({
				id: item.id,
				rect: item.rect as Rect,
				rotation: Number(item.rotation ?? 0),
			}));
	}

	setupRuntimeFx() {
		if (!this.textures.exists("ch03_combat_smoke")) {
			const graphics = this.make.graphics({ x: 0, y: 0 }, false);
			graphics.fillStyle(0x473b36, 0.28);
			graphics.fillCircle(20, 20, 20);
			graphics.generateTexture("ch03_combat_smoke", 40, 40);
			graphics.destroy();
		}
		if (!this.textures.exists("ch03_combat_ember")) {
			const graphics = this.make.graphics({ x: 0, y: 0 }, false);
			graphics.fillStyle(0xffa329, 1);
			graphics.fillRect(0, 0, 8, 8);
			graphics.generateTexture("ch03_combat_ember", 8, 8);
			graphics.destroy();
		}
		this.combatSmoke = this.add.particles(0, 0, "ch03_combat_smoke", {
			x: { min: 1090, max: 1430 },
			y: { min: 170, max: 535 },
			lifespan: { min: 1200, max: 2300 },
			speedY: { min: -50, max: -15 },
			speedX: { min: -24, max: 24 },
			scale: { start: 0.7, end: 2.1 },
			alpha: { start: 0.18, end: 0 },
			frequency: 280,
			quantity: 1,
		});
		this.combatSmoke.setDepth(340);
		this.combatEmbers = this.add.particles(0, 0, "ch03_combat_ember", {
			x: { min: 1130, max: 1410 },
			y: { min: 270, max: 540 },
			lifespan: { min: 500, max: 1000 },
			speedY: { min: -90, max: -30 },
			speedX: { min: -20, max: 20 },
			scale: { start: 0.7, end: 0 },
			alpha: { start: 0.85, end: 0 },
			tint: [0xffa329, 0xffe16a, 0xff6b1b],
			frequency: 130,
			quantity: 1,
			blendMode: Phaser.BlendModes.ADD,
		});
		this.combatEmbers.setDepth(350);
		this.cameras.main.shake(220, 0.004);
		this.playCombatSfx("gate_break");
	}

	setupActors() {
		createChenWalkAnimations(this);
		const start = START_POSITION_BY_PERMISSION[this.permission] ?? START_POSITION_BY_PERMISSION.FORWARD_SUPPORT;
		this.playerDirection = "right";
		this.player = this.add
			.sprite(start[0], start[1], chenFrameKey(this.playerDirection, 0))
			.setOrigin(0.5, 1)
			.setDisplaySize(chenDisplayWidth(this, this.playerDirection, PLAYER_HEIGHT), PLAYER_HEIGHT)
			.setDepth(actorDepth(start[1]));
		this.playerWeapon = this.add
			.image(this.player.x + 28, this.player.y - 64, WEAPONS[this.weapon].texture)
			.setOrigin(0.12, 0.5)
			.setDisplaySize(58, 30)
			.setDepth(actorDepth(start[1]) + 1);

		this.dongYunting = this.add
			.image(665, 570, "ch03_dong_yunting")
			.setOrigin(0.5, 1)
			.setDisplaySize(76, 112)
			.setDepth(actorDepth(570));
		this.dongWeapon = this.add
			.image(this.dongYunting.x + 18, this.dongYunting.y - 68, WEAPONS.longgun.texture)
			.setOrigin(0.12, 0.5)
			.setDisplaySize(78, 22)
			.setDepth(actorDepth(570) + 1);
		this.dongLabel = this.add
			.text(this.dongYunting.x, this.dongYunting.y - 126, "董云庭", {
				fontFamily: "Georgia, Noto Serif SC, serif",
				fontSize: "14px",
				color: "#f4d08a",
				stroke: "#1b110b",
				strokeThickness: 4,
			})
			.setOrigin(0.5, 1)
			.setAlpha(0.82)
			.setDepth(actorDepth(570) + 2);

		const enemyDefinitions: Array<[string, string, number, number]> = [
			["MILITIA_01", "ch03_combat_militia_a", 615, 540],
			["MILITIA_02", "ch03_combat_militia_b", 925, 535],
			["MILITIA_03", "ch03_combat_militia_a", 1035, 655],
			["MILITIA_04", "ch03_combat_militia_b", 680, 720],
		];
		this.enemies = enemyDefinitions.map(([id, texture, x, y], index) => {
			const sprite = this.add
				.image(x, y, texture)
				.setOrigin(0.5, 1)
				.setDisplaySize(94, 114)
				.setDepth(actorDepth(y));
			const weaponSprite = this.add
				.image(x + 18, y - 62, WEAPONS.pistol.texture)
				.setOrigin(0.12, 0.5)
				.setDisplaySize(52, 22)
				.setDepth(actorDepth(y) + 1);
			const marker = this.add.graphics().setDepth(actorDepth(y) + 2);
			const enemy: EnemyUnit = {
				id,
				sprite,
				weaponSprite,
				marker,
				hp: 100,
				maxHp: 100,
				state: "active",
				lastShotAt: 800 + index * 460,
				staggerUntil: 0,
				patrolTarget: new Phaser.Math.Vector2(x + (index % 2 ? -90 : 90), y),
			};
			this.drawEnemyMarker(enemy);
			this.updateEnemyWeapon(enemy, new Phaser.Math.Vector2(1, 0));
			return enemy;
		});
		this.reticle = this.add.graphics().setDepth(700);
	}

	drawEnemyMarker(enemy: EnemyUnit) {
		enemy.marker.clear();
		if (enemy.state === "captured") {
			enemy.marker.lineStyle(2, 0x8fc6a0, 0.8);
			enemy.marker.strokeCircle(enemy.sprite.x, enemy.sprite.y - 108, 12);
			return;
		}
		if (enemy.state === "stunned") {
			enemy.marker.lineStyle(2, 0xf0c066, 0.95);
			enemy.marker.strokeCircle(enemy.sprite.x, enemy.sprite.y - 118, 14);
			enemy.marker.lineBetween(enemy.sprite.x - 6, enemy.sprite.y - 118, enemy.sprite.x + 6, enemy.sprite.y - 118);
			return;
		}
		const width = 52;
		enemy.marker.fillStyle(0x321d18, 0.82);
		enemy.marker.fillRect(enemy.sprite.x - width / 2, enemy.sprite.y - 124, width, 5);
		enemy.marker.fillStyle(0xb6402b, 0.92);
		enemy.marker.fillRect(enemy.sprite.x - width / 2, enemy.sprite.y - 124, width * (enemy.hp / enemy.maxHp), 5);
	}

	beginCapturePhase() {
		this.phase = "capture";
		this.state.mode = "combat";
		this.state.playerLocked = false;
		showCombatHud({
			visible: true,
			hp: this.playerHp,
			maxHp: this.maxPlayerHp,
			ammo: this.weaponAmmo[this.weapon],
			reserve: this.weaponReserve[this.weapon],
			weapon: this.weapon,
			weaponLabel: WEAPONS[this.weapon].label,
			objective: "俘虏团丁",
			captured: this.captured,
			captureTotal: CAPTURE_TOTAL,
			status: this.permission === "FORWARD_SUPPORT" ? "前门内侧·辅助突入" : "分组协同·跟上传话",
		});
		showPrompt("击晕团丁后靠近，按 E 俘虏");
	}

	get playerCenter(): Phaser.Math.Vector2 {
		return new Phaser.Math.Vector2(this.player.x, this.player.y - PLAYER_HEIGHT * 0.46);
	}

	get pointerWorld(): Phaser.Math.Vector2 {
		const pointer = this.input?.activePointer;
		const camera = this.cameras?.main;
		if (!pointer || !camera) return new Phaser.Math.Vector2(this.player?.x ?? 0, this.player?.y ?? 0);
		return camera.getWorldPoint(pointer.x, pointer.y);
	}

	updateAim() {
		const target = this.pointerWorld;
		const direction = new Phaser.Math.Vector2(target.x - this.playerCenter.x, target.y - this.playerCenter.y);
		if (direction.lengthSq() > 100) this.lastAim.copy(direction.normalize());
		const aim = this.lastAim;
		const angle = Math.atan2(aim.y, aim.x);
		this.playerWeapon.setPosition(this.playerCenter.x + aim.x * 28, this.playerCenter.y + aim.y * 28);
		this.playerWeapon.setRotation(angle);
		this.playerWeapon.setTexture(WEAPONS[this.weapon].texture);
		this.playerWeapon.setDisplaySize(this.weapon === "longgun" ? 78 : 56, this.weapon === "longgun" ? 22 : 28);
		this.playerWeapon.setDepth(actorDepth(this.player.y) + 1);
		const nextDirection: ChenWalkDirection = Math.abs(aim.x) >= Math.abs(aim.y)
			? aim.x < 0 ? "left" : "right"
			: aim.y < 0 ? "up" : "down";
		this.playerDirection = nextDirection;
	}

	/**
	 * 武器不是烘焙在角色图上的第二套人物，而是独立的可替换运行时层。
	 * 这样同一把枪可以服务陈继南、董云庭和团丁，角色素材仍保持像素比例稳定。
	 */
	updateDongWeapon() {
		if (!this.dongWeapon || !this.dongYunting) return;
		let direction = new Phaser.Math.Vector2(1, 0);
		const target = this.enemies.find((enemy) => enemy.state === "active");
		if (target) {
			direction = new Phaser.Math.Vector2(
				target.sprite.x - this.dongYunting.x,
				target.sprite.y - 52 - (this.dongYunting.y - 64),
			).normalize();
		} else if (this.phase === "pursuit" && this.pursuitIndex < this.pursuitPath.length) {
			const [targetX, targetY] = this.pursuitPath[this.pursuitIndex];
			direction = new Phaser.Math.Vector2(targetX - this.dongYunting.x, targetY - this.dongYunting.y).normalize();
		}
		const angle = Math.atan2(direction.y, direction.x);
		this.dongWeapon
			.setVisible(this.phase === "capture" || this.phase === "pursuit")
			.setPosition(this.dongYunting.x + direction.x * 18, this.dongYunting.y - 68 + direction.y * 18)
			.setRotation(angle)
			.setDepth(actorDepth(this.dongYunting.y) + 1);
	}

	updateEnemyWeapon(enemy: EnemyUnit, direction: Phaser.Math.Vector2) {
		const angle = Math.atan2(direction.y, direction.x);
		enemy.weaponSprite
			.setVisible(enemy.state === "active")
			.setPosition(enemy.sprite.x + direction.x * 18, enemy.sprite.y - 62 + direction.y * 18)
			.setRotation(angle)
			.setDepth(actorDepth(enemy.sprite.y) + 1);
	}

	movePlayer(delta: number) {
		let x = 0;
		let y = 0;
		if (isActionDown(this.keyMap, "MOVE_LEFT")) x -= 1;
		if (isActionDown(this.keyMap, "MOVE_RIGHT")) x += 1;
		if (isActionDown(this.keyMap, "MOVE_UP")) y -= 1;
		if (isActionDown(this.keyMap, "MOVE_DOWN")) y += 1;
		if (!x && !y) {
			this.player.anims.stop();
			this.player.setTexture(chenFrameKey(this.playerDirection, 0));
			return;
		}
		const vector = new Phaser.Math.Vector2(x, y).normalize().scale(245 * delta);
		this.tryMove(vector.x, vector.y);
		if (Math.abs(x) >= Math.abs(y)) this.playerDirection = x < 0 ? "left" : "right";
		else this.playerDirection = y < 0 ? "up" : "down";
		this.player.setTexture(chenFrameKey(this.playerDirection, 0));
		if (this.player.anims.currentAnim?.key !== chenAnimKey(this.playerDirection)) this.player.play(chenAnimKey(this.playerDirection));
		this.player.anims.timeScale = 1.2;
	}

	tryMove(dx: number, dy: number) {
		const canOccupy = (x: number, y: number) => {
			const rect: Rect = [x - 18, y - 28, 36, 28];
			if (rect[0] < 0 || rect[1] < 0 || rect[0] + rect[2] > WORLD_W || rect[1] + rect[3] > WORLD_H) return false;
			return !this.collisionRects.some(({ rect: obstacle }) => this.aabbOverlaps(rect, obstacle));
		};
		if (canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
		if (canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
	}

	aabbOverlaps(a: Rect, b: Rect): boolean {
		return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
	}

	shoot() {
		if (this.phase !== "capture" || this.state.playerLocked || this.reloadUntil > this.time.now) return;
		const definition = WEAPONS[this.weapon];
		if (this.time.now - this.lastShotAt < definition.cooldown) return;
		if (this.weaponAmmo[this.weapon] <= 0) {
			this.reloadUntil = this.time.now + 740;
			showPrompt("弹匣已空，正在重新装填");
			return;
		}
		this.lastShotAt = this.time.now;
		this.weaponAmmo[this.weapon] -= 1;
		const aim = this.lastAim.clone().normalize();
		const origin = this.playerCenter.clone().add(aim.clone().scale(28));
		const sprite = this.add
			.rectangle(origin.x, origin.y, this.weapon === "longgun" ? 12 : 9, this.weapon === "longgun" ? 4 : 3, 0xffe2a1, 1)
			.setRotation(Math.atan2(aim.y, aim.x))
			.setDepth(680);
		this.projectiles.push({
			sprite,
			velocity: aim.scale(definition.projectileSpeed),
			damage: definition.damage,
			faction: "player",
			life: 0.9,
		});
		this.emitMuzzleFlash(origin.x, origin.y, 0xffdc79);
		this.playCombatSfx("shot");
		this.updateCombatHudState();
	}

	findNearestActiveEnemy(origin: Phaser.GameObjects.Image): EnemyUnit | undefined {
		return this.enemies
			.filter((enemy) => enemy.state === "active")
			.sort((a, b) => distanceBetween(a.sprite, origin) - distanceBetween(b.sprite, origin))[0];
	}

	updateDongCombat() {
		if (this.phase !== "capture" || !this.dongYunting) return;
		const target = this.findNearestActiveEnemy(this.dongYunting);
		if (!target || this.time.now - this.dongLastShotAt < 1120) return;
		this.dongLastShotAt = this.time.now;
		const direction = new Phaser.Math.Vector2(
			target.sprite.x - this.dongYunting.x,
			target.sprite.y - 52 - (this.dongYunting.y - 64),
		).normalize();
		const origin = new Phaser.Math.Vector2(this.dongYunting.x, this.dongYunting.y - 64).add(direction.clone().scale(26));
		const sprite = this.add
			.rectangle(origin.x, origin.y, 13, 4, 0xb9e4ff, 1)
			.setRotation(Math.atan2(direction.y, direction.x))
			.setDepth(680);
		this.projectiles.push({
			sprite,
			velocity: direction.scale(980),
			damage: 42,
			faction: "ally",
			life: 1,
		});
		this.emitMuzzleFlash(origin.x, origin.y, 0xb9e4ff);
		this.playCombatSfx("ally_shot");
	}

	swapWeapon() {
		if (this.phase !== "capture" || this.state.playerLocked) return;
		this.weapon = this.weapon === "pistol" ? "longgun" : "pistol";
		this.showStatus(`${WEAPONS[this.weapon].label}已就位`);
		this.updateCombatHudState();
	}

	tryCapture() {
		if (this.phase !== "capture" || this.state.playerLocked) return;
		const target = this.enemies
			.filter((enemy) => enemy.state === "stunned")
			.sort((a, b) => distanceBetween(a.sprite, this.player) - distanceBetween(b.sprite, this.player))[0];
		if (!target || distanceBetween(target.sprite, this.player) > 112) {
			this.showStatus("靠近已经失去抵抗能力的团丁，再按 E");
			return;
		}
		target.state = "captured";
		target.sprite.clearTint();
		target.sprite.setAlpha(0.62);
		this.captured += 1;
		this.drawEnemyMarker(target);
		this.playCombatSfx("capture");
		this.showStatus(`已控制团丁（${this.captured}/${CAPTURE_TOTAL}）`);
		this.updateCombatHudState();
		if (this.captured >= CAPTURE_TOTAL) this.beginPursuitTransition();
	}

	beginPursuitTransition() {
		this.state.flags.add(CH03_COMBAT_FLAGS.captureComplete);
		this.state.playerLocked = true;
		this.phase = "intro";
		this.state.mode = "combat_narrative";
		showPrompt("");
		playNarrative(CH03_GATE_BREACH_PURSUIT_INTRO, () => this.beginPursuit());
	}

	beginPursuit() {
		this.state.flags.add(CH03_COMBAT_FLAGS.pursuitStarted);
		this.phase = "pursuit";
		this.pursuitIndex = 0;
		this.state.mode = "combat_pursuit";
		this.state.playerLocked = false;
		showPrompt("跟住董云庭，按他的路线向后院推进");
		updateCombatHud({
			objective: "跟随董云庭追击杜老三",
			pursuitProgress: 0,
			status: "三路合拢·追击展开",
		});
	}

	updatePursuit(delta: number) {
		if (!this.dongYunting || this.pursuitIndex >= this.pursuitPath.length) return;
		const [targetX, targetY] = this.pursuitPath[this.pursuitIndex];
		const dx = targetX - this.dongYunting.x;
		const dy = targetY - this.dongYunting.y;
		const distance = Math.hypot(dx, dy);
		const playerDistance = distanceBetween(this.dongYunting, this.player);
		if (playerDistance < 240 && distance > 8) {
			this.dongYunting.x += (dx / distance) * 150 * delta;
			this.dongYunting.y += (dy / distance) * 150 * delta;
		}
		if (distance <= 10) this.pursuitIndex += 1;
		this.dongYunting.setDepth(actorDepth(this.dongYunting.y));
		this.dongLabel.setPosition(this.dongYunting.x, this.dongYunting.y - 126).setDepth(actorDepth(this.dongYunting.y) + 2);
		const progress = Math.min(1, (this.pursuitIndex + Math.max(0, 1 - distance / 150)) / this.pursuitPath.length);
		updateCombatHud({ pursuitProgress: progress });
		if (this.pursuitIndex >= this.pursuitPath.length && playerDistance < 260) this.completePursuit();
	}

	completePursuit() {
		if (this.phase !== "pursuit") return;
		this.phase = "intro";
		this.state.mode = "combat_narrative";
		this.state.playerLocked = true;
		showPrompt("");
		playNarrative(CH03_GATE_BREACH_FINISH, () => this.completeCombat());
	}

	completeCombat() {
		this.phase = "complete";
		this.state.flags.add(CH03_COMBAT_FLAGS.captureComplete);
		this.state.flags.add(CH03_COMBAT_FLAGS.pursuitStarted);
		this.state.flags.add(CH03_COMBAT_FLAGS.complete);
		this.state.mode = "combat_complete";
		this.state.playerLocked = true;
		hideDialogue();
		hideCombatHud();
		showTask(CH03_GATE_BREACH_COMPLETE_TASK);
		useGameSaveStore().autosave("CH03_COMPOUND");
		// 给玩家一个短暂的“战斗完成”确认，再自动进入固定历史节点。
		// 历史行动由视频呈现，避免玩家操作改写董云庭击中杜老三这一节点。
		this.time.delayedCall(1350, () => {
			if (this.phase !== "complete" || this.state.flags.has(CH03_COMBAT_FLAGS.historicalNodeStarted)) return;
			this.state.flags.add(CH03_COMBAT_FLAGS.historicalNodeStarted);
			this.state.mode = "transition";
			this.state.playerLocked = true;
			hideTask();
			hidePrompt();
			this.cameras.main.fadeOut(650, 0, 0, 0);
			this.time.delayedCall(660, () => this.game.events.emit("ch03:historical-node-enter"));
		});
	}

	failCombat() {
		if (this.phase === "failure" || this.phase === "complete") return;
		this.phase = "failure";
		this.state.flags.add(CH03_COMBAT_FLAGS.failure);
		this.state.mode = "combat_failure";
		this.state.playerLocked = true;
		hideCombatHud();
		this.playCombatSfx("failure");
		showTask(CH03_GATE_BREACH_FAILURE_TASK);
	}

	handleConfirm() {
		if (taskNeedsConfirmation()) {
			closeTask();
			return;
		}
		if (this.phase === "failure") {
			this.state.flags.delete(CH03_COMBAT_FLAGS.failure);
			this.state.flags.delete(CH03_COMBAT_FLAGS.started);
			this.scene.restart({ retry: true });
			return;
		}
		if (this.phase === "capture") this.tryCapture();
	}

	handlePointerDown() {
		if (this.phase === "capture") this.shoot();
	}

	updateProjectiles(delta: number) {
		for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
			const projectile = this.projectiles[index];
			const previous = new Phaser.Math.Vector2(projectile.sprite.x, projectile.sprite.y);
			projectile.sprite.x += projectile.velocity.x * delta;
			projectile.sprite.y += projectile.velocity.y * delta;
			projectile.life -= delta;
			const outOfBounds = projectile.sprite.x < 0 || projectile.sprite.y < 0 || projectile.sprite.x > WORLD_W || projectile.sprite.y > WORLD_H;
			const hitWall = this.collisionRects.some(({ rect }) => this.aabbOverlaps([projectile.sprite.x - 2, projectile.sprite.y - 2, 4, 4], rect));
			let remove = projectile.life <= 0 || outOfBounds || hitWall;
		if (!remove && projectile.faction === "player") {
			const target = this.enemies.find((enemy) => enemy.state === "active" && Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, enemy.sprite.x, enemy.sprite.y - 52) < 32);
			if (target) {
				this.hitEnemy(target, projectile.damage);
				remove = true;
			}
		} else if (!remove && projectile.faction === "ally") {
			const target = this.enemies.find((enemy) => enemy.state === "active" && Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, enemy.sprite.x, enemy.sprite.y - 52) < 32);
			if (target) {
				this.hitEnemy(target, projectile.damage);
				remove = true;
			}
		} else if (!remove && projectile.faction === "enemy") {
				if (Phaser.Math.Distance.Between(projectile.sprite.x, projectile.sprite.y, this.playerCenter.x, this.playerCenter.y) < 24) {
					this.hitPlayer(projectile.damage);
					remove = true;
				}
			}
			if (remove) {
				projectile.sprite.destroy();
				this.projectiles.splice(index, 1);
			} else {
				const angle = Math.atan2(projectile.sprite.y - previous.y, projectile.sprite.x - previous.x);
				projectile.sprite.setRotation(angle);
			}
		}
	}

	hitEnemy(enemy: EnemyUnit, damage: number) {
		if (enemy.state !== "active") return;
		enemy.hp = Math.max(0, enemy.hp - damage);
		enemy.staggerUntil = this.time.now + 180;
		enemy.sprite.setTint(0xffd27a);
		this.time.delayedCall(120, () => enemy.state === "active" && enemy.sprite.clearTint());
		this.emitHitFx(enemy.sprite.x, enemy.sprite.y - 55, 0xffd27a);
		this.playCombatSfx("hit");
		if (enemy.hp <= 0) {
			enemy.state = "stunned";
			enemy.sprite.setTint(0xc88e55);
			this.showStatus("团丁已失去抵抗能力，靠近后按 E 俘虏");
		}
		this.drawEnemyMarker(enemy);
	}

	hitPlayer(damage: number) {
		if (this.time.now < this.invulnerableUntil || this.phase !== "capture") return;
		this.invulnerableUntil = this.time.now + 650;
		this.playerHp = Math.max(0, this.playerHp - damage);
		this.player.setTint(0xff8b65);
		this.time.delayedCall(170, () => this.player?.clearTint());
		this.cameras.main.shake(90, 0.003);
		this.playCombatSfx("enemy_hit");
		this.updateCombatHudState();
		if (this.playerHp <= 0) this.failCombat();
	}

	updateEnemies(delta: number) {
		if (this.phase !== "capture") return;
		for (const enemy of this.enemies) {
			if (enemy.state !== "active") {
				this.updateEnemyWeapon(enemy, new Phaser.Math.Vector2(1, 0));
				this.drawEnemyMarker(enemy);
				continue;
			}
			const dx = this.playerCenter.x - enemy.sprite.x;
			const dy = this.playerCenter.y - (enemy.sprite.y - 52);
			const distance = Math.hypot(dx, dy);
			const aimDirection = new Phaser.Math.Vector2(dx, dy).normalize();
			this.updateEnemyWeapon(enemy, aimDirection);
			if (distance < 560 && this.time.now - enemy.lastShotAt > 1700) {
				enemy.lastShotAt = this.time.now;
				this.enemyShoot(enemy);
			}
			if (distance > 260 && distance < 520) {
				const length = Math.max(1, distance);
				const stepX = (dx / length) * 42 * delta;
				const stepY = (dy / length) * 42 * delta;
				if (this.enemyCanOccupy(enemy.sprite.x + stepX, enemy.sprite.y)) enemy.sprite.x += stepX;
				if (this.enemyCanOccupy(enemy.sprite.x, enemy.sprite.y + stepY)) enemy.sprite.y += stepY;
			} else if (distance > 560) {
				this.moveEnemyToPatrol(enemy, delta);
			}
			enemy.sprite.setDepth(actorDepth(enemy.sprite.y));
			this.updateEnemyWeapon(enemy, aimDirection);
			this.drawEnemyMarker(enemy);
		}
	}

	moveEnemyToPatrol(enemy: EnemyUnit, delta: number) {
		const dx = enemy.patrolTarget.x - enemy.sprite.x;
		const dy = enemy.patrolTarget.y - enemy.sprite.y;
		const distance = Math.hypot(dx, dy);
		if (distance < 12) {
			enemy.patrolTarget.x = enemy.sprite.x + Phaser.Math.Between(-120, 120);
			enemy.patrolTarget.y = enemy.sprite.y + Phaser.Math.Between(-70, 70);
			return;
		}
		const stepX = (dx / distance) * 24 * delta;
		const stepY = (dy / distance) * 24 * delta;
		if (this.enemyCanOccupy(enemy.sprite.x + stepX, enemy.sprite.y)) enemy.sprite.x += stepX;
		if (this.enemyCanOccupy(enemy.sprite.x, enemy.sprite.y + stepY)) enemy.sprite.y += stepY;
	}

	enemyCanOccupy(x: number, y: number) {
		const rect: Rect = [x - 20, y - 24, 40, 24];
		return rect[0] >= 0 && rect[1] >= 0 && rect[0] + rect[2] <= WORLD_W && rect[1] + rect[3] <= WORLD_H && !this.collisionRects.some(({ rect: obstacle }) => this.aabbOverlaps(rect, obstacle));
	}

	enemyShoot(enemy: EnemyUnit) {
		const direction = this.playerCenter.clone().subtract(new Phaser.Math.Vector2(enemy.sprite.x, enemy.sprite.y - 52)).normalize();
		const origin = new Phaser.Math.Vector2(enemy.sprite.x, enemy.sprite.y - 58).add(direction.clone().scale(20));
		const sprite = this.add.rectangle(origin.x, origin.y, 9, 3, 0xffa67a, 1).setRotation(Math.atan2(direction.y, direction.x)).setDepth(680);
		this.projectiles.push({
			sprite,
			velocity: direction.scale(520),
			damage: 6,
			faction: "enemy",
			life: 1.2,
		});
		this.emitMuzzleFlash(origin.x, origin.y, 0xff9e70);
		this.playCombatSfx("enemy_shot");
	}

	emitMuzzleFlash(x: number, y: number, color: number) {
		this.muzzleFlash?.destroy();
		this.muzzleFlash = this.add.rectangle(x, y, 24, 10, color, 0.9).setDepth(690);
		this.tweens.add({
			targets: this.muzzleFlash,
			alpha: { from: 0.85, to: 0 },
			scale: { from: 1, to: 1.7 },
			duration: 90,
			onComplete: () => this.muzzleFlash?.destroy(),
		});
	}

	emitHitFx(x: number, y: number, color: number) {
		const burst = this.add.circle(x, y, 10, color, 0.6).setDepth(690);
		this.tweens.add({
			targets: burst,
			scale: 2.2,
			alpha: 0,
			duration: 160,
			onComplete: () => burst.destroy(),
		});
	}

	showStatus(text: string) {
		showPrompt(text);
		this.time.delayedCall(1600, () => {
			if (this.phase === "capture") showPrompt("击晕团丁后靠近，按 E 俘虏");
		});
	}

	updateCombatHudState() {
		updateCombatHud({
			hp: this.playerHp,
			maxHp: this.maxPlayerHp,
			ammo: this.weaponAmmo[this.weapon],
			reserve: this.weaponReserve[this.weapon],
			weapon: this.weapon,
			weaponLabel: WEAPONS[this.weapon].label,
			captured: this.captured,
		});
	}

	drawReticle() {
		if (!this.reticle) return;
		const point = this.pointerWorld;
		this.reticle.clear();
		this.reticle.lineStyle(1.5, 0xf6d899, 0.82);
		this.reticle.strokeCircle(point.x, point.y, 10);
		this.reticle.lineBetween(point.x - 15, point.y, point.x - 5, point.y);
		this.reticle.lineBetween(point.x + 5, point.y, point.x + 15, point.y);
		this.reticle.lineBetween(point.x, point.y - 15, point.x, point.y - 5);
		this.reticle.lineBetween(point.x, point.y + 5, point.x, point.y + 15);
	}

	playBgm() {
		this.chapter3Bgm = this.sound.add("ch03_bgm_gate_breach", { loop: true, volume: 0.58 });
		this.chapter3Bgm.play();
	}

	playCombatSfx(kind: "gate_break" | "shot" | "ally_shot" | "enemy_shot" | "hit" | "enemy_hit" | "capture" | "failure") {
		try {
			const context = (this.sound as any).context as AudioContext | undefined;
			if (!context || context.state === "suspended") return;
			const now = context.currentTime;
			const gain = context.createGain();
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.exponentialRampToValueAtTime(kind === "gate_break" ? 0.12 : 0.055, now + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "gate_break" ? 0.7 : 0.14));
			gain.connect((this.sound as any).masterVolumeNode ?? context.destination);
			const oscillator = context.createOscillator();
			oscillator.type = kind === "shot" || kind === "ally_shot" || kind === "enemy_shot" ? "square" : "sawtooth";
			const base = kind === "gate_break" ? 62 : kind === "capture" ? 330 : kind === "failure" ? 82 : kind === "hit" ? 190 : kind === "ally_shot" ? 520 : 120;
			oscillator.frequency.setValueAtTime(base, now);
			oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, base * 0.42), now + (kind === "gate_break" ? 0.64 : 0.12));
			oscillator.connect(gain);
			this.runtimeSfxSources.push(oscillator);
			this.runtimeSfxGains.push(gain);
			oscillator.start(now);
			oscillator.stop(now + (kind === "gate_break" ? 0.74 : 0.18));
		} catch {
			// Web Audio may not be available before a user gesture.
		}
	}

	stopRuntimeSfx() {
		for (const source of this.runtimeSfxSources) {
			try {
				source.stop();
			} catch {
				// A source may already have completed naturally.
			}
			try {
				source.disconnect();
			} catch {
				// Disconnect is best effort during scene shutdown.
			}
		}
		for (const gain of this.runtimeSfxGains) {
			try {
				gain.disconnect();
			} catch {
				// Gain may already be detached by the browser.
			}
		}
		this.runtimeSfxSources = [];
		this.runtimeSfxGains = [];
	}

	update(_time: number, deltaMs: number) {
		if (!this.player || !this.sys.isActive()) return;
		this.drawReticle();
		this.updateAim();
		if (this.state.paused || this.state.inNarrative || this.state.playerLocked) {
			this.player.anims.stop();
			return;
		}
		const delta = Math.min(0.05, deltaMs / 1000);
		if (this.phase === "capture") {
			this.movePlayer(delta);
			if (isActionDown(this.keyMap, "FIRE")) this.shoot();
			this.updateDongCombat();
			this.updateEnemies(delta);
		}
		if (this.phase === "pursuit") {
			this.movePlayer(delta);
			this.updatePursuit(delta);
		}
		if (this.reloadUntil && this.time.now >= this.reloadUntil) {
			const definition = WEAPONS[this.weapon];
			const needed = definition.magazine - this.weaponAmmo[this.weapon];
			const loaded = Math.min(needed, this.weaponReserve[this.weapon]);
			this.weaponAmmo[this.weapon] += loaded;
			this.weaponReserve[this.weapon] -= loaded;
			this.reloadUntil = 0;
			this.updateCombatHudState();
			this.showStatus("装填完成");
		}
		this.updateProjectiles(delta);
		this.player.setDepth(actorDepth(this.player.y));
		this.playerWeapon.setDepth(actorDepth(this.player.y) + 1);
		this.updateDongWeapon();
	}

	shutdown() {
		this.stopRuntimeSfx();
		this.chapter3Bgm?.stop();
		this.chapter3Bgm?.destroy();
		this.chapter3Bgm = undefined;
		this.input.off("pointerdown", this.handlePointerDown, this);
		for (const projectile of this.projectiles) projectile.sprite.destroy();
		this.projectiles = [];
		this.combatSmoke?.destroy();
		this.combatSmoke = undefined;
		this.combatEmbers?.destroy();
		this.combatEmbers = undefined;
		hideCombatHud();
		if ((window as any).ch03GateBreachCombatGame === this) delete (window as any).ch03GateBreachCombatGame;
	}
}
