import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Pressable, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View, Platform as DevicePlatform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DraftStorage from './src/draftStore';
import { getSavedSettings, saveSavedSettings } from './src/serverSettings';
import { exportVideo } from './src/videoExport';
import { shareText } from './src/textShare';
import { createLocalVideo, downloadLocalVideo, type LocalVideoResult } from './src/localRender';
import { checkServer, generateAiScript, generateMetadata, readVideoJob, startVideoJob } from './src/api';
import { isSavedDraft, makeStarterDraft, makeVideoPayload, normalizedServerUrl, type Draft, type Niche, type Platform } from './src/content';

const INK = '#EEF2FF';
const MUTED = '#9BA8C4';
const SURFACE = '#141D32';
const ACCENT = '#B7F768';
type Page = 'create' | 'library' | 'settings';
const platforms: Platform[] = ['TikTok', 'YouTube Shorts', 'Instagram Reels'];
const niches: Niche[] = ['Storytelling', 'Business', 'Education', 'Music'];

function Pill({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole='button' accessibilityState={{ selected: active }} onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
    <Text style={[styles.pillText, active && styles.pillTextActive]}>{text}</Text>
  </Pressable>;
}

function Action({ label, onPress, secondary, disabled }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole='button' accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress}
    style={[styles.action, secondary && styles.actionSecondary, disabled && styles.disabled]}>
    <Text style={[styles.actionText, secondary && styles.actionTextSecondary]}>{label}</Text>
  </Pressable>;
}

