export type Platform = 'TikTok' | 'YouTube Shorts' | 'Instagram Reels';
export type Niche = 'Storytelling' | 'Business' | 'Education' | 'Music';
export type Draft = {
  id: string; topic: string; platform: Platform; niche: Niche;
  script: string; caption: string; hashtags: string; createdAt: number;
  taskId?: string; status?: string; progress?: number; videoUrl?: string;
};
const hooks: Record<Niche, (subject: string) => string> = {
  Storytelling: (subject) => 'What happened next changed everything. Here is the story of ' + subject + '.',
  Business: (subject) => 'Most businesses overlook this about ' + subject + '. Here is what matters.',
  Education: (subject) => 'Here is the simplest way to understand ' + subject + ' in under a minute.',
  Music: (subject) => 'There is a story behind ' + subject + ' that deserves to be heard.',
};
export function isSavedDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return typeof d.id === 'string' && d.id.length > 0 && d.id.length < 100
    && typeof d.topic === 'string' && d.topic.length <= 500
    && typeof d.script === 'string' && d.script.length <= 100_000
    && typeof d.caption === 'string' && d.caption.length <= 20_000
    && typeof d.hashtags === 'string' && d.hashtags.length <= 5_000
    && typeof d.createdAt === 'number' && Number.isFinite(d.createdAt)
    && ['TikTok', 'YouTube Shorts', 'Instagram Reels'].includes(String(d.platform))
    && ['Storytelling', 'Business', 'Education', 'Music'].includes(String(d.niche))
    && (d.status === undefined || typeof d.status === 'string')
    && (d.taskId === undefined || (typeof d.taskId === 'string' && /^[a-z0-9-]{8,80}$/i.test(d.taskId)));
}

export function makeStarterDraft(topic: string, niche: Niche, platform: Platform): Draft {
  const subject = topic.trim().replace(/\s+/g, ' ');
  if (!subject || subject.length > 500) throw new Error('Enter a topic under 500 characters.');
  const script = [hooks[niche](subject),
    'First, explain the essential context that will help viewers follow along.',
    'Then, add one concrete example, moment or surprising detail in your own words.',
    'Finish with your own perspective and invite viewers to share theirs.',
  ].join('\n\n');
  const caption = 'A fresh take on ' + subject + '. What would you add?';
  const hashtags = platform === 'YouTube Shorts' ? '#Shorts #Creators'
    : platform === 'TikTok' ? '#TikTokCreators #Storytime' : '#Reels #Creators';
  return { id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7),
    topic: subject, niche, platform, script, caption, hashtags,
    createdAt: Date.now(), status: 'draft' };
}
export function normalizedServerUrl(input: string): string {
  const value = input.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value)) {
    throw new Error('Use a secure HTTPS server origin (without an API path).');
  }
  return value;
}
export function makeVideoPayload(draft: Draft) {
  return {
    video_subject: draft.topic,
    video_script: draft.script.trim(),
    video_aspect: '9:16',
    video_count: 1,
    video_source: 'pexels',
    voice_name: 'en-US-AriaNeural',
    subtitle_enabled: true,
    subtitle_display_mode: 'word_by_word',
    bgm_type: 'random',
    bgm_volume: 0.15,
  };
}
