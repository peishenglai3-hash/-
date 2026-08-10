import Phaser from 'phaser';
import { createKeyMap, isActionDown, onAction } from './actions.js';
import { state } from './state.js';
import { showTask, closeTask, showPrompt, playNarrative, advanceNarrative, showItem, closeItem, itemPanelOpen, showItemPassive, hideItem, fadeToBlack, togglePause, showFlavor } from './ui.js';
import { ambience } from './ambience.js';
import { OPENING, AUDIO_REVIEW, WRITE_QUESTION, FALL_ASLEEP, TASKS, PROP_LINES, ONE_LINERS, FLAVOR_SPOTS } from './content02.js';
import { CollisionEditor } from './zone-editor.js';
import { aabbOverlapsRotatedRect } from './collision-geometry.js';
import { ForegroundOcclusionRenderer, foregroundBottomPx } from './foreground-occlusion.js';
import { actorColliderBottomAt, actorColliderRectAt, createActorColliderEntry, ensureActorColliderConfig } from './actor-collider.js';

const PX = 32;
const PLAYER_FRAME = { width: 332, height: 720 };
const PLAYER_VIEW_HEIGHT = 360;
const PLAYER_VIEW_WIDTH = Math.round(PLAYER_VIEW_HEIGHT * (PLAYER_FRAME.width / PLAYER_FRAME.height));
const PLAYER_DIRECTIONS = ['down', 'left', 'right', 'up'];
const DOOR_STAND = { x: 8.2 * PX, y: 34 * PX };
const SIDE_VIEW_HEIGHT = 328;
const OBJECTIVE_ANCHORS = {
  recorder: [28.25 * PX, 470],
  notebook: [32.25 * PX, 460],
  bed: [460, 560]
};

export class PrologueScene02 extends Phaser.Scene {
  constructor() { super('PrologueScene02'); }

  preload() {
    this.load.json('logic', '/data/PRO02_logic.json');
    this.load.json('interactions', '/data/PRO02_interactions.json');
    this.load.json('states', '/data/PRO02_states.json');
    this.load.image('bg02', '/assets/map/pro02_base.png');
    for (const direction of PLAYER_DIRECTIONS) {
      this.load.spritesheet(`player-walk-${direction}`, `/assets/characters/player/modern/walk-${direction}.png`, { frameWidth: PLAYER_FRAME.width, frameHeight: PLAYER_FRAME.height });
    }
    this.load.image('player-side-right', '/assets/characters/player/modern/side-right.png');
  }

  create() {
    this.logic = this.cache.json.get('logic');
    this.setupActorCollider();
    this.interactionData = this.cache.json.get('interactions');
    this.statesData = this.cache.json.get('states');
    this.applyInjectedStates();
    this.physics.world.setBounds(0, 0, this.logic.logical_grid.width * PX, this.logic.logical_grid.height * PX);
    this.background = this.add.image(this.logic.world_size[0] / 2, this.logic.world_size[1] / 2, 'bg02').setDepth(0);
    this.foregroundOcclusion = new ForegroundOcclusionRenderer(this, {
      background: this.background,
      getObjects: () => this.logic.foreground_layers?.objects ?? [],
      resolveDepth: (object) => 10 + (foregroundBottomPx(object, PX) ?? 0) / PX + 0.001,
      tileSize: PX
    });
    this.buildCollision();
    const spawn = this.logic.player_spawn;
    this.player = this.physics.add
      .sprite(spawn.position[0] * PX, spawn.position[1] * PX, 'player-walk-down')
      .setOrigin(0.5, 1)
      .setDepth(this.depthForBottom(actorColliderBottomAt(spawn.position[0] * PX, spawn.position[1] * PX, this.playerColliderProfile, PX)));
    this.applyPlayerColliderBody();
    this.player.setCollideWorldBounds(true);
    this.playerDirection = spawn.facing || 'up';
    this.player.setPosition(DOOR_STAND.x, DOOR_STAND.y);
    this.setupPlayerVisual();
    if (this.textures.exists('player-side-right')) {
      const source = this.textures.get('player-side-right').getSourceImage();
      this.playerVisual.setTexture('player-side-right')
        .setDisplaySize(Math.round(SIDE_VIEW_HEIGHT * (source.width / source.height)), SIDE_VIEW_HEIGHT);
      this.introSide = true;
    }
    this.setupObjectiveMarker();
    this.flavorArmed = new Map(FLAVOR_SPOTS.map((spot) => [spot.id, true]));
    this.keyMap = createKeyMap(this);
    this.setupZoneEditor();
    this.cameras.main
      .setBounds(0, 0, this.logic.world_size[0], this.logic.world_size[1])
      .startFollow(this.player, true, 0.08, 0.08)
      .setZoom(1);
    onAction(this, 'INTERACT', () => this.handleConfirm());
    onAction(this, 'ADVANCE', () => {
      if (state.inNarrative) advanceNarrative();
      else if (itemPanelOpen()) closeItem();
    });
    onAction(this, 'PAUSE', () => togglePause());
    window.scene02Game = this;
    this.startOpening();
  }

