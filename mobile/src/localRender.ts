import type { Draft } from './content';
export type LocalVideoResult = {
  blob: Blob;
  filename: string;
  format: 'mp4' | 'webm';
  durationSeconds: number;
};
export async function createLocalVideo(
  _draft: Draft, _onProgress: (progress: number) => void, _signal?: AbortSignal,
): Promise<LocalVideoResult> {
  throw new Error('Local video export currently works in the browser preview. Native iOS/Android export requires a connected video engine.');
}
export function downloadLocalVideo(_result: LocalVideoResult): void {
  throw new Error('Local download is not available in this native build.');
}
