import type { Draft } from './content';
import { buildStoryboard, storyboardDurationMs, type StoryScene } from './storyboard';
import { type LocalAudioAsset, validateAudioAsset } from './localAudio';

export type LocalVideoResult = {
  blob: Blob;
  filename: string;
  format: 'mp4' | 'webm';
  durationSeconds: number;
};

const W = 540;
const H = 960;
const FPS = 24;

function supportedMimeType(hasAudio: boolean): string {
  if (typeof MediaRecorder === 'undefined') throw new Error('Your browser does not support video recording.');
  const choices = hasAudio ? [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/webm;codecs="vp8,opus"',
    'video/webm;codecs="vp9,opus"',
    'video/mp4',
    'video/webm',
  ] : [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const found = choices.find(type => MediaRecorder.isTypeSupported(type));
  if (!found) throw new Error('Your browser cannot export MP4 or WebM. Try the latest Safari, Chrome or Edge.');
  return found;
}
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const result: string[] = [];
  let row = '';
  for (const word of text.split(/\s+/u)) {
    const candidate = row ? row + ' ' + word : word;
    if (row && ctx.measureText(candidate).width > maxWidth) {
      result.push(row);
      row = word;
    } else {
      row = candidate;
    }
  }
  if (row) result.push(row);
  return result;
}
function draw(
  ctx: CanvasRenderingContext2D,
  scene: StoryScene,
  index: number,
  sceneCount: number,
  elapsed: number,
  totalProgress: number,
): void {
  const time = elapsed / 1000;
  const palettes: [string, string, string][] = [
    ['#0A132B', '#0F4754', '#B9F769'],
    ['#161128', '#4E2356', '#FFE49D'],
    ['#0A1E2C', '#155D4E', '#B9F769'],
  ];
  const [a, b, accent] = palettes[index % palettes.length];
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, a);
  gradient.addColorStop(1, b);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W - 55 + Math.sin(time * 0.5) * 45, 230 + Math.cos(time * 0.7) * 45);
  ctx.rotate(time * 0.08);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fillRect(-235, -200, 470, 400);
  ctx.restore();

  ctx.fillStyle = accent;
  ctx.fillRect(37, 50, 9, 9);
  ctx.fillStyle = '#F2F6FF';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('PLUTEVIRAL  AI', 58, 62);
  ctx.fillStyle = '#B9CBDB';
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText(scene.heading, 40, 282);

  let size = scene.kind === 'intro' ? 49 : 43;
  let lines: string[] = [];
  do {
    ctx.font = '800 ' + size + 'px system-ui, sans-serif';
    lines = wrapLines(ctx, scene.text, 446);
    if (lines.length <= 9) break;
    size -= 2;
  } while (size > 23);

  const lineHeight = size * 1.34;
  const blockHeight = lines.length * lineHeight;
  let y = Math.max(335, 505 - blockHeight / 2);
  ctx.fillStyle = '#F6F9FF';
  ctx.textBaseline = 'top';
  for (const line of lines.slice(0, 12)) {
    ctx.fillText(line, 40, y, 455);
    y += lineHeight;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.66)';
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText('MADE WITH PLUTEVIRAL · PRIVATE CREATOR BETA', 40, 860);
  ctx.fillStyle = 'rgba(255,255,255,0.17)';
  ctx.fillRect(40, 893, W - 80, 6);
  ctx.fillStyle = accent;
  ctx.fillRect(40, 893, (W - 80) * Math.min(1, Math.max(0, totalProgress)), 6);
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.font = '500 15px system-ui, sans-serif';
  ctx.fillText('SCENE ' + String(index + 1).padStart(2, '0') + ' / ' + String(sceneCount).padStart(2, '0'), 40, 925);
}