  applyInjectedStates() {
    const bindings = this.logic.story_state_bindings;
    for (const stateKey of bindings.apply_order) {
      const flag = Object.keys(bindings.flag_map).find((name) => bindings.flag_map[name] === stateKey);
      if (!flag || !state.flags.has(flag)) continue;
      for (const [prop, value] of Object.entries(this.statesData[stateKey] ?? {})) {
        if (prop in state.propStates) state.propStates[prop] = value;
      }
    }
  }

  depthForBottom(bottomY) { return 10 + bottomY / PX; }

  depthForPlayer() {
    return this.depthForBottom(actorColliderBottomAt(this.player.x, this.player.y, this.playerColliderProfile, PX));
  }

  buildCollision() {
    this.collisionRects = this.logic.collision_zones.map((item) => {
      const [x, y, width, height] = item.rect;
      return {
        id: item.id,
        rect: [x * PX, y * PX, width * PX, height * PX],
        rotation: Number(item.rotation) || 0
      };
    });
  }

  setupActorCollider() {
    this.playerColliderProfile = ensureActorColliderConfig(this.logic, 'PLAYER', {
      offset: [-0.5625, -0.8125],
      size: [1.125, 1.625]
    });
    this.actorColliderEntries = [createActorColliderEntry({
      id: 'ACTOR_PLAYER',
      label: '主角脚底',
      getActor: () => this.player,
      getProfile: () => this.playerColliderProfile
    })];
  }

  applyPlayerColliderBody() {
    const profile = this.playerColliderProfile;
    this.player.setSize(profile.size[0] * PX, profile.size[1] * PX)
      .setOffset(PLAYER_FRAME.width / 2 + profile.offset[0] * PX, PLAYER_FRAME.height + profile.offset[1] * PX);
  }

