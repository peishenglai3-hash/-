import type { NarrativeEntry } from '@/common/state';

export const REQUIRED_NARRATIVE: NarrativeEntry[] = [
  { entry_id: 'N1', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '昼暑将消。', style: 'narration', cps: 14, pause_before_ms: 800, advance: 'manual' },
  { entry_id: 'N2', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '白天蛰伏在墓地的巨兽，此刻蠢蠢欲动。', style: 'narration', cps: 14, pause_before_ms: 400, advance: 'manual' },
  { entry_id: 'N3', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '黑夜将要降临在江汉平原。', style: 'narration', cps: 14, pause_before_ms: 500, advance: 'manual' },
  { entry_id: 'N4', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '夏天的野草长得有些太盛了。', style: 'narration', cps: 14, pause_before_ms: 300, advance: 'manual' },
  { entry_id: 'N5', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '人影浸没在热风和夕光里。', style: 'narration', cps: 14, pause_before_ms: 300, advance: 'manual' },
  { entry_id: 'N6', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '实践队的采访工作已经结束，同学们正将散落的设备一件件收回包里。', style: 'narration', cps: 14, pause_before_ms: 200, advance: 'manual' },
  { entry_id: 'D1', kind: 'dialogue', speaker_id: 'NPC_CH00_STUDENT_A', speaker_name: '同学甲', text: '录音文件都在，采访登记也对上了。', style: 'dialogue', avatar_id: 'student-a', cps: 22, pause_before_ms: 600, advance: 'manual' },
  { entry_id: 'D2', kind: 'dialogue', speaker_id: 'NPC_CH00_STUDENT_B', speaker_name: '同学乙', text: '天快黑了，差不多我们就回去吧。', style: 'dialogue', avatar_id: 'student-b', cps: 22, pause_before_ms: 400, advance: 'manual' },
  { entry_id: 'N7', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '你应了一声，却没有立刻合上手里的实践笔记。', style: 'thought', cps: 14, pause_before_ms: 1000, advance: 'manual' },
  { entry_id: 'N8', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '白天采访留下的内容并不完整。', style: 'narration', cps: 14, pause_before_ms: 400, advance: 'manual' },
  { entry_id: 'N9', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '姓名、地点和时间散落在不同人的叙述里。', style: 'narration', cps: 14, pause_before_ms: 300, advance: 'manual' },
  { entry_id: 'N10', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '有些话听得清楚。', style: 'narration', cps: 30, pause_before_ms: 200, advance: 'manual' },
  { entry_id: 'N11', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '有些话却在蝉鸣、停顿和方言里变得面目模糊。', style: 'narration', cps: 10, pause_before_ms: 500, advance: 'manual' },
  { entry_id: 'N12', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '整理到最后，最清晰的反而只是一个反复出现的名字。', style: 'narration', cps: 14, pause_before_ms: 700, advance: 'manual' },
  { entry_id: 'M1', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '纪念碑同样浸没在傍晚的天光里，像一枚琥珀。', style: 'thought', cps: 14, pause_before_ms: 700, advance: 'manual' },
  { entry_id: 'M2', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '天色渐暗，碑面上的笔迹好像被风吹乱。', style: 'thought', cps: 14, pause_before_ms: 400, advance: 'manual' },
  { entry_id: 'M3', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '你弯下身子，眯起眼来，细细辨认。', style: 'thought', cps: 14, pause_before_ms: 300, advance: 'manual' },
  { entry_id: 'M4', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '手指抚过一道道凹痕——', style: 'thought', cps: 14, pause_before_ms: 400, advance: 'manual' },
  { entry_id: 'M5', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '你认识这个名字。', style: 'thought', cps: 10, pause_before_ms: 3000, advance: 'manual' },
  { entry_id: 'M6', kind: 'thought', speaker_id: 'PLAYER', speaker_name: '你', text: '我还得再确认一件事。', style: 'thought', cps: 10, pause_before_ms: 1200, advance: 'manual' },
  { entry_id: 'L1', kind: 'dialogue', speaker_id: 'NPC_CH00_STUDENT_A', speaker_name: '同学甲', text: '都收好了。', style: 'dialogue', avatar_id: 'student-a', cps: 22, pause_before_ms: 0, advance: 'manual' },
  { entry_id: 'L2', kind: 'dialogue', speaker_id: 'NPC_CH00_STUDENT_B', speaker_name: '同学乙', text: '走吧，天色不早了，我们也该回去了。', style: 'dialogue', avatar_id: 'student-b', cps: 22, pause_before_ms: 0, advance: 'manual' },
  { entry_id: 'L3b', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '野草稀树尽头，淡蓝的天边一弯浅浅的月亮。你合上实践笔记，放进包里，打算先忘记一会儿那个名字。', style: 'narration', cps: 14, pause_before_ms: 0, advance: 'manual' },
  { entry_id: 'L4', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '人声渐远，纪念碑静静矗立在昏暗的天色里。风凉了，虫鸣密了，月亮升起来了。一切的一切都一如既往，曾经陌生的名字，如今经过了你的目光，经过了你手指的抚摸，从耳畔的回响到唇齿间的轻声呼唤，也许真的驻进了你的心魂。往事泛起微澜，尘封的记忆等待着下一次被开启。', style: 'narration', cps: 14, pause_before_ms: 0, advance: 'manual' }
];

