export type LetterMeta = { id: string; uc: string; lc: string; confusions?: string[] };

export const LETTERS: LetterMeta[] = Array.from({ length: 26 }, (_, i) => {
  const uc = String.fromCharCode(65 + i);
  const lc = String.fromCharCode(97 + i);
  return { id: lc, uc, lc };
});

// quick confusion map (expand later)
export const CONFUSIONS: Record<string, string[]> = {
  b: ['d', 'p'], d: ['b', 'q'], p: ['q', 'b'], q: ['p', 'd'],
  m: ['n'], n: ['m'], u: ['v'], v: ['u'], i: ['j'], j: ['i'],
  c: ['o', 'e'], o: ['c'], g: ['c'], s: ['z'], z: ['s'],
  O: ['Q'], Q: ['O'], C: ['G'], G: ['C'], I: ['J'], J: ['I'],
};
