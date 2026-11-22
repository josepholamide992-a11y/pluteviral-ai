# PluteViral AI — Release Gate Checklist

**Product:** PluteViral AI, Plutevia Limited. **Status:** PRIVATE BETA (not for public app stores).

This checklist is deliberately explicit: a successful **Expo Web** bundle is not the same as an Android APK, iOS IPA or a functioning paid multi-user video SaaS.

## Gate 1 — Product and code

- [x] Source repository with upstream MIT attribution: `harry0703/MoneyPrinterTurbo`
- [x] React Native / Expo frontend (TikTok, Shorts, Reels formats)
- [x] Draft editor, caption and hashtag entry
- [x] Device-local project persistence and deletion confirmation
- [x] Authenticated MoneyPrinterTurbo API calls (private personal test only)
- [x] Platform-specific text sharing and authenticated MP4 exports
- [x] Periodic render-state polling with manual refresh
- [x] Accessible labels for core inputs and buttons
- [x] Test suite and TypeScript gate in Vercel's protected web build
- [ ] Full mobile interaction QA with iPhone VoiceOver / Android TalkBack
- [ ] Run the Playwright UI tests in an environment that supports browser execution

## Gate 2 — Video renderer (blocked)

- [ ] Provision an eligible compute host (e.g. Always Free Arm VM if available)
- [ ] Verify Arm image, disk/CPU/RAM headroom and upstream dependencies
- [ ] Configure `config.toml` and `[app] api_key` as private secrets
- [ ] Supply legitimate LLM and stock-footage provider credentials; configure budget limits
- [ ] Configure an HTTPS reverse proxy with correct Origin handling; **never open unprotected port 8080**
- [ ] For the protected Vercel browser preview, set the server environment variable
      `CORS_ALLOWED_ORIGINS` to the exact authorised HTTPS preview origin(s) —
      no wildcard. This is only for authorised testing, not a production user-auth solution.
- [ ] Submit one actual low-cost MoneyPrinterTurbo render and verify its final MP4, subtitle quality, source attribution and error recovery
- [ ] Validate artifact retention, deletion, backups and storage limits

## Gate 3 — Production security (blocked)

- [ ] Implement per-user accounts and session authentication
- [ ] Put the MoneyPrinterTurbo master key exclusively in a server-side broker
- [ ] Bind each job and output file to a validated user ID
- [ ] Enforce job quotas, abuse prevention, request limits and explicit provider budget caps
- [ ] Enforce scoped file download permissions; audit access
- [ ] Secure secrets, restrict CORS origins, add CSRF protections where needed
- [ ] Add privacy-aware logging, monitoring, failure alerting, retention/deletion workflows
- [ ] Security review including authentication, SSRF, uploaded media, content ownership, TLS and supply-chain risks

## Gate 4 — Native mobile (blocked)

- [ ] Connect an Expo/EAS account with appropriate build entitlement
- [ ] Build a real Android internal-test APK/AAB and test on physical Android hardware
- [ ] Build a signed iOS IPA for TestFlight after Apple Developer approval
- [ ] Test permission prompts, safe areas, offline behaviour, large script editing, export/share, screen readers and accessibility
- [ ] Create final brand icon, splash screen, screenshots, store descriptions and permitted AI disclosures
- [ ] Verify app signing, bundle IDs, iOS/Android target requirements and Google Play testing eligibility

## Gate 5 — Business and launch (blocked)

- [ ] Confirm Plutevia Limited contact details and publish accurate Privacy Policy and Terms
- [ ] Disclose which third-party generation and stock-media providers process user-submitted text/audio
- [ ] Implement payment plans only after server-side entitlement and usage limits exist
- [ ] Obtain necessary TikTok/YouTube developer approval before offering direct publishing
- [ ] Provide account and data deletion controls, support process, copyright complaint flow and incident response
- [ ] Complete end-to-end native test with a real video before app-store submission
- [ ] Obtain user approval before any public release or paid service activation

**Current external blockers:** no Oracle/alternative render VM, no provider API keys configured, Apple account verification incomplete, no connected EAS build account. No completed AI video or signed native build can truthfully be claimed.

## November 22, 2026: Free browser creation

- [x] Browser-only storyboard renderer uses Canvas/MediaRecorder to produce silent motion-text videos without a video server on supported browsers
- [x] Browser download supports MP4 when the browser encoder supports it, otherwise WebM
- [x] Standalone web manifest and app icon hosted with the protected browser preview
- [ ] Verify the browser export on actual iPhone Safari and Android Chrome (capabilities differ)
- [ ] Signed native IPA/APK builds and native-device QA remain required; JavaScript export checks do not replace these
- [ ] MoneyPrinterTurbo AI-generated footage, speech and captions still require a legitimate, configured rendering server
