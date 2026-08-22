import type { LayeredMapDefinition } from "@/common/layeredMap";

export type Ch04TempleShot = "SHOT_WIDE" | "SHOT_MEDIUM" | "SHOT_CLOSE";

const LAYER_FILES = {
	L01_GROUND: "L01_GROUND.png",
	L02_GROUND_DETAIL: "L02_GROUND_DETAIL.png",
	L03_STRUCTURE_LOW: "L03_STRUCTURE_LOW.png",
	L04_PROP_INTERACT: "L04_PROP_INTERACT.png",
	L06_OCCLUSION_HIGH: "L06_OCCLUSION_HIGH.png",
	L07_LIGHT_FX: "L07_LIGHT_FX.png",
};

function createDefinition(shot: Ch04TempleShot): LayeredMapDefinition {
	const slug = shot.toLowerCase();
	const id = `ch04_wangye_temple_${slug}`;
	return {
		id,
		assetRoot: `assets/ch04/wangye-temple/${shot}`,
		manifestPath: `data/ch04_wangye_temple_${slug}_manifest.json`,
		manifestKey: `${id}_manifest`,
		objectPath: `data/ch04_wangye_temple_${slug}_objects.json`,
		objectKey: `${id}_objects`,
		layerFiles: { ...LAYER_FILES },
		layerKeys: Object.fromEntries(
			Object.keys(LAYER_FILES).map((layerName) => [
				layerName,
				`${id}_${layerName}`,
			]),
		),
	};
}

export const CH04_WANGYE_TEMPLE_MAPS: Record<
	Ch04TempleShot,
	LayeredMapDefinition
> = {
	SHOT_WIDE: createDefinition("SHOT_WIDE"),
	SHOT_MEDIUM: createDefinition("SHOT_MEDIUM"),
	SHOT_CLOSE: createDefinition("SHOT_CLOSE"),
};

export function isCh04TempleShot(
	value: string | null,
): value is Ch04TempleShot {
	return Boolean(value && value in CH04_WANGYE_TEMPLE_MAPS);
}
