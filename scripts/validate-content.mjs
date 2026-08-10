import { REQUIRED_NARRATIVE, CHOICES, LEAVE_NARRATIVE, validateNarrative } from '../src/content01.js';
import { OPENING, AUDIO_REVIEW, WRITE_QUESTION, FALL_ASLEEP, FLAVOR_SPOTS } from '../src/content02.js';
import { TRANSITION_A, TRANSITION_B } from '../src/transition-content.js';

const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exit(1);
  }
};

validateNarrative();
assert(REQUIRED_NARRATIVE.length === 24, 'scene01 narrative lock (24 entries)');
assert(LEAVE_NARRATIVE.length === 1, 'leave narrative lock');
assert(CHOICES.length === 4, 'choice lock');
assert(OPENING.length === 6, 'scene02 opening lock');
assert(AUDIO_REVIEW.length === 4, 'scene02 audio review lock');
assert(WRITE_QUESTION.length === 13, 'scene02 write question lock');
assert(FALL_ASLEEP.length === 6, 'scene02 fall asleep lock');
assert(FLAVOR_SPOTS.length === 6, 'scene02 flavor spots');
assert(TRANSITION_A.entries.length === 5, 'transition A entries');
assert(TRANSITION_B.entries.length === 21, 'transition B entries');

const styles = new Set(['narration', 'thought', 'dialogue', 'cue', 'date']);
const lists = [REQUIRED_NARRATIVE, LEAVE_NARRATIVE, OPENING, AUDIO_REVIEW, WRITE_QUESTION, FALL_ASLEEP, TRANSITION_A.entries, TRANSITION_B.entries];
for (const list of lists) {
  for (const entry of list) {
    assert(styles.has(entry.style), `style lock for ${entry.entry_id}`);
    if (entry.style === 'dialogue') assert(entry.speaker_name, `speaker lock for ${entry.entry_id}`);
  }
}

console.log('PASS prologue content lock: scene01 24+1 entries / 4 choices, scene02 6+4+13+6 entries / 6 flavors, transitions A5+B21');
