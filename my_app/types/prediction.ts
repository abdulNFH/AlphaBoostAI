export type Top1 = { label: string; prob: number };
export type PredictResponse = { top1: Top1; top3: Top1[] };
