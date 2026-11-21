# PluteViral AI — cross-platform native mobile MVP

React Native / Expo creator console for Plutevia Limited. The MoneyPrinterTurbo Python video engine stays at repository root.

## Functional prototype features
- TikTok, YouTube Shorts and Instagram Reels 9:16 content workflow.
- Four starter content niches, editable templates, caption and hashtag editor.
- AI script, social metadata and render job calls to a connected MoneyPrinterTurbo HTTPS API.
- Progress refresh, completed MP4 download and native share sheet.
- The engine x-api-key and origin are stored in Expo SecureStore on the device.
- Projects and drafts exist only in the current app session; share text before leaving.

## What needs infrastructure
- A running privately controlled MoneyPrinterTurbo server with config.toml settings for LLM, media source, subtitles, ffmpeg and a nonempty api_key.
- HTTPS reverse proxy, appropriate firewall/access control, quotas and a server-side broker before accepting external users.
- No MP4 can be rendered without a configured working video server. The app must not be represented as a finished generator until this is connected and tested.
- Direct TikTok/YouTube publishing, scheduling, billing, auth, cloud project persistence and store publication are not part of this MVP.

## Start the mobile app

1. Install Node 22+, run npm install inside mobile/.
2. Run npx expo start for Expo dev testing, or npx expo run:android / npx expo run:ios for native builds.
3. Follow the root MoneyPrinterTurbo README-en.md to deploy and configure its FastAPI renderer independently. Its REST API is at /api/v1.
4. Configure the server HTTPS origin and x-api-key in Settings; both remain device-local.
5. Create an outline, edit it, request AI Script, then Render Video and Refresh status.

The mobile identifiers are com.plutevia.pluteviral for Android and iOS. These have not yet been checked for availability. Build and device testing, Play Console, Apple Developer, privacy disclosures and approval are still required.

## Attribution
The upstream MIT-licensed renderer is Copyright (c) 2024 Harry. Keep the original LICENSE and upstream notices. PluteViral AI is a separate Plutevia Limited client, not an endorsed original release.
