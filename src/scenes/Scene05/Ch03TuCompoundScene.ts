import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { actorDepth } from "@/common/displayDepth";
import { useGameStateStore } from "@/stores/modules/gameState";
import { useGameSaveStore } from "@/stores/modules/gameSave";
import { classifyRisk, applyFormalChoice, type RiskFailure } from "@/common/actionProfileSystem";
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
	closeInfoPanel,
	closeTask,
	hideChoices,
	hideDialogue,
	hideInfoPanel,
	hideItem,
	hidePrompt,
	hideResult,
	hideTask,
	advanceNarrative,
	playNarrative,
	showChoices,
	showInfoPanel,
	showResult,
	showPrompt,
	showTask,
	taskNeedsConfirmation,
	togglePause,
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
import {
	CH03_RISK_PRECHECK_FLAGS,
	getChapter3TaskAssignment,
	TASK_PERMISSION_LABELS,
	taskPermissionFlags,
	taskPermissionFromFlags,
	type Chapter3TaskAssignment,
	type Chapter3TaskPermission,
} from "./ch03RiskPrecheck";
import {
	buildChapter3RiskBranch,
	buildChapter3RiskCompleteTask,
	buildChapter3RiskInfo,
	CH03_RISK_PRECHECK_INTRO,
} from "./ch03RiskPrecheck.content";
import {
	buildChapter3ObservationChoices,
	buildChapter3ObservationCompleteTask,
	buildChapter3ObservationFeedback,
	buildChapter3ObservationFormalChoice,
	CH03_OBSERVATION_FLAGS,
	CH03_OBSERVATION_IMAGE_KEYS,
	observationImagePath,
	type ObservationChoiceId,
} from "./ch03Observation.content";
import {
	CH03_ACTION_START_TASK,
	CH03_FLASHBACK3_ENTRY_TASK,
	CH03_FLASHBACK3_FLAGS,
} from "./ch03Flashback3.content";
import {
	actionImagePath,
	buildChapter3ActionChoices,
	buildChapter3ActionFailureTask,
	buildChapter3ActionFeedback,
	buildChapter3ActionFormalChoice,
	CH03_ACTION_FLAGS,
	CH03_ACTION_IMAGE_KEYS,
	CH03_ACTION_INTRO,
	type ActionStartChoiceId,
} from "./ch03ActionStart.content";
import {
	buildChapter3GateAttackFailureTask,
	buildChapter3GateEntryChoices,
	buildChapter3GateEntryFeedback,
	buildChapter3GateEntryFormalChoice,
	CH03_FIRE_SYNC_INTRO,
	CH03_GATE_ATTACK_FLAGS,
	CH03_GATE_ATTACK_INTRO,
	CH03_GATE_ATTACK_TASK,
	CH03_GATE_ENTRY_IMAGE_KEYS,
	gateEntryImagePath,
	type GateEntryChoiceId,
} from "./ch03GateAttack.content";
import {
	CH03_COMBAT_FLAGS,
	CH03_GATE_BREACH_TASK,
	CH03_GATE_BREACH_COMPLETE_TASK,
} from "./ch03GateBreachCombat.content";
import {
	afterBattleImagePath,
	buildChapter3AfterBattleChoices,
	buildChapter3AfterBattleFailureTask,
	buildChapter3AfterBattleFeedback,
	buildChapter3AfterBattleFormalChoice,
	CH03_AFTER_BATTLE_FLAGS,
	CH03_AFTER_BATTLE_IMAGE_KEYS,
	CH03_AFTER_BATTLE_TASK,
	type AfterBattleChoiceId,
} from "./ch03AfterBattle.content";
import {
	buildChapter3ClearingChoices,
	buildChapter3ClearingFeedback,
	buildChapter3ClearingFailureTask,
	buildChapter3ClearingFormalChoice,
	buildChapter3MooncakeChoices,
	buildChapter3MooncakeFeedback,
	buildChapter3MooncakeFormalChoice,
	CH03_CLEARING_FLAGS,
	CH03_CLEARING_IMAGE_KEYS,
	CH03_CLEARING_INTRO,
	CH03_CLEARING_TASK,
	CH03_MOONCAKE_FLAGS,
	CH03_MOONCAKE_IMAGE_KEYS,
	CH03_MOONCAKE_INTRO,
	CH03_MOONCAKE_TASK,
	CH03_AFTERMATH_COMPLETE_TASK,
	CH03_CHAPTER_END_FLAGS,
	CH03_CHAPTER_END_INTRO,
	CH03_CHAPTER_END_TASK,
	clearingImagePath,
	moonCakeStatus,
	mooncakeImagePath,
	type ClearingChoiceId,
	type MooncakeChoiceId,
} from "./ch03Aftermath.content";

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

interface RuntimeNpcDefinition {
	id: string;
	texture: string;
	position: [number, number];
	displayHeight: number;
	alpha?: number;
}

function rectCenterBottom(rect: Rect): [number, number] {
	return [rect[0] + rect[2] / 2, rect[1] + rect[3]];
}