function AppInner() {
  const [page, setPage] = useState<Page>('create');
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState<Niche>('Storytelling');
  const [platform, setPlatform] = useState<Platform>('TikTok');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsRestored, setDraftsRestored] = useState(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [serverVerified, setServerVerified] = useState(false);
  const [localRendering, setLocalRendering] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localVideo, setLocalVideo] = useState<(LocalVideoResult & { draftId: string }) | null>(null);
  const localAbort = useRef<AbortController | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; actionLabel: string; destructive?: boolean; onConfirm: () => void } | null>(null);
  const active = drafts.find(d => d.id === activeId);

  useEffect(() => {
    let mounted = true;
    getSavedSettings()
      .then(([host, key]) => { if (mounted) { setOrigin(host || ''); setApiKey(key || ''); } })
      .catch(() => { if (mounted) setNotice('Secure settings could not be restored.'); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    DraftStorage.getItem('pluteviral_drafts_v1')
      .then(raw => {
        if (!mounted || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const verified = parsed.filter(isSavedDraft).slice(0, 75);
        setDrafts(verified);
      })
      .catch(() => { if (mounted) setNotice('Could not restore saved projects.'); })
      .finally(() => { if (mounted) setDraftsRestored(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!draftsRestored) return;
    const serialized = JSON.stringify(drafts.slice(0, 75));
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => DraftStorage.setItem('pluteviral_drafts_v1', serialized))
      .catch(() => { setNotice('Local saving failed. Export important scripts.'); });
  }, [drafts, draftsRestored]);

  function deleteDraft(id: string) {
    setConfirmDialog({
      title: 'Delete this project?',
      message: 'Your script, captions and rendering history for this project will be removed from this device.',
      actionLabel: 'Delete project',
      destructive: true,
      onConfirm: () => {
        setDrafts(prev => prev.filter(d => d.id !== id));
        if (activeId === id) setActiveId(null);
        setNotice('Project deleted from this device.');
      },
    });
  }

  function patch(changes: Partial<Draft>) {
    if (!activeId) return;
    localAbort.current?.abort();
    setLocalVideo(null);
    setLocalProgress(0);
    setDrafts(prev => prev.map(d => d.id === activeId ? { ...d, ...changes } : d));
  }

  function changeTopic(value: string) {
    setTopic(value);
    if (activeId) patch({ topic: value });
  }

  function changePlatform(value: Platform) {
    setPlatform(value);
    if (activeId) patch({ platform: value });
  }

  function changeNiche(value: Niche) {
    setNiche(value);
    if (activeId) patch({ niche: value });
  }

  function startDraft() {
    try {
      const next = makeStarterDraft(topic, niche, platform);
      setDrafts(prev => [next, ...prev].slice(0, 75));
      setActiveId(next.id);
      setLocalVideo(null);
      setLocalProgress(0);
      setNotice('Editable starter outline created. Add original details before rendering.');
    } catch (error) {
      setErrorMessage(String((error as Error).message));
    }
  }

  async function saveSettings() {
    try {
      const safeOrigin = normalizedServerUrl(origin);
      await saveSavedSettings(safeOrigin, apiKey.trim());
      setOrigin(safeOrigin);
      setNotice(DevicePlatform.OS === 'web'
        ? 'Server address saved for this browser tab. The API key stays only in memory.'
        : 'Server address and API key securely saved on this device.');
      setPage('create');
    } catch (error) {
      setErrorMessage('Settings not saved: ' + String((error as Error).message));
    }
  }

  async function connected<T>(operation: () => Promise<T>, completed: (value: T) => void) {
    setBusy(true);
    setNotice('');
    setErrorMessage('');
    try {
      normalizedServerUrl(origin);
      if (!apiKey.trim()) throw new Error('Enter the configured server API key under Settings before requesting AI or video rendering.');
      const result = await operation();
      completed(result);
    } catch (error) {
      setErrorMessage('Server request failed: ' + String((error as Error).message));
    } finally { setBusy(false); }
  }

  async function testConnection() {
    await connected(() => checkServer(origin, apiKey), result => {
      setServerVerified(result.ok);
      setNotice('Server connection verified. The API accepted your credentials.');
    });
  }

  function confirmRender() {
    if (!active) return;
    setConfirmDialog({
      title: 'Start rendering?',
      message: 'This sends your script to your configured video server. Rendering may consume paid provider credits. Check your account budget first.',
      actionLabel: 'Start render',
      onConfirm: () => { void renderVideo(); },
    });
  }

  async function scriptFromAi() {
    if (!active) return;
    await connected(() => generateAiScript(origin, apiKey, active.topic), script => {
      patch({ script });
      setNotice('AI script returned by your MoneyPrinterTurbo server.');
    });
  }

  async function captionFromAi() {
    if (!active) return;
    await connected(() => generateMetadata(origin, apiKey, active), metadata => {
      patch({ caption: metadata.caption, hashtags: metadata.hashtags.join(' ') });
      setNotice('Caption and hashtags generated by your server.');
    });
  }

  async function renderVideo() {
    if (!active) return;
    if (!active.script.trim()) { setErrorMessage('Write a script before rendering.'); return; }
    await connected(() => startVideoJob(origin, apiKey, makeVideoPayload(active)), result => {
      patch({ taskId: result.task_id, status: 'Rendering', progress: 0, videoUrl: undefined });
      setNotice('Video job submitted. Use Refresh status to check progress.');
    });
  }

  async function refreshStatus() {
    if (!active?.taskId) return;
    await connected(() => readVideoJob(origin, apiKey, active.taskId!), task => {
      const url = task.videos?.[0] || task.combined_videos?.[0];
      patch({
        status: task.state === 1 ? 'Completed' : task.state === -1 ? 'Failed' : 'Rendering',
        progress: task.progress || 0, videoUrl: url,
      });
      setNotice(task.state === -1 ? 'Render failed: ' + (task.error || task.failed_stage || 'Unknown error')
        : task.state === 1 ? 'Your MP4 is ready to download.' : 'Rendering in progress.');
    });
  }

  async function shareDraft() {
    if (!active) return;
    try {
      await shareText([active.topic, active.script, active.caption, active.hashtags].join('\n\n'));
    } catch (error) { setErrorMessage('Share unavailable: ' + String(error)); }
  }

  async function renderLocally() {
    if (!active || localRendering) return;
    const draft = { ...active };
    const controller = new AbortController();
    localAbort.current = controller;
    setLocalRendering(true);
    setLocalProgress(0);
    setLocalVideo(null);
    setNotice('');
    setErrorMessage('');
    try {
      const result = await createLocalVideo(draft, setLocalProgress, controller.signal);
      if (!controller.signal.aborted) {
        setLocalVideo({ ...result, draftId: draft.id });
        setNotice('Your silent motion-text video is ready. Tap Download to save it.');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setNotice('Local video creation cancelled.');
      } else {
        setErrorMessage('Could not create local video: ' + String((error as Error).message));
      }
    } finally {
      if (localAbort.current === controller) localAbort.current = null;
      setLocalRendering(false);
    }
  }

  function cancelLocalRender() {
    localAbort.current?.abort();
  }

  function downloadLocalRender() {
    if (!localVideo || localVideo.draftId !== activeId) return;
    try {
      downloadLocalVideo(localVideo);
      setNotice('Your video download was requested. Check the browser Downloads folder.');
    } catch (error) {
      setErrorMessage('Could not download local video: ' + String((error as Error).message));
    }
  }

  async function shareRenderedVideo() {
    if (!active?.videoUrl || !apiKey.trim()) return;
    setBusy(true);
    setErrorMessage('');
    try {
      await exportVideo(origin, active.videoUrl, apiKey, active.id);
      setNotice(DevicePlatform.OS === 'web' ? 'Video download started.' : 'Video opened in your device share sheet.');
    } catch (error) {
      setErrorMessage('Could not export video: ' + String((error as Error).message));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!active?.taskId || active.status !== 'Rendering' || !origin || !apiKey) return;
    let cancelled = false;
    let inFlight = false;
    const taskId = active.taskId;
    async function poll() {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await readVideoJob(origin, apiKey, taskId);
        if (cancelled) return;
        const status = data.state === 1 ? 'Completed' : data.state === -1 ? 'Failed' : 'Rendering';
        const videoUrl = data.videos?.[0] || data.combined_videos?.[0];
        setDrafts(prev => prev.map(d => d.taskId === taskId ? {
          ...d, status, progress: data.progress ?? d.progress,
          ...(status === 'Completed' && videoUrl ? { videoUrl } : {}),
        } : d));
        if (status === 'Completed') setNotice('Your video is ready to download.');
        if (status === 'Failed') setErrorMessage('Video rendering failed: ' + (data.error || data.failed_stage || 'Unknown error'));
      } catch {
        // Keep the current job and allow a manual retry; transient network failures
        // must not mark a video as failed.
      } finally { inFlight = false; }
    }
    const timer = setInterval(() => { void poll(); }, 12000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [active?.taskId, active?.status, origin, apiKey]);

  function openDraft(draft: Draft) {
    setActiveId(draft.id);
    setTopic(draft.topic);
    setNiche(draft.niche);
    setPlatform(draft.platform);
    setLocalVideo(null);
    setLocalProgress(0);
    setPage('create');
    setNotice('');
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle='light-content' />
    <View style={styles.header}>
      <View style={styles.mark}><Text style={styles.markText}>P</Text></View>
      <View>
        <Text style={styles.brand}>PLUTEVIRAL <Text style={{ color: ACCENT }}>AI</Text></Text>
        <Text style={styles.brandTag}>YOUR CONTENT. MULTIPLIED.</Text>
      </View>
      <View style={styles.beta}><Text style={styles.betaText}>PRIVATE BETA</Text></View>
    </View>
    <View style={styles.nav}>
      <Pill text='Create' active={page === 'create'} onPress={() => setPage('create')} />
      <Pill text={'Projects ' + drafts.length} active={page === 'library'} onPress={() => setPage('library')} />
      <Pill text='Settings' active={page === 'settings'} onPress={() => setPage('settings')} />
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
      {page === 'create' ? <>
        <View style={styles.studioBanner}>
          <Text style={styles.bannerOverline}>PLUTEVIA CREATOR SUITE</Text>
          <Text style={styles.bannerTitle}>Your studio, anywhere.</Text>
          <Text style={styles.bannerCaption}>Build original short-form stories with control over every word.</Text>
          <View style={styles.bannerStats}>
            <Text style={styles.bannerStat}>{drafts.length} local projects</Text>
            <Text style={styles.bannerStat}>{origin && apiKey ? (serverVerified ? '● Engine verified' : '◌ Engine configured') : '○ Engine not connected'}</Text>
          </View>
        </View>
        <Text style={styles.eyebrow}>CREATOR STUDIO / 01</Text>
        <Text style={styles.hero}>Turn one idea into your <Text style={{ color: ACCENT }}>next video.</Text></Text>
        <Text style={styles.sub}>Build the story. Refine the script. Render for TikTok, Shorts or Reels with your video server.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>YOUR VIDEO IDEA</Text>
          <TextInput accessibilityLabel='Video topic' style={styles.input} value={topic} onChangeText={changeTopic}
            placeholder='e.g. The untold story behind my latest song' placeholderTextColor='#67758E'
            maxLength={500} multiline />
          <Text style={styles.label}>PLATFORM</Text>
          <View style={styles.wrap}>{platforms.map(p => <Pill key={p} text={p} active={platform === p} onPress={() => changePlatform(p)} />)}</View>
          <Text style={styles.label}>CONTENT STYLE</Text>
          <View style={styles.wrap}>{niches.map(n => <Pill key={n} text={n} active={niche === n} onPress={() => changeNiche(n)} />)}</View>
          <Action label='Create starter outline  →' onPress={startDraft} />
          <View style={styles.stepRow}>
            <Text style={styles.stepText}>01 · Plan</Text><Text style={styles.stepText}>02 · Write</Text><Text style={styles.stepText}>03 · Render</Text>
          </View>
          <Text style={styles.help}>Starter outlines are templates, not AI-generated results.</Text>
        </View>
        {active ? <View style={styles.card}>
          <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>Your content draft</Text><Text style={styles.dot}>● EDITABLE</Text></View>
          <Text style={styles.label}>SCRIPT</Text>
          <TextInput accessibilityLabel='Video script' multiline style={[styles.input, styles.script]} value={active.script}
            onChangeText={script => patch({ script })} textAlignVertical='top' />
          <View style={styles.split}>
            <View style={styles.half}><Action label='AI script' secondary disabled={busy} onPress={scriptFromAi} /></View>
            <View style={styles.half}><Action label='AI captions' secondary disabled={busy} onPress={captionFromAi} /></View>
          </View>
          <Text style={styles.label}>CAPTION</Text>
          <TextInput accessibilityLabel='Social media caption' multiline style={styles.input} value={active.caption} onChangeText={caption => patch({ caption })} />
          <Text style={styles.label}>HASHTAGS</Text>
          <TextInput accessibilityLabel='Social media hashtags' style={styles.input} value={active.hashtags} onChangeText={hashtags => patch({ hashtags })} />
          {!origin || !apiKey ? <Pressable style={styles.connectionPrompt} onPress={() => setPage('settings')}>
            <Text style={styles.connectionPromptTitle}>Connect the video engine to render</Text>
            <Text style={styles.connectionPromptBody}>Your local outline works now. Video generation requires a private HTTPS MoneyPrinterTurbo server. Configure it in Settings →</Text>
          </Pressable> : null}
          <Action label='Render 9:16 video  →' disabled={busy || !origin || !apiKey} onPress={confirmRender} />
          {DevicePlatform.OS === 'web' ? <View style={styles.localCard}>
            <Text style={styles.localKicker}>NO SERVER · FREE EXPORT</Text>
            <Text style={styles.localTitle}>Create a motion-text video</Text>
            <Text style={styles.localDescription}>Turns your edited script into a silent 9:16 video with animated typography. No AI footage or voiceover. Keep this tab open while it renders. MP4 is used where supported; otherwise WebM.</Text>
            {!localRendering ? <Action label='Make free silent video  →' disabled={busy} onPress={() => { void renderLocally(); }} />
              : <>
                <Text style={styles.localStatus}>Rendering video… {localProgress}%</Text>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: (localProgress + '%') as `${number}%` }]} /></View>
                <Action label='Cancel local render' secondary onPress={cancelLocalRender} />
              </>}
            {localVideo && localVideo.draftId === activeId ? <>
              <Text style={styles.localStatus}>Ready · {localVideo.durationSeconds}s · {localVideo.format.toUpperCase()} · {Math.round(localVideo.blob.size / 1024)} KB</Text>
              <Action label={'Download ' + localVideo.format.toUpperCase() + ' video'} onPress={downloadLocalRender} />
            </> : null}
          </View> : null}
          <Action label='Share script & caption' secondary onPress={shareDraft} />
          {active.taskId ? <View style={styles.job}>
            <Text style={styles.jobHeading}>RENDER STATUS</Text>
            <Text style={styles.jobTitle}>{active.status || 'Rendering'} · {active.progress || 0}%</Text>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: (Math.max(0, Math.min(100, active.progress || 0)) + '%') as `${number}%` }]} /></View>
            <Text style={styles.help}>Status refreshes automatically while this project is open.</Text>
            <Text style={styles.jobId}>Job: {active.taskId}</Text>
            <Action label='Refresh status' secondary disabled={busy} onPress={refreshStatus} />
            {active.videoUrl ? <Action label='Download & share MP4' onPress={shareRenderedVideo} disabled={busy} /> : null}
          </View> : null}
        </View> : null}
      </> : page === 'library' ? <>
        <Text style={styles.eyebrow}>CREATOR STUDIO / 02</Text>
        <Text style={styles.hero}>Your <Text style={{ color: ACCENT }}>projects.</Text></Text>
        <Text style={styles.sub}>Projects are saved locally on this device. Export important scripts for backup.</Text>
        {drafts.length === 0 ? <View style={styles.card}><Text style={styles.empty}>No drafts yet. Create your first story.</Text><Action label='Go to creator' onPress={() => setPage('create')} /></View>
          : drafts.map(d => <View key={d.id} style={styles.project}>
            <Text style={styles.projectTitle}>{d.topic}</Text>
            <Text style={styles.projectMeta}>{d.platform}  •  {d.niche}  •  {d.status || 'Draft'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <Pressable onPress={() => openDraft(d)} accessibilityRole='button'>
                <Text style={styles.projectOpen}>Open project  →</Text>
              </Pressable>
              <Pressable onPress={() => deleteDraft(d.id)} accessibilityRole='button'>
                <Text style={[styles.projectOpen, { color: '#FDA4AF' }]}>Delete</Text>
              </Pressable>
            </View>
          </View>)}
      </> : <>
        <Text style={styles.eyebrow}>CREATOR STUDIO / 03</Text>
        <Text style={styles.hero}>Connect your <Text style={{ color: ACCENT }}>engine.</Text></Text>
        <Text style={styles.sub}>PluteViral uses your own MoneyPrinterTurbo render server. Without it, local templates and text sharing still work.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>HTTPS SERVER ORIGIN</Text>
          <TextInput accessibilityLabel='Video engine HTTPS address' value={origin} onChangeText={value => { setOrigin(value); setServerVerified(false); }} style={styles.input}
            autoCapitalize='none' autoCorrect={false} keyboardType='url'
            placeholder='https://video.yourdomain.com' placeholderTextColor='#67758E' />
          <Text style={styles.label}>SERVER API KEY</Text>
          <TextInput accessibilityLabel='Private video engine API key' value={apiKey} onChangeText={value => { setApiKey(value); setServerVerified(false); }} style={styles.input}
            secureTextEntry autoCapitalize='none' autoCorrect={false}
            placeholder='Stored securely on your device' placeholderTextColor='#67758E' />
          <Action label='Save secure connection' onPress={saveSettings} />
          <Action label='Test server connection' secondary disabled={busy} onPress={testConnection} />
          {serverVerified ? <Text style={styles.connectionOk}>● Server connection verified</Text> : null}
          <Text style={styles.help}>For private testing only. A production multi-user app needs a server-side job broker; never share a master API key with customers. {DevicePlatform.OS === 'web' ? 'In the web preview, the API key is never saved.' : ''}</Text>
          <Pressable onPress={() => Linking.openURL('https://github.com/harry0703/MoneyPrinterTurbo')}>
            <Text style={styles.link}>MoneyPrinterTurbo open-source engine ↗</Text>
          </Pressable>
        </View>
      </>}
      {busy && <View style={styles.busy}><ActivityIndicator color={ACCENT}/><Text style={styles.muted}>Processing your request…</Text></View>}
      {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
      {errorMessage ? <Pressable accessibilityRole='button' accessibilityLabel='Dismiss error' onPress={() => setErrorMessage('')} style={styles.errorBox}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Text style={styles.errorDismiss}>Dismiss ✕</Text>
      </Pressable> : null}
      <Text style={styles.footer}>PLUTEVIA LIMITED · PLUTEVIRAL AI · BUILD 0.1</Text>
    </ScrollView>
    <Modal visible={Boolean(confirmDialog)} transparent animationType='fade' onRequestClose={() => setConfirmDialog(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{confirmDialog?.title}</Text>
          <Text style={styles.modalBody}>{confirmDialog?.message}</Text>
          <Action label={confirmDialog?.actionLabel || 'Confirm'} onPress={() => {
            const callback = confirmDialog?.onConfirm;
            setConfirmDialog(null);
            callback?.();
          }} />
          <Action secondary label='Cancel' onPress={() => setConfirmDialog(null)} />
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><AppInner /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1020' },
  header: { height: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, width: '100%', maxWidth: 860, alignSelf: 'center' },
  mark: { width: 38, height: 38, backgroundColor: ACCENT, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  markText: { fontWeight: '900', fontSize: 23, color: '#0A1020' },
  brand: { color: INK, fontWeight: '900', letterSpacing: 1.5, fontSize: 15 },
  brandTag: { color: MUTED, fontSize: 8, letterSpacing: 2.1, marginTop: 3 },
  beta: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: '#263049' },
  betaText: { color: ACCENT, fontSize: 10, fontWeight: '800' },
  nav: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, paddingBottom: 14, width: '100%', maxWidth: 860, alignSelf: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 13, paddingBottom: 36, width: '100%', maxWidth: 860, alignSelf: 'center' },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: ACCENT, fontWeight: '700', marginBottom: 12 },
  studioBanner: { backgroundColor: '#192E3C', padding: 20, borderRadius: 21, marginBottom: 26, borderWidth: 1, borderColor: '#37596A' },
  localCard: { marginTop: 16, backgroundColor: '#1A3040', borderWidth: 1, borderColor: '#3E6472', padding: 16, borderRadius: 16 },
  localKicker: { fontSize: 10, color: ACCENT, fontWeight: '900', letterSpacing: 1.6 },
  localTitle: { color: INK, fontSize: 18, fontWeight: '900', marginTop: 9 },
  localDescription: { color: '#C3D6E2', fontSize: 12, lineHeight: 19, marginTop: 8 },
  localStatus: { color: '#D6F9C5', fontSize: 12, fontWeight: '800', marginTop: 15 },
  bannerOverline: { color: ACCENT, letterSpacing: 1.9, fontSize: 10, fontWeight: '900', marginBottom: 14 },
  bannerTitle: { color: INK, fontWeight: '900', fontSize: 25, letterSpacing: -0.8 },
  bannerCaption: { color: '#C6D3E0', fontSize: 12, lineHeight: 19, marginTop: 8 },
  bannerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  bannerStat: { backgroundColor: '#223E4C', color: '#D8E6EF', paddingHorizontal: 11, paddingVertical: 8, overflow: 'hidden', borderRadius: 12, fontSize: 11, fontWeight: '700' },
  hero: { color: INK, fontWeight: '900', fontSize: 32, letterSpacing: -1.25, lineHeight: 39, marginBottom: 12 },
  sub: { color: MUTED, fontSize: 14, lineHeight: 22, marginBottom: 22 },
  card: { backgroundColor: SURFACE, padding: 17, borderRadius: 22, marginBottom: 18, borderWidth: 1, borderColor: '#27324B' },
  label: { color: MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 9, marginTop: 12 },
  input: { backgroundColor: '#0D1425', color: INK, fontSize: 14, borderRadius: 12, minHeight: 54, padding: 13, borderWidth: 1, borderColor: '#2E3A53' },
  script: { minHeight: 190, lineHeight: 23 },
  wrap: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 10 },
  pill: { borderRadius: 12, borderWidth: 1, borderColor: '#34405A', paddingHorizontal: 12, paddingVertical: 10 },
  pillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  pillText: { color: '#C8D2E7', fontSize: 11, fontWeight: '700' },
  pillTextActive: { color: '#0B1020' },
  action: { backgroundColor: ACCENT, borderRadius: 13, paddingVertical: 16, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  actionSecondary: { backgroundColor: '#24314B', borderWidth: 1, borderColor: '#374762' },
  actionText: { color: '#09111A', fontWeight: '900', fontSize: 13 },
  actionTextSecondary: { color: INK },
  disabled: { opacity: 0.46 },
  help: { color: MUTED, fontSize: 11, lineHeight: 18, marginTop: 12 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionHeading: { color: INK, fontSize: 17, fontWeight: '900' },
  dot: { color: ACCENT, fontSize: 9, fontWeight: '800' },
  split: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  job: { backgroundColor: '#0D1425', borderRadius: 14, padding: 12, marginTop: 15 },
  jobHeading: { color: ACCENT, letterSpacing: 1.4, fontSize: 9, fontWeight: '800' },
  jobTitle: { color: INK, fontSize: 18, fontWeight: '900', marginTop: 9 },
  jobId: { color: MUTED, fontSize: 10, marginTop: 7 },
  empty: { color: MUTED, marginBottom: 15 },
  project: { padding: 17, backgroundColor: SURFACE, borderRadius: 17, marginBottom: 11, borderWidth: 1, borderColor: '#26344D' },
  projectTitle: { color: INK, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  projectMeta: { color: MUTED, fontSize: 11 },
  projectOpen: { color: ACCENT, fontSize: 12, fontWeight: '800', marginTop: 15 },
  link: { color: ACCENT, marginTop: 15, fontWeight: '700', fontSize: 12 },
  connectionOk: { color: ACCENT, marginTop: 13, fontWeight: '800', fontSize: 12 },
  busy: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 15 },
  muted: { color: MUTED, fontSize: 12 },
  notice: { padding: 13, backgroundColor: '#253D27', borderRadius: 13, marginBottom: 17 },
  noticeText: { color: '#D9FFD2', fontSize: 12, lineHeight: 18 },
  footer: { color: '#61718D', fontWeight: '700', fontSize: 9, textAlign: 'center', letterSpacing: 1, marginTop: 16 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 3 },
  stepText: { color: '#7B9DAD', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  connectionPrompt: { backgroundColor: '#203044', borderRadius: 14, borderWidth: 1, borderColor: '#4C6385', padding: 14, marginTop: 16 },
  connectionPromptTitle: { color: ACCENT, fontSize: 13, fontWeight: '900', marginBottom: 6 },
  connectionPromptBody: { color: '#CBD5E1', fontSize: 11, lineHeight: 18 },
  progressTrack: { height: 6, backgroundColor: '#34445E', borderRadius: 100, overflow: 'hidden', marginTop: 12 },
  progressFill: { height: 6, backgroundColor: ACCENT, borderRadius: 100 },
  errorBox: { backgroundColor: '#3F1E29', borderColor: '#9F445B', borderWidth: 1, borderRadius: 13, padding: 13, marginBottom: 17 },
  errorText: { color: '#FFE4EA', fontSize: 12, lineHeight: 18 },
  errorDismiss: { color: '#FDA4AF', textAlign: 'right', fontSize: 11, fontWeight: '800', marginTop: 10 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.76)' },
  modalCard: { backgroundColor: '#18243C', borderRadius: 23, padding: 22, borderWidth: 1, borderColor: '#475569' },
  modalTitle: { color: INK, fontSize: 23, fontWeight: '900' },
  modalBody: { color: '#BAC7DB', fontSize: 13, lineHeight: 21, marginTop: 12, marginBottom: 14 },
});
