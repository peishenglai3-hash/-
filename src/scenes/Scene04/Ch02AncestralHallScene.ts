import Phaser from "phaser";
import { createKeyMap, isActionDown, onAction } from "@/common/actions";
import { actorDepth, WORLD_INDICATOR_DEPTH } from "@/common/displayDepth";
import { useGameStateStore } from "@/stores/modules/gameState";
// @ts-ignore Shared JS helpers are intentionally untyped in the current project.
import { actorColliderBottomAt, actorColliderRectAt, ensureActorColliderConfig, createActorColliderEntry, ensureActorVisualConfig, createActorVisualEntry } from "../../actor-collider.js";
// @ts-ignore Shared collision geometry is JavaScript and covered by runtime tests.
import { aabbOverlapsRotatedRect } from "../../collision-geometry.js";
// @ts-ignore Shared developer editor is JavaScript and used by existing scenes.
import { CollisionEditor } from "../../zone-editor.js";
import {
	chenAnimKey,
	chenDisplayWidth,
	chenFrameKey,
	chenFrameSize,
	createChenWalkAnimations,
	preloadChenWalk,
} from "@/common/chenWalk";
import type { ChenWalkDirection } from "@/common/chenWalk";
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
	advanceNarrative,
	playNarrative,
	showPrompt,
	showTask,
	taskNeedsConfirmation,
	togglePause,
	getPlayerAnimationMultiplier,
	getPlayerMovementMultiplier,
	showChoices,
	showInfoPanel,
} from "@/common/ui";
import {
	mountLayeredMap,
	preloadLayeredMap,
	type LayeredMapObject,
	type LayeredMapObjectDocument,
} from "@/common/layeredMap";
import {
	ANCESTRAL_HALL_MAPS,
	isAncestralHallVariant,
	type AncestralHallVariant,
} from "./ancestralHallMap";
import { CH02_ARRIVAL_NARRATIVE, CH02_ARRIVAL_TASK } from "./ch02Arrival.content";
import { CH02_DEPLOYMENT_NARRATIVE, CH02_DEPLOYMENT_TASK } from "./ch02Deployment.content";
import {
	CH02_DISCIPLINE_FLAGS,
	CH02_DISCIPLINE_NARRATIVE,
	CH02_DISCIPLINE_TASK,
	CH02_FIND_GROUP_LEADER_TASK,
	CH02_GROUP_ASSIGNMENT_INFO,
	CH02_GROUP_CHOICE_COMPLETE_TASK,
	CH02_GROUP_CHOICES,
	CH02_GROUP_LEADER_INTRO,
	type Ch02GroupChoice,
} from "./ch02Discipline.content";
import {
	CH02_MATERIALS_CHOICES,
	CH02_MATERIALS_COMPLETE_TASK,
	CH02_MATERIALS_FLAGS,
	CH02_MATERIALS_INFO,
	CH02_MATERIALS_NARRATIVE,
	CH02_MATERIALS_TASK,
	type Ch02MaterialsChoice,
} from "./ch02Materials.content";

const WORLD_W = 1664;
const WORLD_H = 936;
const PLAYER_DISPLAY_HEIGHT = 280;
const NPC_DISPLAY_HEIGHT = 280;
const CAMERA_ZOOM = 1280 / WORLD_W;

type Rect = [number, number, number, number];

interface RuntimeMapManifest {
	map_id: string;
	canvas: { width: number; height: number };
	tile_size: number;
	coordinate_origin?: string;
	collision: Array<{ id: string; rect: Rect; rotation?: number }>;
	interactions: Array<{ id: string; prompt?: string; rect: Rect; type?: string }>;
	spawns: Array<{ id: string; position: [number, number]; facing: ChenWalkDirection }>;
	exits: Array<{ id: string; prompt?: string; rect: Rect; type?: string }>;
	camera_bounds?: Rect;
	foreground_occlusion: { reserved: boolean; objects: unknown[] };
	actor_colliders?: Record<string, unknown>;
	actor_visuals?: Record<string, unknown>;
}

type DeploymentNpcId = "GROUP_LEADER" | "YOUNG_MEMBER" | "DAI_ANNAN";
type DeploymentNpcPhase = "waiting" | "briefing" | "settled";
type DisciplinePhase = "waiting-table" | "find-leader" | "choice" | "complete";
type MaterialsPhase = "waiting-npc" | "briefing" | "choice" | "complete";

interface DeploymentNpcDefinition {
	id: DeploymentNpcId;
	texture: string;
	x: number;
	y: number;
	alpha: number;
	depth: number;
}

function rectCenterBottom(rect: Rect): [number, number] {
	return [rect[0] + rect[2] / 2, rect[1] + rect[3]];
}

