import Phaser from "phaser";

export interface LayeredMapLayerManifest {
	file: string;
	visible_at_runtime?: boolean;
	editor_only?: boolean;
}

export interface LayeredMapManifest {
	map_id: string;
	canvas: { width: number; height: number };
	tile_size: number;
	coordinate_origin?: "top_left" | string;
	render_order: string[];
	// Older runtime manifests use `layers`; authored asset packages may keep
	// the same filenames under `files.layers`. The mount adapter accepts both.
	layers?: Record<string, LayeredMapLayerManifest>;
	collision_objects?: string;
}

export interface LayeredMapObjectDocument {
	map_id: string;
	canvas: { width: number; height: number };
	tile_size: number;
	coordinate_origin?: string;
	objects?: LayeredMapObject[];
	[key: string]: unknown;
}

export interface LayeredMapObject {
	id: string;
	type: string;
	rect?: [number, number, number, number];
	[key: string]: unknown;
}

export interface LayeredMapDefinition {
	id: string;
	assetRoot: string;
	manifestPath: string;
	manifestKey: string;
	objectPath: string;
	objectKey: string;
	layerFiles: Record<string, string>;
	layerKeys: Record<string, string>;
}

export interface MountedLayeredMap {
	manifest: LayeredMapManifest;
	objectDocument: LayeredMapObjectDocument;
	layers: Record<string, Phaser.GameObjects.Image>;
}

const LAYER_DEPTHS: Record<string, number> = {
	L01_GROUND: -100,
	L02_GROUND_DETAIL: -90,
	L03_STRUCTURE_LOW: -80,
	L04_PROP_INTERACT: 100,
	// Keep every authored layer below the actor depth band (500 + foot Y).
	// Selective foreground masks use that same foot-Y band with a small offset.
	L06_OCCLUSION_HIGH: 200,
	L07_LIGHT_FX: 300,
};

export function layeredMapLayerDepth(layerName: string, fallbackIndex = 0): number {
	return LAYER_DEPTHS[layerName] ?? -100 + fallbackIndex * 10;
}

export function preloadLayeredMap(
	scene: Phaser.Scene,
	definition: LayeredMapDefinition,
): void {
	scene.load.json(definition.manifestKey, definition.manifestPath);
	scene.load.json(definition.objectKey, definition.objectPath);
	for (const [layerName, file] of Object.entries(definition.layerFiles)) {
		const key = definition.layerKeys[layerName];
		if (key && !scene.textures.exists(key)) {
			scene.load.image(key, `${definition.assetRoot}/${file}`);
		}
	}
}

export function mountLayeredMap(
	scene: Phaser.Scene,
	definition: LayeredMapDefinition,
): MountedLayeredMap {
	const manifest = scene.cache.json.get(definition.manifestKey) as LayeredMapManifest;
	const objectDocument = scene.cache.json.get(definition.objectKey) as LayeredMapObjectDocument;
	if (!manifest?.canvas || !Array.isArray(manifest.render_order)) {
		throw new Error(`Invalid layered map manifest: ${definition.manifestKey}`);
	}
	if (!objectDocument || !Array.isArray(objectDocument.objects)) {
		throw new Error(`Invalid layered map object document: ${definition.objectKey}`);
	}

	const layers: Record<string, Phaser.GameObjects.Image> = {};
	for (const [index, layerName] of manifest.render_order.entries()) {
		const layerManifest = manifest.layers?.[layerName] ?? { file: layerName };
		const key = definition.layerKeys[layerName];
		if (
			!layerManifest ||
			layerManifest.editor_only ||
			layerManifest.visible_at_runtime === false ||
			!key
		) {
			continue;
		}
		const image = scene.add
			.image(manifest.canvas.width / 2, manifest.canvas.height / 2, key)
			.setOrigin(0.5)
			.setDepth(layeredMapLayerDepth(layerName, index));
		layers[layerName] = image;
	}

	return { manifest, objectDocument, layers };
}
