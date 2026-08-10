import Phaser from 'phaser';
import { createKeyMap, isActionDown, onAction } from './actions.js';
import { state } from './state.js';
import {
  showTask, closeTask, hideTask, showPrompt, playNarrative, advanceNarrative,
  showItem, closeItem, hideItem, itemPanelOpen, showChoices, hideChoices, showResult,
  hideResult, hideDialogue, fadeToBlack, togglePause
} from './ui.js';
import { REQUIRED_NARRATIVE, CHOICES, TASKS01, LEAVE_NARRATIVE, PROFILE_DELTAS } from './content01.js';
import { CollisionEditor } from './collision-editor.js';

const PX = 32;
const PLAYER_FRAME = { width: 332, height: 720 };
const PLAYER_DISPLAY = { width: 83, height: 180 };
const NPC_DISPLAY = { width: 77, height: 160 };
const STUDENT_A_FRAME = { width: 453, height: 902 };
const STUDENT_A_DISPLAY = { width: Math.round(NPC_DISPLAY.height * (STUDENT_A_FRAME.width / STUDENT_A_FRAME.height)), height: NPC_DISPLAY.height };

export class Scene01 extends Phaser.Scene {
  constructor() { super('Scene01'); }

  preload() {
    this.load.json('manifest', '/data/scene01_manifest.json');
    this.load.image('bg01', '/assets/map/scene01_base.png');
    for (const direction of ['up', 'down', 'left', 'right']) {
      this.load.spritesheet(`player-walk-${direction}`, `/assets/characters/player/modern/walk-${direction}.png`, { frameWidth: PLAYER_FRAME.width, frameHeight: PLAYER_FRAME.height });
    }
    for (const id of ['front', 'back', 'side']) this.load.image(`student-b-${id}`, `/assets/characters/student-b/${id}.png`);
    this.load.image('student-b-front-task3', '/assets/characters/student-b/front-task3.png');
    this.load.spritesheet('student-a-reading', '/assets/characters/student-a/actions/reading-sheet.png', { frameWidth: STUDENT_A_FRAME.width, frameHeight: STUDENT_A_FRAME.height });
  }

  create() {
    this.manifest = this.cache.json.get('manifest');
    this.createKeyedTexture('student-b-front', 'student-b-front-keyed');
    this.createKeyedTexture('student-b-back', 'student-b-back-keyed');
    this.createKeyedTexture('student-b-side', 'student-b-side-keyed');
    this.anims.create({ key: 'student-a-reading-anim', frames: this.anims.generateFrameNumbers('student-a-reading', { start: 0, end: 31 }), frameRate: 8, repeat: -1 });
    this.physics.world.setBounds(0, 0, 48 * PX, 27 * PX);
    this.add.image(768, 432, 'bg01').setDisplaySize(1536, 864).setDepth(-20);
    this.buildCollision();
    const spawn = (id) => this.manifest.spawns.find((entry) => entry.id === id);
    const playerSpawn = spawn('PLAYER_START');
    this.player = this.physics.add.sprite(playerSpawn.position[0] * PX, playerSpawn.position[1] * PX, 'player-walk-down').setOrigin(0.5, 1).setDepth(800);
    this.player.setSize(24, 40).setOffset(154, 680);
    this.player.setCollideWorldBounds(true);
    this.player.setVisible(false);
    this.playerDirection = 'down';
    this.setupPlayerVisual();
    this.keyMap = createKeyMap(this);
    this.setupZoneEditor();
    this.camera = this.cameras.main.setBounds(0, 0, 1536, 864).startFollow(this.player, true, 0.08, 0.08);
    this.camera.setZoom(1);
    const studentASpawn = spawn('NPC_CH00_STUDENT_A');
    const studentBSpawn = spawn('NPC_CH00_STUDENT_B');
    this.createNpc('student-a', 'NPC_CH00_STUDENT_A', studentASpawn.position[0], studentASpawn.position[1], studentASpawn.facing);
    this.createNpc('student-b', 'NPC_CH00_STUDENT_B', studentBSpawn.position[0], studentBSpawn.position[1], studentBSpawn.facing);
    onAction(this, 'INTERACT', () => this.handleConfirm());
    onAction(this, 'ADVANCE', () => {
      if (state.mode === 'result') this.beginLeave();
      else if (state.inNarrative) advanceNarrative();
      else if (itemPanelOpen()) closeItem();
    });
    onAction(this, 'PAUSE', () => togglePause());
    window.scene01Game = this;
  }

  beginExplore() {
    if (state.mode !== 'intro') return;
    state.mode = 'explore';
    state.playerLocked = false;
    showTask(TASKS01.intro);
  }

