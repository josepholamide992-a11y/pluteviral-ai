# Free browser automation for PluteViral AI

This replaces browser-agent testing with **Microsoft Playwright**, an Apache-2.0 open-source framework. The tests run on your own computer, not a paid cloud-browser account, and do not use GitHub Actions.

## Commands

Run from `mobile/` with Node.js 22.13+:

```sh
npm install
npx playwright install chromium
npm run test:ui
```

Playwright starts an Expo Web development server on 127.0.0.1:19006 and runs a Chromium mobile-size emulation. No login, external server or API keys are needed for the **local starter-outline tests**.

To preview the interface without tests:

```sh
npm run web
```

## Scope and limitations

- These are **browser tests for the React Native Web version**, not proof that the iOS or Android native build works.
- Video rendering requires a separately deployed MoneyPrinterTurbo API and media provider credentials. These tests deliberately do not submit video jobs, incur AI costs or upload content.
- Browser automation is suitable for repeatable tests or websites you are authorised to use. It does not let this chat remotely take over a personal signed-in browser without a supported integration.
- This was committed as a test setup, not executed on a real Android/iOS device, and no GitHub Actions jobs were enabled.
