import { normalizedServerUrl, type Draft } from './content';
export type TaskStatus = {
  task_id: string; state: number; progress?: number;
  videos?: string[]; combined_videos?: string[];
  error?: string; failed_stage?: string;
};
async function request<T>(origin: string, apiKey: string, path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
  const base = normalizedServerUrl(origin);
  const response = await fetch(base + path, {
    method,
    headers: { Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.status !== 200) {
    throw new Error(String(payload?.message || 'Server request failed (' + response.status + ')'));
  }
  return payload.data as T;
}
export async function generateAiScript(origin: string, apiKey: string, topic: string) {
  const result = await request<{ video_script: string }>(origin, apiKey, '/api/v1/scripts', 'POST', {
    video_subject: topic, video_language: 'en', paragraph_number: 3,
  });
  if (!result.video_script?.trim()) throw new Error('The server returned an empty script.');
  return result.video_script;
}
export async function generateMetadata(origin: string, apiKey: string, draft: Draft) {
  return request<{ title: string; caption: string; hashtags: string[] }>(
    origin, apiKey, '/api/v1/social-metadata', 'POST', {
      video_subject: draft.topic, video_script: draft.script,
      platform: draft.platform === 'YouTube Shorts' ? 'youtube' : draft.platform === 'TikTok' ? 'tiktok' : 'instagram',
      language: 'en',
    });
}
export async function startVideoJob(origin: string, apiKey: string, body: object) {
  return request<{ task_id: string }>(origin, apiKey, '/api/v1/videos', 'POST', body);
}
export async function readVideoJob(origin: string, apiKey: string, taskId: string) {
  if (!/^[a-z0-9-]{8,80}$/i.test(taskId)) throw new Error('Invalid task ID.');
  return request<TaskStatus>(origin, apiKey, '/api/v1/tasks/' + taskId, 'GET');
}