  setupPlayerVisual() {
    for (const direction of PLAYER_DIRECTIONS) {
      this.anims.create({
        key: `player-walk-${direction}-anim`,
        frames: this.anims.generateFrameNumbers(`player-walk-${direction}`, { start: 0, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    this.playerVisual = this.add.sprite(this.player.x, this.player.y, 'player-walk-down', 0)
      .setOrigin(0.5, 1)
      .setDisplaySize(PLAYER_VIEW_WIDTH, PLAYER_VIEW_HEIGHT)
      .setDepth(this.depthForPlayer());
    this.player.setVisible(false);
  }

  syncPlayerVisual(direction, moving) {
    if (!this.playerVisual) return;
    this.playerVisual.setPosition(this.player.x, this.player.y).setDepth(this.depthForPlayer());
    if (this.introSide) {
      if (!moving) return;
      this.introSide = false;
      this.playerVisual.setTexture(`player-walk-${direction}`, 0).setDisplaySize(PLAYER_VIEW_WIDTH, PLAYER_VIEW_HEIGHT);
    }
    if (moving) {
      const animation = `player-walk-${direction}-anim`;
      if (this.playerVisual.anims.currentAnim?.key !== animation || !this.playerVisual.anims.isPlaying) this.playerVisual.play(animation);
      return;
    }
    this.playerVisual.anims.stop();
    this.playerVisual.setTexture(`player-walk-${direction}`, 0);
  }

  setupObjectiveMarker() {
    this.objectiveMarker = this.add.container(0, 0).setDepth(180).setVisible(false);
    const bang = this.add.text(0, 0, '!', {
      fontFamily: 'Georgia, "Noto Serif SC", serif',
      fontSize: '46px',
      fontStyle: 'bold',
      color: '#e03428',
      stroke: '#fff6df',
      strokeThickness: 8
    }).setOrigin(0.5, 1);
    this.objectiveMarker.add(bang);
    this.tweens.add({ targets: bang, y: -12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  updateObjective() {
    let target = null;
    if (state.mode === 'explore' && !state.sleepStarted) {
      if (!state.audioReviewed) target = 'recorder';
      else if (!state.questionWritten) target = 'notebook';
      else target = 'bed';
    }
    this.objectiveTarget = target;
    if (!target) return this.objectiveMarker.setVisible(false);
    const [x, y] = OBJECTIVE_ANCHORS[target];
    if (this.objectiveMarker.x !== x || this.objectiveMarker.y !== y) this.objectiveMarker.setPosition(x, y);
    this.objectiveMarker.setVisible(true);
    return null;
  }

  updateFlavor() {
    if (state.mode !== 'explore' || state.playerLocked || state.paused) return;
    const px = this.player.x / PX;
    const py = this.player.y / PX;
    for (const spot of FLAVOR_SPOTS) {
      const distance = Math.hypot(px - spot.at[0], py - spot.at[1]);
      if (distance <= spot.radius) {
        if (this.flavorArmed.get(spot.id)) {
          this.flavorArmed.set(spot.id, false);
          showFlavor(spot.line);
        }
      } else if (distance > spot.radius + 1) {
        this.flavorArmed.set(spot.id, true);
      }
    }
  }

  handleConfirm() {
    if (state.taskOpen) return closeTask();
    if (itemPanelOpen()) return closeItem();
    this.interact();
  }

  interact() {
    if (state.playerLocked || state.mode !== 'explore') return;
    const zone = this.nearby();
    if (!zone) return;
    showPrompt('');
    switch (zone.action) {
      case 'recorder_review': return this.recorderReview(zone);
      case 'notebook_write': return this.notebookWrite(zone);
      case 'phone_look': return showItem({ icon: '/assets/items/phone-icon.png', title: '手机', text: PROP_LINES.phone[state.propStates.phone] ?? PROP_LINES.phone.default });
      case 'desk_look': return this.oneLine(ONE_LINERS.desk);
      case 'bed_look': return this.bedLook();
      case 'exit_blocked': return this.oneLine(zone.line ?? ONE_LINERS.exit);
      default: return null;
    }
  }

  recorderReview(zone) {
    if (state.audioReviewed) {
      return this.oneLine(zone.repeat_line_state?.[state.propStates.recorder] ?? zone.repeat_line);
    }
    state.mode = 'narrative';
    ambience.play('tape');
    showItemPassive({ icon: '/assets/items/recorder-icon.png', title: '采访录音设备', text: PROP_LINES.recorder[state.propStates.recorder] ?? PROP_LINES.recorder.default });
    playNarrative(AUDIO_REVIEW, () => {
      hideItem();
      ambience.play('stopTape');
      state.audioReviewed = true;
      state.flags.add('FLAG_PRO02_AUDIO_REVIEWED');
      state.mode = 'explore';
      showTask(TASKS.afterAudio);
    });
  }

  notebookWrite(zone) {
    if (!state.audioReviewed) {
      const line = `${PROP_LINES.notebook[state.propStates.notebook] ?? PROP_LINES.notebook.default} ${zone.blocked_line ?? ONE_LINERS.notebookBlocked}`;
      return this.oneLine(line);
    }
    if (state.questionWritten) return this.oneLine(zone.repeat_line ?? ONE_LINERS.notebookRepeat);
    state.mode = 'narrative';
    showItemPassive({ icon: '/assets/items/notebook-written-icon.png', title: '实践笔记', text: PROP_LINES.notebook[state.propStates.notebook] ?? PROP_LINES.notebook.default });
    playNarrative(WRITE_QUESTION, () => {
      hideItem();
      state.questionWritten = true;
      state.flags.add('FLAG_PRO02_QUESTION_WRITTEN');
      this.startSleepChain();
    });
  }

  bedLook() {
    if (state.audioReviewed && state.questionWritten && !state.sleepStarted) return this.startSleepChain();
    return this.oneLine(ONE_LINERS.bed);
  }

  startSleepChain() {
    if (state.sleepStarted) return;
    state.sleepStarted = true;
    state.mode = 'narrative';
    showPrompt('');
    playNarrative(FALL_ASLEEP, () => {
      ambience.play('sleepFade');
      fadeToBlack();
      this.game.events.emit('prologue:sleep-complete');
    });
  }

  oneLine(text) {
    state.mode = 'narrative';
    playNarrative([{ entry_id: 'LINE', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text, style: 'narration', cps: 16, advance: 'manual' }], () => { state.mode = 'explore'; });
  }

  startOpening() {
    if (state.mode !== 'intro') return;
    state.mode = 'narrative';
    playNarrative(OPENING, () => {
      state.mode = 'explore';
      showTask(TASKS.opening);
    });
  }

  update() {
    this.updateObjective();
    this.updateFlavor();
    if (state.paused) {
      this.player.setVelocity(0, 0);
      return;
    }
    const canWalk = state.mode === 'explore';
    if (!this.player || state.playerLocked || !canWalk) {
      if (this.player) {
        this.player.setVelocity(0, 0);
        this.syncPlayerVisual(this.playerDirection, false);
      }
      return;
    }
    const speed = 150;
    let x = 0; let y = 0;
    if (isActionDown(this.keyMap, 'MOVE_LEFT')) x -= 1;
    if (isActionDown(this.keyMap, 'MOVE_RIGHT')) x += 1;
    if (isActionDown(this.keyMap, 'MOVE_UP')) y -= 1;
    if (isActionDown(this.keyMap, 'MOVE_DOWN')) y += 1;
    const vector = new Phaser.Math.Vector2(x, y).normalize().scale(speed * (this.game.loop.delta / 1000));
    this.tryMove(vector.x, vector.y);
    if (x !== 0 || y !== 0) {
      if (Math.abs(x) > Math.abs(y)) this.playerDirection = x < 0 ? 'left' : 'right';
      if (Math.abs(y) >= Math.abs(x)) this.playerDirection = y < 0 ? 'up' : 'down';
    }
    this.player.setDepth(this.depthForPlayer());
    this.syncPlayerVisual(this.playerDirection, x !== 0 || y !== 0);
    this.updatePrompt();
  }

  tryMove(dx, dy) {
    const canOccupy = (nextX, nextY) => {
      const playerRect = actorColliderRectAt(nextX, nextY, this.playerColliderProfile, PX);
      if (playerRect[0] < 0 || playerRect[1] < 0 || playerRect[0] + playerRect[2] > this.logic.world_size[0] || playerRect[1] + playerRect[3] > this.logic.world_size[1]) return false;
      return !this.collisionRects.some((collision) => aabbOverlapsRotatedRect(playerRect, collision.rect, collision.rotation));
    };
    if (canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
    if (canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
  }

  updatePrompt() {
    const zone = this.nearby();
    showPrompt(zone ? `${zone.prompt}  ·  E` : '');
  }

  nearby() {
    const margin = this.interactionData.margin_tiles ?? 0.5;
    const px = this.player.x / PX; const py = this.player.y / PX;
    return this.interactionData.zones.find((zone) => {
      if (!zone.rect) return false;
      const [x, y, width, height] = zone.rect;
      return px >= x - margin && px <= x + width + margin && py >= y - margin && py <= y + height + margin;
    });
  }

  setupZoneEditor() {
    const logicFile = 'public/data/PRO02_logic.json';
    const interactionsFile = 'public/data/PRO02_interactions.json';
    const documents = { [logicFile]: this.logic, [interactionsFile]: this.interactionData };
    this.zoneEditor = new CollisionEditor(this, {
      documents,
      getCollisions: () => this.logic.collision_zones,
      getInteractions: () => this.interactionData.zones,
      getForegrounds: () => {
        this.logic.foreground_layers ??= { reserved: true, objects: [] };
        this.logic.foreground_layers.objects ??= [];
        return this.logic.foreground_layers.objects;
      },
      getDefaultForegroundDepth: () => 100,
      getWorldSize: () => this.logic.logical_grid ? [this.logic.logical_grid.width, this.logic.logical_grid.height] : [64, 36],
      getActorColliders: () => this.actorColliderEntries,
      getMagneticSource: () => this.textures.get('bg02').getSourceImage(),
      replaceDocuments: (next) => {
        this.logic = next[logicFile];
        this.interactionData = next[interactionsFile];
        documents[logicFile] = this.logic;
        documents[interactionsFile] = this.interactionData;
        this.setupActorCollider();
      },
      onChange: (kind) => {
        if (!kind || kind === 'collision') {
          this.buildCollision();
          this.applyPlayerColliderBody();
        }
        if (!kind || kind === 'foreground') this.foregroundOcclusion.rebuild();
      }
    });
  }
}
