import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('mobile/App.tsx');
const api = read('mobile/src/api.ts');
const content = read('mobile/src/content.ts');
const packageJson = JSON.parse(read('mobile/package.json'));
const appJson = JSON.parse(read('mobile/app.json'));
const compose = read('deploy/pluteviral.compose.yml');
const checks = [
  ['Expo entry file', fs.existsSync(path.join(root, 'mobile/index.js'))],
  ['Mobile app sources', app.includes('function AppInner()') && app.includes('export default function App()')],
  ['Local SQLite draft saving', app.includes("DraftStorage.setItem('pluteviral_drafts_v1'")],
  ['Local SQLite draft restoration', app.includes("DraftStorage.getItem('pluteviral_drafts_v1'")],
  ['Delete confirmation', app.includes("Alert.alert('Delete this project?'")],
  ['Secure key storage', app.includes("SecureStore.setItemAsync('pluteviral_api_key'")],
  ['Key-protected API calls', api.includes("'x-api-key': apiKey")],
  ['Actual video task submission', api.includes("'/api/v1/videos'")],
  ['Actual task status lookup', api.includes("'/api/v1/tasks/'")],
  ['HTTPS endpoint validation', content.includes('https:')],
  ['No public inbound binding', compose.includes('127.0.0.1:8080:8080')],
  ['Production private deployment warning', read('deploy/README.md').includes('Production needs a Plutevia-controlled')],
  ['App identity', appJson.expo.ios.bundleIdentifier === 'com.plutevia.pluteviral' && appJson.expo.android.package === 'com.plutevia.pluteviral'],
  ['Expo SQLite package', Boolean(packageJson.dependencies['expo-sqlite'])],
];
for (const [name, pass] of checks) {
  console.log((pass ? 'PASS ' : 'FAIL ') + name);
}
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