function normalizeObjectDocument(document: LayeredMapObjectDocument): RuntimeMapManifest {
	const objects = Array.isArray(document.objects) ? document.objects : [];
	const ofType = <T extends LayeredMapObject>(type: string): T[] =>
		objects.filter((item) => item.type === type) as T[];
	const toRegion = (item: LayeredMapObject) => ({
		id: item.id,
		rect: item.rect as Rect,
		...(typeof item.prompt === "string" ? { prompt: item.prompt } : {}),
		...(typeof item.action === "string" ? { type: item.action } : {}),
	});
	const spawnObjects = ofType("spawn");
	const camera = ofType("camera")[0];
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
			facing: "down",
		})),
		exits: ofType("exit").map(toRegion),
		camera_bounds: camera?.rect as Rect | undefined,
		foreground_occlusion: {
			reserved: true,
			objects: [],
		},
		actor_colliders: document.actor_colliders as Record<string, unknown> | undefined,
		actor_visuals: document.actor_visuals as Record<string, unknown> | undefined,
	};
}

function serializeRuntimeManifest(manifest: RuntimeMapManifest): LayeredMapObjectDocument {
	const objects: LayeredMapObject[] = [
		...manifest.collision.map((item) => ({ ...item, type: "collision" })),
		...manifest.interactions.map((item) => ({ ...item, type: "interaction" })),
		...manifest.spawns.map((spawn) => ({
			id: spawn.id,
			type: "spawn",
			rect: [spawn.position[0] - 24, spawn.position[1] - 48, 48, 48] as Rect,
		})),
		...(manifest.camera_bounds
			? [{ id: "CAM_MAIN", type: "camera", rect: manifest.camera_bounds }]
			: []),
		...manifest.exits.map((item) => ({ ...item, type: "exit" })),
	];
	return {
		map_id: manifest.map_id,
		canvas: manifest.canvas,
		tile_size: manifest.tile_size,
		coordinate_origin: manifest.coordinate_origin,
		objects,
		...(manifest.actor_colliders ? { actor_colliders: manifest.actor_colliders } : {}),
		...(manifest.actor_visuals ? { actor_visuals: manifest.actor_visuals } : {}),
	};
}

export class Ch02AncestralHallScene extends Phaser.Scene {
	zoneEditor: any;
	entry: "preview" | "arrival" | "deployment" | "discipline" | "materials" = "preview";
	variant: AncestralHallVariant = "main";
	definition = ANCESTRAL_HALL_MAPS.main;
	mapManifest!: ReturnType<typeof mountLayeredMap>["manifest"];
	mapDocument!: RuntimeMapManifest;
	mapDocumentFile = "";
	playerColliderProfile: any;
	actorColliderEntries: any[] = [];
	actorVisualProfiles: Record<string, any> = {};
	actorVisualEntries: any[] = [];
	player!: Phaser.Physics.Arcade.Sprite;
	playerVisual!: Phaser.GameObjects.Sprite;
	playerDirection: ChenWalkDirection = "down";
	keyMap!: ReturnType<typeof createKeyMap>;
	collisionRects: Array<{ id: string; rect: Rect; rotation: number }> = [];
	arrivalCrowd: Phaser.GameObjects.Container[] = [];
	arrivalActors: Phaser.GameObjects.Image[] = [];
	deploymentActors: Partial<Record<DeploymentNpcId, Phaser.GameObjects.Image>> = {};
	deploymentNpcPhase: DeploymentNpcPhase = "waiting";
	deploymentComplete = false;
	disciplineCrowd: Phaser.GameObjects.Image[] = [];
	disciplinePhase: DisciplinePhase = "waiting-table";
	materialsActors: Partial<Record<DeploymentNpcId, Phaser.GameObjects.Image>> = {};
	materialsCrowd: Phaser.GameObjects.Image[] = [];
	materialsPhase: MaterialsPhase = "waiting-npc";
	interactionMarkers: Partial<Record<DeploymentNpcId, Phaser.GameObjects.Container>> = {};
	chapter2Bgm?: Phaser.Sound.BaseSound;

	get state() {
		return useGameStateStore().state;
	}

	constructor() {
		super("Ch02AncestralHallScene");
	}

