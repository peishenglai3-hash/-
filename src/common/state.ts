export interface SaveData {
  checkpoint: string;
  checkpointLabel: string;
  profile: Record<string, number>;
  choice: string | null;
  choiceTag: string | null;
  echo: string | null;
  tags: string[];
  fixed: string[];
  risk: { identity: number; execution: number; coordination: number };
  exit: { nextSceneCanonical: string };
}

export interface NarrativeEntry {
  entry_id: string;
  kind: string;
  speaker_id?: string;
  speaker_name?: string;
  text: string;
  style: string;
  cps?: number;
  advance?: string;
  pause_before_ms?: number;
  avatar_id?: string;
  sfx?: string;
}

export interface GameState {
  mode: string;
  flags: Set<string>;
  profile: Record<string, number>;
  choice: { id: string; flag: string; echo_summary: string } | null;
  propStates: Record<string, string>;
  playerLocked: boolean;
  audioReviewed: boolean;
  questionWritten: boolean;
  sleepStarted: boolean;
  taskOpen: boolean;
  taskPreviousLock: boolean;
  paused: boolean;
  inNarrative: boolean;
  narrativeQueue: NarrativeEntry[];
  narrativeIndex: number;
  typing: boolean;
  typingTimer: number | null;
  onNarrativeComplete: (() => void) | null;
  monumentSeen: boolean;
  fieldworkSeen: boolean;
  npcDialogue: Set<string>;
  leavePhase: string | null;
  leaveNpcArrived: boolean | null;
}

export const state: GameState = {
  mode: 'intro',
  flags: new Set(),
  profile: { D: 0, C: 0, I: 0, G: 0, P: 0, A: 0 },
  choice: null,
  propStates: { notebook: 'default', phone: 'default', recorder: 'default' },
  playerLocked: true,
  audioReviewed: false,
  questionWritten: false,
  sleepStarted: false,
  taskOpen: false,
  taskPreviousLock: false,
  paused: false,
  inNarrative: false,
  narrativeQueue: [],
  narrativeIndex: 0,
  typing: false,
  typingTimer: null,
  onNarrativeComplete: null,
  monumentSeen: false,
  fieldworkSeen: false,
  npcDialogue: new Set(),
  leavePhase: null,
  leaveNpcArrived: null
};
