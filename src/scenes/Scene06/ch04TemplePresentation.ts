import Phaser from "phaser";
import { actorDepth } from "@/common/displayDepth";
import type { LayeredMapObjectDocument } from "@/common/layeredMap";

type Rect = [number, number, number, number];

export interface RuntimeActorDefinition {
	id: string;
	texture: string;
	position: [number, number];
	displayHeight: number;
	alpha?: number;
	depthOffset?: number;
	role?: "stage" | "crowd" | "support" | "ambient";
}

export interface Ch04TempleActorSetup {
	actors: Phaser.GameObjects.Image[];
	ambientActors: Phaser.GameObjects.Image[];
	instabilityGhosts: Phaser.GameObjects.Image[];
}

const CHARACTER_ASSETS: Record<string, string> = {
	ch04_stage_dai_annan: "assets/ch02/actors/ch02_npc_dai_annan.png",
	ch04_stage_peng_guocai: "assets/characters/ch03-peng-dingbang/idle-v2.png",
	ch04_wounded_member: "assets/characters/ch03-wounded-member/idle.png",
	ch04_crowd_young: "assets/ch02/actors/ch02_npc_young_member.png",
	ch04_crowd_straw_hat: "assets/ch02/actors/ch02_npc_worker_straw_hat.png",
	ch04_crowd_headcloth: "assets/ch02/actors/ch02_npc_worker_blue_headcloth.png",
	ch04_crowd_guard: "assets/characters/ch03-militia/idle-a.png",
};

export function preloadCh04TempleCharacters(scene: Phaser.Scene): void {
	for (const [key, path] of Object.entries(CHARACTER_ASSETS)) {
		if (!scene.textures.exists(key)) scene.load.image(key, path);
	}
}

function centerBottom(rect: Rect): [number, number] {
	return [rect[0] + rect[2] / 2, rect[1] + rect[3]];
}

function getSpawn(
	objectDocument: LayeredMapObjectDocument,
	name: string,
	fallback: [number, number],
): [number, number] {
	const object = objectDocument.objects?.find((candidate) => candidate.name === name);
	return object?.rect ? centerBottom(object.rect as Rect) : fallback;
}

function createActor(
	scene: Phaser.Scene,
	definition: RuntimeActorDefinition,
	actors: Phaser.GameObjects.Image[],
): Phaser.GameObjects.Image {
	const source = scene.textures.get(definition.texture).getSourceImage() as {
		width: number;
		height: number;
	};
	const actor = scene.add
		.image(definition.position[0], definition.position[1], definition.texture)
		.setName(definition.id)
		.setOrigin(0.5, 1)
		.setDisplaySize(
			(source.width / Math.max(1, source.height)) * definition.displayHeight,
			definition.displayHeight,
		)
		.setAlpha(definition.alpha ?? 1)
		.setDepth(actorDepth(definition.position[1]) + (definition.depthOffset ?? 0));
	actors.push(actor);
	return actor;
}

function addInstabilityGhost(
	scene: Phaser.Scene,
	actor: Phaser.GameObjects.Image,
	definition: RuntimeActorDefinition,
	ghosts: Phaser.GameObjects.Image[],
): void {
	const ghost = scene.add
		.image(actor.x + 2, actor.y, definition.texture)
		.setName(`${definition.id}_MEMORY_OFFSET`)
		.setOrigin(0.5, 1)
		.setDisplaySize(actor.displayWidth, actor.displayHeight)
		.setTint(0xbcae98)
		.setAlpha(Math.min(0.12, (definition.alpha ?? 1) * 0.12))
		.setDepth(actor.depth - 0.2);
	ghosts.push(ghost);

	// 只有一像素级横向错位和低幅度透明度呼吸，避免旋转、飞散或强光。
	scene.tweens.add({
		targets: ghost,
		x: actor.x - 1,
		alpha: Math.min(0.16, (definition.alpha ?? 1) * 0.16),
		duration: 900,
		yoyo: true,
		repeat: -1,
		ease: "Sine.InOut",
	});
}