	init(data?: { variant?: string; entry?: string }) {
		const requestedVariant = data?.variant ?? null;
		if (isAncestralHallVariant(requestedVariant)) this.variant = requestedVariant;
		this.entry = data?.entry === "arrival"
			? "arrival"
			: data?.entry === "deployment"
				? "deployment"
				: data?.entry === "discipline"
					? "discipline"
					: data?.entry === "materials"
						? "materials"
				: "preview";
		this.definition = ANCESTRAL_HALL_MAPS[this.variant];
		this.arrivalCrowd = [];
		this.arrivalActors = [];
		this.deploymentActors = {};
		this.deploymentNpcPhase = "waiting";
		this.deploymentComplete = false;
		this.disciplineCrowd = [];
		this.disciplinePhase = "waiting-table";
		this.materialsActors = {};
		this.materialsCrowd = [];
		this.materialsPhase = "waiting-npc";
		this.interactionMarkers = {};
	}

	preload() {
		this.definition = ANCESTRAL_HALL_MAPS[this.variant];
		preloadLayeredMap(this, this.definition);
		preloadChenWalk(this);
		this.load.image("ch02_liaison", "assets/ch01/sc03/npc/liaison.png");
		this.load.image("ch02_npc_group_leader", "assets/ch02/actors/ch02_npc_group_leader.png");
		this.load.image("ch02_npc_young_member", "assets/ch02/actors/ch02_npc_young_member.png");
		this.load.image("ch02_npc_dai_annan", "assets/ch02/actors/ch02_npc_dai_annan.png");
		this.load.image("ch02_npc_worker_white_headcloth", "assets/ch02/actors/ch02_npc_worker_white_headcloth.png");
		this.load.image("ch02_npc_worker_straw_hat", "assets/ch02/actors/ch02_npc_worker_straw_hat.png");
		this.load.image("ch02_npc_worker_conical_hat", "assets/ch02/actors/ch02_npc_worker_conical_hat.png");
		this.load.image("ch02_npc_worker_blue_headcloth", "assets/ch02/actors/ch02_npc_worker_blue_headcloth.png");
		this.load.audio("ch02_bgm_secret_gathering", "assets/audio/ch02/01_祠堂夜集_秘密集结.mp3");
		this.load.audio("ch02_bgm_discipline", "assets/audio/ch02/03_油灯下的纪律_分组与物资.mp3");
	}

