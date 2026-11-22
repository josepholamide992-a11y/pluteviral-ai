# PluteViral core tests — free, no server needed

Run from the `mobile/` directory after `npm install`:

```sh
npm run test:core
```

The command compiles only the dependency-free `src/content.ts` and `src/api.ts` modules using TypeScript and runs **nine Node built-in tests**. It checks topic cleanup, video payload shape, URL validation, authenticated API requests, error handling and malformed server responses. The HTTP replies are mocked; no provider is contacted and no video job is started.

This test suite is different from `npm run test:ui` (Playwright) and from real iOS/Android builds. The tests do **not** establish full Expo compatibility or live video-rendering success.

Generated `.core-test-build/` files are ignored by Git.
