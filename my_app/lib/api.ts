// my-app/lib/api.ts
import * as FileSystem from 'expo-file-system';
import type { PredictResponse } from '../types/prediction';

// ✅ Use your laptop's Wi-Fi IP (from ipconfig)
export const API_BASE = 'http://10.68.38.22:8000';
export const API_URL  = `${API_BASE}/predict`;

export async function predictUri(uri: string): Promise<PredictResponse> {
  const result = await FileSystem.uploadAsync(API_URL, uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',     // must match FastAPI param name
    mimeType: 'image/jpeg'
  });

  if (result.status !== 200) {
    throw new Error(`Predict failed (${result.status}) ${result.body ?? ''}`);
  }
  return JSON.parse(result.body) as PredictResponse;
}