	create() {
		this.resetHud();
		// 地图场景只保留自己的 BGM；如果上一个场景有遗留声音，在这里先切断。
		this.sound.stopAll();
		const mounted = mountLayeredMap(this, this.definition);
		this.mapManifest = mounted.manifest;
		this.mapDocumentFile = `public/data/${this.definition.objectPath.replace(/^data\//, "")}`;
		this.mapDocument = normalizeObjectDocument(mounted.objectDocument);
		this.setupActorCollider();
		this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
		this.buildCollision();

		const spawn = this.mapDocument.spawns.find((item) => item.id === "SPAWN_PLAYER") ?? this.mapDocument.spawns[0];
		const [spawnX, spawnY] = this.entry === "discipline"
			? [1048, 790]
			: (spawn?.position ?? [WORLD_W / 2, WORLD_H - 120]);
		this.player = this.physics.add
			.sprite(spawnX, spawnY, chenFrameKey("down", 0))
			.setOrigin(0.5, 1)
			.setDepth(this.depthForPlayer());
		this.applyPlayerColliderBody();
		this.player.setCollideWorldBounds(true).setVisible(false);
		this.setupPlayerVisual();
		this.applyActorVisualHeight("PLAYER", this.actorVisualProfiles.PLAYER.display_height);

		this.cameras.main
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
		(window as any).ch02AncestralHallGame = this;

		if (this.entry === "arrival") {
			this.setupArrivalPresentation();
			this.beginArrivalNarrative();
		} else if (this.entry === "deployment") {
			this.setupDeploymentPresentation();
			this.beginDeploymentNarrative();
		} else if (this.entry === "discipline") {
			this.setupDisciplinePresentation();
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH02_DISCIPLINE_TASK);
		} else if (this.entry === "materials") {
			this.setupMaterialsPresentation();
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH02_MATERIALS_TASK);
		} else {
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask({
				title: "第二章地图适配预览",
				detail: `${this.variant} · WASD/方向键移动，E 关闭本卡或命中地图交互区；剧情内容尚未接入。`,
			});
		}
	}

	beginDeploymentNarrative() {
		this.playChapter2Bgm("ch02_bgm_secret_gathering");
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		this.setDeploymentNpcPhase("briefing");
		playNarrative(CH02_DEPLOYMENT_NARRATIVE, () => {
			this.setDeploymentNpcPhase("settled");
			this.deploymentComplete = true;
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH02_DEPLOYMENT_TASK);
		});
	}

	beginDisciplineNarrative() {
		if (this.disciplinePhase !== "waiting-table" || this.state.mode !== "explore") return;
		this.disciplinePhase = "find-leader";
		this.playChapter2Bgm("ch02_bgm_discipline");
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH02_DISCIPLINE_NARRATIVE, () => {
			this.state.flags.add(CH02_DISCIPLINE_FLAGS.disciplineComplete);
			this.reformDisciplineCrowd();
			this.setInteractionMarkerVisible("GROUP_LEADER", true);
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH02_FIND_GROUP_LEADER_TASK);
		});
	}

	beginGroupLeaderBriefing() {
		if (this.disciplinePhase !== "find-leader" || this.state.mode !== "explore") return;
		this.disciplinePhase = "choice";
		this.setInteractionMarkerVisible("GROUP_LEADER", false);
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH02_GROUP_LEADER_INTRO, () => {
			this.state.mode = "info";
			showInfoPanel({
				title: "选择前处境",
				items: CH02_GROUP_ASSIGNMENT_INFO,
				continueLabel: "进入正式选择",
				onContinue: () => this.startGroupChoice(),
			});
		});
	}

	startGroupChoice() {
		if (this.disciplinePhase !== "choice") return;
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			CH02_GROUP_CHOICES.map(({ id, label, detail }) => ({ id, label, detail })),
			(id: string) => this.chooseGroupChoice(id),
			"正式选择一：接受小组安排",
		);
	}

	chooseGroupChoice(id: string) {
		const choice = CH02_GROUP_CHOICES.find((item) => item.id === id);
		if (!choice) return;
		this.applyGroupChoice(choice);
		hideChoices();
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(choice.feedback, () => this.completeGroupChoice());
	}

	applyGroupChoice(choice: Ch02GroupChoice) {
		for (const [axis, delta] of Object.entries(choice.profileDelta))
			this.state.profile[axis] = (this.state.profile[axis] ?? 0) + delta;
		for (const [axis, delta] of Object.entries(choice.riskDelta)) {
			const riskKey = axis as keyof typeof this.state.risk;
			this.state.risk[riskKey] += delta;
		}
		this.state.choice = {
			id: `CH02_GROUP_${choice.id}`,
			flag: choice.flag,
			echo_summary: choice.label,
		};
		this.state.flags.add(choice.flag);
	}

	completeGroupChoice() {
		this.disciplinePhase = "complete";
		this.setInteractionMarkerVisible("GROUP_LEADER", false);
		this.state.flags.add(CH02_DISCIPLINE_FLAGS.disciplineComplete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hidePrompt();
		showTask(CH02_GROUP_CHOICE_COMPLETE_TASK);
	}

	beginMaterialsTransition() {
		if (this.disciplinePhase !== "complete" || this.state.mode === "transition") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		// 当前剧本没有指定视频转场，统一使用一秒黑屏完成场景切换。
		this.cameras.main.fadeOut(1000, 0, 0, 0);
		this.time.delayedCall(1000, () => this.game.events.emit("ch02:materials-enter"));
	}

	beginMaterialsBriefing() {
		if (this.materialsPhase !== "waiting-npc" || this.state.mode !== "explore") return;
		this.materialsPhase = "briefing";
		this.setInteractionMarkerVisible("GROUP_LEADER", false);
		this.playChapter2Bgm("ch02_bgm_discipline");
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		playNarrative(CH02_MATERIALS_NARRATIVE, () => {
			this.materialsPhase = "choice";
			this.state.mode = "info";
			showInfoPanel({
				title: "正式选择二：协助准备",
				items: CH02_MATERIALS_INFO,
				continueLabel: "进入正式选择",
				onContinue: () => this.startMaterialsChoice(),
			});
		});
	}

	startMaterialsChoice() {
		if (this.materialsPhase !== "choice") return;
		this.state.mode = "choice";
		this.state.playerLocked = true;
		showChoices(
			CH02_MATERIALS_CHOICES.map(({ id, label, detail }) => ({ id, label, detail })),
			(id: string) => this.chooseMaterialsChoice(id),
			"正式选择二：协助准备",
		);
	}

	chooseMaterialsChoice(id: string) {
		const choice = CH02_MATERIALS_CHOICES.find((item) => item.id === id);
		if (!choice) return;
		this.applyMaterialsChoice(choice);
		hideChoices();
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		playNarrative(choice.feedback, () => this.completeMaterialsChoice());
	}

	applyMaterialsChoice(choice: Ch02MaterialsChoice) {
		for (const [axis, delta] of Object.entries(choice.profileDelta))
			this.state.profile[axis] = (this.state.profile[axis] ?? 0) + delta;
		for (const [axis, delta] of Object.entries(choice.riskDelta)) {
			const riskKey = axis as keyof typeof this.state.risk;
			this.state.risk[riskKey] += delta;
		}
		this.state.choice = {
			id: `CH02_MATERIALS_${choice.id}`,
			flag: choice.flag,
			echo_summary: choice.label,
		};
		this.state.flags.add(choice.flag);
		if (choice.id === "D") this.state.flags.add(CH02_MATERIALS_FLAGS.contactCaution);
	}

	completeMaterialsChoice() {
		this.materialsPhase = "complete";
		this.setInteractionMarkerVisible("GROUP_LEADER", false);
		this.state.flags.add(CH02_MATERIALS_FLAGS.materialsComplete);
		this.state.mode = "end";
		this.state.playerLocked = true;
		hideDialogue();
		hideChoices();
		hidePrompt();
		showTask(CH02_MATERIALS_COMPLETE_TASK);
	}

	beginChapter3Transition() {
		if (this.materialsPhase !== "complete" || this.state.mode === "transition") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		this.stopChapter2Bgm();
		hidePrompt();
		hideTask();
		// 这里进入第二章章末“出发前”专用视频段，避免把它误当作地图内动画。
		this.cameras.main.fadeOut(220, 0, 0, 0);
		this.time.delayedCall(240, () => this.game.events.emit("ch02:chapter3-transition"));
	}

	beginArrivalNarrative() {
		this.state.mode = "narrative";
		this.state.playerLocked = true;
		hidePrompt();
		playNarrative(CH02_ARRIVAL_NARRATIVE, () => {
			this.state.mode = "explore";
			this.state.playerLocked = false;
			showTask(CH02_ARRIVAL_TASK);
		});
	}

	setupArrivalPresentation() {
		if (this.variant !== "main") return;
		// 门边值守者使用低对比度剪影，避免把现有联络人资产误当作新的历史人物。
		for (const [x, flip] of [[720, false], [920, true]] as const) {
			const actor = this.add
				.image(x, 726, "ch02_liaison")
				.setOrigin(0.5, 1)
				.setDisplaySize(138, 208)
				.setAlpha(0.42)
				.setTint(0x182027)
				.setFlipX(flip)
				.setDepth(actorDepth(726));
			this.arrivalActors.push(actor);
		}

		// 不逐人绘制三百余名角色，而以院内、院门外和墙根的人影传达规模。
		const crowdPoints: Array<[number, number, number]> = [
			[270, 688, 0.28],
			[385, 642, 0.34],
			[510, 700, 0.38],
			[620, 650, 0.32],
			[1010, 666, 0.34],
			[1130, 704, 0.38],
			[1270, 648, 0.28],
			[1410, 704, 0.26],
			[1510, 654, 0.22],
		];
		for (const [x, y, alpha] of crowdPoints) {
			const person = this.add.container(x, y).setDepth(actorDepth(y));
			person.add([
				this.add.ellipse(0, -56, 22, 22, 0x0b1116, alpha),
				this.add.rectangle(0, -25, 34, 64, 0x0b1116, alpha),
			]);
			this.arrivalCrowd.push(person);
		}
	}

	setupDeploymentPresentation() {
		if (this.variant !== "mainhall-close") return;
		const definitions: DeploymentNpcDefinition[] = [
			{
				id: "GROUP_LEADER",
				texture: "ch02_npc_group_leader",
				x: 832,
				y: 760,
				alpha: 0.82,
				// 站在低桌前沿，置于 L06 前景层之上、L07 灯光特效之下，
				// 确保发言者不会被可复用的桌椅遮挡。
				depth: 1650,
			},
			{
				id: "YOUNG_MEMBER",
				texture: "ch02_npc_young_member",
				x: 642,
				y: 842,
				alpha: 0.96,
				depth: actorDepth(842),
			},
			{
				id: "DAI_ANNAN",
				texture: "ch02_npc_dai_annan",
				x: 1028,
				y: 842,
				alpha: 0.96,
				depth: actorDepth(842),
			},
		];
		for (const definition of definitions) {
			const source = this.textures.get(definition.texture).getSourceImage() as HTMLImageElement;
			const width = Math.round((source.width / source.height) * NPC_DISPLAY_HEIGHT);
			const actor = this.add
				.image(definition.x, definition.y, definition.texture)
				.setOrigin(0.5, 1)
				.setDisplaySize(width, NPC_DISPLAY_HEIGHT)
				.setAlpha(definition.alpha)
				.setDepth(definition.depth);
			this.deploymentActors[definition.id] = actor;
		}
	}

	setupDisciplinePresentation() {
		if (this.variant !== "mainhall-close") return;
		const keyActors: DeploymentNpcDefinition[] = [
			{
				id: "GROUP_LEADER",
				texture: "ch02_npc_group_leader",
				x: 690,
				y: 760,
				alpha: 0.94,
				depth: 1650,
			},
			{
				id: "YOUNG_MEMBER",
				texture: "ch02_npc_young_member",
				x: 1090,
				y: 820,
				alpha: 0.9,
				depth: 1650,
			},
			{
				id: "DAI_ANNAN",
				texture: "ch02_npc_dai_annan",
				x: 920,
				y: 760,
				alpha: 0.98,
				depth: 1660,
			},
		];
		for (const definition of keyActors) {
			const source = this.textures.get(definition.texture).getSourceImage() as HTMLImageElement;
			const width = Math.round((source.width / source.height) * NPC_DISPLAY_HEIGHT);
			const actor = this.add
				.image(definition.x, definition.y, definition.texture)
				.setOrigin(0.5, 1)
				.setDisplaySize(width, NPC_DISPLAY_HEIGHT)
				.setAlpha(definition.alpha)
				.setDepth(definition.depth);
			this.deploymentActors[definition.id] = actor;
			if (definition.id === "GROUP_LEADER")
				this.createInteractionMarker("GROUP_LEADER", actor);
		}

		// 现场人数用四种已抠图的普通队员循环实例化；散点是初始等候，目标点是纪律传达后的分组站位。
		const crowd: Array<[string, number, number, number, number, number]> = [
			["ch02_npc_worker_white_headcloth", 470, 720, 535, 760, 0.62],
			["ch02_npc_worker_straw_hat", 555, 820, 600, 820, 0.58],
			["ch02_npc_worker_conical_hat", 650, 700, 675, 760, 0.64],
			["ch02_npc_worker_blue_headcloth", 760, 835, 745, 835, 0.56],
			["ch02_npc_worker_white_headcloth", 850, 840, 845, 820, 0.5],
			["ch02_npc_worker_straw_hat", 1015, 710, 1015, 770, 0.58],
			["ch02_npc_worker_conical_hat", 1135, 720, 1145, 780, 0.62],
			["ch02_npc_worker_blue_headcloth", 1220, 840, 1210, 820, 0.54],
			["ch02_npc_worker_white_headcloth", 1310, 710, 1290, 760, 0.5],
			["ch02_npc_worker_straw_hat", 1400, 820, 1365, 815, 0.52],
			["ch02_npc_worker_conical_hat", 1480, 730, 1435, 765, 0.48],
			["ch02_npc_worker_blue_headcloth", 1530, 840, 1490, 820, 0.46],
		];
		for (const [texture, x, y, targetX, targetY, alpha] of crowd) {
			const source = this.textures.get(texture).getSourceImage() as HTMLImageElement;
			const height = 210;
			const width = Math.round((source.width / source.height) * height);
			const actor = this.add
				.image(x, y, texture)
				.setOrigin(0.5, 1)
				.setDisplaySize(width, height)
				.setAlpha(alpha)
				.setDepth(1540);
			(actor as Phaser.GameObjects.Image & { disciplineTarget?: [number, number] }).disciplineTarget = [targetX, targetY];
			this.disciplineCrowd.push(actor);
		}
	}

	setupMaterialsPresentation() {
		if (this.variant !== "sidewall") return;
		const keyActors: Array<Pick<DeploymentNpcDefinition, "id" | "texture" | "x" | "y" | "alpha" | "depth">> = [
			{
				id: "GROUP_LEADER",
				texture: "ch02_npc_group_leader",
				x: 640,
				y: 575,
				alpha: 0.97,
				depth: 1650,
			},
			{
				id: "YOUNG_MEMBER",
				texture: "ch02_npc_young_member",
				x: 1085,
				y: 620,
				alpha: 0.88,
				depth: 1651,
			},
		];
		for (const definition of keyActors) {
			const source = this.textures.get(definition.texture).getSourceImage() as HTMLImageElement;
			const width = Math.round((source.width / source.height) * NPC_DISPLAY_HEIGHT);
			const actor = this.add
				.image(definition.x, definition.y, definition.texture)
				.setOrigin(0.5, 1)
				.setDisplaySize(width, NPC_DISPLAY_HEIGHT)
				.setAlpha(definition.alpha)
				.setDepth(definition.depth);
			this.materialsActors[definition.id] = actor;
			if (definition.id === "GROUP_LEADER") {
				const marker = this.createInteractionMarker("GROUP_LEADER", actor);
				marker.setVisible(true);
			}
		}

		// 侧墙上的辅助人员只负责表现清点、搬运和看护，不参与剧情状态判断。
		const workers: Array<[string, number, number, number]> = [
			["ch02_npc_worker_white_headcloth", 360, 560, 0.58],
			["ch02_npc_worker_straw_hat", 475, 635, 0.52],
			["ch02_npc_worker_conical_hat", 835, 565, 0.5],
			["ch02_npc_worker_blue_headcloth", 1190, 575, 0.55],
			["ch02_npc_worker_white_headcloth", 1310, 650, 0.45],
		];
		for (const [texture, x, y, alpha] of workers) {
			const source = this.textures.get(texture).getSourceImage() as HTMLImageElement;
			const height = 210;
			const width = Math.round((source.width / source.height) * height);
			this.materialsCrowd.push(
				this.add
					.image(x, y, texture)
					.setOrigin(0.5, 1)
					.setDisplaySize(width, height)
					.setAlpha(alpha)
					.setDepth(1620),
			);
		}
	}

	reformDisciplineCrowd() {
		for (const actor of this.disciplineCrowd) {
			const target = (actor as Phaser.GameObjects.Image & { disciplineTarget?: [number, number] }).disciplineTarget;
			if (!target) continue;
			this.tweens.add({ targets: actor, x: target[0], y: target[1], duration: 420, ease: "Sine.easeOut" });
		}
	}

	playChapter2Bgm(key: string) {
		this.stopChapter2Bgm();
		this.chapter2Bgm = this.sound.add(key, { loop: true, volume: 0.55 });
		this.chapter2Bgm.play();
	}

	stopChapter2Bgm() {
		this.chapter2Bgm?.stop();
		this.chapter2Bgm?.destroy();
		this.chapter2Bgm = undefined;
	}

	createInteractionMarker(id: DeploymentNpcId, actor: Phaser.GameObjects.Image) {
		const marker = this.add
			.container(actor.x, actor.y - NPC_DISPLAY_HEIGHT - 20)
			.setDepth(WORLD_INDICATOR_DEPTH)
			.setVisible(false)
			.setAlpha(0.96);
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
		marker.setData("targetId", id);
		this.interactionMarkers[id] = marker;
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

	setInteractionMarkerVisible(id: DeploymentNpcId, visible: boolean) {
		this.interactionMarkers[id]?.setVisible(visible);
	}

	setDeploymentNpcPhase(phase: DeploymentNpcPhase) {
		this.deploymentNpcPhase = phase;
		const leader = this.deploymentActors.GROUP_LEADER;
		const youngMember = this.deploymentActors.YOUNG_MEMBER;
		const daiAnnan = this.deploymentActors.DAI_ANNAN;
		if (phase === "briefing") {
			leader?.setAlpha(0.78);
			youngMember?.setAlpha(0.9);
			daiAnnan?.setAlpha(0.96);
			return;
		}
		if (phase === "settled") {
			leader?.setAlpha(0.62);
			youngMember?.setAlpha(0.72);
			daiAnnan?.setAlpha(0.78);
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
				onPositionChange: () => this.applyActorVisualPosition("PLAYER"),
				tileSize: 1,
			}),
		];
	}

	setupZoneEditor() {
		const documents = { [this.mapDocumentFile]: serializeRuntimeManifest(this.mapDocument) };
		this.zoneEditor = new CollisionEditor(this, {
			documents,
			tileSize: 1,
			snapStep: 1,
			getCollisions: () => this.mapDocument.collision,
			getInteractions: () => this.mapDocument.interactions,
			getForegrounds: () => this.mapDocument.foreground_occlusion.objects,
			getDefaultForegroundDepth: () => 1600,
			getWorldSize: () => [WORLD_W, WORLD_H],
			getActorColliders: () => this.actorColliderEntries,
			getActorVisuals: () => this.actorVisualEntries,
			onActorVisualChange: (id: string, height: number) => this.applyActorVisualHeight(id, height),
			getMagneticSource: () => this.textures.get(this.definition.layerKeys.L04_PROP_INTERACT).getSourceImage(),
			replaceDocuments: (next: any) => {
				this.mapDocument = normalizeObjectDocument(next[this.mapDocumentFile]);
				documents[this.mapDocumentFile] = serializeRuntimeManifest(this.mapDocument);
				this.setupActorCollider();
				this.buildCollision();
				this.applyPlayerColliderBody();
			},
			onChange: (kind: string) => {
				documents[this.mapDocumentFile] = serializeRuntimeManifest(this.mapDocument);
				if (!kind || kind === "collision") {
					this.buildCollision();
					this.applyPlayerColliderBody();
				}
			},
		});
	}

	setupPlayerVisual() {
		createChenWalkAnimations(this);
		this.playerVisual = this.add
			.sprite(this.player.x, this.player.y, chenFrameKey("down", 0))
			.setOrigin(0.5, 1)
			.setDisplaySize(chenDisplayWidth(this, "down", PLAYER_DISPLAY_HEIGHT), PLAYER_DISPLAY_HEIGHT)
			.setDepth(this.depthForPlayer());
	}

	applyActorVisualHeight(id: string, height: number) {
		if (id !== "PLAYER" || !this.playerVisual || !Number.isFinite(height) || height <= 0) return;
		const source = chenFrameSize(this, this.playerDirection);
		this.playerVisual.setDisplaySize(Math.round((source.width / source.height) * height), height);
		this.applyActorVisualPosition(id);
	}

	applyActorVisualPosition(id: string) {
		if (id !== "PLAYER" || !this.playerVisual || !this.player) return;
		const offset = this.actorVisualProfiles.PLAYER?.offset ?? [0, 0];
		this.playerVisual.setPosition(this.player.x + offset[0], this.player.y + offset[1]);
	}

	applyPlayerColliderBody() {
		if (!this.player || !this.playerColliderProfile) return;
		const source = chenFrameSize(this, "down");
		this.player
			.setSize(this.playerColliderProfile.size[0], this.playerColliderProfile.size[1])
			.setOffset(source.width / 2 + this.playerColliderProfile.offset[0], source.height + this.playerColliderProfile.offset[1]);
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

	update() {
		// 场景切换时 Arcade body 可能先于 Scene.update 的最后一帧被销毁。
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
		this.playerVisual.anims.timeScale = getPlayerAnimationMultiplier();
		this.applyActorVisualPosition("PLAYER");
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
		const nearbyTarget = this.nearby();
		const target = this.entry === "discipline"
			? this.disciplinePhase === "waiting-table" && nearbyTarget?.id === "TRG_DEPLOYMENT_MAP"
				? nearbyTarget
				: this.disciplinePhase === "find-leader" && nearbyTarget?.id === "TRG_GROUP_LEADER"
					? nearbyTarget
					: undefined
			: this.entry === "materials"
				? this.materialsPhase === "waiting-npc" && nearbyTarget?.id === "TRG_MATERIALS_NPC"
					? nearbyTarget
					: undefined
				: nearbyTarget;
		showPrompt(target ? `${target.prompt || target.id}  ·  E` : "");
	}

	handleConfirm() {
		if (taskNeedsConfirmation()) return closeTask();
		if (this.entry === "arrival") {
			const target = this.nearby();
			if (target?.id === "TRG_HALL_OBSERVE") this.beginDeploymentTransition();
			return;
		}
		if (this.entry === "deployment") {
			if (this.deploymentComplete) this.beginFlashbackTransition();
			return;
		}
		if (this.entry === "discipline") {
			const target = this.nearby();
			if (this.disciplinePhase === "complete") {
				this.beginMaterialsTransition();
				return;
			}
			if (this.disciplinePhase === "waiting-table" && target?.id === "TRG_DEPLOYMENT_MAP") {
				this.beginDisciplineNarrative();
				return;
			}
			if (this.disciplinePhase === "find-leader" && target?.id === "TRG_GROUP_LEADER") {
				this.beginGroupLeaderBriefing();
			}
			return;
		}
		if (this.entry === "materials") {
			const target = this.nearby();
			if (this.materialsPhase === "complete") {
				this.beginChapter3Transition();
				return;
			}
			if (this.materialsPhase === "waiting-npc" && target?.id === "TRG_MATERIALS_NPC")
				this.beginMaterialsBriefing();
			return;
		}
		const target = this.nearby();
		if (!target) return;
		showTask({
			title: `地图对象：${target.id}`,
			detail: `${target.type ?? "interaction"} 区域已命中。这里保留为第二章剧情接入点，当前不写入正式剧情。`,
		});
	}

	beginDeploymentTransition() {
		if (this.state.mode !== "explore") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		this.cameras.main.fadeOut(280, 0, 0, 0);
		this.time.delayedCall(300, () => this.game.events.emit("ch02:deployment-enter"));
	}

	beginFlashbackTransition() {
		if (this.state.mode !== "explore") return;
		this.state.mode = "transition";
		this.state.playerLocked = true;
		hidePrompt();
		hideTask();
		this.cameras.main.fadeOut(280, 0, 0, 0);
		this.time.delayedCall(300, () => this.game.events.emit("ch02:flashback-enter"));
	}

	shutdown() {
		this.stopChapter2Bgm();
		for (const marker of Object.values(this.interactionMarkers)) {
			if (!marker) continue;
			this.tweens.killTweensOf(marker);
			marker.destroy();
		}
		this.interactionMarkers = {};
		for (const actor of this.disciplineCrowd) actor.destroy();
		this.disciplineCrowd = [];
		for (const actor of this.materialsCrowd) actor.destroy();
		this.materialsCrowd = [];
		for (const actor of Object.values(this.materialsActors)) actor?.destroy();
		this.materialsActors = {};
	}
}
