import { normalizedServerUrl, type Draft } from './content';
export type TaskStatus = {
  task_id: string; state: number; progress?: number;
  videos?: string[]; combined_videos?: string[];
  error?: string; failed_stage?: string;
};
async function request<T>(origin: string, apiKey: string, path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
  const base = normalizedServerUrl(origin);
  if (!apiKey.trim()) throw new Error('A server API key is required.');
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
  const result = await request<{ title: string; caption: string; hashtags: string[] }>(
    origin, apiKey, '/api/v1/social-metadata', 'POST', {
      video_subject: draft.topic, video_script: draft.script,
      platform: draft.platform === 'YouTube Shorts' ? 'youtube' : draft.platform === 'TikTok' ? 'tiktok' : 'instagram',
      language: 'en',
    });
  if (!result || typeof result.caption !== 'string' || !Array.isArray(result.hashtags)
      || !result.hashtags.every(tag => typeof tag === 'string')) {
    throw new Error('The server returned invalid caption metadata.');
  }
  return result;
}
export async function checkServer(origin: string, apiKey: string) {
  const result = await request<{ tasks: TaskStatus[]; total: number }>(
    origin, apiKey, '/api/v1/tasks?page_size=1', 'GET',
  );
  if (!Array.isArray(result.tasks)) throw new Error('Unexpected server response.');
  return { ok: true, total: result.total };
}

export async function startVideoJob(origin: string, apiKey: string, body: object) {
  const result = await request<{ task_id: string }>(origin, apiKey, '/api/v1/videos', 'POST', body);
  if (!result || !/^[a-z0-9-]{8,80}$/i.test(result.task_id || '')) {
    throw new Error('The server returned an invalid video task ID.');
  }
  return result;
}
export async function readVideoJob(origin: string, apiKey: string, taskId: string) {
  if (!/^[a-z0-9-]{8,80}$/i.test(taskId)) throw new Error('Invalid task ID.');
  const result = await request<TaskStatus>(origin, apiKey, '/api/v1/tasks/' + taskId, 'GET');
  if (!result || typeof result.state !== 'number' || result.task_id !== taskId) {
    throw new Error('The server returned an invalid task status.');
  }
  return result;
}
