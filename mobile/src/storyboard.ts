import type { Draft } from './content';

export type StoryScene = {
  kind: 'intro' | 'story' | 'outro';
  heading: string;
  text: string;
  durationMs: number;
};

const MAX_SCRIPT_LENGTH = 1500;
const MAX_SEGMENTS = 9;
const MAX_SEGMENT_LENGTH = 155;

export function buildStoryboard(draft: Draft): StoryScene[] {
  const topic = draft.topic.trim();
  const script = draft.script.trim().replace(/[ \t]+/g, ' ');
  if (!topic) throw new Error('Add a topic before creating a video.');
  if (!script) throw new Error('Write or edit your script before creating a video.');
  if (script.length > MAX_SCRIPT_LENGTH) {
    throw new Error('Local video mode supports up to 1,500 script characters. Shorten your script or use the video engine.');
  }
  const sentences = script.split(/\n+|(?<=[.!?])\s+/u).map(x => x.trim()).filter(Boolean);
  const segments: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/u);
    for (const word of words) {
      if (word.length > MAX_SEGMENT_LENGTH) {
        throw new Error('One word is too long to fit on a video card.');
      }
      if (buffer && (buffer.length + word.length + 1 > MAX_SEGMENT_LENGTH)) {
        segments.push(buffer);
        buffer = '';
      }
      buffer += (buffer ? ' ' : '') + word;
    }
    if (buffer && buffer.length > 85) {
      segments.push(buffer);
      buffer = '';
    }
  }
  if (buffer) segments.push(buffer);
  if (segments.length === 0) throw new Error('Your script has no usable content.');
  if (segments.length > MAX_SEGMENTS) {
    throw new Error('The script needs more than nine scenes. Shorten it for this local video or use the server renderer.');
  }
  const scenes: StoryScene[] = [{ kind: 'intro', heading: 'THE STORY', text: topic.slice(0, 160), durationMs: 2900 }];
  segments.forEach((segment, i) => {
    scenes.push({
      kind: 'story',
      heading: String(i + 1).padStart(2, '0') + ' / ' + String(segments.length).padStart(2, '0'),
      text: segment,
      durationMs: Math.max(3300, Math.min(5400, segment.length * 37)),
    });
  });
  const outro = [draft.caption.trim(), draft.hashtags.trim()].filter(Boolean).join('  ');
  scenes.push({
    kind: 'outro', heading: 'JOIN THE CONVERSATION',
    text: (outro || 'What is your perspective?').slice(0, 180),
    durationMs: 3000,
  });
  return scenes;
}

export function storyboardDurationMs(scenes: StoryScene[]): number {
  return scenes.reduce((total, scene) => total + scene.durationMs, 0);
}
