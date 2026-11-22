const test = require('node:test');
const assert = require('node:assert/strict');
const { makeStarterDraft, normalizedServerUrl, makeVideoPayload } = require('../.core-test-build/content.js');
const { generateAiScript, generateMetadata, checkServer, startVideoJob, readVideoJob } = require('../.core-test-build/api.js');

test('starter outline sanitizes whitespace and prepares a portrait video', () => {
  const draft = makeStarterDraft('  Lagos   business   story  ', 'Business', 'TikTok');
  assert.equal(draft.topic, 'Lagos business story');
  assert.equal(makeVideoPayload(draft).video_aspect, '9:16');
  assert.equal(makeVideoPayload(draft).video_count, 1);
  assert.match(draft.hashtags, /TikTok/);
});

test('empty and excessively long topics are rejected', () => {
  assert.throws(() => makeStarterDraft(' ', 'Music', 'TikTok'));
  assert.throws(() => makeStarterDraft('x'.repeat(501), 'Music', 'TikTok'));
});

test('insecure and non-origin URLs are rejected', () => {
  for (const url of [
    'http://example.com',
    'https://example.com/path',
    'https://example.com?q=1',
    'https://user:pass@example.com',
  ]) assert.throws(() => normalizedServerUrl(url));
  assert.equal(normalizedServerUrl(' https://video.example.com/// '), 'https://video.example.com');
});

test('AI script request uses x-api-key and the documented endpoint', async () => {
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://video.example.com/api/v1/scripts');
    assert.equal(options.headers['x-api-key'], 'secret');
    assert.equal(JSON.parse(options.body).video_subject, 'cat');
    return { ok: true, status: 200, json: async () => ({ status: 200, data: { video_script: 'Hello cats' } }) };
  };
  assert.equal(await generateAiScript('https://video.example.com', 'secret', 'cat'), 'Hello cats');
  assert.equal(calls, 1);
});

test('video job requests and API errors are handled', async () => {
  global.fetch = async url => {
    if (url.includes('/videos')) return {
      ok: true, status: 200, json: async () => ({ status: 200, data: { task_id: 'abc-12345' } }),
    };
    return { ok: false, status: 401, json: async () => ({ status: 401, message: 'invalid API key' }) };
  };
  assert.deepEqual(await startVideoJob('https://video.example.com', 'secret', {}), { task_id: 'abc-12345' });
  await assert.rejects(() => readVideoJob('https://video.example.com', 'secret', 'abc-12345'), /invalid API key/);
  await assert.rejects(() => readVideoJob('https://video.example.com', 'secret', '../../evil'), /Invalid task ID/);
});

test('read-only server check validates task listing', async () => {
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({ status: 200, data: { tasks: [], total: 0 } }),
  });
  assert.deepEqual(await checkServer('https://video.example.com', 'secret'), { ok: true, total: 0 });
});

test('missing API key is rejected without making an HTTP request', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('Unexpected network request'); };
  await assert.rejects(() => checkServer('https://video.example.com', ''), /server API key/);
  assert.equal(calls, 0);
});

test('malformed social metadata is rejected before updating the app', async () => {
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({ status: 200, data: { caption: 'Hello', hashtags: null } }),
  });
  const draft = makeStarterDraft('topic', 'Music', 'TikTok');
  await assert.rejects(() => generateMetadata('https://video.example.com', 'secret', draft), /invalid caption metadata/);
});

test('malformed video job responses are rejected', async () => {
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({ status: 200, data: { task_id: '' } }),
  });
  await assert.rejects(() => startVideoJob('https://video.example.com', 'secret', {}), /invalid video task ID/);
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({ status: 200, data: { task_id: 'abc-12345', state: 'processing' } }),
  });
  await assert.rejects(() => readVideoJob('https://video.example.com', 'secret', 'abc-12345'), /invalid task status/);
});

test('restored project schema rejects invalid or tampered drafts', () => {
  const { isSavedDraft } = require('../.core-test-build/content.js');
  const valid = makeStarterDraft('Valid original content', 'Music', 'TikTok');
  assert.equal(isSavedDraft(valid), true);
  assert.equal(isSavedDraft({ ...valid, platform: 'Unknown' }), false);
  assert.equal(isSavedDraft({ ...valid, taskId: '../admin' }), false);
  assert.equal(isSavedDraft({ ...valid, script: 'x'.repeat(101_000) }), false);
});

test('storyboard produces timed 9:16-friendly scenes without external services', () => {
  const { buildStoryboard, storyboardDurationMs } = require('../.core-test-build/storyboard.js');
  const draft = makeStarterDraft('A story about resilience', 'Storytelling', 'YouTube Shorts');
  draft.script = 'First scene has a surprising story. Second scene adds the real context. Third scene gives the conclusion.';
  const scenes = buildStoryboard(draft);
  assert.equal(scenes[0].kind, 'intro');
  assert.equal(scenes[scenes.length - 1].kind, 'outro');
  assert.ok(scenes.some(s => s.kind === 'story'));
  assert.ok(storyboardDurationMs(scenes) >= 9000);
  assert.ok(scenes.every(s => s.text.length <= 180));
});

test('storyboard refuses unrenderable and overly long scripts', () => {
  const { buildStoryboard } = require('../.core-test-build/storyboard.js');
  const draft = makeStarterDraft('Original title', 'Education', 'TikTok');
  draft.script = '';
  assert.throws(() => buildStoryboard(draft), /Write or edit/);
  draft.script = 'long '.repeat(400);
  assert.throws(() => buildStoryboard(draft), /1,500/);
});
