import { normalizedServerUrl } from './content';

/** Authenticated same-origin MP4 download; API keys are never stored in a URL. */
export async function exportVideo(origin: string, remoteUrl: string, apiKey: string, projectId: string): Promise<void> {
  const host = normalizedServerUrl(origin);
  const url = new URL(remoteUrl, host);
  if (url.protocol !== 'https:' || url.origin !== new URL(host).origin) {
    throw new Error('Video must be served by your connected HTTPS engine.');
  }
  const response = await fetch(url.toString(), { headers: { 'x-api-key': apiKey } });
  if (!response.ok) throw new Error('MP4 download failed (HTTP ' + response.status + ').');
  const type = response.headers.get('content-type') || '';
  if (!type.includes('video/') && !type.includes('application/octet-stream')) {
    throw new Error('The server did not return a video file.');
  }
  const blob = await response.blob();
  if (blob.size === 0) throw new Error('The server returned an empty video.');
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'pluteviral-' + projectId.replace(/[^a-z0-9-]/gi, '') + '.mp4';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  }
}
