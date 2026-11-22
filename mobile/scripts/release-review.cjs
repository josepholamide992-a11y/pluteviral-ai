const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const files = [
  'src/api.ts','src/content.ts','src/draftStore.ts','src/draftStore.web.ts',
  'src/serverSettings.ts','src/serverSettings.web.ts','src/videoExport.ts',
  'src/videoExport.web.ts','src/textShare.ts','src/textShare.web.ts','WORKFLOWS.md',
  'RELEASE_GATES.md','PRIVACY_POLICY_DRAFT.md',
];
const checks = [
  ['Required source files', files.every(p => fs.existsSync(path.join(root, p)))],
  ['Web build script', typeof pkg.scripts['build:web'] === 'string'],
  ['Unit test script', typeof pkg.scripts['test:core'] === 'string'],
  ['Android application ID', manifest.android?.package === 'com.plutevia.pluteviral'],
  ['iOS bundle ID', manifest.ios?.bundleIdentifier === 'com.plutevia.pluteviral'],
  ['Android internal build', eas.build?.preview?.android?.buildType === 'apk'],
];
for (const [name, ok] of checks) console.log((ok ? 'PASS ' : 'FAIL ') + name);
console.log('BLOCKED production release: signed native device builds, hosted renderer, per-user broker, provider credentials, reviewed legal policies and developer/store approvals remain unverified.');
if (checks.some(x => !x[1])) process.exitCode = 1;
