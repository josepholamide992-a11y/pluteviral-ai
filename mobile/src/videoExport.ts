import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { normalizedServerUrl } from './content';

/** Download a protected MP4 to this device and offer the OS share sheet. */
export async function exportVideo(origin: string, remoteUrl: string, apiKey: string, projectId: string): Promise<void> {
  const host = normalizedServerUrl(origin);
  const url = new URL(remoteUrl, host);
  if (url.protocol !== 'https:' || url.origin !== new URL(host).origin) {
    throw new Error('Video must be served by your connected HTTPS engine.');
  }
  const safeId = projectId.replace(/[^a-z0-9-]/gi, '');
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!dir) throw new Error('Video cache is unavailable on this device.');
  const dest = dir + 'pluteviral-' + safeId + '.mp4';
  const result = await FileSystem.downloadAsync(url.toString(), dest, { headers: { 'x-api-key': apiKey } });
  if (result.status !== 200) throw new Error('MP4 download failed (HTTP ' + result.status + ').');
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  await Sharing.shareAsync(result.uri, { mimeType: 'video/mp4', dialogTitle: 'PluteViral AI video' });
}