function distanceBetweenActors(
	a: Phaser.GameObjects.GameObject & { x: number; y: number },
	b: Phaser.GameObjects.GameObject & { x: number; y: number },
): number {
	return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
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
	npcActors: Phaser.GameObjects.Image[] = [];
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	playerDirection: ChenWalkDirection = "up";
	keyMap!: ReturnType<typeof createKeyMap>;
	collisionRects: Array<{ id: string; rect: Rect; rotation: number }> = [];
	riskPrecheckStarted = false;
	riskAssignment: Chapter3TaskAssignment | null = null;
	observationPhase: "waiting" | "choice" | "result" | "feedback" | "complete" | "replacement" = "waiting";
	observationChoice: ObservationChoiceId | null = null;
	observationFailure: "identity" | "execution" | "coordination" | null = null;
	observationCoordinationRiskHigh = false;
	actionPhase: "waiting" | "intro" | "choice" | "result" | "feedback" | "complete" | "replacement" = "waiting";
	actionChoice: ActionStartChoiceId | null = null;
	actionFailure: RiskFailure | null = null;
	actionCoordinationRiskHigh = false;
	gateAttackPhase: "waiting" | "narrative" | "fire_narrative" | "choice" | "result" | "feedback" | "complete" | "replacement" = "waiting";
	gateEntryChoice: GateEntryChoiceId | null = null;
	gateEntryFailure: RiskFailure | null = null;
	gateEntryCoordinationRiskHigh = false;
	afterBattlePhase:
		| "waiting"
		| "choice"
		| "result"
		| "feedback"
		| "complete"
		| "replacement"
		| "clearing_ready"
		| "clearing_intro"
		| "clearing_choice"
		| "clearing_result"
		| "clearing_feedback"
		| "moon_cake_ready"
		| "moon_cake_intro"
		| "moon_cake_choice"
	| "moon_cake_result"
	| "moon_cake_feedback"
	| "chapter_end_ready"
	| "chapter_end_intro" = "waiting";
	afterBattleChoice: AfterBattleChoiceId | null = null;
	afterBattleFailure: RiskFailure | null = null;
	clearingChoice: ClearingChoiceId | null = null;
	clearingFailure: RiskFailure | null = null;
	clearingPropertySuspicion = false;
	mooncakeChoice: MooncakeChoiceId | null = null;
	afterBattleMarker?: Phaser.GameObjects.Container;
	fireEmbers?: Phaser.GameObjects.Particles.ParticleEmitter;
	fireSmoke?: Phaser.GameObjects.Particles.ParticleEmitter;
	fireGlow?: Phaser.GameObjects.Ellipse;
	gateSparks?: Phaser.GameObjects.Particles.ParticleEmitter;
	effectTimers: Phaser.Time.TimerEvent[] = [];
	runtimeSfxSources: AudioScheduledSourceNode[] = [];
	runtimeSfxGains: GainNode[] = [];
	chapter3Bgm?: Phaser.Sound.BaseSound;

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
		this.npcActors = [];
		this.riskPrecheckStarted = false;
		this.riskAssignment = null;
		this.observationPhase = "waiting";
		this.observationChoice = null;
		this.observationFailure = null;
		this.observationCoordinationRiskHigh = false;
		this.actionPhase = "waiting";
		this.actionChoice = null;
		this.actionFailure = null;
		this.actionCoordinationRiskHigh = false;
		this.gateAttackPhase = "waiting";
		this.gateEntryChoice = null;
		this.gateEntryFailure = null;
		this.gateEntryCoordinationRiskHigh = false;
		this.afterBattlePhase = "waiting";
		this.afterBattleChoice = null;
		this.afterBattleFailure = null;
		this.clearingChoice = null;
		this.clearingFailure = null;
		this.clearingPropertySuspicion = false;
		this.mooncakeChoice = null;
		this.afterBattleMarker = undefined;
		this.fireEmbers = undefined;
		this.fireSmoke = undefined;
		this.fireGlow = undefined;
		this.gateSparks = undefined;
		this.effectTimers = [];
		this.runtimeSfxSources = [];
		this.runtimeSfxGains = [];
	}

	preload() {
		this.definition = TU_COMPOUND_MAPS[this.compoundState];
		preloadLayeredMap(this, this.definition);
		preloadChenWalk(this);
		this.load.image("ch03_elder_member", "assets/characters/ch03-elder-member/idle.png");
		this.load.image("ch03_dong_yunting_after_battle", "assets/characters/ch03-dong-yunting/idle.png");
		this.load.image("ch03_wounded_member", "assets/characters/ch03-wounded-member/idle.png");
		this.load.image("ch02_npc_group_leader", "assets/ch02/actors/ch02_npc_group_leader.png");
		this.load.image("ch02_npc_dai_annan", "assets/ch02/actors/ch02_npc_dai_annan.png");
		this.load.image("ch02_npc_young_member", "assets/ch02/actors/ch02_npc_young_member.png");
		this.load.image("ch02_npc_worker_straw_hat", "assets/ch02/actors/ch02_npc_worker_straw_hat.png");
		this.load.image("ch02_npc_worker_blue_headcloth", "assets/ch02/actors/ch02_npc_worker_blue_headcloth.png");
		this.load.image("ch03_npc_peng_dingbang", "assets/characters/ch03-peng-dingbang/idle.png");
		this.load.image("ch03_militia_guard_a", "assets/characters/ch03-militia/idle-a.png");
		this.load.image("ch03_militia_guard_b", "assets/characters/ch03-militia/idle-b.png");
		this.load.image(CH03_OBSERVATION_IMAGE_KEYS.A, "assets/ch03/observation/observation-A.png");
		this.load.image(CH03_OBSERVATION_IMAGE_KEYS.B, "assets/ch03/observation/observation-B.png");
		this.load.image(CH03_OBSERVATION_IMAGE_KEYS.C, "assets/ch03/observation/observation-C.png");
		this.load.image(CH03_OBSERVATION_IMAGE_KEYS.D, "assets/ch03/observation/observation-D.png");
		this.load.image(CH03_ACTION_IMAGE_KEYS.A, "assets/ch03/action/branch04/branch04-A.png");
		this.load.image(CH03_ACTION_IMAGE_KEYS.B, "assets/ch03/action/branch04/branch04-B.png");
		this.load.image(CH03_ACTION_IMAGE_KEYS.C, "assets/ch03/action/branch04/branch04-C.png");
		this.load.image(CH03_ACTION_IMAGE_KEYS.D, "assets/ch03/action/branch04/branch04-D.png");
		this.load.image(CH03_GATE_ENTRY_IMAGE_KEYS.A, "assets/ch03/action/branch05/branch05-A.png");
		this.load.image(CH03_GATE_ENTRY_IMAGE_KEYS.B, "assets/ch03/action/branch05/branch05-B.png");
		this.load.image(CH03_GATE_ENTRY_IMAGE_KEYS.C, "assets/ch03/action/branch05/branch05-C.png");
		this.load.image(CH03_GATE_ENTRY_IMAGE_KEYS.D, "assets/ch03/action/branch05/branch05-D.png");
		this.load.image(CH03_AFTER_BATTLE_IMAGE_KEYS.A, "assets/ch03/action/branch07/branch07-A.png");
		this.load.image(CH03_AFTER_BATTLE_IMAGE_KEYS.B, "assets/ch03/action/branch07/branch07-B.png");
		this.load.image(CH03_AFTER_BATTLE_IMAGE_KEYS.C, "assets/ch03/action/branch07/branch07-C.png");
		this.load.image(CH03_AFTER_BATTLE_IMAGE_KEYS.D, "assets/ch03/action/branch07/branch07-D.png");
		this.load.image(CH03_CLEARING_IMAGE_KEYS.A, "assets/ch03/action/branch08/branch08-A.png");
		this.load.image(CH03_CLEARING_IMAGE_KEYS.B, "assets/ch03/action/branch08/branch08-B.png");
		this.load.image(CH03_CLEARING_IMAGE_KEYS.C, "assets/ch03/action/branch08/branch08-C.png");
		this.load.image(CH03_CLEARING_IMAGE_KEYS.D, "assets/ch03/action/branch08/branch08-D.png");
		this.load.image(CH03_MOONCAKE_IMAGE_KEYS.A, "assets/ch03/action/branch09/branch09-A.png");
		this.load.image(CH03_MOONCAKE_IMAGE_KEYS.B, "assets/ch03/action/branch09/branch09-B.png");
		this.load.image(CH03_MOONCAKE_IMAGE_KEYS.C, "assets/ch03/action/branch09/branch09-C.png");
		this.load.image(CH03_MOONCAKE_IMAGE_KEYS.D, "assets/ch03/action/branch09/branch09-D.png");
		this.load.audio("ch03_bgm_outer_shadow", "assets/audio/ch03/01_墙外伏影_大院外围.mp3");
		this.load.audio("ch03_bgm_three_routes", "assets/audio/ch03/03_三路合围_榨房起火.mp3");
		this.load.audio("ch03_bgm_after_battle", "assets/audio/ch03/05_火光余温_清点与集结.mp3");
	}

	create() {
		this.resetHud();
		this.sound.stopAll();
		this.playChapter3Bgm();
		const mounted = mountLayeredMap(this, this.definition);
		this.mapDocument = normalizeObjectDocument(mounted.objectDocument);
		this.mapDocumentFile = `public/data/${this.definition.objectPath.replace(/^data\//, "")}`;
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.buildCollision();
		this.setupRuntimeNpcs();
		if (this.compoundState === "STATE_GATE_ATTACK") this.setupGateAttackFx();
		if (this.compoundState === "STATE_FIRE_STARTED") this.setupFireFx();

		const requestedSpawn = (this as any).requestedSpawn as [number, number] | undefined;
		const spawnId = this.compoundState === "STATE_AFTER_BATTLE" ? "SPAWN_COUNTING_CENTER" : "SPAWN_PLAYER_HIDING";
		const spawn = this.mapDocument.spawns.find((item) => item.id === spawnId) ?? this.mapDocument.spawns[0];
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
		if (this.compoundState !== "STATE_WAITING") this.cameras.main.fadeIn(650, 0, 0, 0);
		this.keyMap = createKeyMap(this);
		onAction(this, "INTERACT", () => this.handleConfirm());
		onAction(this, "PAUSE", () => togglePause());
		 onAction(this, "ADVANCE", () => {
			if (this.state.mode === "result") {
				if (this.actionPhase === "result") this.closeActionResult();
				else if (this.gateAttackPhase === "result") this.closeGateEntryResult();
				else if (this.afterBattlePhase === "result") this.closeAfterBattleResult();
				else if (this.afterBattlePhase === "clearing_result") this.closeClearingResult();
				else if (this.afterBattlePhase === "moon_cake_result") this.closeMooncakeResult();
				else this.closeObservationResult();
			}
			else if (this.state.inNarrative) advanceNarrative();
			else if (this.state.mode === "info") closeInfoPanel();
		});
		(window as any).ch03TuCompoundGame = this;
		if (this.compoundState === "STATE_AFTER_BATTLE") {
			this.restoreAfterBattleState();
		} else if (this.state.flags.has(CH03_RISK_PRECHECK_FLAGS.complete)) {
			this.restoreCompletedRiskPrecheck();
		} else {
			this.state.mode = "narrative";
			this.state.playerLocked = true;
			this.time.delayedCall(120, () => this.beginRiskPrecheck());
		}
	}

	setupRuntimeNpcs() {
		const definitions: RuntimeNpcDefinition[] = this.compoundState === "STATE_AFTER_BATTLE"
			? [
					{ id: "GROUP_LEADER", texture: "ch02_npc_group_leader", position: [720, 540], displayHeight: 220 },
					{ id: "DONG_YUNTING", texture: "ch03_dong_yunting_after_battle", position: [935, 540], displayHeight: 210 },
					{ id: "WOUNDED_MEMBER", texture: "ch03_wounded_member", position: [505, 570], displayHeight: 190, alpha: 0.92 },
					{ id: "CAPTURED_CONFIDANT", texture: "ch03_militia_guard_b", position: [1220, 610], displayHeight: 205, alpha: 0.74 },
					{ id: "FRONT_MEMBER_A", texture: "ch02_npc_young_member", position: [890, 760], displayHeight: 220 },
				]
			: [
					{ id: "GATE_GUARD_A", texture: "ch03_militia_guard_a", position: [610, 645], displayHeight: 220 },
					{ id: "GATE_GUARD_B", texture: "ch03_militia_guard_b", position: [1050, 645], displayHeight: 220 },
					{ id: "GROUP_LEADER", texture: "ch02_npc_group_leader", position: [560, 875], displayHeight: 250 },
					{ id: "ELDER_ESCORT", texture: "ch03_elder_member", position: [475, 875], displayHeight: 245 },
					{ id: "FRONT_MEMBER_A", texture: "ch02_npc_young_member", position: [705, 875], displayHeight: 245 },
					{ id: "FRONT_MEMBER_B", texture: "ch02_npc_worker_straw_hat", position: [965, 875], displayHeight: 245 },
					{ id: "REAR_MEMBER", texture: "ch02_npc_worker_blue_headcloth", position: [380, 875], displayHeight: 245 },
				];
		if (this.compoundState === "STATE_GATE_ATTACK" || this.compoundState === "STATE_FIRE_STARTED") {
			definitions.push(
				{ id: "DAI_ANNAN", texture: "ch02_npc_dai_annan", position: [520, 640], displayHeight: 230, alpha: 0.72 },
				{ id: "PENG_DINGBANG", texture: "ch03_npc_peng_dingbang", position: [690, 650], displayHeight: 230, alpha: 0.84 },
			);
		}
		this.npcActors = definitions.map(({ id, texture, position, displayHeight, alpha = 1 }) => {
			const source = this.textures.get(texture).getSourceImage() as { width: number; height: number };
			return this.add.image(position[0], position[1], texture)
				.setName(id)
				.setOrigin(0.5, 1)
				.setDisplaySize((source.width / source.height) * displayHeight, displayHeight)
				.setAlpha(alpha)
				.setDepth(actorDepth(position[1]));
		});
		if (this.compoundState === "STATE_AFTER_BATTLE") {
			const leader = this.npcActors.find((actor) => actor.name === "GROUP_LEADER");
			if (leader) this.afterBattleMarker = this.createAfterBattleMarker(leader);
		}
	}

	createAfterBattleMarker(actor: Phaser.GameObjects.Image) {
		const marker = this.add
			.container(actor.x, actor.y - 245)
			.setDepth(actorDepth(actor.y) + 4)
			.setAlpha(0.96)
			.setVisible(false);
		const badge = this.add.graphics();
		badge.fillStyle(0xf0cf67, 1);
		badge.fillRoundedRect(-14, -17, 28, 32, 5);
		badge.fillTriangle(-8, 14, 8, 14, 0, 24);
		badge.lineStyle(2, 0x4a2c1f, 1);
		badge.strokeRoundedRect(-14, -17, 28, 32, 5);
		const symbol = this.add.text(0, -2, "!", {
			color: "#4a2c1f",
			fontFamily: "monospace",
			fontSize: "20px",
			fontStyle: "bold",
			stroke: "#fff3b0",
			strokeThickness: 1,
		}).setOrigin(0.5);
		marker.add([badge, symbol]);
		this.tweens.add({
			targets: marker,
			y: marker.y - 7,
			duration: 520,
			yoyo: true,
			repeat: -1,
			ease: "Sine.easeInOut",
		});
		return marker;
	}

	/**
	 * 榨房起火状态的轻量即时渲染层：地图交付负责主体火势，运行时只补
	 * 一层暖光呼吸和少量火星，避免把状态图烘焙成不可复用的单一画面。
	 */
	setupFireFx() {
		if (this.fireGlow || this.fireEmbers || this.fireSmoke) return;
		if (!this.textures.exists("ch03_fire_ember")) {
			const graphics = this.make.graphics({ x: 0, y: 0 }, false);
			graphics.fillStyle(0xffb52e, 1);
			graphics.fillCircle(4, 4, 4);
			graphics.generateTexture("ch03_fire_ember", 8, 8);
			graphics.destroy();
		}

		this.fireGlow = this.add
			.ellipse(1300, 340, 470, 360, 0xff6b1a, 0.08)
			.setDepth(295)
			.setBlendMode(Phaser.BlendModes.ADD);
		this.tweens.add({
			targets: this.fireGlow,
			alpha: { from: 0.045, to: 0.12 },
			duration: 540,
			yoyo: true,
			repeat: -1,
			ease: "Sine.easeInOut",
		});

		this.fireEmbers = this.add
			.particles(0, 0, "ch03_fire_ember", {
				x: { min: 1080, max: 1515 },
				y: { min: 110, max: 585 },
				lifespan: { min: 700, max: 1300 },
				speedY: { min: -90, max: -35 },
				speedX: { min: -20, max: 20 },
				scale: { start: 0.8, end: 0 },
				alpha: { start: 0.9, end: 0 },
				tint: [0xffb52e, 0xff6b1a, 0xffe54b],
				frequency: 90,
				quantity: 1,
				blendMode: Phaser.BlendModes.ADD,
			});
		this.fireEmbers.setDepth(350);

		if (!this.textures.exists("ch03_fire_smoke")) {
			const graphics = this.make.graphics({ x: 0, y: 0 }, false);
			graphics.fillStyle(0x3b302b, 0.28);
			graphics.fillCircle(18, 18, 18);
			graphics.generateTexture("ch03_fire_smoke", 36, 36);
			graphics.destroy();
		}
		this.fireSmoke = this.add
			.particles(0, 0, "ch03_fire_smoke", {
				x: { min: 1110, max: 1480 },
				y: { min: 260, max: 500 },
				lifespan: { min: 1500, max: 2500 },
				speedY: { min: -55, max: -18 },
				speedX: { min: -25, max: 25 },
				scale: { start: 0.7, end: 2.5 },
				alpha: { start: 0.2, end: 0 },
				tint: [0x51433a, 0x2e2927, 0x6b5140],
				frequency: 240,
				quantity: 1,
			});
		this.fireSmoke.setDepth(345);
	}

	setupGateAttackFx() {
		if (this.gateSparks) return;
		if (!this.textures.exists("ch03_gate_spark")) {
			const graphics = this.make.graphics({ x: 0, y: 0 }, false);
			graphics.fillStyle(0xffc55c, 1);
			graphics.fillRect(0, 0, 10, 10);
			graphics.generateTexture("ch03_gate_spark", 10, 10);
			graphics.destroy();
		}
		this.gateSparks = this.add
			.particles(0, 0, "ch03_gate_spark", {
				x: { min: 660, max: 1020 },
				y: { min: 680, max: 820 },
				lifespan: { min: 280, max: 560 },
				speed: { min: 60, max: 180 },
				angle: { min: 190, max: 350 },
				gravityY: 260,
				scale: { start: 0.8, end: 0 },
				alpha: { start: 0.9, end: 0 },
				tint: [0xffc55c, 0xff7a24, 0xf3e2ad],
				frequency: -1,
				quantity: 1,
			});
		this.gateSparks.setDepth(355);
	}

	beginRiskPrecheck() {
		if (this.riskPrecheckStarted || this.state.flags.has(CH03_RISK_PRECHECK_FLAGS.complete)) return;
		this.riskPrecheckStarted = true;
		this.state.flags.add(CH03_RISK_PRECHECK_FLAGS.started);
		this.riskAssignment = getChapter3TaskAssignment({ ...this.state.risk });
		this.state.chapter3Access = this.riskAssignment.access;
		this.state.chapter3TaskPermission = this.riskAssignment.permission;
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH03_RISK_PRECHECK_INTRO, () => this.showRiskReadout());
	}

	showRiskReadout() {
		if (!this.riskAssignment) return;
		this.state.mode = "info";
		this.state.playerLocked = true;
		showInfoPanel({
			title: "行动前重新安排",
			items: buildChapter3RiskInfo(this.riskAssignment),
			continueLabel: "查看重新安排",
			onContinue: () => this.playRiskBranch(),
		});
	}

	playRiskBranch() {
		if (!this.riskAssignment) return;
		hideInfoPanel();
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(buildChapter3RiskBranch(this.riskAssignment), () => {
			if (this.riskAssignment?.permission === "WITHDRAWN") this.completeRiskFailure();
			else this.completeRiskPrecheck();
		});
	}

	clearTaskPermissionFlags() {
		const permissions: Chapter3TaskPermission[] = [
			"FORWARD_SUPPORT",
			"REAR_SUPPORT",
			"REAR_COORDINATION",
			"ESCORTED_SUPPORT",
			"WITHDRAWN",
		];
		for (const permission of permissions)
			for (const tag of taskPermissionFlags(permission)) this.state.flags.delete(tag);
	}

	completeRiskPrecheck() {
		if (!this.riskAssignment) return;
		this.clearTaskPermissionFlags();
		this.state.flags.add(CH03_RISK_PRECHECK_FLAGS.complete);
		for (const tag of taskPermissionFlags(this.riskAssignment.permission)) this.state.flags.add(tag);
		this.state.chapter3Access = getChapter3TaskAssignment({ ...this.state.risk }).access;
		this.state.chapter3TaskPermission = this.riskAssignment.permission;
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.state.mode = "explore";
		this.state.playerLocked = false;
		hideDialogue();
		hidePrompt();
		showTask(buildChapter3RiskCompleteTask(this.riskAssignment));
	}

	completeRiskFailure() {
		if (!this.riskAssignment) return;
		this.clearTaskPermissionFlags();
		this.state.flags.add(CH03_RISK_PRECHECK_FLAGS.complete);
		this.state.flags.add(CH03_RISK_PRECHECK_FLAGS.riskFailure);
		for (const tag of taskPermissionFlags("WITHDRAWN")) this.state.flags.add(tag);
		this.state.chapter3Access = this.riskAssignment.access;
		this.state.chapter3TaskPermission = "WITHDRAWN";
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hidePrompt();
		showTask(buildChapter3RiskCompleteTask(this.riskAssignment));
		this.time.delayedCall(900, () => this.game.events.emit("ch03:risk-failure"));
	}

	beginObservationChoice() {
		if (
			!this.riskAssignment ||
			this.compoundState !== "STATE_WAITING" ||
			this.state.mode !== "explore" ||
			this.state.flags.has(CH03_OBSERVATION_FLAGS.complete)
		)
			return;

		this.observationPhase = "choice";
		this.state.flags.add(CH03_OBSERVATION_FLAGS.started);
		this.state.mode = "choice";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		showChoices(
			buildChapter3ObservationChoices(this.riskAssignment.permission),
			(id: string) => this.chooseObservation(id),
			"交互一：等待行动时的观察",
		);
	}

	chooseObservation(id: string) {
		if (this.observationPhase !== "choice" || !this.riskAssignment) return;
		const available = buildChapter3ObservationChoices(this.riskAssignment.permission).find(
			(item) => item.id === id,
		);
		if (!available || available.disabled) return;
		const choice = id.slice(-1) as ObservationChoiceId;
		this.observationCoordinationRiskHigh = classifyRisk(this.state.risk).coordination === "HIGH";
		const definition = buildChapter3ObservationFormalChoice(id, {
			permission: this.riskAssignment.permission,
			coordinationRiskHigh: this.observationCoordinationRiskHigh,
		});
		if (!definition) return;

		const result = applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.observationChoice = choice;
		this.observationFailure = result.failure;
		this.observationPhase = "result";
		hideChoices();
		hidePrompt();
		this.state.mode = "result";
		this.state.playerLocked = true;
		showResult({
			image: observationImagePath(choice),
			result: [
				`你选择了“${available.label}”。`,
				"当前观察已记录。按 Space 退出图片，进入心理描写。",
			],
			hint: "Space 退出",
		});
	}

	closeObservationResult() {
		if (this.observationPhase !== "result" || !this.observationChoice || !this.riskAssignment) return;
		hideResult();
		this.observationPhase = "feedback";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(
			buildChapter3ObservationFeedback(this.observationChoice, {
				permission: this.riskAssignment.permission,
				coordinationRiskHigh: this.observationCoordinationRiskHigh,
			}),
			() => this.completeObservation(),
		);
	}

	completeObservation() {
		if (this.observationPhase !== "feedback" || !this.riskAssignment) return;
		this.state.flags.add(CH03_OBSERVATION_FLAGS.complete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hidePrompt();

		if (this.observationFailure) {
			this.observationPhase = "replacement";
			this.state.flags.add(CH03_OBSERVATION_FLAGS.replacement);
			useGameSaveStore().autosave("CH03_COMPOUND");
			showTask(
				buildChapter3ObservationCompleteTask(
					this.riskAssignment.permission,
					this.observationFailure,
				),
			);
			this.time.delayedCall(900, () => this.game.events.emit("ch03:risk-failure"));
			return;
		}

		this.observationPhase = "complete";
		this.state.mode = "flashback3_ready";
		useGameSaveStore().autosave("CH03_COMPOUND");
		showTask(CH03_FLASHBACK3_ENTRY_TASK);
	}

	beginActionStart() {
		if (
			this.state.mode !== "action_ready" ||
			!this.state.flags.has(CH03_FLASHBACK3_FLAGS.complete) ||
			this.state.flags.has(CH03_ACTION_FLAGS.started)
		)
			return;
		this.state.flags.add(CH03_ACTION_FLAGS.started);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.startGateClosedTransition();
	}

	startGateClosedTransition() {
		if (this.compoundState === "STATE_GATE_CLOSED") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		this.actionPhase = "intro";
		hideTask();
		hidePrompt();
		hideDialogue();
		this.cameras.main.fadeOut(1000, 0, 0, 0);
		this.time.delayedCall(1020, () => this.transitionToState("STATE_GATE_CLOSED"));
	}

	beginActionIntro() {
		if (
			this.compoundState !== "STATE_GATE_CLOSED" ||
			!this.state.flags.has(CH03_ACTION_FLAGS.started) ||
			this.state.flags.has(CH03_ACTION_FLAGS.choiceComplete)
		)
			return;
		this.state.flags.add(CH03_ACTION_FLAGS.gateClosed);
		this.actionPhase = "intro";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.time.delayedCall(260, () => {
			playNarrative(CH03_ACTION_INTRO, () => this.beginActionChoice());
		});
	}

	beginActionChoice() {
		if (
			this.compoundState !== "STATE_GATE_CLOSED" ||
			!this.state.flags.has(CH03_ACTION_FLAGS.started) ||
			this.state.flags.has(CH03_ACTION_FLAGS.choiceComplete)
		)
			return;
		this.actionPhase = "choice";
		this.state.flags.add(CH03_ACTION_FLAGS.choiceStarted);
		this.state.mode = "choice";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		showChoices(
			buildChapter3ActionChoices(this.riskAssignment?.permission ?? "FORWARD_SUPPORT"),
			(id: string) => this.chooseAction(id),
			"交互二：大门合拢后，先稳住哪一处？",
		);
	}

	chooseAction(id: string) {
		if (this.actionPhase !== "choice" || !this.riskAssignment) return;
		const available = buildChapter3ActionChoices(this.riskAssignment.permission).find(
			(item) => item.id === id,
		);
		if (!available || available.disabled) return;
		const choice = id.slice(-1) as ActionStartChoiceId;
		this.actionCoordinationRiskHigh = classifyRisk(this.state.risk).coordination === "HIGH";
		const definition = buildChapter3ActionFormalChoice(id, {
			permission: this.riskAssignment.permission,
			coordinationRiskHigh: this.actionCoordinationRiskHigh,
		});
		if (!definition) return;

		const result = applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.actionChoice = choice;
		this.actionFailure = result.failure;
		this.actionPhase = "result";
		hideChoices();
		hidePrompt();
		this.state.mode = "result";
		this.state.playerLocked = true;
		showResult({
			image: actionImagePath(choice),
			result: [
				`你选择了“${available.label}”。`,
				"当前判断已记录。按 Space 退出图片，进入心理描写。",
			],
			hint: "Space 退出",
		});
	}

	closeActionResult() {
		if (this.actionPhase !== "result" || !this.actionChoice || !this.riskAssignment) return;
		hideResult();
		this.actionPhase = "feedback";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(
			buildChapter3ActionFeedback(this.actionChoice, {
				permission: this.riskAssignment.permission,
				coordinationRiskHigh: this.actionCoordinationRiskHigh,
			}),
			() => this.completeActionChoice(),
		);
	}

	completeActionChoice() {
		if (this.actionPhase !== "feedback" || !this.riskAssignment) return;
		this.state.flags.add(CH03_ACTION_FLAGS.choiceComplete);
		this.state.flags.add(CH03_ACTION_FLAGS.complete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hidePrompt();

		if (this.actionFailure) {
			this.actionPhase = "replacement";
			this.state.flags.add(CH03_ACTION_FLAGS.replacement);
			useGameSaveStore().autosave("CH03_COMPOUND");
			showTask(buildChapter3ActionFailureTask(this.actionFailure));
			this.time.delayedCall(900, () => this.game.events.emit("ch03:risk-failure"));
			return;
		}

		this.actionPhase = "complete";
		this.state.mode = "gate_attack_ready";
		useGameSaveStore().autosave("CH03_COMPOUND");
		showTask(CH03_GATE_ATTACK_TASK);
	}

	beginGateAttack() {
		if (
			this.state.mode !== "gate_attack_ready" ||
			!this.state.flags.has(CH03_ACTION_FLAGS.choiceComplete) ||
			this.state.flags.has(CH03_GATE_ATTACK_FLAGS.started)
		)
			return;
		this.state.flags.add(CH03_GATE_ATTACK_FLAGS.started);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.gateAttackPhase = "narrative";
		if (this.compoundState === "STATE_GATE_ATTACK") {
			this.beginGateAttackNarrative();
			return;
		}
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		hideDialogue();
		this.cameras.main.fadeOut(900, 0, 0, 0);
		this.time.delayedCall(920, () => this.transitionToState("STATE_GATE_ATTACK"));
	}

	beginGateAttackNarrative() {
		if (
			this.compoundState !== "STATE_GATE_ATTACK" ||
			!this.state.flags.has(CH03_GATE_ATTACK_FLAGS.started) ||
			this.state.flags.has(CH03_GATE_ATTACK_FLAGS.narrativeComplete) ||
			this.state.flags.has(CH03_GATE_ATTACK_FLAGS.fireStarted)
		)
			return;
		this.gateAttackPhase = "narrative";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.setupGateAttackFx();
		this.scheduleGateImpacts();
		this.time.delayedCall(220, () => {
			playNarrative(CH03_GATE_ATTACK_INTRO, () => {
				this.state.flags.add(CH03_GATE_ATTACK_FLAGS.narrativeComplete);
				useGameSaveStore().autosave("CH03_COMPOUND");
				this.startGateFireTransition();
			});
		});
	}

	startGateFireTransition() {
		if (this.state.flags.has(CH03_GATE_ATTACK_FLAGS.fireStarted)) return;
		this.clearEffectTimers();
		this.state.flags.add(CH03_GATE_ATTACK_FLAGS.fireStarted);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.gateAttackPhase = "fire_narrative";
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideDialogue();
		hidePrompt();
		this.cameras.main.fadeOut(900, 0, 0, 0);
		this.time.delayedCall(920, () => this.transitionToState("STATE_FIRE_STARTED"));
	}

	beginFireSyncNarrative() {
		if (
			this.compoundState !== "STATE_FIRE_STARTED" ||
			!this.state.flags.has(CH03_GATE_ATTACK_FLAGS.fireStarted) ||
			this.state.flags.has(CH03_GATE_ATTACK_FLAGS.choiceComplete)
		)
			return;
		this.gateAttackPhase = "fire_narrative";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.emitFireIgnitionFx();
		this.time.delayedCall(180, () => {
			playNarrative(CH03_FIRE_SYNC_INTRO, () => this.beginGateEntryChoice());
		});
	}

	beginGateEntryChoice() {
		if (
			this.compoundState !== "STATE_FIRE_STARTED" ||
			!this.state.flags.has(CH03_GATE_ATTACK_FLAGS.fireStarted) ||
			this.state.flags.has(CH03_GATE_ATTACK_FLAGS.choiceComplete)
		)
			return;
		this.gateAttackPhase = "choice";
		this.state.flags.add(CH03_GATE_ATTACK_FLAGS.choiceStarted);
		this.state.mode = "choice";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		showChoices(
			buildChapter3GateEntryChoices(this.riskAssignment?.permission ?? "FORWARD_SUPPORT"),
			(id: string) => this.chooseGateEntry(id),
			"交互三：撞门前，如何进入位置？",
		);
	}

	chooseGateEntry(id: string) {
		if (this.gateAttackPhase !== "choice" || !this.riskAssignment) return;
		const available = buildChapter3GateEntryChoices(this.riskAssignment.permission).find(
			(item) => item.id === id,
		);
		if (!available || available.disabled) return;
		const choice = id.slice(-1) as GateEntryChoiceId;
		this.gateEntryCoordinationRiskHigh = classifyRisk(this.state.risk).coordination === "HIGH";
		const definition = buildChapter3GateEntryFormalChoice(id, {
			permission: this.riskAssignment.permission,
			coordinationRiskHigh: this.gateEntryCoordinationRiskHigh,
		});
		if (!definition) return;

		const result = applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.gateEntryChoice = choice;
		this.gateEntryFailure = result.failure;
		this.gateAttackPhase = "result";
		hideChoices();
		hidePrompt();
		this.state.mode = "result";
		this.state.playerLocked = true;
		showResult({
			image: gateEntryImagePath(choice),
			result: [
				`你选择了“${available.label}”。`,
				"当前判断已记录。按 Space 退出图片，进入行动反馈。",
			],
			hint: "Space 退出",
		});
	}

	closeGateEntryResult() {
		if (this.gateAttackPhase !== "result" || !this.gateEntryChoice) return;
		hideResult();
		this.gateAttackPhase = "feedback";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(buildChapter3GateEntryFeedback(this.gateEntryChoice), () => this.completeGateEntryChoice());
	}

	completeGateEntryChoice() {
		if (this.gateAttackPhase !== "feedback" || !this.riskAssignment) return;
		this.state.flags.add(CH03_GATE_ATTACK_FLAGS.choiceComplete);
		this.state.flags.add(CH03_GATE_ATTACK_FLAGS.complete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hidePrompt();

		if (this.gateEntryFailure) {
			this.gateAttackPhase = "replacement";
			this.state.flags.add(CH03_GATE_ATTACK_FLAGS.replacement);
			useGameSaveStore().autosave("CH03_COMPOUND");
			showTask(buildChapter3GateAttackFailureTask(this.gateEntryFailure));
			this.time.delayedCall(900, () => this.game.events.emit("ch03:risk-failure"));
			return;
		}

		this.gateAttackPhase = "complete";
		this.state.flags.add(CH03_COMBAT_FLAGS.ready);
		// 保留既有 gate_attack_complete 模式，兼容已经完成交互三的试玩回归入口；
		// 新任务卡把下一步明确切换为独立战斗切片。
		this.state.mode = "gate_attack_complete";
		useGameSaveStore().autosave("CH03_COMPOUND");
		showTask(CH03_GATE_BREACH_TASK);
	}

	restoreAfterBattleState() {
		this.riskAssignment = getChapter3TaskAssignment({ ...this.state.risk });
		this.state.chapter3Access = this.riskAssignment.access;
		this.state.chapter3TaskPermission = this.riskAssignment.permission;
		this.state.flags.add(CH03_AFTER_BATTLE_FLAGS.started);
		if (this.state.flags.has(CH03_AFTER_BATTLE_FLAGS.replacement)) {
			this.afterBattlePhase = "replacement";
			this.state.mode = "end";
			this.state.playerLocked = true;
			showTask(buildChapter3AfterBattleFailureTask(this.riskAssignment.access.failure ?? "coordination"));
			return;
		}
		if (this.state.flags.has(CH03_CLEARING_FLAGS.replacement)) {
			this.afterBattlePhase = "replacement";
			this.state.mode = "end";
			this.state.playerLocked = true;
			showTask(buildChapter3ClearingFailureTask(this.riskAssignment.access.failure ?? "coordination"));
			return;
		}
		if (!this.state.flags.has(CH03_AFTER_BATTLE_FLAGS.choiceComplete)) {
			this.afterBattlePhase = "waiting";
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH03_AFTER_BATTLE_TASK);
			return;
		}
		if (!this.state.flags.has(CH03_CLEARING_FLAGS.choiceComplete)) {
			this.afterBattlePhase = "clearing_ready";
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH03_CLEARING_TASK);
			return;
		}
		if (!this.state.flags.has(CH03_MOONCAKE_FLAGS.choiceComplete)) {
			this.afterBattlePhase = "moon_cake_ready";
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH03_MOONCAKE_TASK);
			return;
		}
		if (!this.state.flags.has(CH03_CHAPTER_END_FLAGS.complete)) {
			this.afterBattlePhase = "chapter_end_ready";
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH03_CHAPTER_END_TASK);
			return;
		}
		this.afterBattlePhase = "complete";
		this.state.mode = "after_battle_complete";
		this.state.playerLocked = true;
		showTask(CH03_AFTERMATH_COMPLETE_TASK);
	}

	nearbyAfterBattleLeader(): Phaser.GameObjects.Image | undefined {
		if (this.compoundState !== "STATE_AFTER_BATTLE") return undefined;
		const leader = this.npcActors.find((actor) => actor.name === "GROUP_LEADER");
		return leader && distanceBetweenActors(this.player, leader) <= 150 ? leader : undefined;
	}

	beginAfterBattleChoice() {
		if (
			this.compoundState !== "STATE_AFTER_BATTLE" ||
			this.state.mode !== "explore" ||
			this.state.flags.has(CH03_AFTER_BATTLE_FLAGS.choiceComplete)
		) return;
		this.afterBattlePhase = "choice";
		this.state.flags.add(CH03_AFTER_BATTLE_FLAGS.choiceStarted);
		this.state.mode = "choice";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		showChoices(
			buildChapter3AfterBattleChoices(),
			(id: string) => this.chooseAfterBattle(id),
			"交互四：杜老三逃走后",
		);
	}

	chooseAfterBattle(id: string) {
		if (this.afterBattlePhase !== "choice") return;
		const available = buildChapter3AfterBattleChoices().find((item) => item.id === id);
		const choice = id.slice(-1) as AfterBattleChoiceId;
		if (!available || available.disabled || !["A", "B", "C", "D"].includes(choice)) return;
		const definition = buildChapter3AfterBattleFormalChoice(id);
		if (!definition) return;
		const result = applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.afterBattleChoice = choice;
		this.afterBattleFailure = result.failure;
		this.afterBattlePhase = "result";
		hideChoices();
		hidePrompt();
		this.state.mode = "result";
		this.state.playerLocked = true;
		showResult({
			image: afterBattleImagePath(choice),
			result: [
				`你选择了“${available.label}”。`,
				"当前处置已记录。按 Space 退出图片，进入行动反馈。",
			],
			hint: "Space 退出",
		});
	}

	closeAfterBattleResult() {
		if (this.afterBattlePhase !== "result" || !this.afterBattleChoice) return;
		hideResult();
		this.afterBattlePhase = "feedback";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(buildChapter3AfterBattleFeedback(this.afterBattleChoice), () => this.completeAfterBattleChoice());
	}

	completeAfterBattleChoice() {
		if (this.afterBattlePhase !== "feedback") return;
		this.state.flags.add(CH03_AFTER_BATTLE_FLAGS.choiceComplete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hidePrompt();
		if (this.afterBattleFailure) {
			this.afterBattlePhase = "replacement";
			this.state.flags.add(CH03_AFTER_BATTLE_FLAGS.replacement);
			useGameSaveStore().autosave("CH03_COMPOUND");
			showTask(buildChapter3AfterBattleFailureTask(this.afterBattleFailure));
			this.time.delayedCall(900, () => this.game.events.emit("ch03:risk-failure"));
			return;
		}
		this.afterBattlePhase = "clearing_ready";
		this.state.flags.add(CH03_AFTER_BATTLE_FLAGS.complete);
		this.state.mode = "explore";
		this.state.playerLocked = false;
		useGameSaveStore().autosave("CH03_COMPOUND");
		showTask(CH03_CLEARING_TASK);
	}

	beginClearingIntro() {
		if (this.afterBattlePhase !== "clearing_ready" || this.state.mode !== "explore") return;
		this.afterBattlePhase = "clearing_intro";
		this.state.flags.add(CH03_CLEARING_FLAGS.started);
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH03_CLEARING_INTRO, () => this.beginClearingChoice());
	}

	beginClearingChoice() {
		if (this.afterBattlePhase !== "clearing_intro") return;
		this.afterBattlePhase = "clearing_choice";
		this.state.flags.add(CH03_CLEARING_FLAGS.choiceStarted);
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			buildChapter3ClearingChoices(),
			(id: string) => this.chooseClearing(id),
			"交互五：优先协助什么？",
		);
	}

	chooseClearing(id: string) {
		if (this.afterBattlePhase !== "clearing_choice") return;
		const available = buildChapter3ClearingChoices().find((item) => item.id === id);
		const choice = id.slice(-1) as ClearingChoiceId;
		if (!available || available.disabled || !["A", "B", "C", "D"].includes(choice)) return;
		const projectedRisk = { ...this.state.risk };
		if (choice === "D") projectedRisk.coordination += 2;
		this.clearingPropertySuspicion = choice === "D" && classifyRisk(projectedRisk).coordination !== "LOW";
		const definition = buildChapter3ClearingFormalChoice(id, this.clearingPropertySuspicion);
		if (!definition) return;
		const result = applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.clearingChoice = choice;
		this.clearingFailure = result.failure;
		this.afterBattlePhase = "clearing_result";
		hideChoices();
		hidePrompt();
		this.state.mode = "result";
		this.state.playerLocked = true;
		showResult({
			image: clearingImagePath(choice),
			result: [
				`你选择了“${available.label}”。`,
				"当前处置已记录。按 Space 退出图片，进入清点反馈。",
			],
			hint: "Space 退出",
		});
	}

	closeClearingResult() {
		if (this.afterBattlePhase !== "clearing_result" || !this.clearingChoice) return;
		hideResult();
		this.afterBattlePhase = "clearing_feedback";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(
			buildChapter3ClearingFeedback(this.clearingChoice, this.clearingPropertySuspicion),
			() => this.completeClearingChoice(),
		);
	}

	completeClearingChoice() {
		if (this.afterBattlePhase !== "clearing_feedback") return;
		this.state.flags.add(CH03_CLEARING_FLAGS.choiceComplete);
		this.state.flags.add(CH03_CLEARING_FLAGS.complete);
		if (this.clearingFailure) {
			this.afterBattlePhase = "replacement";
			this.state.flags.add(CH03_CLEARING_FLAGS.replacement);
			this.state.mode = "end";
			this.state.playerLocked = true;
			hideDialogue();
			hideChoices();
			hidePrompt();
			useGameSaveStore().autosave("CH03_COMPOUND");
			showTask(buildChapter3ClearingFailureTask(this.clearingFailure));
			this.time.delayedCall(900, () => this.game.events.emit("ch03:risk-failure"));
			return;
		}
		this.afterBattlePhase = "moon_cake_ready";
		this.state.mode = "explore";
		this.state.playerLocked = false;
		hideDialogue();
		hideChoices();
		hidePrompt();
		useGameSaveStore().autosave("CH03_COMPOUND");
		showTask(CH03_MOONCAKE_TASK);
	}

	beginMooncakeIntro() {
		if (this.afterBattlePhase !== "moon_cake_ready" || this.state.mode !== "explore") return;
		this.afterBattlePhase = "moon_cake_intro";
		this.state.flags.add(CH03_MOONCAKE_FLAGS.started);
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH03_MOONCAKE_INTRO, () => this.beginMooncakeChoice());
	}

	beginMooncakeChoice() {
		if (this.afterBattlePhase !== "moon_cake_intro") return;
		this.afterBattlePhase = "moon_cake_choice";
		this.state.flags.add(CH03_MOONCAKE_FLAGS.choiceStarted);
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			buildChapter3MooncakeChoices(),
			(id: string) => this.chooseMooncake(id),
			"交互六：月饼的处理",
		);
	}

	chooseMooncake(id: string) {
		if (this.afterBattlePhase !== "moon_cake_choice") return;
		const available = buildChapter3MooncakeChoices().find((item) => item.id === id);
		const choice = id.slice(-1) as MooncakeChoiceId;
		if (!available || available.disabled || !["A", "B", "C", "D"].includes(choice)) return;
		const definition = buildChapter3MooncakeFormalChoice(id);
		if (!definition) return;
		applyFormalChoice(this.state, definition);
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.state.propStates.mooncake = moonCakeStatus(choice);
		this.mooncakeChoice = choice;
		this.afterBattlePhase = "moon_cake_result";
		hideChoices();
		hidePrompt();
		this.state.mode = "result";
		this.state.playerLocked = true;
		showResult({
			image: mooncakeImagePath(choice),
			result: [
				`你选择了“${available.label}”。`,
				"月饼处理结果已记录。按 Space 退出图片，进入月饼处理反馈。",
			],
			hint: "Space 退出",
		});
	}

	closeMooncakeResult() {
		if (this.afterBattlePhase !== "moon_cake_result" || !this.mooncakeChoice) return;
		hideResult();
		this.afterBattlePhase = "moon_cake_feedback";
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(buildChapter3MooncakeFeedback(this.mooncakeChoice), () => this.completeMooncakeChoice());
	}

	completeMooncakeChoice() {
		if (this.afterBattlePhase !== "moon_cake_feedback") return;
		this.state.flags.add(CH03_MOONCAKE_FLAGS.choiceComplete);
		this.state.flags.add(CH03_MOONCAKE_FLAGS.complete);
		this.afterBattlePhase = "chapter_end_ready";
		this.state.mode = "explore";
		this.state.playerLocked = false;
		hideDialogue();
		hideChoices();
		hidePrompt();
		useGameSaveStore().autosave("CH03_COMPOUND");
		showTask(CH03_CHAPTER_END_TASK);
	}

	beginChapterEnd() {
		if (this.afterBattlePhase !== "chapter_end_ready" || this.state.mode !== "explore") return;
		this.afterBattlePhase = "chapter_end_intro";
		this.state.flags.add(CH03_CHAPTER_END_FLAGS.started);
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH03_CHAPTER_END_INTRO, () => this.completeChapterEndIntro());
	}

	completeChapterEndIntro() {
		if (this.afterBattlePhase !== "chapter_end_intro") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hideInfoPanel();
		hideItem();
		hidePrompt();
		hideTask();
		useGameSaveStore().autosave("CH03_COMPOUND");
		this.time.delayedCall(700, () => this.game.events.emit("ch03:chapter-end-enter"));
	}

	scheduleGateImpacts() {
		this.clearEffectTimers();
		[180, 980, 1780].forEach((delay, index) => {
			this.effectTimers.push(this.time.delayedCall(delay, () => this.emitGateImpactFx(index)));
		});
	}

	emitGateImpactFx(index: number) {
		if (this.compoundState !== "STATE_GATE_ATTACK") return;
		const x = 835 + Phaser.Math.Between(-120, 120);
		const y = 748 + Phaser.Math.Between(-34, 34);
		this.gateSparks?.explode(12 + index * 4, x, y);
		this.cameras.main.shake(150, 0.0035 + index * 0.0008);
		this.playRuntimeSfx(index === 2 ? "gate_impact_heavy" : "gate_impact");
		const flash = this.add
			.rectangle(x, y, 260, 90, 0xffcf7a, 0.12)
			.setDepth(360)
			.setBlendMode(Phaser.BlendModes.ADD);
		this.tweens.add({
			targets: flash,
			alpha: { from: 0.18, to: 0 },
			duration: 180,
			onComplete: () => flash.destroy(),
		});
	}

	emitFireIgnitionFx() {
		this.fireEmbers?.explode(18, 1300, 445);
		this.fireSmoke?.explode(9, 1300, 420);
		this.playRuntimeSfx("fire_ignite");
		this.effectTimers.push(this.time.delayedCall(360, () => this.playRuntimeSfx("street_burst")));
		this.effectTimers.push(this.time.delayedCall(820, () => this.playRuntimeSfx("street_burst")));
	}

	playRuntimeSfx(kind: "gate_impact" | "gate_impact_heavy" | "fire_ignite" | "street_burst") {
		try {
			const context = (this.sound as any).context as AudioContext | undefined;
			if (!context || context.state === "suspended") return;
			const output = (this.sound as any).masterVolumeNode ?? context.destination;
			const now = context.currentTime;
			const tone = (frequency: number, endFrequency: number, duration: number, level: number, type: OscillatorType) => {
				const oscillator = context.createOscillator();
				const gain = context.createGain();
				oscillator.type = type;
				oscillator.frequency.setValueAtTime(frequency, now);
				oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
				gain.gain.setValueAtTime(0.0001, now);
				gain.gain.linearRampToValueAtTime(level, now + 0.012);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
				oscillator.connect(gain).connect(output);
				this.runtimeSfxSources.push(oscillator);
				this.runtimeSfxGains.push(gain);
				oscillator.start(now);
				oscillator.stop(now + duration + 0.04);
			};
			const noise = (duration: number, level: number, cutoff: number) => {
				const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
				const channel = buffer.getChannelData(0);
				for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
				const source = context.createBufferSource();
				const filter = context.createBiquadFilter();
				const gain = context.createGain();
				source.buffer = buffer;
				filter.type = "lowpass";
				filter.frequency.value = cutoff;
				gain.gain.setValueAtTime(0.0001, now);
				gain.gain.linearRampToValueAtTime(level, now + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
				source.connect(filter).connect(gain).connect(output);
				this.runtimeSfxSources.push(source);
				this.runtimeSfxGains.push(gain);
				source.start(now);
				source.stop(now + duration + 0.04);
			};

			switch (kind) {
				case "gate_impact":
					noise(0.22, 0.08, 720);
					tone(105, 48, 0.28, 0.045, "sine");
					break;
				case "gate_impact_heavy":
					noise(0.36, 0.13, 620);
					tone(92, 34, 0.42, 0.07, "sine");
					break;
				case "fire_ignite":
					noise(1.1, 0.055, 1000);
					tone(58, 28, 0.9, 0.045, "sawtooth");
					break;
				case "street_burst":
					noise(0.28, 0.11, 850);
					tone(140, 42, 0.24, 0.055, "square");
					break;
			}
		} catch {
			// Browser audio may be unavailable in screenshots or before a user gesture.
		}
	}

	clearEffectTimers() {
		for (const timer of this.effectTimers) timer.remove(false);
		this.effectTimers = [];
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

	restoreCompletedRiskPrecheck() {
		const derived = getChapter3TaskAssignment({ ...this.state.risk });
		const persistedPermission = taskPermissionFromFlags(this.state.flags);
		this.riskAssignment = persistedPermission && persistedPermission !== derived.permission
			? {
				...derived,
				permission: persistedPermission,
				label: TASK_PERMISSION_LABELS[persistedPermission],
				safetyLabel: persistedPermission === "WITHDRAWN"
					? "不进入行动核心"
					: persistedPermission === "FORWARD_SUPPORT" ? "可继续参与" : "受限参与",
			}
			: derived;
		this.state.chapter3Access = this.riskAssignment.access;
		this.state.chapter3TaskPermission = this.riskAssignment.permission;
		for (const tag of taskPermissionFlags(this.riskAssignment.permission)) this.state.flags.add(tag);
		if (this.state.flags.has(CH03_OBSERVATION_FLAGS.replacement)) {
			this.observationPhase = "replacement";
			this.state.mode = "end";
			this.state.playerLocked = true;
			showTask(
				buildChapter3ObservationCompleteTask(
					this.riskAssignment.permission,
					this.riskAssignment.access.failure,
				),
			);
			return;
		}
		if (this.state.flags.has(CH03_ACTION_FLAGS.replacement)) {
			this.actionPhase = "replacement";
			this.state.mode = "end";
			this.state.playerLocked = true;
			showTask(
				buildChapter3ActionFailureTask(
					this.riskAssignment.access.failure ?? "coordination",
				),
			);
			return;
		}
		if (this.state.flags.has(CH03_GATE_ATTACK_FLAGS.replacement)) {
			this.gateAttackPhase = "replacement";
			this.state.mode = "end";
			this.state.playerLocked = true;
			showTask(
				buildChapter3GateAttackFailureTask(
					this.riskAssignment.access.failure ?? "coordination",
				),
			);
			return;
		}
		if (this.state.flags.has(CH03_COMBAT_FLAGS.complete)) {
			this.state.mode = "gate_breach_complete";
			this.state.playerLocked = true;
			showTask(CH03_GATE_BREACH_COMPLETE_TASK);
			return;
		}
		if (this.state.flags.has(CH03_COMBAT_FLAGS.ready)) {
			this.gateAttackPhase = "complete";
			this.state.mode = "gate_attack_complete";
			this.state.playerLocked = true;
			showTask(CH03_GATE_BREACH_TASK);
			return;
		}
		if (this.state.flags.has(CH03_GATE_ATTACK_FLAGS.choiceComplete)) {
			this.gateAttackPhase = "complete";
			this.state.mode = "gate_attack_complete";
			this.state.flags.add(CH03_COMBAT_FLAGS.ready);
			this.state.playerLocked = true;
			showTask(CH03_GATE_BREACH_TASK);
			return;
		}
		if (this.state.flags.has(CH03_GATE_ATTACK_FLAGS.fireStarted)) {
			if (this.compoundState !== "STATE_FIRE_STARTED") {
				this.state.mode = "transition";
				this.state.playerLocked = true;
				hideTask();
				hidePrompt();
				this.time.delayedCall(240, () => this.transitionToState("STATE_FIRE_STARTED"));
			} else {
				this.time.delayedCall(280, () => this.beginFireSyncNarrative());
			}
			return;
		}
		if (this.state.flags.has(CH03_GATE_ATTACK_FLAGS.started)) {
			if (this.compoundState === "STATE_GATE_ATTACK") {
				this.time.delayedCall(280, () => this.beginGateAttackNarrative());
			} else {
				this.state.mode = "transition";
				this.state.playerLocked = true;
				hideTask();
				hidePrompt();
				this.time.delayedCall(240, () => this.transitionToState("STATE_GATE_ATTACK"));
			}
			return;
		}
		if (this.state.flags.has(CH03_ACTION_FLAGS.choiceComplete)) {
			this.actionPhase = "complete";
			this.state.mode = "gate_attack_ready";
			this.state.playerLocked = true;
			showTask(CH03_GATE_ATTACK_TASK);
			return;
		}
		if (this.state.flags.has(CH03_ACTION_FLAGS.started)) {
			if (this.compoundState === "STATE_GATE_CLOSED") {
				this.time.delayedCall(280, () => this.beginActionIntro());
			} else {
				this.time.delayedCall(240, () => this.startGateClosedTransition());
			}
			return;
		}
		if (this.state.flags.has(CH03_FLASHBACK3_FLAGS.complete)) {
			this.observationPhase = "complete";
			this.state.mode = "action_ready";
			this.state.playerLocked = true;
			showTask(CH03_ACTION_START_TASK);
			return;
		}
		if (this.state.flags.has(CH03_OBSERVATION_FLAGS.complete)) {
			this.observationPhase = "complete";
			this.state.mode = "flashback3_ready";
			this.state.playerLocked = true;
			showTask(CH03_FLASHBACK3_ENTRY_TASK);
			return;
		}
		if (this.riskAssignment.permission === "WITHDRAWN") {
			this.state.mode = "end";
			this.state.playerLocked = true;
			showTask(buildChapter3RiskCompleteTask(this.riskAssignment));
			return;
		}
		this.state.mode = "explore";
		this.state.playerLocked = false;
		const catalog = TU_COMPOUND_STATE_CATALOG[this.compoundState];
		showTask({
			title: `第三章·杜家大院外围｜${catalog.label}`,
			detail: `${catalog.storyUse}。当前任务权限：${this.riskAssignment.label}。前往隐蔽处，按 E 开始等待行动时的观察。`,
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
			this.afterBattleMarker?.setVisible(false);
			return;
		}
		if (this.compoundState === "STATE_AFTER_BATTLE") {
			const leader = this.nearbyAfterBattleLeader();
			const canTalk = ["waiting", "clearing_ready", "moon_cake_ready", "chapter_end_ready"].includes(this.afterBattlePhase);
			this.afterBattleMarker?.setVisible(canTalk);
			const prompt = !leader || !canTalk
				? ""
			: this.afterBattlePhase === "waiting"
					? "组长：杜老三逃走后  ·  E"
					: this.afterBattlePhase === "clearing_ready"
						? "组长：战后清点  ·  E"
						: this.afterBattlePhase === "moon_cake_ready"
							? "组长：月饼的处理  ·  E"
							: "行动结束：三路结果汇合  ·  E";
			showPrompt(prompt);
			return;
		}
		const target = this.nearby();
		const prompt = target?.id === "TRG_HIDING_ZONE"
			? "隐蔽处：等待行动时的观察"
			: target?.prompt || target?.id;
		showPrompt(target ? `${prompt}  ·  E` : "");
	}

	handleConfirm() {
		if (taskNeedsConfirmation()) {
			closeTask();
			return;
		}
		if (this.state.mode === "flashback3_ready") {
			this.beginFlashback3Transition();
			return;
		}
		if (this.state.mode === "action_ready") {
			this.beginActionStart();
			return;
		}
		if (this.state.mode === "gate_attack_ready") {
			this.beginGateAttack();
			return;
		}
		if (this.state.mode === "gate_breach_ready" || (this.state.mode === "gate_attack_complete" && this.state.flags.has(CH03_COMBAT_FLAGS.ready))) {
			this.beginGateBreachCombat();
			return;
		}
		if (["action_complete", "gate_attack_complete", "gate_breach_complete", "after_battle_complete", "end", "narrative", "info", "choice", "result", "transition"].includes(this.state.mode)) return;
		if (this.compoundState === "STATE_AFTER_BATTLE" && this.nearbyAfterBattleLeader()) {
			if (this.afterBattlePhase === "waiting") this.beginAfterBattleChoice();
			else if (this.afterBattlePhase === "clearing_ready") this.beginClearingIntro();
			else if (this.afterBattlePhase === "moon_cake_ready") this.beginMooncakeIntro();
			else if (this.afterBattlePhase === "chapter_end_ready") this.beginChapterEnd();
			return;
		}
		const target = this.nearby();
		if (!target) return;
		if (target.id === "TRG_HIDING_ZONE" && !this.state.flags.has(CH03_OBSERVATION_FLAGS.complete)) {
			this.beginObservationChoice();
			return;
		}
		const action = "action" in target ? target.action : undefined;
		showTask({
			title: `地图交互｜${target.id}`,
			detail: `${action ?? target.type ?? "interaction"}。当前只完成杜家大院地图状态接入；该交互将由后续第三章场景实现。`,
		});
	}

	beginFlashback3Transition() {
		if (
			this.observationPhase !== "complete" ||
			!this.state.flags.has(CH03_OBSERVATION_FLAGS.complete) ||
			this.state.flags.has(CH03_FLASHBACK3_FLAGS.complete) ||
			this.state.mode !== "flashback3_ready"
		)
			return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.cameras.main.fadeOut(1000, 0, 0, 0);
		this.time.delayedCall(1000, () => this.game.events.emit("ch03:flashback3-enter"));
	}

	beginGateBreachCombat() {
		if (!this.state.flags.has(CH03_COMBAT_FLAGS.ready) || !["gate_breach_ready", "gate_attack_complete"].includes(this.state.mode)) return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hideTask();
		hidePrompt();
		this.cameras.main.fadeOut(580, 0, 0, 0);
		this.time.delayedCall(580, () => this.game.events.emit("ch03:gate-breach-combat-enter"));
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

	playChapter3Bgm() {
		this.stopChapter3Bgm();
		const cue = this.compoundState === "STATE_WAITING"
			? "ch03_bgm_outer_shadow"
			: this.compoundState === "STATE_AFTER_BATTLE"
				? "ch03_bgm_after_battle"
				: "ch03_bgm_three_routes";
		this.chapter3Bgm = this.sound.add(cue, {
			loop: true,
			volume: 0.55,
		});
		this.chapter3Bgm.play();
	}

	stopChapter3Bgm() {
		this.chapter3Bgm?.stop();
		this.chapter3Bgm?.destroy();
		this.chapter3Bgm = undefined;
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
		this.stopChapter3Bgm();
		this.clearEffectTimers();
		this.stopRuntimeSfx();
		this.afterBattleMarker?.destroy();
		this.afterBattleMarker = undefined;
		this.fireEmbers?.destroy();
		this.fireEmbers = undefined;
		this.fireSmoke?.destroy();
		this.fireSmoke = undefined;
		this.fireGlow?.destroy();
		this.fireGlow = undefined;
		this.gateSparks?.destroy();
		this.gateSparks = undefined;
		for (const actor of this.npcActors) actor.destroy();
		this.npcActors = [];
		this.playerVisual?.destroy();
		if ((window as any).ch03TuCompoundGame === this) delete (window as any).ch03TuCompoundGame;
	}
}
