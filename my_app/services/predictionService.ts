// services/predictionService.ts
import type { PredictResponse } from '../types/prediction';
import { predictUri } from '../lib/api';

// Set true only if you want to bypass the backend for testing
const USE_MOCK = false;

export async function predictFromUri(uri: string): Promise<PredictResponse> {
  if (USE_MOCK) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const pick = letters[Math.floor(Math.random() * letters.length)];
    return {
      top1: { label: pick, prob: 0.9 },
      top3: [
        { label: pick, prob: 0.9 },
        { label: "b", prob: 0.05 },
        { label: "d", prob: 0.03 },
      ],
    };
  }

  try {
    // 🔗 Real API call
    return await predictUri(uri);
  } catch (e: any) {
    const msg = String(e?.message ?? e);

    // Retry once for transient network hiccups
    if (msg.includes("Network request failed")) {
      await new Promise((r) => setTimeout(r, 200)); // brief pause
      return await predictUri(uri);
    }

    // Rethrow for other errors (e.g., 413, 422, 500)
    throw e;
  }
}
