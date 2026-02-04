// lib/report.ts
import { getAllProgress, type LetterProgress } from './progress';

// A–Z helper
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const idOf = (uc: string) => uc.toLowerCase();

export type PerLetterCard = {
  id: string;             // 'a'..'z'
  uc: number;             // ucStars
  lc: number;             // lcStars
  recog: number;          // recogStars
  draw: number;           // drawStars
  unlocked: boolean;      // gamesUnlocked
  confusionScore: number; // 0–100
  timeSpentMs: number;    // accumulated time
  games?: { monster?: number; hero?: number; catch?: number };
};

export type OverallSummary = {
  totalCompleted: number; // letters passing unlock rule
  avg: {
    recog: number;
    uc: number;
    lc: number;
    draw: number;
    // optional common training (0 if unused)
    puzzle: number;
    confusions: number;
    caseMatch: number;
    picture: number;
  };
  starsDist: {
    recog: number;
    uc: number;
    lc: number;
    draw: number;
  };
  games: {
    monsterAvg: number;
    heroAvg: number;
    catchAvg: number;
  };
  timeSpentMin: number;   // total minutes (rounded)
};

export type Highlights = {
  top3Strong: string[];   // letters where uc+lc+recog are all 3⭐
  needAttention: string[];// letters with any core < 2⭐ OR confusionScore < 60
};

export type ConfusionTrendPoint = { label: string; value: number };
export type ReportData = {
  summary: OverallSummary;
  perLetter: PerLetterCard[];
  highlights: Highlights;
  confusionTrend: ConfusionTrendPoint[]; // either real history or synthetic buckets
};

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}
const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

// Unlock rule (same as in progress.ts)
function unlocked(p: LetterProgress) {
  return (p.recogStars ?? 0) >= 2
      && (p.ucStars ?? 0) >= 2
      && (p.lcStars ?? 0) >= 2
      && (p.confusionScore ?? 0) >= 80;
}

// Build line points from real confusion history when present
function computeTrendFromHistory(all: { id: string; data: LetterProgress }[]): ConfusionTrendPoint[] {
  // Collect up to last 10 timestamps across letters; average by index from the end
  const series: number[][] = [];
  for (const { data } of all) {
    const hist = (data.confusionHistory ?? []).slice(-10).map(h => h.score);
    if (hist.length) series.push(hist);
  }
  if (!series.length) return [];

  // Right-align by padding on the left with first value
  const maxLen = Math.max(...series.map(s => s.length));
  const aligned = series.map(s => {
    const pad = Array(maxLen - s.length).fill(s[0] ?? 0);
    return [...pad, ...s];
  });

  const points: ConfusionTrendPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    const v = avg(aligned.map(s => s[i]));
    points.push({ label: `T${i + 1}`, value: Math.round(v) });
  }
  return points;
}

// Fallback synthetic trend using current confusion scores
function computeSyntheticTrend(perLetter: PerLetterCard[]): ConfusionTrendPoint[] {
  if (!perLetter.length) return [];
  const sorted = [...perLetter].sort((a, b) => a.confusionScore - b.confusionScore);
  const n = sorted.length;
  const buckets = [
    sorted.slice(0, Math.ceil(n * 0.2)),
    sorted.slice(Math.ceil(n * 0.2), Math.ceil(n * 0.4)),
    sorted.slice(Math.ceil(n * 0.4), Math.ceil(n * 0.6)),
    sorted.slice(Math.ceil(n * 0.6), Math.ceil(n * 0.8)),
    sorted.slice(Math.ceil(n * 0.8)),
  ];
  return buckets.map((b, i) => ({
    label: `T${i + 1}`,
    value: Math.round(avg(b.map(x => x.confusionScore))),
  }));
}

export async function buildReport(): Promise<ReportData> {
  const all = await getAllProgress();

  const perLetter: PerLetterCard[] = all.map(({ id, data }) => ({
    id,
    uc: data.ucStars ?? 0,
    lc: data.lcStars ?? 0,
    recog: data.recogStars ?? 0,
    draw: data.drawStars ?? 0,
    unlocked: unlocked(data) || !!data.gamesUnlocked,
    confusionScore: data.confusionScore ?? 0,
    timeSpentMs: data.timeSpentMs ?? 0,
    games: {
      monster: data.monsterStars ?? 0,
      hero: data.heroStars ?? 0,
      catch: data.catchStars ?? 0,
    },
  }));

  const summary: OverallSummary = {
    totalCompleted: perLetter.filter(({ id }) => {
      const p = all.find(x => x.id === id)!.data;
      return unlocked(p);
    }).length,
    avg: {
      recog: avg(perLetter.map(x => x.recog)),
      uc: avg(perLetter.map(x => x.uc)),
      lc: avg(perLetter.map(x => x.lc)),
      draw: avg(perLetter.map(x => x.draw)),
      puzzle: avg(all.map(x => x.data.puzzleStars ?? 0)),
      confusions: avg(all.map(x => x.data.confusionsStars ?? 0)),
      caseMatch: avg(all.map(x => x.data.caseMatchStars ?? 0)),
      picture: avg(all.map(x => x.data.pictureStars ?? 0)),
    },
    starsDist: {
      recog: sum(perLetter.map(x => x.recog)),
      uc: sum(perLetter.map(x => x.uc)),
      lc: sum(perLetter.map(x => x.lc)),
      draw: sum(perLetter.map(x => x.draw)),
    },
    games: {
      monsterAvg: avg(perLetter.map(x => x.games?.monster ?? 0)),
      heroAvg: avg(perLetter.map(x => x.games?.hero ?? 0)),
      catchAvg: avg(perLetter.map(x => x.games?.catch ?? 0)),
    },
    timeSpentMin: Math.round(sum(perLetter.map(x => x.timeSpentMs)) / 60000),
  };

  const top3Strong = perLetter
    .filter(x => x.uc === 3 && x.lc === 3 && x.recog === 3)
    .sort((a, b) => b.confusionScore - a.confusionScore)
    .slice(0, 3)
    .map(x => x.id.toUpperCase());

  const needAttention = perLetter
    .filter(x => (x.uc < 2 || x.lc < 2 || x.recog < 2) || x.confusionScore < 60)
    .sort((a, b) => a.confusionScore - b.confusionScore)
    .slice(0, 3)
    .map(x => x.id.toUpperCase());

  const highlights: Highlights = { top3Strong, needAttention };

  // Prefer real history if present; otherwise create a small synthetic trend
  const hasAnyHistory = all.some(x => (x.data.confusionHistory ?? []).length > 1);
  const confusionTrend = hasAnyHistory
    ? computeTrendFromHistory(all)
    : computeSyntheticTrend(perLetter);

  return { summary, perLetter, highlights, confusionTrend };
}
