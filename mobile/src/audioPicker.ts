import type { LocalAudioAsset } from './localAudio';

export async function pickLocalAudio(): Promise<LocalAudioAsset | null> {
  throw new Error('Audio-file selection for local recording is currently available in the browser studio.');
}
