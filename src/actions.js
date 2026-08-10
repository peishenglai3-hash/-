export const ACTIONS = {
  MOVE_UP: ['W', 'UP'],
  MOVE_DOWN: ['S', 'DOWN'],
  MOVE_LEFT: ['A', 'LEFT'],
  MOVE_RIGHT: ['D', 'RIGHT'],
  INTERACT: ['E'],
  ADVANCE: ['SPACE'],
  PAUSE: ['ESC']
};

export function createKeyMap(scene) {
  const names = [...new Set(Object.values(ACTIONS).flat())];
  return scene.input.keyboard.addKeys(names.join(','), false);
}

export function isActionDown(keyMap, action) {
  return ACTIONS[action].some((name) => keyMap[name]?.isDown);
}

export function onAction(scene, action, handler) {
  for (const name of ACTIONS[action]) scene.input.keyboard.on(`keydown-${name}`, handler);
}
