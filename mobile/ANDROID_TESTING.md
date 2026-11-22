# Android tester APK (direct installation)

This project provides a GitHub Actions build workflow at `.github/workflows/android-apk.yml`.

It builds a **release-mode APK using the Expo prebuild Android project**, signs it with the template's **development/test signing key**, verifies the APK signature and verifies the embedded JavaScript bundle. This is intended for **limited internal testing only**, not a production/distribution signature and not for Google Play.

## Getting the APK

1. Open https://github.com/josepholamide992-a11y/pluteviral-ai/actions/workflows/android-apk.yml
2. Open the most recent **successful** “PluteViral AI Android tester APK” run.
3. Under **Artifacts**, download `PluteViral-AI-Android-Tester-APK`.
4. Extract the ZIP and share the contained `PluteViral-AI-Android-TEST.apk` only with people who have agreed to test it.
5. Download the APK onto an Android phone. When prompted, temporarily allow installation from the chosen file app/browser. Install, then turn that permission off again.

**Never** ask testers to disable Play Protect. The build is not published on Google Play and may show an unsigned/unrecognised developer warning. Verify the SHA-256 checksum from the same run before distributing the APK.

## What testers can use

- Creator form: platform, niche, local script/caption/hashtags editing.
- On-device draft saving and project management.
- Share text and captions.
- Private MoneyPrinterTurbo integration **only when the app owner supplies a real, authenticated HTTPS engine**.

Not included in the native APK: browser-only Canvas video generation, music-file browser picker and local recording. These currently work in the protected **web** studio only. The native APK is an initial **UX and storage test build**, not a fully functional AI video-generation release.

## Limitations and security

- A normal Gradle `assembleDebug` APK may depend on the Metro development server. This workflow intentionally uses `assembleRelease` to embed JS.
- Default Android template test signing credentials are **not private**, so testers must not mistake this package for the official secure Play Store app. A real release must have private, rotated signing credentials managed securely.
- When upstream template signing behaviour changes, the signature verification stage will fail and the build will not upload an unverified APK.
- The app does not include any embedded service master API key, third-party provider key, or paid subscription access.
- Beta testing should be voluntary, limited, and should not involve entering sensitive or copyrighted third-party data.