  setupPlayerVisual() {
    for (const direction of ['up', 'down', 'left', 'right']) {
      this.anims.create({
        key: `player-walk-${direction}-anim`,
        frames: this.anims.generateFrameNumbers(`player-walk-${direction}`, { start: 0, end: 7 }),
        frameRate: 8,
        repeat: -1
      });
    }
    this.playerVisual = this.add.sprite(this.player.x, this.player.y, 'player-walk-down', 0)
      .setOrigin(0.5, 1).setDisplaySize(PLAYER_DISPLAY.width, PLAYER_DISPLAY.height).setDepth(801);
  }

  syncPlayerVisual(direction, moving) {
    if (!this.playerVisual) return;
    this.playerVisual.setPosition(this.player.x, this.player.y).setFlipX(false);
    if (moving) {
      const animation = `player-walk-${direction}-anim`;
      if (this.playerVisual.anims.currentAnim?.key !== animation || !this.playerVisual.anims.isPlaying) this.playerVisual.play(animation);
      return;
    }
    this.playerVisual.anims.stop();
    this.playerVisual.setTexture(`player-walk-${direction}`, 0);
  }

  createKeyedTexture(sourceKey, targetKey) {
    const source = this.textures.get(sourceKey).getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue = [];
    const isBackground = (index) => {
      const r = data[index]; const g = data[index + 1]; const b = data[index + 2];
      const max = Math.max(r, g, b); const min = Math.min(r, g, b);
      return max < 28 || (max - min < 12 && min > 180);
    };
    const enqueue = (x, y) => {
      if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
      const pixel = y * canvas.width + x;
      if (visited[pixel]) return;
      const index = pixel * 4;
      if (!isBackground(index)) return;
      visited[pixel] = 1;
      queue.push(pixel);
    };
    for (let x = 0; x < canvas.width; x += 1) { enqueue(x, 0); enqueue(x, canvas.height - 1); }
    for (let y = 0; y < canvas.height; y += 1) { enqueue(0, y); enqueue(canvas.width - 1, y); }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const pixel = queue[cursor];
      const x = pixel % canvas.width; const y = Math.floor(pixel / canvas.width);
      data[pixel * 4 + 3] = 0;
      enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
    }
    context.putImageData(image, 0, 0);
    if (this.textures.exists(targetKey)) this.textures.remove(targetKey);
    this.textures.addCanvas(targetKey, canvas);
  }

  buildCollision() {
    this.collisionRects = this.manifest.collision.map((item) => {
      const [x, y, width, height] = item.rect;
      return { id: item.id, x: x * PX, y: y * PX, width: width * PX, height: height * PX };
    });
  }

  createNpc(prefix, id, x, y, facing) {
    const textureFacing = facing === 'down' ? 'front' : facing === 'up' ? 'back' : 'side';
    if (id === 'NPC_CH00_STUDENT_B') {
      const image = document.createElement('img');
      image.src = '/assets/characters/student-b/actions/camera-keyed.gif';
      image.className = 'npc-gif-mask';
      image.alt = '同学乙拍照';
      const npc = this.add.dom(x * PX, y * PX, image).setOrigin(0.5, 1).setDepth(550 + y * PX);
      npc.setData('spawnId', id);
      npc.setData('facing', facing);
      npc.setData('action', 'photo');
      this.studentB = npc;
      return;
    }
    if (id === 'NPC_CH00_STUDENT_A') {
      const npc = this.add.sprite(x * PX, y * PX, 'student-a-reading', 0).setDisplaySize(STUDENT_A_DISPLAY.width, STUDENT_A_DISPLAY.height).setOrigin(0.5, 1).setDepth(500 + y * PX);
      npc.setData('spawnId', id);
      npc.setData('facing', facing);
      npc.setData('action', 'reading');
      npc.play('student-a-reading-anim');
      this.studentA = npc;
      return;
    }
    const npc = this.add.sprite(x * PX, y * PX, `${prefix}-${textureFacing}-keyed`).setDisplaySize(NPC_DISPLAY.width, NPC_DISPLAY.height).setOrigin(0.5, 1).setDepth(500 + y * PX);
    npc.setData('spawnId', id);
    npc.setData('facing', facing);
    npc.setData('action', 'idle');
    this[prefix === 'student-a' ? 'studentA' : 'studentB'] = npc;
  }

  repositionActors() {
    this.player.setPosition(24 * PX, 25 * PX);
    this.studentA.setPosition(26 * PX, 25 * PX);
    this.studentB.setPosition(22 * PX, 25 * PX);
    this.studentB.setVisible(false);
  }

  startLeaveWalk() {
    this.leaveNpcArrived = { A: true, B: true };
    this.studentA.setData('action', 'packing');
    this.studentB.setData('action', 'returning');
    this.studentA.setPosition(26 * PX, 25 * PX);
    this.studentB.setPosition(22 * PX, 25 * PX);
    this.swapStudentBToExitPose();
  }

  swapStudentBToExitPose() {
    this.studentB.setVisible(false);
    this.studentBExit?.destroy();
    const texture = this.textures.exists('student-b-front-task3') ? 'student-b-front-task3' : 'student-b-front-keyed';
    const source = this.textures.get(texture).getSourceImage();
    const displayHeight = NPC_DISPLAY.height;
    const displayWidth = Math.round(displayHeight * (source.width / source.height));
    this.studentBExit = this.add.sprite(22 * PX, 25 * PX, texture)
      .setDisplaySize(displayWidth, displayHeight).setOrigin(0.5, 1).setDepth(600);
    this.studentBExit.setData('spawnId', 'NPC_CH00_STUDENT_B');
  }

  handleConfirm() {
    if (state.taskOpen) return closeTask();
    if (itemPanelOpen()) return closeItem();
    this.interact();
  }

  update() {
    const canWalk = state.mode === 'explore' || state.mode === 'leave_walk';
    if (!this.player || state.playerLocked || state.paused || !canWalk) {
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
      if (Math.abs(x) > Math.abs(y)) {
        this.playerDirection = x < 0 ? 'left' : 'right';
      }
      if (Math.abs(y) >= Math.abs(x)) this.playerDirection = y < 0 ? 'up' : 'down';
    }
    this.syncPlayerVisual(this.playerDirection, x !== 0 || y !== 0);
    this.updatePrompt();
  }

  tryMove(dx, dy) {
    const halfW = 12;
    const halfH = 20;
    const canOccupy = (nextX, nextY) => {
      if (nextX - halfW < 0 || nextY - halfH < 0 || nextX + halfW > 48 * PX || nextY + halfH > 27 * PX) return false;
      return !this.collisionRects.some((rect) => nextX + halfW > rect.x && nextX - halfW < rect.x + rect.width && nextY + halfH > rect.y && nextY - halfH < rect.y + rect.height);
    };
    if (canOccupy(this.player.x + dx, this.player.y)) this.player.x += dx;
    if (canOccupy(this.player.x, this.player.y + dy)) this.player.y += dy;
  }

  setupZoneEditor() {
    const file = 'public/data/scene01_manifest.json';
    const documents = { [file]: this.manifest };
    this.zoneEditor = new CollisionEditor(this, {
      documents,
      getCollisions: () => this.manifest.collision,
      getInteractions: () => this.manifest.interactions,
      getWorldSize: () => [48, 27],
      getPlayerRect: () => [this.player.x / PX - 12 / PX, this.player.y / PX - 20 / PX, 24 / PX, 40 / PX],
      getActorRects: () => [this.studentA, this.studentB, this.studentBExit]
        .filter(Boolean)
        .filter((actor) => actor.visible !== false)
        .map((actor) => [actor.x / PX - 12 / PX, actor.y / PX - 20 / PX, 24 / PX, 40 / PX]),
      replaceDocuments: (next) => {
        this.manifest = next[file];
        documents[file] = this.manifest;
      },
      onChange: () => this.buildCollision()
    });
  }

  updatePrompt() {
    const nearby = this.nearby();
    showPrompt(nearby ? `${nearby.prompt || nearby.id}  ·  E` : '');
  }

  nearby() {
    const px = this.player.x / PX; const py = this.player.y / PX;
    const targets = [...this.manifest.interactions];
    if (state.mode === 'explore') {
      targets.push({ id: 'NPC_CH00_STUDENT_A', prompt: '与同学甲交谈', rect: [33, 20, 2, 2], type: 'dialogue' });
      targets.push({ id: 'NPC_CH00_STUDENT_B', prompt: '与同学乙交谈', rect: [19.5, 17.5, 2, 2], type: 'dialogue' });
    }
    if (state.mode === 'leave_walk') {
      if (!state.npcDialogue.has('A') && this.leaveNpcArrived?.A) targets.push({ id: 'LEAVE_NPC_A', prompt: '与同学甲交谈', rect: [25, 24, 2, 2], type: 'dialogue' });
      if (state.npcDialogue.has('A') && !state.npcDialogue.has('B') && this.leaveNpcArrived?.B) targets.push({ id: 'LEAVE_NPC_B', prompt: '与同学乙交谈', rect: [21, 24, 2, 2], type: 'dialogue' });
    }
    return targets.find((target) => {
      if (target.id === 'EXIT_TRIGGER') return false;
      if (target.id === 'PRO_Q01_TRIGGER' && !state.monumentSeen) return false;
      const [x, y, width, height] = target.rect;
      return px >= x - 1 && px <= x + width + 1 && py >= y - 1 && py <= y + height + 1;
    });
  }

  interact() {
    if (state.playerLocked || !['explore', 'leave_walk'].includes(state.mode)) return;
    const target = this.nearby();
    if (!target) return;
    if (target.id === 'INT_FIELDWORK_MATERIAL') return this.showFieldwork();
    if (target.id === 'NPC_CH00_STUDENT_A') return this.openNpc('D1');
    if (target.id === 'NPC_CH00_STUDENT_B') return this.openNpc('D2');
    if (target.id === 'INT_MONUMENT') return this.startMonument();
    if (target.id === 'PRO_Q01_TRIGGER') return this.openChoices();
    if (target.id === 'LEAVE_NPC_A') return this.startLeaveNpcDialogue('A');
    if (target.id === 'LEAVE_NPC_B') return this.startLeaveNpcDialogue('B');
    return null;
  }

  showFieldwork() {
    state.fieldworkSeen = true;
    state.flags.add('FLAG_FIELDWORK_MATERIAL_SEEN');
    showItem({ icon: '/assets/items/notebook-open.png', title: '实践笔记', text: '散落的采访记录与待确认的名字。' });
  }

  openNpc(entryId) {
    state.mode = 'narrative';
    playNarrative(REQUIRED_NARRATIVE.filter((entry) => entry.entry_id === entryId), () => { state.mode = 'explore'; });
  }

  startMonument() {
    if (state.monumentSeen) return this.openChoices();
    state.mode = 'narrative';
    const sequence = REQUIRED_NARRATIVE.filter((entry) => ['N1','N2','N3','N4','N5','N6','D1','D2','N7','N8','N9','N10','N11','N12','M1','M2','M3','M4','M5','M6'].includes(entry.entry_id));
    playNarrative(sequence, () => {
      state.monumentSeen = true;
      state.flags.add('FLAG_INT_MONUMENT_COMPLETED');
      showTask(TASKS01.afterMonument);
      window.setTimeout(() => this.openChoices(), 500);
    });
  }

  openChoices() {
    state.mode = 'choice';
    state.playerLocked = true;
    showChoices(CHOICES, (id) => this.choose(id));
  }

  choose(id) {
    const choice = CHOICES.find((item) => item.id === id);
    if (!choice) return;
    state.choice = choice;
    for (const [axis, delta] of Object.entries(PROFILE_DELTAS[choice.id] ?? {})) state.profile[axis] += delta;
    state.flags.add(choice.flag);
    state.flags.add('FLAG_PRO_Q01_COMPLETED');
    hideChoices();
    showResult(choice);
    state.mode = 'result';
  }

  beginLeave() {
    hideResult();
    state.mode = 'leave_walk';
    state.leavePhase = 'walk';
    state.playerLocked = false;
    state.flags.add('FLAG_LEAVE_WALK_ENABLED');
    this.startLeaveWalk();
    showTask({ title: '走向南门', detail: '沿石板路向南门行走，与同学甲和同学乙汇合' });
  }

  startLeaveNpcDialogue(which) {
    const entryId = which === 'A' ? 'L1' : 'L2';
    state.mode = which === 'A' ? 'leave_npc_a' : 'leave_npc_b';
    state.leavePhase = state.mode;
    state.playerLocked = true;
    playNarrative(REQUIRED_NARRATIVE.filter((entry) => entry.entry_id === entryId), () => {
      state.npcDialogue.add(which);
      if (which === 'A') {
        state.mode = 'leave_walk';
        state.leavePhase = 'walk';
        state.playerLocked = false;
        showPrompt('与同学乙交谈 · E');
      } else {
        state.flags.add('FLAG_LEAVE_NPCS_COMPLETED');
        state.mode = 'leave_narrative';
        state.leavePhase = 'narrative';
        state.playerLocked = true;
        showTask({ title: '收好实践笔记', detail: '你将实践笔记放进包里' });
        playNarrative(LEAVE_NARRATIVE, () => this.finishLeave());
      }
    });
  }

  finishLeave() {
    state.mode = 'transition';
    state.leavePhase = 'blackout';
    state.playerLocked = true;
    state.taskOpen = false;
    hideTask();
    showPrompt('');
    hideItem();
    hideDialogue();
    fadeToBlack();
    this.game.events.emit('prologue:scene01-complete');
  }
}
