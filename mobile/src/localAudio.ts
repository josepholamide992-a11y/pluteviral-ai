export type LocalAudioAsset = {
  name: string;
  size: number;
  type: string;
  blob: Blob;
};

export function validateAudioAsset(asset: Pick<LocalAudioAsset, 'name' | 'size' | 'type'>): void {
  const safeExtension = /\.(mp3|m4a|wav|aac|ogg|mp4|flac)$/i.test(asset.name);
  if (!asset.name || !(asset.type.startsWith('audio/') || safeExtension)) {
    throw new Error('Choose an audio file such as MP3, M4A or WAV.');
  }
  if (!Number.isFinite(asset.size) || asset.size <= 0) {
    throw new Error('The chosen audio file is empty or invalid.');
  }
  if (asset.size > 25 * 1024 * 1024) {
    throw new Error('Choose an audio file smaller than 25 MB.');
  }
}
