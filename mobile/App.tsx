import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StatusBar,
  StyleSheet, Text, TextInput, View, Platform as DevicePlatform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DraftStorage from './src/draftStore';
import { getSavedSettings, saveSavedSettings } from './src/serverSettings';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { checkServer, generateAiScript, generateMetadata, readVideoJob, startVideoJob } from './src/api';
import { makeStarterDraft, makeVideoPayload, normalizedServerUrl, type Draft, type Niche, type Platform } from './src/content';

const INK = '#EEF2FF';
const MUTED = '#9BA8C4';
const SURFACE = '#141D32';
const ACCENT = '#B7F768';
type Page = 'create' | 'library' | 'settings';
const platforms: Platform[] = ['TikTok', 'YouTube Shorts', 'Instagram Reels'];
const niches: Niche[] = ['Storytelling', 'Business', 'Education', 'Music'];

function Pill({ text, active, onPress }: { text: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
    <Text style={[styles.pillText, active && styles.pillTextActive]}>{text}</Text>
  </Pressable>;
}

function Action({ label, onPress, secondary, disabled }: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable disabled={disabled} onPress={onPress}
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [serverVerified, setServerVerified] = useState(false);
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
        const verified = parsed.filter((d): d is Draft =>
          d && typeof d === 'object' && typeof d.id === 'string'
          && typeof d.topic === 'string' && typeof d.script === 'string'
          && typeof d.caption === 'string' && typeof d.hashtags === 'string'
        ).slice(0, 75);
        setDrafts(verified);
      })
      .catch(() => { if (mounted) setNotice('Could not restore saved projects.'); })
      .finally(() => { if (mounted) setDraftsRestored(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!draftsRestored) return;
    DraftStorage.setItem('pluteviral_drafts_v1', JSON.stringify(drafts.slice(0, 75)))
      .catch(() => setNotice('Local saving failed. Export important scripts.'));
  }, [drafts, draftsRestored]);

  function deleteDraft(id: string) {
    Alert.alert('Delete this project?', 'This removes its script and render history from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setDrafts(prev => prev.filter(d => d.id !== id));
        if (activeId === id) setActiveId(null);
        setNotice('Project deleted from this device.');
      } },
    ]);
  }

  function patch(changes: Partial<Draft>) {
    if (!activeId) return;
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
      setNotice('Editable starter outline created. Add original details before rendering.');
    } catch (error) {
      Alert.alert('Check your topic', String((error as Error).message));
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
      Alert.alert('Settings not saved', String((error as Error).message));
    }
  }

  async function connected<T>(operation: () => Promise<T>, completed: (value: T) => void) {
    setBusy(true);
    setNotice('');
    try {
      normalizedServerUrl(origin);
      if (!apiKey.trim()) throw new Error('Enter the configured server API key under Settings before requesting AI or video rendering.');
      const result = await operation();
      completed(result);
    } catch (error) {
      Alert.alert('Server request failed', String((error as Error).message));
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
    Alert.alert(
      'Start video rendering?',
      'MoneyPrinterTurbo may consume paid AI, media, or hosting resources. Proceed only if your provider budget permits it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Render video', onPress: () => { void renderVideo(); } },
      ],
    );
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
    if (!active.script.trim()) return Alert.alert('Script required', 'Write a script first.');
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
      await Share.share({ message: [active.topic, active.script, active.caption, active.hashtags].join('\n\n') });
    } catch (error) { Alert.alert('Share unavailable', String(error)); }
  }

  async function shareRenderedVideo() {
    if (!active?.videoUrl) return;
    setBusy(true);
    try {
      const host = normalizedServerUrl(origin);
      const resolved = new URL(active.videoUrl, host);
      if (resolved.protocol !== 'https:' || resolved.origin !== new URL(host).origin) {
        throw new Error('For safety, video downloads must use your configured HTTPS server.');
      }
      const local = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + 'pluteviral-' + active.id.replace(/[^a-z0-9-]/gi, '') + '.mp4';
      const headers: Record<string, string> = apiKey ? { 'x-api-key': apiKey } : {};
      const result = await FileSystem.downloadAsync(resolved.toString(), local, { headers });
      if (result.status !== 200) throw new Error('Download failed with HTTP ' + result.status);
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
      await Sharing.shareAsync(result.uri, { mimeType: 'video/mp4', dialogTitle: 'Share PluteViral video' });
    } catch (error) {
      Alert.alert('Could not export video', String((error as Error).message));
    } finally { setBusy(false); }
  }

  function openDraft(draft: Draft) {
    setActiveId(draft.id);
    setTopic(draft.topic);
    setNiche(draft.niche);
    setPlatform(draft.platform);
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
      <View style={styles.beta}><Text style={styles.betaText}>MVP</Text></View>
    </View>
    <View style={styles.nav}>
      <Pill text='Create' active={page === 'create'} onPress={() => setPage('create')} />
      <Pill text={'Projects ' + drafts.length} active={page === 'library'} onPress={() => setPage('library')} />
      <Pill text='Settings' active={page === 'settings'} onPress={() => setPage('settings')} />
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
      {page === 'create' ? <>
        <Text style={styles.eyebrow}>CREATOR STUDIO / 01</Text>
        <Text style={styles.hero}>Turn one idea into your <Text style={{ color: ACCENT }}>next video.</Text></Text>
        <Text style={styles.sub}>Build the story. Refine the script. Render for TikTok, Shorts or Reels with your video server.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>YOUR VIDEO IDEA</Text>
          <TextInput style={styles.input} value={topic} onChangeText={changeTopic}
            placeholder='e.g. The untold story behind my latest song' placeholderTextColor='#67758E'
            maxLength={500} multiline />
          <Text style={styles.label}>PLATFORM</Text>
          <View style={styles.wrap}>{platforms.map(p => <Pill key={p} text={p} active={platform === p} onPress={() => changePlatform(p)} />)}</View>
          <Text style={styles.label}>CONTENT STYLE</Text>
          <View style={styles.wrap}>{niches.map(n => <Pill key={n} text={n} active={niche === n} onPress={() => changeNiche(n)} />)}</View>
          <Action label='Create starter outline  →' onPress={startDraft} />
          <Text style={styles.help}>Starter outlines are templates, not AI-generated results.</Text>
        </View>
        {active ? <View style={styles.card}>
          <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>Your content draft</Text><Text style={styles.dot}>● EDITABLE</Text></View>
          <Text style={styles.label}>SCRIPT</Text>
          <TextInput multiline style={[styles.input, styles.script]} value={active.script}
            onChangeText={script => patch({ script })} textAlignVertical='top' />
          <View style={styles.split}>
            <View style={styles.half}><Action label='AI script' secondary disabled={busy} onPress={scriptFromAi} /></View>
            <View style={styles.half}><Action label='AI captions' secondary disabled={busy} onPress={captionFromAi} /></View>
          </View>
          <Text style={styles.label}>CAPTION</Text>
          <TextInput multiline style={styles.input} value={active.caption} onChangeText={caption => patch({ caption })} />
          <Text style={styles.label}>HASHTAGS</Text>
          <TextInput style={styles.input} value={active.hashtags} onChangeText={hashtags => patch({ hashtags })} />
          <Action label='Render 9:16 video  →' disabled={busy} onPress={confirmRender} />
          <Action label='Share script & caption' secondary onPress={shareDraft} />
          {active.taskId ? <View style={styles.job}>
            <Text style={styles.jobHeading}>RENDER STATUS</Text>
            <Text style={styles.jobTitle}>{active.status || 'Rendering'} · {active.progress || 0}%</Text>
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
          <TextInput value={origin} onChangeText={value => { setOrigin(value); setServerVerified(false); }} style={styles.input}
            autoCapitalize='none' autoCorrect={false} keyboardType='url'
            placeholder='https://video.yourdomain.com' placeholderTextColor='#67758E' />
          <Text style={styles.label}>SERVER API KEY</Text>
          <TextInput value={apiKey} onChangeText={value => { setApiKey(value); setServerVerified(false); }} style={styles.input}
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
      <Text style={styles.footer}>PLUTEVIA LIMITED · PLUTEVIRAL AI · BUILD 0.1</Text>
    </ScrollView>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><AppInner /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1020' },
  header: { height: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10 },
  mark: { width: 38, height: 38, backgroundColor: ACCENT, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  markText: { fontWeight: '900', fontSize: 23, color: '#0A1020' },
  brand: { color: INK, fontWeight: '900', letterSpacing: 1.5, fontSize: 15 },
  brandTag: { color: MUTED, fontSize: 8, letterSpacing: 2.1, marginTop: 3 },
  beta: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: '#263049' },
  betaText: { color: ACCENT, fontSize: 10, fontWeight: '800' },
  nav: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 13, paddingBottom: 36 },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: ACCENT, fontWeight: '700', marginBottom: 12 },
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
});
