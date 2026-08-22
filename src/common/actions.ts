export const ACTIONS: Record<string, string[]> = {
	MOVE_UP: ["W", "UP"],
	MOVE_DOWN: ["S", "DOWN"],
	MOVE_LEFT: ["A", "LEFT"],
	MOVE_RIGHT: ["D", "RIGHT"],
	INTERACT: ["E"],
	ADVANCE: ["SPACE"],
	FIRE: ["SPACE"],
	SWAP_WEAPON: ["Q"],
	PAUSE: ["ESC"],
};

export function createKeyMap(
	scene: Phaser.Scene,
): Record<string, Phaser.Input.Keyboard.Key> {
	const names = [...new Set(Object.values(ACTIONS).flat())];
	return scene.input.keyboard!.addKeys(names.join(","), false) as Record<
		string,
		Phaser.Input.Keyboard.Key
	>;
}

export function isActionDown(
	keyMap: Record<string, Phaser.Input.Keyboard.Key>,
	action: string,
): boolean {
	return ACTIONS[action].some((name) => keyMap[name]?.isDown);
}

export function onAction(
	scene: Phaser.Scene,
	action: string,
	handler: () => void,
): void {
	for (const name of ACTIONS[action])
		scene.input.keyboard!.on(`keydown-${name}`, handler);
}
