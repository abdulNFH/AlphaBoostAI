// lib/arcade.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'arcade_progress_v1';

export type ArcadeProgress = {
  // Monster Feeding
  monsterHigh: number;
  monsterStars: number;

  // Letter Hero (NEW)
  heroHigh: number;
  heroStars: number;

  // Future games (stubs so TS is ready)
  catchHigh: number;
  catchStars: number;

  puzzleHigh: number;
  puzzleStars: number;

  gardenHigh: number;
  gardenStars: number;

  safariHigh: number;
  safariStars: number;

  // Bonus
  stickers: number; // total collected/unlocked
};

const DEFAULT: ArcadeProgress = {
  monsterHigh: 0,
  monsterStars: 0,

  heroHigh: 0,
  heroStars: 0,

  catchHigh: 0,
  catchStars: 0,

  puzzleHigh: 0,
  puzzleStars: 0,

  gardenHigh: 0,
  gardenStars: 0,

  safariHigh: 0,
  safariStars: 0,

  stickers: 0,
};

export async function getArcade(): Promise<ArcadeProgress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

export async function setArcade(update: Partial<ArcadeProgress>): Promise<void> {
  const cur = await getArcade();
  const next = { ...cur, ...update };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/**
 * Ensure we only *increase* the recorded high score for a given game.
 * e.g., await setHigh('heroHigh', newScore)
 */
export async function setHigh<K extends keyof ArcadeProgress>(key: K, value: number) {
  const cur = await getArcade();
  const current = (cur[key] as unknown) as number;
  const next = Math.max(current || 0, value);
  await setArcade({ [key]: next } as Partial<ArcadeProgress>);
}

/**
 * Award stars for a game, never decreasing previous best.
 * Use with one of the *...Stars keys*, e.g. 'monsterStars', 'heroStars'.
 */
export async function awardArcadeStars<K extends keyof ArcadeProgress>(key: K, stars: number) {
  const cur = await getArcade();
  const current = (cur[key] as unknown) as number;
  const next = Math.max(current || 0, stars);
  await setArcade({ [key]: next } as Partial<ArcadeProgress>);
}
