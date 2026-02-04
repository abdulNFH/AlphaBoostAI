// constants/introWords.ts
export type IntroWord = { word: string; emoji: string };

export const INTRO_WORDS: Record<string, IntroWord> = {
  A: { word: 'Apple', emoji: '🍎' },
  B: { word: 'Ball', emoji: '⚽' },
  C: { word: 'Cat', emoji: '🐱' },
  D: { word: 'Dog', emoji: '🐶' },
  E: { word: 'Egg', emoji: '🥚' },
  F: { word: 'Fish', emoji: '🐟' },
  G: { word: 'Grapes', emoji: '🍇' },
  H: { word: 'Hat', emoji: '🎩' },
  I: { word: 'Ice Cream', emoji: '🍦' },
  J: { word: 'Juice', emoji: '🧃' },
  K: { word: 'Kite', emoji: '🪁' },
  L: { word: 'Lion', emoji: '🦁' },
  M: { word: 'Monkey', emoji: '🐵' },
  N: { word: 'Nest', emoji: '🪹' },
  O: { word: 'Orange', emoji: '🍊' },
  P: { word: 'Pineapple', emoji: '🍍' },
  Q: { word: 'Queen', emoji: '👸' },
  R: { word: 'Rabbit', emoji: '🐰' },
  S: { word: 'Sun', emoji: '☀️' },
  T: { word: 'Tree', emoji: '🌳' },
  U: { word: 'Umbrella', emoji: '☂️' },
  V: { word: 'Violin', emoji: '🎻' },
  W: { word: 'Whale', emoji: '🐳' },
  X: { word: 'Xylophone', emoji: '🎼' },
  Y: { word: 'Yo-yo', emoji: '🪀' },
  Z: { word: 'Zebra', emoji: '🦓' },
};

export function getIntro(uc: string): IntroWord {
  return INTRO_WORDS[uc] ?? { word: 'Apple', emoji: '🍎' };
}
