import AsyncStorage from '@react-native-async-storage/async-storage';

/* ============================================================
   🧠 Letter Progress — Core + Games + Metrics
============================================================ */
export type LetterProgress = {
  // Core learning
  recogStars: number;
  ucStars: number;
  lcStars: number;
  drawStars: number;

  // Optional training
  puzzleStars: number;
  confusionsStars: number;
  caseMatchStars: number;
  pictureStars: number;

  // Metrics
  confusionScore: number;
  confusionHistory?: { ts: number; score: number }[];

  // Mini-game stars
  monsterStars: number;
  heroStars: number;
  catchStars: number;

  // 🎯 Highest scores (persistent)
  monsterHighScore?: number;
  heroHighScore?: number;
  catchHighScore?: number;
  gardenHighScore?: number; // 🌼 Letter Garden high score

  // Unlock status
  gamesUnlocked: boolean;

  // Time tracking
  timeSpentMs?: number;
};

/* ============================================================
   🧩 Constants & Defaults
============================================================ */
export type StarField =
  | 'recogStars'
  | 'ucStars'
  | 'lcStars'
  | 'drawStars'
  | 'puzzleStars'
  | 'confusionsStars'
  | 'caseMatchStars'
  | 'pictureStars'
  | 'monsterStars'
  | 'heroStars'
  | 'catchStars';

const DEFAULT: LetterProgress = {
  recogStars: 0,
  ucStars: 0,
  lcStars: 0,
  drawStars: 0,

  puzzleStars: 0,
  confusionsStars: 0,
  caseMatchStars: 0,
  pictureStars: 0,

  confusionScore: 0,
  confusionHistory: [],

  monsterStars: 0,
  heroStars: 0,
  catchStars: 0,
  gardenHighScore: 0,
  monsterHighScore: 0,
  heroHighScore: 0,
  catchHighScore: 0,

  gamesUnlocked: false,
  timeSpentMs: 0,
};

const key = (id: string) => `progress:${id.toLowerCase()}`;

/* ============================================================
   🔁 Utility Helpers
============================================================ */
function withDefaults(raw: Partial<LetterProgress> | null): LetterProgress {
  const base = { ...DEFAULT, ...(raw ?? {}) };
  if (!Array.isArray(base.confusionHistory)) base.confusionHistory = [];
  for (const k of Object.keys(DEFAULT) as (keyof LetterProgress)[]) {
    const v = base[k];
    if (typeof (DEFAULT as any)[k] === 'number' && (typeof v !== 'number' || Number.isNaN(v))) {
      (base as any)[k] = (DEFAULT as any)[k];
    }
  }
  return base;
}

/* ============================================================
   📥 Core Persistence Functions
============================================================ */
export async function getLetterProgress(id: string): Promise<LetterProgress> {
  const raw = await AsyncStorage.getItem(key(id));
  if (!raw) return { ...DEFAULT };
  try {
    const parsed = JSON.parse(raw) as Partial<LetterProgress>;
    return withDefaults(parsed);
  } catch {
    return { ...DEFAULT };
  }
}
export async function saveGardenHighScore(id: string, score: number) {
  const cur = await getLetterProgress(id);
  const newScore = Math.max(cur.gardenHighScore ?? 0, Math.floor(score));
  if (newScore === cur.gardenHighScore) return cur;
  return setLetterProgress(id, { gardenHighScore: newScore });
}

export async function setLetterProgress(id: string, patch: Partial<LetterProgress>) {
  const cur = await getLetterProgress(id);
  const next: LetterProgress = withDefaults({ ...cur, ...patch });

  const ok =
    (next.recogStars ?? 0) >= 2 &&
    (next.ucStars ?? 0) >= 2 &&
    (next.lcStars ?? 0) >= 2 &&
    (next.confusionScore ?? 0) >= 80;

  next.gamesUnlocked = ok || next.gamesUnlocked;

  await AsyncStorage.setItem(key(id), JSON.stringify(next));
  return next;
}

/* ============================================================
   🌟 Stars + High Scores
============================================================ */
export async function awardStars(id: string, field: StarField, stars: number) {
  const cur = await getLetterProgress(id);
  const current = (cur as any)[field] ?? 0;
  const val = Math.max(0, Math.min(3, Math.floor(stars)));
  const nextVal = Math.max(current, val);
  if (nextVal === current) return cur;
  return setLetterProgress(id, { [field]: nextVal } as Partial<LetterProgress>);
}