export function setupCh04TempleActors(
	scene: Phaser.Scene,
	objectDocument: LayeredMapObjectDocument,
	options: { unstable?: boolean; animateAmbient?: boolean } = {},
): Ch04TempleActorSetup {
	const actors: Phaser.GameObjects.Image[] = [];
	const ambientActors: Phaser.GameObjects.Image[] = [];
	const instabilityGhosts: Phaser.GameObjects.Image[] = [];
	const unstable = options.unstable === true;
	const animateAmbient = options.animateAmbient !== false;

	const stageSpawn = getSpawn(objectDocument, "SPAWN_STAGE_SPEAKER", [832, 396]);
	const wounded = getSpawn(objectDocument, "SPAWN_WOUNDED_A", [664, 492]);
	const woundedHelper = getSpawn(objectDocument, "SPAWN_WOUNDED_HELPER_A", [712, 492]);
	const handover = getSpawn(objectDocument, "SPAWN_HANDOVER_MEMBER", [1096, 492]);
	const guard = getSpawn(objectDocument, "SPAWN_STREET_GUARD", [808, 828]);
	const crowdA = getSpawn(objectDocument, "SPAWN_CROWD_FRONT_A", [616, 636]);
	const crowdB = getSpawn(objectDocument, "SPAWN_CROWD_FRONT_B", [808, 684]);
	const crowdC = getSpawn(objectDocument, "SPAWN_CROWD_FRONT_C", [1000, 636]);

	const definitions: RuntimeActorDefinition[] = [
		{
			id: "STAGE_SPEAKER_DAI_ANNAN",
			texture: "ch04_stage_dai_annan",
			position: [stageSpawn[0] - 56, stageSpawn[1] - 6],
			displayHeight: 138,
			depthOffset: 2,
			role: "stage",
		},
		{
			id: "STAGE_SPEAKER_PENG_GUOCAI",
			texture: "ch04_stage_peng_guocai",
			position: [stageSpawn[0] + 56, stageSpawn[1] - 6],
			displayHeight: 132,
			depthOffset: 2,
			role: "stage",
		},
		{
			id: "WOUNDED_MEMBER",
			texture: "ch04_wounded_member",
			position: wounded,
			displayHeight: 108,
			alpha: 0.92,
			role: "support",
		},
		{
			id: "WOUNDED_HELPER",
			texture: "ch04_crowd_young",
			position: woundedHelper,
			displayHeight: 104,
			role: "support",
		},
		{
			id: "HANDOVER_MEMBER",
			texture: "ch04_crowd_headcloth",
			position: handover,
			displayHeight: 112,
			role: "support",
		},
		{
			id: "STREET_GUARD",
			texture: "ch04_crowd_guard",
			position: guard,
			displayHeight: 118,
			alpha: 0.9,
			role: "support",
		},
		{ id: "FRONT_CROWD_A", texture: "ch04_crowd_straw_hat", position: crowdA, displayHeight: 142, role: "crowd" },
		{ id: "FRONT_CROWD_B", texture: "ch04_crowd_young", position: crowdB, displayHeight: 148, role: "crowd" },
		{ id: "FRONT_CROWD_C", texture: "ch04_crowd_headcloth", position: crowdC, displayHeight: 140, role: "crowd" },
		{ id: "FRONT_CROWD_D", texture: "ch04_crowd_straw_hat", position: [704, 660], displayHeight: 122, alpha: 0.86, role: "crowd" },
		{ id: "FRONT_CROWD_E", texture: "ch04_crowd_young", position: [912, 660], displayHeight: 126, alpha: 0.86, role: "crowd" },
		{ id: "DISTANT_A", texture: "ch04_crowd_headcloth", position: [470, 528], displayHeight: 92, alpha: 0.34, role: "ambient" },
		{ id: "DISTANT_B", texture: "ch04_crowd_young", position: [540, 544], displayHeight: 86, alpha: 0.3, role: "ambient" },
		{ id: "DISTANT_C", texture: "ch04_crowd_straw_hat", position: [1110, 530], displayHeight: 88, alpha: 0.32, role: "ambient" },
		{ id: "DISTANT_D", texture: "ch04_crowd_headcloth", position: [1180, 552], displayHeight: 84, alpha: 0.28, role: "ambient" },
		{ id: "DISTANT_E", texture: "ch04_crowd_young", position: [500, 700], displayHeight: 98, alpha: 0.24, role: "ambient" },
		{ id: "DISTANT_F", texture: "ch04_crowd_straw_hat", position: [1160, 692], displayHeight: 96, alpha: 0.23, role: "ambient" },
	];

	for (const definition of definitions) {
		const actor = createActor(scene, definition, actors);
		if (definition.role === "ambient") {
			ambientActors.push(actor);
			if (animateAmbient) {
				scene.tweens.add({
					targets: actor,
					y: actor.y - 2,
					duration: 1800 + ambientActors.length * 120,
					yoyo: true,
					repeat: -1,
					ease: "Sine.InOut",
				});
			}
		}
		if (unstable) {
			if (definition.role === "stage") actor.setAlpha((definition.alpha ?? 1) * 0.62);
			else if (definition.role === "crowd" || definition.role === "ambient")
				actor.setAlpha((definition.alpha ?? 1) * 0.72);
			addInstabilityGhost(scene, actor, definition, instabilityGhosts);
		}
	}

	return { actors, ambientActors, instabilityGhosts };
}

export function createCh04TempleFlag(
	scene: Phaser.Scene,
	alpha = 1,
): Phaser.GameObjects.Graphics {
	const flag = scene.add.graphics().setDepth(actorDepth(390) + 1).setAlpha(alpha);
	flag.lineStyle(4, 0x5b402a, 1);
	flag.lineBetween(832, 216, 832, 365);
	flag.fillStyle(0xb52d35, 0.96);
	flag.beginPath();
	flag.moveTo(835, 226);
	flag.lineTo(954, 244);
	flag.lineTo(835, 286);
	flag.closePath();
	flag.fillPath();
	flag.lineStyle(1, 0xe6b3a0, 0.6);
	flag.strokePath();
	return flag;
}
