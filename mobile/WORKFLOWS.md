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