/** 🏆 Save a game high score without decreasing it. */
export async function saveGameHighScore(
  id: string,
  game: 'monster' | 'hero' | 'catch',
  score: number
) {
  const cur = await getLetterProgress(id);
  const field =
    game === 'monster'
      ? 'monsterHighScore'
      : game === 'hero'
      ? 'heroHighScore'
      : 'catchHighScore';
  const current = (cur as any)[field] ?? 0;
  const newScore = Math.max(current, Math.floor(score));
  if (newScore === current) return cur;
  return setLetterProgress(id, { [field]: newScore } as Partial<LetterProgress>);
}

/* ============================================================
   📊 Confusion Scores + Metrics
============================================================ */
export async function setConfusionScore(
  id: string,
  score: number,
  opts?: { appendHistory?: boolean }
) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const cur = await getLetterProgress(id);
  const patch: Partial<LetterProgress> = { confusionScore: s };

  if (opts?.appendHistory ?? true) {
    const hist = (cur.confusionHistory ?? []).slice(-14);
    hist.push({ ts: Date.now(), score: s });
    patch.confusionHistory = hist;
  }

  return setLetterProgress(id, patch);
}

export async function addTimeSpent(id: string, deltaMs: number) {
  const cur = await getLetterProgress(id);
  const ms = Math.max(0, Math.floor(deltaMs || 0));
  return setLetterProgress(id, { timeSpentMs: (cur.timeSpentMs ?? 0) + ms });
}

/* ============================================================
   ⚙️ Utilities
============================================================ */
export async function resetProgress(id: string) {
  await AsyncStorage.setItem(key(id), JSON.stringify({ ...DEFAULT }));
  return getLetterProgress(id);
}

export async function getAllProgress(): Promise<{ id: string; data: LetterProgress }[]> {
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const out: { id: string; data: LetterProgress }[] = [];
  for (const L of ABC) {
    const id = L.toLowerCase();
    out.push({ id, data: await getLetterProgress(id) });
  }
  return out;
}

export async function clearAllProgress() {
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const L of ABC) {
    await AsyncStorage.removeItem(key(L));
  }
}

/** ⭐ Sum all stars across all letters (for total scoreboards). */
export async function getTotalStars(): Promise<number> {
  const all = await getAllProgress();
  let total = 0;
  for (const { data } of all) {
    total +=
      (data.recogStars ?? 0) +
      (data.ucStars ?? 0) +
      (data.lcStars ?? 0) +
      (data.drawStars ?? 0) +
      (data.puzzleStars ?? 0) +
      (data.confusionsStars ?? 0) +
      (data.caseMatchStars ?? 0) +
      (data.pictureStars ?? 0) +
      (data.monsterStars ?? 0) +
      (data.heroStars ?? 0) +
      (data.catchStars ?? 0);
  }
  return total;
}

/* ============================================================
   🔡 Confusion-Pair Tracking
============================================================ */
export type ConfPairProgress = {
  pair: string;
  correct: number;
  wrong: number;
  accuracy: number;
};

const pairKey = (pair: string) => `confpair:${pair}`;

export async function addConfusionPairResult(pair: string, correct: number, wrong: number) {
  const raw = await AsyncStorage.getItem(pairKey(pair));
  const prev = raw ? JSON.parse(raw) : { correct: 0, wrong: 0 };
  const totalCorrect = prev.correct + correct;
  const totalWrong = prev.wrong + wrong;
  const accuracy =
    totalCorrect + totalWrong === 0
      ? 0
      : Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100);
  const updated = { correct: totalCorrect, wrong: totalWrong, accuracy };
  await AsyncStorage.setItem(pairKey(pair), JSON.stringify(updated));
  return updated;
}

export async function getAllConfusionPairResults(): Promise<ConfPairProgress[]> {
  const keys = await AsyncStorage.getAllKeys();
  const pairs = keys.filter((k) => k.startsWith('confpair:'));
  const results: ConfPairProgress[] = [];
  for (const k of pairs) {
    const val = await AsyncStorage.getItem(k);
    if (val) results.push({ pair: k.replace('confpair:', ''), ...JSON.parse(val) });
  }
  return results;
}

export async function getWeakConfusionPairs(limit = 6): Promise<ConfPairProgress[]> {
  const all = await getAllConfusionPairResults();
  return all.sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
}
