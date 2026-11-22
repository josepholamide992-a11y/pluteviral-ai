# PluteViral AI — client workflow (MVP)

The client supports editing and saving story outlines without a server. It integrates with the upstream MoneyPrinterTurbo FastAPI service only when a **private HTTPS engine address and key** are configured.

## Core user journeys

1. Open Create, enter a subject, choose TikTok / YouTube Shorts / Reels and one of the four content styles.
2. Create an editable starter outline. This local outline is a **template, not AI**.
3. Edit script, caption and hashtags. The project is saved on the current device. Open Projects to restore it.
4. Connect a privately controlled MoneyPrinterTurbo API in Settings. Test its `/api/v1/tasks` endpoint.
5. Request an AI script or social caption, which uses configured server-side LLM credentials.
6. Choose Render. A cross-platform confirmation warns that paid provider credits may be consumed. One 9:16 render job is submitted.
7. While the project is open, status is polled approximately every 12 seconds. You can also refresh manually. Failed jobs keep the error.
8. Download a completed MP4: browser downloads use an authenticated HTTPS fetch; native devices use Expo FileSystem and the OS share sheet.

## Important release restrictions

The root MoneyPrinterTurbo service accepts a single API master key and does **not** implement per-customer subscriptions, quotas or ownership. This architecture is only safe for **private testing** behind access restrictions. **Do not distribute the test app with this master key or release it to public app stores.** A production backend must hold the upstream key server-side, authenticate end users, record job ownership, validate completed artifacts, enforce rate and budget limits, and generate scoped download links.

The app does not yet upload directly to YouTube or TikTok, schedule posts, collect payments, authenticate customers, or sync projects between devices. Store approval, working video-server provisioning, external provider keys and signed iOS/Android builds are separate release gates.

## Build/test

From `mobile/`, run `npm ci` after generating and committing a lockfile. If no lockfile is present, use `npm install` first. Run `npm run typecheck`, `npm run test:core`, and `npm run build:web`. The protected Vercel preview project uses these checks. For native app builds, Expo EAS requires your own connected Expo account and the relevant Apple/Google signing setup.

## Free local browser mode — functional fallback

When using the browser preview on iPhone, Android or desktop, a separate button renders a **silent motion-text video** using browser Canvas + MediaRecorder. This mode does not contact MoneyPrinterTurbo, external AI providers, stock-photo services or a remote rendering API.

It creates 540 × 960 portrait motion typography using the current topic, edited script and caption. The browser selects MP4 if its recorder supports MP4, otherwise exports WebM. A separate Download button saves the resulting file. The renderer enforces a 1,500-character maximum, limits the storyboard to nine body scenes, and displays progress. Keep the browser tab active throughout the recording. No audio, face footage, automatic captions over stock clips, TikTok posting, or AI imagery are implied.

The native iOS/Android source still requires a **connected video engine** for MP4 rendering. Browser-based exports are available from the deployed web preview and can be tested on supported mobile browsers. This fallback is not a substitute for signed native app builds or the complete MoneyPrinterTurbo service.

## Installable browser preview

The protected Expo Web app also includes a web-app manifest and SVG application icon. On a supported iPhone browser, open the protected Vercel preview, choose Share → Add to Home Screen. On Android Chrome, use the browser menu's **Install app** or **Add to Home screen** option when offered.

This adds the **web studio** to the Home Screen; it is not a signed iOS IPA or Android APK. It still requires authentication to access its protected hosted version. Local video output depends on browser MediaRecorder capabilities, so a supported browser may export MP4 or WebM.

The app does not install an offline service worker and does not claim guaranteed offline access. An active tab is required during browser video recording.

## Creator-owned soundtrack in free browser mode

The free browser renderer can optionally attach one **user-selected audio file** (MP3, M4A, WAV, or another browser-decodable audio format) under **25 MB**. The app processes this audio entirely within the browser using Web Audio and adds it to the canvas video stream for MediaRecorder. It loops the selected track if the storyboard is longer than the track. A playback preview is shown before download.

Only select music you created or have permission to use. Platform copyright rules still apply. If an audio codec or mixed-stream recording is unsupported on a specific browser, use the silent export or a different browser. An uploaded file is not persisted with the draft, and the app does not send it to any remote provider.

This feature is **not** an AI voiceover, lip-sync renderer, or automatic song synchronization.

## Browser E2E quality gate

The protected Vercel deployment now attempts to install Playwright Chromium and exercise the actual browser UI against an Expo dev server. It includes a real local video creation-and-download test. These tests do not contact a paid AI provider.

If a build host cannot launch a Chromium browser, the release must stay on the last verified version until the browser environment is corrected or CI is moved to a supported runner.