export interface Choice {
  id: string;
  label: string;
  detail: string;
  image: string;
  flag: string;
  echo_summary: string;
  result: [string, string];
}

import { assetPath } from '@/common/paths';

export const CHOICES: Choice[] = [
  { id: 'PRO_Q01_A', label: '逐字核对碑面姓名与采访登记', detail: '核验文字与姓名，确保记录准确', image: assetPath('/assets/choices/a.png'), flag: 'FLAG_PRO_NAME_CHECKED', echo_summary: '我把碑上的名字，一个一个核对了。', result: ['就是他。', '现在，我站在纪念他的石碑前，念叨着他的名字，但好像仍然对他一无所知。'] },
  { id: 'PRO_Q01_B', label: '拍下纪念碑与周围环境', detail: '保存姓名所在的具体环境与现场关系', image: assetPath('/assets/choices/b.png'), flag: 'FLAG_PRO_PHOTO_TAKEN', echo_summary: '拍下纪念碑的时候，周围安静得能听见风。', result: ['刘绍南，刘绍南……', '十八岁的你，二十五岁的你，会是什么模样？'] },
  { id: 'PRO_Q01_C', label: '向同学确认采访中是否提到刘绍南', detail: '通过他人记录和团队材料补全信息', image: assetPath('/assets/choices/c.png'), flag: 'FLAG_PRO_TEAM_RECORD_FOUND', echo_summary: '同队的记录里有他的名字——找到了。', result: ['石碑上、登记表上，录音里、陌生人的记忆里，', '好像处处都有你，但好像处处又都没有你。'] },
  { id: 'PRO_Q01_D', label: '在实践笔记上写下"刘绍南"', detail: '主动留下问题，并继续追索这个名字', image: assetPath('/assets/choices/d.png'), flag: 'FLAG_PRO_NAME_WRITTEN', echo_summary: '那页纸还摊着，笔也还在。', result: ['我想继续写下去，', '我发现自己无话可说。'] }
];

export const PROFILE_DELTAS: Record<string, Record<string, number>> = {
  PRO_Q01_A: { C: 2, I: 1 },
  PRO_Q01_B: { C: 1, A: 2 },
  PRO_Q01_C: { I: 1, G: 2 },
  PRO_Q01_D: { D: 1, I: 2 }
};

export const TASKS01 = {
  intro: { title: '名字留在纸上', detail: '在纪念碑附近探索，确认笔记中的那个名字' },
  afterMonument: { title: '名字留在纸上', detail: '再确认一件事——查看纪念碑、笔记或采访设备' }
};

export const LEAVE_NARRATIVE: NarrativeEntry[] = [
  { entry_id: 'LEAVE_NARRATION', kind: 'narration', speaker_id: 'NARRATOR', speaker_name: '旁白', text: '纪念碑没有因实践队的离开而发生任何变化。风仍从树间穿过，虫鸣也比刚才更密了一些。只是那个原本陌生的名字，已经被带进笔记、照片或录音文件中，等待下一次被打开。', style: 'narration', cps: 14, pause_before_ms: 0, advance: 'manual' }
];

export const SCENE1_TO_SCENE2_EXIT = {
  sceneId: 'pro01_monument',
  nextScene: 'CH00_SC02_PRACTICE_BASE',
  transfer: {
    profile: 'accumulated',
    risk: { identity: 0, execution: 0, coordination: 0 },
    tags: 'selected_prologue_tag',
    materials: 'selected_material_state'
  },
  historicalOutcomeChanged: false
};

export const SCENE_EXIT = {
  sceneId: 'CH00_SC02_PRACTICE_BASE',
  nextScene: 'ch01_chenjinnan_home',
  nextSceneCanonical: 'CH01_SC01_CHEN_HOME_WAKE',
  transfer: {
    profile: 'accumulated',
    risk: { identity: 0, execution: 0, coordination: 0 },
    tags: 'selected_prologue_tag',
    materials: 'selected_material_state'
  },
  historicalOutcomeChanged: false
};

export function validateNarrative(): boolean {
  const required = ['N1','N2','N3','N4','N5','N6','D1','D2','N7','N8','N9','N10','N11','N12','M1','M2','M3','M4','M5','M6','L1','L2','L3b','L4'];
  const ids = REQUIRED_NARRATIVE.map((entry) => entry.entry_id);
  if (required.some((id) => !ids.includes(id))) throw new Error('Narrative content lock failed: missing entry');
  if (new Set(ids).size !== ids.length) throw new Error('Narrative content lock failed: duplicate entry_id');
  if (CHOICES.length !== 4 || CHOICES.map((choice) => choice.id).join(',') !== 'PRO_Q01_A,PRO_Q01_B,PRO_Q01_C,PRO_Q01_D') throw new Error('Choice order lock failed');
  return true;
}