export async function createLocalVideo(
  draft: Draft,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
  audio?: LocalAudioAsset,
): Promise<LocalVideoResult> {
  const scenes = buildStoryboard(draft);
  if (audio) validateAudioAsset(audio);
  if (signal?.aborted) throw new Error('Video creation cancelled.');

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') {
    throw new Error('Your browser cannot record a canvas. Use the latest Safari, Chrome or Edge.');
  }

  let audioContext: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  let videoStream: MediaStream | null = null;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let frameId = 0;
  let finalized = false;
  let cancelled = false;
  let start = 0;
  let lastReported = -1;
  const duration = storyboardDurationMs(scenes);
  const mime = supportedMimeType(Boolean(audio));

  function finish(abort = false) {
    if (finalized) return;
    finalized = true;
    cancelled = abort;
    cancelAnimationFrame(frameId);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }
  function onAbort() { finish(true); }
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    // Web Audio is used instead of HTMLMediaElement.captureStream(): that latter
    // API is not available on iOS Safari. The supplied audio never leaves the browser.
    let destination: MediaStreamAudioDestinationNode | null = null;
    if (audio) {
      audioContext = new AudioContext();
      await audioContext.resume();
      const bytes = await audio.blob.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(bytes).catch(() => {
        throw new Error('This audio format cannot be decoded on your device. Try MP3, M4A or WAV.');
      });
      if (signal?.aborted) throw new Error('Video creation cancelled.');
      if (!decoded.duration || !Number.isFinite(decoded.duration)) throw new Error('The selected audio is invalid.');
      audioSource = audioContext.createBufferSource();
      audioSource.buffer = decoded;
      audioSource.loop = true;
      const gain = audioContext.createGain();
      gain.gain.value = 0.8;
      destination = audioContext.createMediaStreamDestination();
      audioSource.connect(gain);
      gain.connect(destination);
    }

    videoStream = canvas.captureStream(FPS);
    stream = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...(destination ? destination.stream.getAudioTracks() : []),
    ]);
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2_800_000,
      ...(audio ? { audioBitsPerSecond: 128_000 } : {}),
    });
    const chunks: BlobPart[] = [];
    const recording = new Promise<Blob>((resolve, reject) => {
      if (!recorder) return reject(new Error('Video recorder unavailable.'));
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error('Browser video encoding failed.'));
      recorder.onstop = () => {
        if (cancelled || signal?.aborted) return reject(new Error('Video creation cancelled.'));
        const blob = new Blob(chunks, { type: recorder?.mimeType || mime });
        if (!blob.size) return reject(new Error('The browser produced an empty video.'));
        resolve(blob);
      };
    });

    draw(ctx, scenes[0], 0, scenes.length, 0, 0);
    recorder.start(500);
    audioSource?.start(0);
    start = performance.now();
    const tick = (now: number) => {
      if (finalized) return;
      if (signal?.aborted) { finish(true); return; }
      const elapsed = Math.max(0, now - start);
      let elapsedInScene = elapsed;
      let index = 0;
      while (index < scenes.length - 1 && elapsedInScene >= scenes[index].durationMs) {
        elapsedInScene -= scenes[index].durationMs;
        index++;
      }
      draw(ctx, scenes[index], index, scenes.length, elapsedInScene, elapsed / duration);
      const percent = Math.min(99, Math.floor((elapsed / duration) * 100));
      if (percent !== lastReported) {
        lastReported = percent;
        onProgress(percent);
      }
      if (elapsed >= duration) finish();
      else frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    const blob = await recording;
    onProgress(100);
    const format = blob.type.startsWith('video/mp4') ? 'mp4' : 'webm';
    return {
      blob, format,
      filename: 'pluteviral-' + draft.id.replace(/[^a-z0-9-]/gi, '') + '.' + format,
      durationSeconds: Math.round(duration / 100) / 10,
    };
  } catch (error) {
    finish(true);
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    try { audioSource?.stop(); } catch { /* Source may not have started. */ }
    stream?.getTracks().forEach(track => track.stop());
    videoStream?.getTracks().forEach(track => track.stop());
    if (audioContext) await audioContext.close().catch(() => undefined);
  }
}

export function downloadLocalVideo(result: LocalVideoResult): void {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
