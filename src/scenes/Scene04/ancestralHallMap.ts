import type { LayeredMapDefinition } from "@/common/layeredMap";

export type AncestralHallVariant = "main" | "mainhall-close" | "sidewall";

const LAYER_FILES = {
	L01_GROUND: "L01_GROUND.png",
	L02_GROUND_DETAIL: "L02_GROUND_DETAIL.png",
	L03_STRUCTURE_LOW: "L03_STRUCTURE_LOW.png",
	L04_PROP_INTERACT: "L04_PROP_INTERACT.png",
	L06_OCCLUSION_HIGH: "L06_OCCLUSION_HIGH.png",
	L07_LIGHT_FX: "L07_LIGHT_FX.png",
};

function createDefinition(
	variant: AncestralHallVariant,
	assetFolder: string,
	filePrefix: string,
	dataPrefix: string,
): LayeredMapDefinition {
	const id = `ch02_ancestral_hall_${variant.replaceAll("-", "_")}`;
	return {
		id,
		assetRoot: `assets/ch02/ancestral-hall/${assetFolder}`,
		manifestPath: `data/${dataPrefix}_manifest.json`,
		manifestKey: `${id}_manifest`,
		objectPath: `data/${dataPrefix}_objects.json`,
		objectKey: `${id}_objects`,
		layerFiles: Object.fromEntries(
			Object.entries(LAYER_FILES).map(([layerName, suffix]) => [
				layerName,
				`${filePrefix}_${suffix}`,
			]),
		),
		layerKeys: Object.fromEntries(
			Object.keys(LAYER_FILES).map((layerName) => [
				layerName,
				`${id}_${layerName}`,
			]),
		),
	};
}

export const ANCESTRAL_HALL_MAPS: Record<AncestralHallVariant, LayeredMapDefinition> = {
	main: createDefinition(
		"main",
		"main",
		"MAP_CH2_ANCESTRAL_HALL_MAIN",
		"ch02_ancestral_hall_main",
	),
	"mainhall-close": createDefinition(
		"mainhall-close",
		"mainhall-close",
		"MAP_CH2_ANCESTRAL_HALL_MAINHALL_CLOSE",
		"ch02_ancestral_hall_mainhall_close",
	),
	sidewall: createDefinition(
		"sidewall",
		"sidewall",
		"MAP_CH2_ANCESTRAL_HALL_SIDEWALL",
		"ch02_ancestral_hall_sidewall",
	),
};

export function isAncestralHallVariant(value: string | null): value is AncestralHallVariant {
	return value === "main" || value === "mainhall-close" || value === "sidewall";
}
