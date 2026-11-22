import { type LocalAudioAsset, validateAudioAsset } from './localAudio';

export async function pickLocalAudio(): Promise<LocalAudioAsset | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.m4a,.wav,.aac,.ogg';
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    function finish(result: LocalAudioAsset | null, error?: Error) {
      if (settled) return;
      settled = true;
      input.remove();
      if (error) reject(error);
      else resolve(result);
    }
    input.addEventListener('change', () => {
      const file = input.files?.item(0);
      if (!file) { finish(null); return; }
      try {
        validateAudioAsset(file);
        finish({ name: file.name, size: file.size, type: file.type, blob: file });
      } catch (error) {
        finish(null, error as Error);
      }
    }, { once: true });
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.click();
  });
}
