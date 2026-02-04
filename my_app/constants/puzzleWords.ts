// constants/puzzleWords.ts
export type PuzzleItem = {
  word: string;        // full word
  missingIndex: number; // which character is blanked (0-based)
  // optional override to force uppercase/lowercase at the blank
  forceCase?: 'uc' | 'lc';
};

export const PUZZLES: PuzzleItem[] = [
  { word: 'CAT', missingIndex: 1, forceCase: 'uc' },     // C _ T
  { word: 'ball', missingIndex: 0, forceCase: 'lc' },    // _ all
  { word: 'dOg',  missingIndex: 1 },                     // d _ g (keeps original casing)
  { word: 'sun',  missingIndex: 2, forceCase: 'lc' },    // su _
  { word: 'Bus',  missingIndex: 0, forceCase: 'uc' },    // _ us
  { word: 'zoo',  missingIndex: 0, forceCase: 'lc' },    // _ oo
  { word: 'Egg',  missingIndex: 0, forceCase: 'uc' },    // _ gg
  { word: 'kite', missingIndex: 2, forceCase: 'lc' },    // ki _ e
];
